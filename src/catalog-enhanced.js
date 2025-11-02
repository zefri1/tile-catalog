// Enhanced CSV parser with better field detection
function parseCSV(text) {
  const rows = [];
  let i = 0, field = '', row = [], inQuotes = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',' || c === ';') { row.push(field.trim()); field = ''; i++; continue; }
    if (c === '\n') { row.push(field.trim()); rows.push(row); row = []; field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    field += c; i++;
  }
  if (field.trim()) row.push(field.trim());
  if (row.length > 0) rows.push(row);
  return rows;
}

function normArray(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/[;,|]/)
    .map(x => x.replace(/[-–—]/g, '').trim())
    .filter(x => x && x.length > 0 && x.toLowerCase() !== 'нет' && x !== '0' && x !== '-');
}

// Функция экранирования HTML для защиты от XSS
function escapeHtml(text) {
  if (text == null) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

// Функция экранирования для HTML атрибутов
function escapeHtmlAttr(text) {
  if (text == null) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  };
  return String(text).replace(/[&<>"]/g, m => map[m]);
}

// Валидация URL изображений (только http/https/data)
function validateImageUrl(url) {
  if (!url) return '';
  try {
    const urlObj = new URL(url, window.location.href);
    const protocol = urlObj.protocol.toLowerCase();
    // Разрешаем только http, https и data (для base64 изображений)
    if (protocol === 'http:' || protocol === 'https:' || protocol === 'data:') {
      return url;
    }
    return '';
  } catch (e) {
    // Если не валидный URL, возвращаем пустую строку
    return '';
  }
}

function s(v) { return v ? String(v).trim() : '' }
function n(v) { const x = parseFloat(String(v).replace(/[^0-9.,]/g, '').replace(',', '.')); return isNaN(x) ? 0 : Math.round(x) }
function b(v) { if (typeof v === 'boolean') return v; const l = String(v || '').toLowerCase().trim(); return l === 'true' || l === '1' || l === 'да' || l === 'yes' }
function cs(v) { if (!v) return ''; return String(v).replace(/[\\'>\"]/g, '').replace(/\s+/g, ' ').trim() }

function parseCSVData(csvContent) {
  const rows = parseCSV(csvContent);
  if (!rows || rows.length < 2) return [];
  
  const headers = rows[0].map(h => String(h || '').toLowerCase().trim());
  const idx = (name) => {
    const index = headers.findIndex(h => h.includes(name.toLowerCase()));
    return index !== -1 ? index : -1;
  };
  
  const col = {
    id: idx('id'),
    brand: idx('brand'),
    collection: idx('collection'),
    country: idx('country'),
    fullname: idx('fullname'),
    color: idx('color'),
    itemcategory: idx('itemcategory'),
    itemsurface: idx('itemsurface'),
    areasofuse: idx('areasofuse'),
    surfacestructures: idx('surfacestructures'),
    image: idx('image'),
    rest: idx('rest.moskow'),
    byorder: idx('byorder'),
    priceRozn: idx('price.roznichnaya'),
    priceDiler: idx('price.diler2'),
    size: idx('size')
  };
  
  const data = rows.slice(1).filter(r => r && r.length > 0);
  return data.map((r) => {
    const product = {
      id: s(r[col.id]) || 'product-' + Math.random().toString(36).slice(2, 11),
      brand: cs(s(r[col.brand])) || 'Неизвестно',
      collection: cs(s(r[col.collection])) || '',
      country: cs(s(r[col.country])) || 'Не указана',
      name: cs(s(r[col.fullname])) || 'Без названия',
      color: cs(s(r[col.color])) || 'Не указан',
      size: cs(s(r[col.size])) || '',
      itemCategory: cs(s(r[col.itemcategory])) || '',
      itemCategoryList: normArray(r[col.itemcategory]),
      itemSurface: cs(s(r[col.itemsurface])) || '',
      itemSurfaceList: normArray(r[col.itemsurface]),
      areasOfUse: cs(s(r[col.areasofuse])) || '',
      areasOfUseList: normArray(r[col.areasofuse]),
      surfaceStruct: cs(s(r[col.surfacestructures])) || '',
      surfaceStructList: normArray(r[col.surfacestructures]),
      image: s(r[col.image]) || '',
      inStock: n(r[col.rest]) > 0,
      onDemand: col.byorder !== -1 ? b(r[col.byorder]) : true,
      hidden: false,
      price: n(r[col.priceRozn]) || n(r[col.priceDiler]) || 0
    };
    return product;
  });
}

class TileCatalog {
  constructor() {
    this.products = []; 
    this.filteredProducts = []; 
    this.currentSort = 'price-asc'; 
    this.currentView = 2;
    this.filters = { 
      search: '', 
      brands: new Set(), 
      colors: new Set(), 
      countries: new Set(), 
      surfaces: new Set(), 
      uses: new Set(), 
      structs: new Set(), 
      categories: new Set(), 
      priceMin: 0, 
      priceMax: 1250 
    };
    this.isInitialized = false; 
    this.batchSize = 40; 
    this.renderIndex = 0;
    
    this.categoryNavigator = null;
  }

  showLoadingScreen() { const screen = document.getElementById('loading-screen'); if (screen) screen.style.display = 'flex'; }
  hideLoadingScreen() { const screen = document.getElementById('loading-screen'); if (screen) screen.style.display = 'none'; }
  showErrorOverlay(message) { console.error('Error:', message); }

  async init() {
    this.showLoadingScreen();
    try { 
      await this.loadProducts(); 
      this.initializeFilters(); 
      this.bindEvents(); 
      if (window.MarketplaceCategoryNavigator) { this.categoryNavigator = new window.MarketplaceCategoryNavigator(this); this.categoryNavigator.init(); }
      this.applyFilters(); 
    }
    catch (err) { this.showErrorOverlay(err.message || 'Ошибка'); }
    finally { this.hideLoadingScreen(); this.isInitialized = true; }
  }

  async loadProducts() {
    const API_URL = window.SHEET_JSON_URL || '/api/items';
    const FALLBACK_CSV = window.SHEET_CSV_URL;
    try {
      const response = await fetch(API_URL, { cache: 'no-store', headers: { 'Accept': 'application/json' } });
      if (response.ok) {
        const json = await response.json();
        const items = Array.isArray(json.items) ? json.items : json;
        this.products = items.filter(p => (p.inStock || p.onDemand !== false) && !p.hidden);
        if (this.products.length > 0) return;
      }
      throw new Error('Empty API');
    } catch (e) {}
    const response = await fetch(`${FALLBACK_CSV}&t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('CSV load failed');
    const csv = await response.text();
    const parsed = parseCSVData(csv);
    this.products = parsed.filter(p => p.price > 0 && !p.hidden);
  }

  initializeFilters() {
    const brands = [...new Set(this.products.map(p => p.brand))].filter(Boolean).sort();
    const colors = [...new Set(this.products.map(p => p.color))].filter(Boolean).sort();
    const countries = [...new Set(this.products.map(p => p.country))].filter(Boolean).sort();
    const allSurfs = [].concat(...this.products.map(p => (p.itemSurfaceList || [])));
    const surfaces = [...new Set(allSurfs)].filter(Boolean).sort();
    const allUses = [].concat(...this.products.map(p => (p.areasOfUseList || [])));
    const uses = [...new Set(allUses)].filter(Boolean).sort();
    const allStructs = [].concat(...this.products.map(p => (p.surfaceStructList || [])));
    const structs = [...new Set(allStructs)].filter(Boolean).sort();

    const sidebar = document.getElementById('filters-sidebar');
    const createFilterGroup = (title, items, id) => {
      if (!items || !Array.isArray(items) || items.length === 0) return '';
      return `
        <div class="filter-group">
          <label class="filter-label">${escapeHtml(title)}:</label>
          <div class="checkbox-group scrollable" id="${escapeHtmlAttr(id)}">
            ${items.map(val => {
              const escapedVal = escapeHtmlAttr(val);
              const escapedText = escapeHtml(val);
              return `
              <div class="checkbox-item">
                <input type="checkbox" value="${escapedVal}" class="filter-checkbox">
                <span class="checkbox-text">${escapedText}</span>
              </div>
            `;
            }).join('')}
          </div>
        </div>`;
    };

    const categories = [...new Set(this.products.flatMap(p=>p.itemCategoryList||[]))]
      .filter(Boolean)
      .sort((a,b)=>a.localeCompare(b,'ru'));

    sidebar.innerHTML = `
      <div class="filters-panel">
        <div class="filters-header">
          <h2>Фильтры</h2>
          <button id="clear-filters" class="clear-btn">Сбросить</button>
        </div>
        <div class="filters-content">
          <div class="filter-group">
            <label class="filter-label" for="search-input">ПОИСК:</label>
            <input type="text" id="search-input" class="search-input" placeholder="Введите название..." autocomplete="off">
          </div>
          ${createFilterGroup('КАТЕГОРИЯ', categories, 'category-filters')}
          ${createFilterGroup('СТРАНА', countries, 'country-filters')}
          ${createFilterGroup('ТИП ПОВЕРХНОСТИ', surfaces, 'surface-filters')}
          ${createFilterGroup('ОБЛАСТЬ ПРИМЕНЕНИЯ', uses, 'use-filters')}
          ${createFilterGroup('СТРУКТУРА ПОВЕРХНОСТИ', structs, 'struct-filters')}
          ${createFilterGroup('БРЕНД', brands, 'brand-filters')}
          ${createFilterGroup('ЦВЕТ', colors, 'color-filters')}
        </div>
      </div>`;
  }

  bindEvents() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.addEventListener('input', (e) => { this.filters.search = e.target.value.toLowerCase(); this.applyFilters(); });

    const mappings = [['#brand-filters','brands'],['#color-filters','colors'],['#country-filters','countries'],['#surface-filters','surfaces'],['#use-filters','uses'],['#struct-filters','structs'],['#category-filters','categories']];
    mappings.forEach(([sel,key])=>{
      const container=document.querySelector(sel);
      if(container){
        container.addEventListener('change',(e)=>{
          if(e.target.classList.contains('filter-checkbox')){
            this.filters[key] = this.filters[key]||new Set();
            if(e.target.checked) this.filters[key].add(e.target.value); else this.filters[key].delete(e.target.value);
            this.applyFilters();
          }
        });
      }
    });

    const clearBtn = document.getElementById('clear-filters');
    if (clearBtn) clearBtn.addEventListener('click', () => { 
      this.clearAllFilters();
    });

    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) sortSelect.addEventListener('change', (e) => { this.currentSort = e.target.value; this.applyFilters(); });

    const viewBtns = document.querySelectorAll('.view-btn');
    if (viewBtns) viewBtns.forEach(btn => { btn.addEventListener('click', (e) => { document.querySelectorAll('.view-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false');}); e.target.classList.add('active'); e.target.setAttribute('aria-pressed','true'); this.currentView = parseInt(e.target.dataset.columns); const grid=document.getElementById('products-grid'); if(grid) grid.className=`products-grid grid-${this.currentView}`; }); });

    // Theme toggle functionality
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', (e) => {
        e.preventDefault();
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        const themeIcon = themeToggle.querySelector('.theme-icon');
        if (themeIcon) {
          themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
        }
      });
    }
  }

  clearAllFilters() {
    this.filters.search='';
    Object.keys(this.filters).forEach(k=>{ 
      if(this.filters[k] instanceof Set) this.filters[k].clear();
    });
    document.querySelectorAll('.filter-checkbox').forEach(cb=>cb.checked=false);
    const searchInput = document.getElementById('search-input');
    if(searchInput) searchInput.value='';
    if (this.categoryNavigator) { this.categoryNavigator.reset(); }
    this.applyFilters();
  }

  applyFilters() {
    let filtered = [...this.products];
    const s = this.filters;
    if (s.search) { const q=s.search; filtered = filtered.filter(p=> p.name.toLowerCase().includes(q)||p.brand.toLowerCase().includes(q)||p.collection.toLowerCase().includes(q)||p.color.toLowerCase().includes(q)||p.country.toLowerCase().includes(q)||(p.itemCategory&&p.itemCategory.toLowerCase().includes(q))); }
    if (s.categories && s.categories.size>0){ filtered = filtered.filter(p => (p.itemCategoryList||[]).some(x=> s.categories.has(x))); }
    if (s.countries && s.countries.size>0){ filtered = filtered.filter(p => s.countries.has(p.country)); }
    if (s.surfaces && s.surfaces.size>0){ filtered = filtered.filter(p => (p.itemSurfaceList||[]).some(x=> s.surfaces.has(x))); }
    if (s.uses && s.uses.size>0){ filtered = filtered.filter(p => (p.areasOfUseList||[]).some(x=> s.uses.has(x))); }
    if (s.structs && s.structs.size>0){ filtered = filtered.filter(p => (p.surfaceStructList||[]).some(x=> s.structs.has(x))); }
    if (s.brands && s.brands.size>0){ filtered = filtered.filter(p => s.brands.has(p.brand)); }
    if (s.colors && s.colors.size>0){ filtered = filtered.filter(p => s.colors.has(p.color)); }

    switch (this.currentSort) { 
      case 'price-asc': filtered.sort((a,b)=>a.price-b.price); break; 
      case 'price-desc': filtered.sort((a,b)=>b.price-a.price); break; 
      case 'name-asc': filtered.sort((a,b)=>a.name.localeCompare(b.name,'ru')); break; 
      case 'name-desc': filtered.sort((a,b)=>b.name.localeCompare(a.name,'ru')); break; 
    }

    this.filteredProducts = filtered; 
    const counter=document.getElementById('results-count'); 
    if(counter) counter.textContent = `Найдено товаров: ${this.filteredProducts.length}`; 
    this.renderProducts();
  }

  renderProducts() {
    const grid = document.getElementById('products-grid'); 
    const nr = document.getElementById('no-results'); 
    if (!grid || !nr) return; 
    
    if (!this.filteredProducts || this.filteredProducts.length === 0) { 
      grid.innerHTML = ''; 
      nr.classList.remove('hidden'); 
      return; 
    } 
    
    nr.classList.add('hidden'); 
    grid.innerHTML = ''; 
    this.renderIndex = 0; 
    
    const renderChunk = () => { 
      const slice = this.filteredProducts.slice(this.renderIndex, this.renderIndex + this.batchSize); 
      const html = slice.map((p, idx) => { 
        const badge = p.inStock ? '<span class="status-badge status-in-stock">В НАЛИЧИИ</span>' : '<span class="status-badge status-on-demand">ПОД ЗАКАЗ</span>'; 
        const validatedImageUrl = validateImageUrl(p.image);
        const img = validatedImageUrl ? `<img src="${escapeHtmlAttr(validatedImageUrl)}" alt="${escapeHtmlAttr(p.name || '')}" loading="lazy" data-img-error>` : ''; 
        const ph = `<div class="product-placeholder" ${validatedImageUrl ? 'style="display:none"' : ''}>🏠</div>`; 
        const animationDelay = (this.renderIndex + idx) % 12 * 0.1;
        const escapedId = escapeHtmlAttr(p.id);
        const escapedName = escapeHtml(p.name || '');
        const escapedBrand = escapeHtml(p.brand || '');
        const escapedColor = escapeHtml(p.color || '');
        const escapedSize = p.size ? escapeHtml(p.size) : '';
        
        return `<article class="product-card" data-product-id="${escapedId}" style="animation-delay: ${animationDelay}s;">
          <div class="product-image">${img}${ph}</div>
          <div class="product-info">
            <h3 class="product-name">${escapedName}</h3>
            <p class="product-brand">${escapedBrand}</p>
            <p class="product-color">${escapedColor}</p>
            ${escapedSize ? `<span class="product-card__size">${escapedSize}</span>` : ''}
            <div class="product-price">${p.price.toLocaleString('ru-RU')} ₽</div>
            <div class="product-status">${badge}</div>
            <div class="product-actions">
              <button class="btn btn-primary add-to-cart" data-id="${escapedId}">
                <svg class="icon"><use href="#cart-icon"></use></svg>
                <span class="cart-text">В корзину</span>
                <span class="cart-counter hidden">0</span>
              </button>
            </div>
          </div>
        </article>`; 
      }).join(''); 
      
      grid.insertAdjacentHTML('beforeend', html); 
      this.renderIndex += slice.length;
      
      // Attach error handlers to images after insertion
      const images = grid.querySelectorAll('img[data-img-error]');
      images.forEach(img => {
        img.removeAttribute('data-img-error');
        img.addEventListener('error', function() {
          this.style.display = 'none';
          const placeholder = this.nextElementSibling;
          if (placeholder && placeholder.classList.contains('product-placeholder')) {
            placeholder.style.display = 'flex';
          }
        });
      });
      
      if (this.renderIndex < this.filteredProducts.length) { 
        requestAnimationFrame(renderChunk); 
      } else { 
        this.attachCardClicks(); 
        this.ensureLoadMore();
        // Update cart UI after rendering products
        if (window.updateCartUI) {
          window.updateCartUI();
        }
        document.dispatchEvent(new CustomEvent('products:rendered'));
      } 
    }; 
    
    requestAnimationFrame(renderChunk); 
  }

  ensureLoadMore() { 
    let btn = document.getElementById('load-more-btn'); 
    if (!btn) { 
      const container = document.createElement('div'); 
      container.className = 'load-more-container'; 
      btn = document.createElement('button');
      btn.id = 'load-more-btn';
      btn.className = 'load-more-btn';
      btn.textContent = 'Показать ещё';
      container.appendChild(btn);
      const productsArea = document.querySelector('.products-area'); 
      if (productsArea) productsArea.appendChild(container); 
    } 
    if (btn) { 
      btn.style.display = this.renderIndex >= this.filteredProducts.length ? 'none' : 'block'; 
      btn.onclick = () => { this.batchSize += 60; this.renderProducts(); }; 
    } 
  }

  attachCardClicks() { 
    const grid = document.getElementById('products-grid'); 
    if (!grid) return; 
    const cards = grid.querySelectorAll('.product-card'); 
    if (cards) cards.forEach(card => { 
      card.addEventListener('click', (e) => { 
        if(e.target.closest('.add-to-cart') || e.target.closest('.product-qty')) return; // не открывать модалку при клике по кнопкам
        const id = card.dataset.productId; 
        const p = this.filteredProducts.find(x => x.id === id); 
        if (p) this.openModal(p); 
      }); 
    }); 
  }

  openModal(product) { 
    const modal = document.getElementById('product-modal'); 
    if (!modal) return; 
    const modalTitle = document.getElementById('modal-title'); 
    const modalBrand = document.getElementById('modal-brand'); 
    const modalColor = document.getElementById('modal-color'); 
    const modalPrice = document.getElementById('modal-price'); 
    const modalDesc = document.getElementById('modal-desc'); 
    const modalStatus = document.getElementById('modal-status'); 
    if (modalTitle) modalTitle.textContent = product.name || ''; 
    if (modalBrand) modalBrand.textContent = product.brand || ''; 
    if (modalColor) modalColor.textContent = product.color || ''; 
    if (modalPrice) modalPrice.textContent = `${product.price.toLocaleString('ru-RU')} ₽`; 
    if (modalDesc) modalDesc.textContent = product.description || 'Описание отсутствует'; 
    if (modalStatus) modalStatus.textContent = product.inStock ? 'В наличии' : 'Под заказ'; 
    const img = document.getElementById('modal-image'); 
    const ph = document.getElementById('modal-image-ph'); 
    const validatedImageUrl = validateImageUrl(product.image);
    if (validatedImageUrl) { 
      if (img) { 
        img.src = validatedImageUrl; 
        img.alt = escapeHtmlAttr(product.name || ''); 
        img.style.display = 'block'; 
      } 
      if (ph) ph.style.display = 'none'; 
    } else { 
      if (img) img.style.display = 'none'; 
      if (ph) ph.style.display = 'flex'; 
    } 
    const modalAdd = document.getElementById('modal-add-to-cart');
    if(modalAdd){ modalAdd.dataset.id = escapeHtmlAttr(product.id || ''); }
    modal.setAttribute('aria-hidden', 'false'); 
    modal.classList.add('open'); 
    document.body.classList.add('modal-open'); 
    const closeBtn = modal.querySelector('.modal__close'); if (closeBtn) closeBtn.focus(); 
    const closeModal = () => { modal.setAttribute('aria-hidden', 'true'); modal.classList.remove('open'); document.body.classList.remove('modal-open'); }; 
    const modalCloseBtn = modal.querySelector('.modal__close'); 
    const modalBackdrop = modal.querySelector('.modal__backdrop'); 
    if (modalCloseBtn) modalCloseBtn.onclick = closeModal; 
    if (modalBackdrop) modalBackdrop.onclick = closeModal; 
    const handleEsc = (e) => { if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', handleEsc); } }; 
    document.addEventListener('keydown', handleEsc);
    
    // Update modal cart button state
    if (window.updateCartUI) {
      window.updateCartUI();
    }
  }
}

// Theme initialization
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

// Set initial theme icon
document.addEventListener('DOMContentLoaded', () => {
  const themeIcon = document.querySelector('#theme-toggle .theme-icon');
  if (themeIcon) {
    themeIcon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
  }
});

let catalog = null;
if (document.readyState === 'loading') { 
  document.addEventListener('DOMContentLoaded', () => { 
    catalog = new TileCatalog(); 
    catalog.init(); 
  }); 
} else { 
  catalog = new TileCatalog(); 
  catalog.init(); 
}

window.catalog = catalog;
window.TileCatalog = TileCatalog;
export default TileCatalog;