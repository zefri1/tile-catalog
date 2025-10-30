/**
 * Каталог плитки - Final version: product modal + contact actions
 */

class TileCatalog {
  constructor() {
    this.config = {
      csvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRfhgka5nFoR1TXYDGQ5CziYYqGSDXjhw_yJeO-MqFTb-k_RWlkjvaWxy9vBzLuKmo4KdCnz2SAdvMh/pub?gid=0&single=true&output=csv',
      themes: { light: 'light', dark: 'dark' },
      phoneFallback: '+7 (495) 123-45-67',
      vkLink: 'https://vk.com/plitochik44'
    };
    this.state = {
      products: [], filteredProducts: [],
      filters: { search: '', brands: new Set(), colors: new Set(), priceMin: 0, priceMax: 10000 },
      sort: 'price-desc', theme: this.getStoredTheme(), loading: true,
      viewMode: [1, 2].includes(Number(localStorage.getItem('viewMode'))) ? Number(localStorage.getItem('viewMode')) : 2,
    };
    this.elements = {};
    this.init();
  }

  async init() {
    this.initElements();
    this.initTheme();
    this.initEventListeners();
    await this.loadData();
    this.initFilters();
    this.updateViewButtons();
    this.updateGridClass();
    this.renderProducts();
    this.hideLoadingScreen();
    const isOpen = this.elements.filtersToggle?.checked || false;
    this.syncFiltersPlacement(isOpen);
  }

  initElements() {
    const sel = {
      loadingScreen: '#loading-screen', themeToggle: '#theme-toggle', themeIcon: '.theme-icon',
      searchInput: '#search-input', brandFilters: '#brand-filters', colorFilters: '#color-filters',
      priceRange: '#price-range', priceMin: '#price-min', priceMax: '#price-max', clearFilters: '#clear-filters',
      sortSelect: '#sort-select', resultsCount: '#results-count', productsGrid: '#products-grid', noResults: '#no-results',
      filtersSidebar: '#filters-sidebar', filtersToggle: '#filters-toggle', filtersCollapsible: '#filters-collapsible',
      viewGrid1: '#view-grid-1', viewGrid2: '#view-grid-2'
    };
    for (const [k, s] of Object.entries(sel)) this.elements[k] = document.querySelector(s);
  }

  initTheme() { this.applyTheme(this.state.theme); }
  applyTheme(t) { document.documentElement.setAttribute('data-theme', t); localStorage.setItem('theme', t); if (this.elements.themeIcon) this.elements.themeIcon.textContent = t === 'dark' ? '☀️' : '🌙'; this.state.theme = t; }
  toggleTheme() { this.applyTheme(this.state.theme === 'dark' ? 'light' : 'dark'); }
  getStoredTheme() { const s = localStorage.getItem('theme'); const sys = matchMedia('(prefers-color-scheme: dark)').matches; return s || (sys ? 'dark' : 'light'); }

  initEventListeners() {
    this.elements.themeToggle?.addEventListener('click', () => this.toggleTheme());
    this.elements.searchInput?.addEventListener('input', e => { this.state.filters.search = e.target.value.toLowerCase().trim(); this.filterAndRenderProducts(); });
    this.elements.priceRange?.addEventListener('input', e => { const v = parseInt(e.target.value); this.state.filters.priceMax = v; if (this.elements.priceMax) this.elements.priceMax.value = v; this.filterAndRenderProducts(); });
    this.elements.priceMin?.addEventListener('input', e => { const v = parseInt(e.target.value) || 0; this.state.filters.priceMin = Math.min(v, this.state.filters.priceMax - 1); e.target.value = this.state.filters.priceMin; this.filterAndRenderProducts(); });
    this.elements.priceMax?.addEventListener('input', e => { const v = parseInt(e.target.value) || 0; const min = this.state.filters.priceMin; const smax = parseInt(this.elements.priceRange?.max) || 10000; this.state.filters.priceMax = Math.max(Math.min(v, smax), min + 1); e.target.value = this.state.filters.priceMax; if (this.elements.priceRange) this.elements.priceRange.value = this.state.filters.priceMax; this.filterAndRenderProducts(); });
    this.elements.clearFilters?.addEventListener('click', () => this.clearAllFilters());

    // Sort select: unique options without duplicates
    if (this.elements.sortSelect) {
      const opts = [
        { v: 'price-asc', t: 'По цене ↑' },
        { v: 'price-desc', t: 'По цене ↓' },
        { v: 'name-asc', t: 'По названию А-Я' },
        { v: 'name-desc', t: 'По названию Я-А' }
      ];
      this.elements.sortSelect.innerHTML = opts.map(o => `<option value="${o.v}">${o.t}</option>`).join('');
      this.elements.sortSelect.value = this.state.sort;
      this.elements.sortSelect.addEventListener('change', e => { this.state.sort = e.target.value; this.renderProducts(); });
    }

    // View mode buttons
    this.elements.viewGrid1?.addEventListener('click', () => this.changeViewMode(1));
    this.elements.viewGrid2?.addEventListener('click', () => this.changeViewMode(2));

    // Mobile filters toggle
    this.elements.filtersToggle?.addEventListener('change', e => { const o = e.target.checked; this.elements.filtersToggle.setAttribute('aria-expanded', String(o)); this.syncFiltersPlacement(o); });
    let resizeTimeout;
    addEventListener('resize', () => { clearTimeout(resizeTimeout); resizeTimeout = setTimeout(() => { const o = this.elements.filtersToggle?.checked || false; this.syncFiltersPlacement(o); }, 120); });

    // Delegation: card click -> product modal, contact button -> NO redirect, opens contact modal
    this.elements.productsGrid?.addEventListener('click', (e) => {
      const contactBtn = e.target.closest('.product-contact');
      if (contactBtn) {
        e.preventDefault();
        e.stopPropagation();
        const card = contactBtn.closest('.product-card');
        const id = card?.dataset.id;
        const product = this.state.filteredProducts.find(x => x.id === id) || this.state.products.find(x => x.id === id);
        if (product) this.openContactModal(product);
        return;
      }
      const card = e.target.closest('.product-card');
      if (!card) return;
      const id = card.dataset.id;
      const product = this.state.filteredProducts.find(x => x.id === id) || this.state.products.find(x => x.id === id);
      if (product) this.openProductModal(product);
    });
  }

  changeViewMode(mode) { const next = mode === 1 ? 1 : 2; this.state.viewMode = next; this.updateViewButtons(); this.updateGridClass(); localStorage.setItem('viewMode', String(next)); }
  syncFiltersPlacement(isOpen) { const sidebar = this.elements.filtersSidebar, collapsible = this.elements.filtersCollapsible; if (!sidebar || !collapsible) return; const isMobile = innerWidth <= 768; const panel = sidebar.querySelector('.filters-panel') || collapsible.querySelector('.filters-panel'); if (!panel) return; if (isMobile) { if (!collapsible.contains(panel)) collapsible.appendChild(panel); collapsible.classList.toggle('open', isOpen); if (isOpen) collapsible.scrollIntoView({ behavior: 'smooth', block: 'start' }); } else { if (!sidebar.contains(panel)) sidebar.appendChild(panel); collapsible.classList.remove('open'); collapsible.style.removeProperty('display'); if (this.elements.filtersToggle) { this.elements.filtersToggle.checked = false; this.elements.filtersToggle.setAttribute('aria-expanded', 'false'); } } }
  updateViewButtons() { document.querySelectorAll('.view-btn').forEach(btn => { btn.classList.remove('active'); btn.setAttribute('aria-pressed', 'false'); }); const active = document.querySelector(`[data-columns="${this.state.viewMode}"]`); active?.classList.add('active'); active?.setAttribute('aria-pressed', 'true'); }
  updateGridClass() { if (!this.elements.productsGrid) return; this.elements.productsGrid.classList.remove('grid-1', 'grid-2'); this.elements.productsGrid.classList.add(`grid-${this.state.viewMode}`); }

  async loadData() { try { await this.loadFromGoogleSheets(); } catch { this.loadDemoData(); } }
  async loadFromGoogleSheets() { const url = `${this.config.csvUrl}&_cachebust=${Date.now()}`; const r = await fetch(url, { headers: { Accept: 'text/csv,application/csv,text/plain', 'Cache-Control': 'no-cache' }, cache: 'no-store' }); if (!r.ok) throw new Error('http'); const csv = await r.text(); if (csv.length < 50) throw new Error('short'); this.parseCSVData(csv); }
  parseCSVData(csv) { try { const wb = XLSX.read(csv, { type: 'string' }); const ws = wb.Sheets[wb.SheetNames[0]]; const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }); if (rows.length < 2) throw new Error('no rows'); this.state.products = rows.slice(1).filter(r => r && r.length > 0).map(r => ({ id: this.generateId(), name: this.cleanString(this.getString(r[0])) || 'Без названия', brand: this.cleanString(this.getString(r[1])) || 'Неизвестно', color: this.cleanString(this.getString(r[2])) || 'Не указан', price: this.getNumber(r[3]) || 0, description: this.cleanString(this.getString(r[4])) || '', image: this.getString(r[5]) || '', phone: this.getString(r[6]) || this.config.phoneFallback, inStock: this.getBoolean(r[7]), onDemand: this.getBoolean(r[8]), hidden: this.getBoolean(r[9]) })).filter(p => (p.inStock || p.onDemand) && !p.hidden && p.name !== 'Без названия'); } catch { this.loadDemoData(); } }
  cleanString(s) { return s ? String(s).replace(/['"<>]/g, '').replace(/\s+/g, ' ').trim() : ''; }
  
  // RESTORED: More demo products like before
  loadDemoData() {
    this.state.products = [
      { id: 'demo-1', name: 'Marble Effect', brand: 'Luxury Line', color: 'Золотистый', price: 3200, description: 'Эффект мраморной поверхности', image: '', phone: this.config.phoneFallback, inStock: true, onDemand: false, hidden: false },
      { id: 'demo-2', name: 'Mosaic Pattern', brand: 'Art Collection', color: 'Многоцветный', price: 2800, description: 'Мозаичный узор для акцентных стен', image: '', phone: this.config.phoneFallback, inStock: true, onDemand: false, hidden: false },
      { id: 'demo-3', name: 'Natural Stone Look', brand: 'Natural Design', color: 'Бежевый', price: 2100, description: 'Имитация натурального камня', image: '', phone: this.config.phoneFallback, inStock: true, onDemand: false, hidden: false },
      { id: 'demo-4', name: 'Industrial Style', brand: 'Loft Design', color: 'Металлик', price: 1950, description: 'Промышленный стиль для современных интерьеров', image: '', phone: this.config.phoneFallback, inStock: false, onDemand: true, hidden: false },
      { id: 'demo-5', name: 'Vintage Pattern', brand: 'Retro Style', color: 'Серый', price: 1890, description: 'Винтажная плитка с уникальным узором', image: '', phone: this.config.phoneFallback, inStock: true, onDemand: false, hidden: false },
      { id: 'demo-6', name: 'Hexagon Modern', brand: 'Geometric', color: 'Синий', price: 1650, description: 'Современная шестигранная плитка', image: '', phone: this.config.phoneFallback, inStock: true, onDemand: false, hidden: false },
      { id: 'demo-7', name: 'Wood Look Classic', brand: 'Traditional', color: 'Коричневый', price: 1450, description: 'Классическая плитка под дерево', image: '', phone: this.config.phoneFallback, inStock: true, onDemand: false, hidden: false },
      { id: 'demo-8', name: 'Metro Tiles', brand: 'Urban Collection', color: 'Белый', price: 1200, description: 'Плитка в стиле метро', image: '', phone: this.config.phoneFallback, inStock: true, onDemand: false, hidden: false },
      { id: 'demo-9', name: 'Stone Texture', brand: 'Nature Plus', color: 'Кремовый', price: 980, description: 'Текстура натурального камня', image: '', phone: this.config.phoneFallback, inStock: true, onDemand: false, hidden: false }
    ];
  }

  initFilters() {
    const brands = [...new Set(this.state.products.map(p => p.brand))].sort();
    const colors = [...new Set(this.state.products.map(p => p.color))].sort();
    
    if (this.elements.brandFilters) {
      this.elements.brandFilters.innerHTML = brands.map(b => this.createCheckboxFilter('brand', b)).join('');
      this.elements.brandFilters.addEventListener('change', e => {
        if (e.target.type === 'checkbox') {
          e.target.checked ? this.state.filters.brands.add(e.target.value) : this.state.filters.brands.delete(e.target.value);
          this.filterAndRenderProducts();
        }
      });
    }
    
    if (this.elements.colorFilters) {
      this.elements.colorFilters.innerHTML = colors.map(c => this.createCheckboxFilter('color', c)).join('');
      this.elements.colorFilters.addEventListener('change', e => {
        if (e.target.type === 'checkbox') {
          e.target.checked ? this.state.filters.colors.add(e.target.value) : this.state.filters.colors.delete(e.target.value);
          this.filterAndRenderProducts();
        }
      });
    }
    
    const prices = this.state.products.map(p => p.price).filter(Number.isFinite);
    const max = prices.length ? Math.max(...prices) : 0;
    this.state.filters.priceMax = max;
    
    if (this.elements.priceRange) { this.elements.priceRange.max = String(max); this.elements.priceRange.value = String(max); }
    if (this.elements.priceMax) { this.elements.priceMax.value = String(max); }
  }

  createCheckboxFilter(type, value) {
    const id = `${type}-${value.replace(/\s+/g, '-').toLowerCase()}`;
    return `<div class="checkbox-item"><input type="checkbox" id="${id}" value="${value}"><label for="${id}" class="checkbox-text">${value}</label></div>`;
  }

  filterAndRenderProducts() { this.applyFilters(); this.renderProducts(); }
  applyFilters() {
    this.state.filteredProducts = this.state.products.filter(p => {
      if (this.state.filters.search) {
        const searchStr = (p.name + ' ' + p.brand + ' ' + p.color + ' ' + p.description).toLowerCase();
        if (!searchStr.includes(this.state.filters.search)) return false;
      }
      if (this.state.filters.brands.size > 0 && !this.state.filters.brands.has(p.brand)) return false;
      if (this.state.filters.colors.size > 0 && !this.state.filters.colors.has(p.color)) return false;
      if (p.price < this.state.filters.priceMin || p.price > this.state.filters.priceMax) return false;
      return true;
    });
  }

  renderProducts() {
    if (!this.elements.productsGrid) return;
    this.applyFilters();
    this.sortProducts();
    this.updateResultsCount();
    
    if (this.state.filteredProducts.length === 0) {
      this.showNoResults();
      return;
    }
    
    this.hideNoResults();
    this.elements.productsGrid.innerHTML = this.state.filteredProducts.map(p => this.createProductCard(p)).join('');
  }

  sortProducts() {
    const sortType = this.state.sort;
    const compareText = (a, b) => a.localeCompare(b, 'ru', { sensitivity: 'base' });
    const compareNum = (a, b) => a - b;
    
    this.state.filteredProducts.sort((a, b) => {
      if (sortType === 'price-asc') return compareNum(a.price, b.price);
      if (sortType === 'price-desc') return compareNum(b.price, a.price);
      if (sortType === 'name-asc') return compareText(a.name, b.name);
      if (sortType === 'name-desc') return compareText(b.name, a.name);
      return 0;
    });
  }

  createProductCard(p) {
    const badges = [];
    if (p.inStock) badges.push('<span class="badge badge-success">В наличии</span>');
    if (p.onDemand) badges.push('<span class="badge badge-warning">Под заказ</span>');
    
    const img = p.image && p.image.trim() ?
      `<img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.style.display='none'; this.parentNode.querySelector('.product-placeholder').style.display='flex';">` : '';
    
    const price = p.price > 0 ? p.price.toLocaleString('ru-RU') + ' ₽' : 'По запросу';
    
    return `
      <article class="product-card" data-id="${p.id}">
        <div class="product-image">
          ${img}
          <div class="product-placeholder" style="${p.image ? 'display: none;' : 'display: flex;'}">🏠</div>
          ${badges.length > 0 ? `<div class="product-status">${badges[0].replace('<span class="badge badge-success">', '').replace('<span class="badge badge-warning">', '').replace('</span>', '')}</div>` : ''}
        </div>
        <div class="product-content">
          <div class="product-header">
            <h3 class="product-title">${p.name}</h3>
            <div class="product-price" style="max-width: 7ch; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${price}</div>
          </div>
          <div class="product-meta">
            <span class="product-brand"><strong>Бренд:</strong> ${p.brand}</span>
            <span class="product-color"><strong>Цвет:</strong> ${p.color}</span>
          </div>
          ${p.description ? `<p class="product-description">${p.description}</p>` : ''}
          <div class="product-badges">${badges.join('')}</div>
          <a href="#" class="product-contact">Связаться</a>
        </div>
      </article>
    `;
  }

  updateResultsCount() {
    if (this.elements.resultsCount) {
      const total = this.state.products.length;
      const filtered = this.state.filteredProducts.length;
      this.elements.resultsCount.textContent = `Найдено товаров: ${filtered} из ${total}`;
    }
  }
  showNoResults() { this.elements.noResults?.classList.remove('hidden'); if (this.elements.productsGrid) this.elements.productsGrid.innerHTML = ''; }
  hideNoResults() { this.elements.noResults?.classList.add('hidden'); }
  
  clearAllFilters() {
    this.state.filters.search = '';
    if (this.elements.searchInput) this.elements.searchInput.value = '';
    
    this.state.filters.brands.clear();
    this.elements.brandFilters?.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    
    this.state.filters.colors.clear();
    this.elements.colorFilters?.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    
    const prices = this.state.products.map(p => p.price).filter(Number.isFinite);
    const max = prices.length ? Math.max(...prices) : 0;
    this.state.filters.priceMin = 0;
    this.state.filters.priceMax = max;
    
    if (this.elements.priceMin) this.elements.priceMin.value = '0';
    if (this.elements.priceMax) this.elements.priceMax.value = String(max);
    if (this.elements.priceRange) { this.elements.priceRange.value = String(max); this.elements.priceRange.max = String(max); }
    
    this.filterAndRenderProducts();
  }

  // ===== Full product modal: photo, description, etc. + contact buttons at bottom =====
  openProductModal(p) {
    const modal = document.getElementById('product-modal');
    if (!modal) return;
    
    const img = document.getElementById('modal-image');
    const ph = document.getElementById('modal-image-ph');
    const title = document.getElementById('modal-title');
    const price = document.getElementById('modal-price');
    const badges = document.getElementById('modal-badges');
    const brand = document.getElementById('modal-brand');
    const color = document.getElementById('modal-color');
    const status = document.getElementById('modal-status');
    const desc = document.getElementById('modal-desc');
    
    title.textContent = p.name;
    price.textContent = p.price > 0 ? p.price.toLocaleString('ru-RU') + ' ₽' : 'По запросу';
    brand.textContent = p.brand;
    color.textContent = p.color;
    status.textContent = p.inStock ? 'В наличии' : (p.onDemand ? 'Под заказ' : 'Недоступно');
    desc.textContent = p.description || '';
    
    badges.innerHTML = '';
    if (p.inStock) badges.insertAdjacentHTML('beforeend', '<span class="badge badge-success">В наличии</span>');
    if (p.onDemand) badges.insertAdjacentHTML('beforeend', '<span class="badge badge-warning">Под заказ</span>');
    
    if (p.image && p.image.trim()) {
      img.src = p.image;
      img.alt = p.name;
      img.style.display = 'block';
      ph.style.display = 'none';
      img.onerror = () => { img.style.display = 'none'; ph.style.display = 'grid'; };
    } else {
      img.removeAttribute('src');
      img.style.display = 'none';
      ph.style.display = 'grid';
    }
    
    // Update modal actions to have separate Call/VK buttons instead of single "Связаться"
    const actionsContainer = modal.querySelector('.modal__actions');
    if (actionsContainer) {
      actionsContainer.innerHTML = `
        <a href="tel:${(p.phone || this.config.phoneFallback).replace(/\s+/g, '')}" class="btn btn-primary">Позвонить</a>
        <a href="${this.config.vkLink}" target="_blank" rel="noopener" class="btn">ВКонтакте</a>
        <button type="button" class="btn" id="modal-close-btn">Закрыть</button>
      `;
    }
    
    modal.classList.add('open');
    document.documentElement.style.overflow = 'hidden';
    this._trapFocusOpen(modal);
    
    const onBackdrop = (e) => { if (e.target === modal || e.target.classList.contains('modal__backdrop')) this.closeProductModal(); };
    const onEsc = (e) => { if (e.key === 'Escape') this.closeProductModal(); };
    
    modal.addEventListener('click', onBackdrop, { once: true });
    addEventListener('keydown', onEsc, { once: true });
    modal.querySelector('.modal__close')?.addEventListener('click', () => this.closeProductModal(), { once: true });
    document.getElementById('modal-close-btn')?.addEventListener('click', () => this.closeProductModal(), { once: true });
  }

  closeProductModal() {
    const modal = document.getElementById('product-modal');
    if (!modal) return;
    modal.classList.remove('open');
    document.documentElement.style.overflow = '';
    this._trapFocusClose();
  }

  // ===== Compact contact modal: separate from product modal =====
  openContactModal(p) {
    let el = document.getElementById('contact-modal');
    
    if (!el) {
      el = document.createElement('div');
      el.id = 'contact-modal';
      el.className = 'modal open';
      el.innerHTML = `
        <div class="modal__backdrop"></div>
        <div class="modal__dialog" role="dialog" aria-modal="true">
          <button class="modal__close" type="button" aria-label="Закрыть">✕</button>
          <div class="modal__content" style="grid-template-columns: 1fr;">
            <div class="modal__details">
              <h2 class="modal__title">Связаться</h2>
              <p class="modal__desc">Выберите удобный способ связи</p>
              <div class="modal__actions">
                <a id="call-btn" class="btn btn-primary" href="#">Позвонить</a>
                <a id="vk-btn" class="btn" target="_blank" rel="noopener">ВКонтакте</a>
              </div>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(el);
      document.documentElement.style.overflow = 'hidden';
      
      el.querySelector('.modal__close')?.addEventListener('click', () => this.closeContactModal());
      el.addEventListener('click', (e) => { if (e.target === el || e.target.classList.contains('modal__backdrop')) this.closeContactModal(); });
      addEventListener('keydown', this._onContactEsc = (e) => { if (e.key === 'Escape') this.closeContactModal(); }, { once: true });
    } else {
      el.classList.add('open');
      document.documentElement.style.overflow = 'hidden';
    }
    
    el.querySelector('#call-btn')?.setAttribute('href', `tel:${(p.phone || this.config.phoneFallback).replace(/\s+/g, '')}`);
    el.querySelector('#vk-btn')?.setAttribute('href', this.config.vkLink);
  }

  closeContactModal() {
    const el = document.getElementById('contact-modal');
    if (!el) return;
    el.classList.remove('open');
    document.documentElement.style.overflow = '';
    el.remove();
  }

  _trapFocusOpen(container) {
    const focusable = container.querySelectorAll('a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])');
    this._focusElems = Array.from(focusable);
    this._focusIndex = 0;
    this._lastActive = document.activeElement;
    (this._focusElems[0] || container).focus();
    
    this._onFocusKey = (e) => {
      if (e.key !== 'Tab') return;
      e.preventDefault();
      this._focusIndex = (this._focusIndex + (e.shiftKey ? -1 : 1) + this._focusElems.length) % this._focusElems.length;
      this._focusElems[this._focusIndex].focus();
    };
    container.addEventListener('keydown', this._onFocusKey);
  }

  _trapFocusClose() {
    const container = document.getElementById('product-modal');
    if (this._onFocusKey) container?.removeEventListener('keydown', this._onFocusKey);
    this._lastActive?.focus?.();
    this._onFocusKey = null;
    this._focusElems = null;
  }

  hideLoadingScreen() {
    if (this.elements.loadingScreen) {
      this.elements.loadingScreen.style.opacity = '0';
      setTimeout(() => { this.elements.loadingScreen.style.display = 'none'; }, 300);
    }
  }

  getString(v) { return v ? String(v).trim() : ''; }
  getNumber(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
  getBoolean(v) {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') {
      const lower = v.toLowerCase().trim();
      return lower === 'true' || lower === '1' || lower === 'да' || lower === 'yes';
    }
    return Boolean(v);
  }
  generateId() { return 'product-' + Math.random().toString(36).slice(2, 11); }
  log(...args) { console.log('[TileCatalog]', ...args); }
}

window.TileCatalog = TileCatalog;
