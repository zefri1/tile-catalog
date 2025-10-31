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

// Enhanced normalizer for multi-value fields
function normArray(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/[;,|]/)
    .map(x => x.replace(/[-–—]/g, '').trim())
    .filter(x => x && x.length > 0 && x.toLowerCase() !== 'нет' && x !== '0' && x !== '-');
}

function s(v) { return v ? String(v).trim() : '' }
function n(v) { const x = parseFloat(String(v).replace(/[^0-9.,]/g, '').replace(',', '.')); return isNaN(x) ? 0 : Math.round(x) }
function b(v) { if (typeof v === 'boolean') return v; const l = String(v || '').toLowerCase().trim(); return l === 'true' || l === '1' || l === 'да' || l === 'yes' }
function cs(v) { if (!v) return ''; return String(v).replace(/[\\'>\"]/g, '').replace(/\s+/g, ' ').trim() }

function parseCSVData(csvContent) {
  const rows = parseCSV(csvContent);
  if (!rows || rows.length < 2) return [];
  
  const headers = rows[0].map(h => String(h || '').toLowerCase().trim());
  console.log('CSV Headers:', headers);
  
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
  
  console.log('Column mapping:', col);
  
  const data = rows.slice(1).filter(r => r && r.length > 0);
  return data.map((r, index) => {
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
    
    // Debug first few products
    if (index < 3) {
      console.log(`Product ${index}:`, {
        itemCategory: product.itemCategory,
        itemCategoryList: product.itemCategoryList
      });
    }
    
    return product;
  });
}

class CategoryTree {
  constructor() {
    this.root = new Map();
    this.productsByCategory = new Map();
  }
  
  addProduct(product, categoryList) {
    if (!categoryList || !Array.isArray(categoryList)) return;
    
    categoryList.forEach(category => {
      const trimmed = category.trim();
      if (!trimmed) return;
      
      if (!this.root.has(trimmed)) {
        this.root.set(trimmed, {
          name: trimmed,
          count: 0,
          products: new Set()
        });
      }
      
      const node = this.root.get(trimmed);
      node.products.add(product.id);
      node.count = node.products.size;
    });
  }
  
  getCategories() {
    return Array.from(this.root.values())
      .sort((a, b) => b.count - a.count); // Sort by product count desc
  }
  
  getProductsForCategory(categoryName) {
    const node = this.root.get(categoryName);
    return node ? Array.from(node.products) : [];
  }
}

class TileCatalog {
  constructor() {
    this.products = []; this.filteredProducts = []; this.currentSort = 'price-asc'; this.currentView = 2;
    this.filters = { search: '', brands: new Set(), colors: new Set(), countries: new Set(), surfaces: new Set(), uses: new Set(), structs: new Set(), priceMin: 0, priceMax: 1250 };
    this.categoryTree = new CategoryTree();
    this.categoryState = { selectedCategories: new Set(), showLimit: 10 };
    this.isInitialized = false; this.batchSize = 40; this.renderIndex = 0;
  }

  showLoadingScreen() {
    const screen = document.getElementById('loading-screen');
    if (screen) screen.style.display = 'flex';
  }

  hideLoadingScreen() {
    const screen = document.getElementById('loading-screen');
    if (screen) screen.style.display = 'none';
  }

  showErrorOverlay(message) {
    console.error('Error:', message);
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--color-surface-elevated);padding:2rem;border:2px solid var(--color-error);border-radius:var(--border-radius);z-index:9999;box-shadow:var(--shadow-xl);text-align:center;';
    errorDiv.innerHTML = `<div class="error-icon">⚠️</div><h3>Ошибка загрузки</h3><p>${message}</p><button onclick="this.parentElement.remove();location.reload()" class="btn btn-primary">Перезагрузить</button>`;
    document.body.appendChild(errorDiv);
  }

  async init() {
    this.showLoadingScreen();
    try {
      await this.loadProducts();
      console.log('Loaded products:', this.products.length);
      this.buildCategoryTree();
      this.initializeFilters();
      this.bindEvents();
      this.applyFilters();
    } catch (err) {
      console.error('init error', err);
      this.showErrorOverlay(err.message || 'Ошибка');
    } finally {
      this.hideLoadingScreen();
      this.isInitialized = true;
    }
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
        if (this.products.length > 0) {
          console.log('Using API data');
          return;
        }
      }
      throw new Error('Empty API');
    } catch (e) {
      console.warn('API failed, using CSV', e.message);
    }
    
    console.log('Loading CSV from:', FALLBACK_CSV);
    const response = await fetch(`${FALLBACK_CSV}&t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('CSV load failed');
    const csv = await response.text();
    console.log('CSV length:', csv.length);
    const parsed = parseCSVData(csv);
    console.log('Parsed products:', parsed.length);
    this.products = parsed.filter(p => p.price > 0 && !p.hidden);
    console.log('Final products after filtering:', this.products.length);
  }

  buildCategoryTree() {
    if (!this.products || !Array.isArray(this.products)) {
      console.warn('Products is not an array:', this.products);
      return;
    }
    
    this.products.forEach(product => {
      if (product && product.itemCategoryList) {
        this.categoryTree.addProduct(product, product.itemCategoryList);
      }
    });
    console.log('Category tree built, categories:', this.categoryTree.getCategories().length);
  }

  initializeFilters() {
    if (!this.products || !Array.isArray(this.products)) {
      console.warn('Cannot initialize filters: products is not an array');
      return;
    }
    
    const brands = [...new Set(this.products.map(p => p.brand))].filter(Boolean).sort();
    const colors = [...new Set(this.products.map(p => p.color))].filter(Boolean).sort();
    const countries = [...new Set(this.products.map(p => p.country))].filter(Boolean).sort();
    
    const allSurfs = [].concat(...this.products.map(p => (p.itemSurfaceList || [])));
    const surfaces = [...new Set(allSurfs)].filter(Boolean).sort();
    
    const allUses = [].concat(...this.products.map(p => (p.areasOfUseList || [])));
    const uses = [...new Set(allUses)].filter(Boolean).sort();
    
    const allStructs = [].concat(...this.products.map(p => (p.surfaceStructList || [])));
    const structs = [...new Set(allStructs)].filter(Boolean).sort();
    
    console.log('Filter data:', { brands: brands.length, colors: colors.length, countries: countries.length, surfaces: surfaces.length, uses: uses.length, structs: structs.length });
    
    this.createFiltersUI(brands, colors, countries, surfaces, uses, structs);
    
    const prices = this.products.map(p => p.price).filter(p => p > 0);
    this.filters.priceMin = prices.length > 0 ? Math.min(...prices) : 0;
    this.filters.priceMax = prices.length > 0 ? Math.max(...prices) : 1250;
  }

  createCategoryFilter() {
    const categories = this.categoryTree.getCategories() || [];
    const visibleCategories = categories.slice(0, this.categoryState.showLimit);
    const hiddenCount = Math.max(0, categories.length - this.categoryState.showLimit);
    
    return `
      <div class="filter-group">
        <div class="category-filter">
          <div class="category-header">
            <span class="category-title">КАТЕГОРИЯ</span>
            <button class="category-clear" onclick="catalog.clearCategoryFilter()">Сбросить</button>
          </div>
          
          ${this.categoryState.selectedCategories.size > 0 ? `
            <div class="breadcrumb-nav">
              <ul class="breadcrumbs">
                <li class="breadcrumb-item">
                  <button class="breadcrumb-link" onclick="catalog.clearCategoryFilter()">Все категории</button>
                </li>
                ${Array.from(this.categoryState.selectedCategories).map(cat => `
                  <li class="breadcrumb-item">
                    <span class="breadcrumb-separator">›</span>
                    <span class="breadcrumb-current">${cat}</span>
                  </li>
                `).join('')}
              </ul>
            </div>
          ` : ''}
          
          <div class="category-list">
            ${visibleCategories.map(cat => {
              const isSelected = this.categoryState.selectedCategories.has(cat.name);
              return `
                <div class="category-item">
                  <input type="checkbox" class="category-checkbox" 
                    value="${cat.name}" ${isSelected ? 'checked' : ''}>
                  <span class="category-name">${cat.name}</span>
                  <span class="category-count">${cat.count}</span>
                </div>
              `;
            }).join('')}
            
            ${hiddenCount > 0 ? `
              <button class="show-more-btn" onclick="catalog.showMoreCategories()">
                Ещё ${hiddenCount} категорий
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  createFiltersUI(brands, colors, countries, surfaces, uses, structs) {
    const sidebar = document.getElementById('filters-sidebar');
    if (!sidebar) return;
    
    const createFilterGroup = (title, items, id) => {
      if (!items || !Array.isArray(items) || items.length === 0) return '';
      return `
        <div class="filter-group">
          <label class="filter-label">${title}:</label>
          <div class="checkbox-group scrollable" id="${id}">
            ${items.map(val => `
              <div class="checkbox-item">
                <input type="checkbox" value="${val}" class="filter-checkbox">
                <span class="checkbox-text">${val}</span>
              </div>
            `).join('')}
            ${items.length > 8 ? '<div class="more-filters-hint">Прокрутите для просмотра всех</div>' : ''}
          </div>
        </div>
      `;
    };
    
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
          ${this.createCategoryFilter()}
          ${createFilterGroup('СТРАНА', countries, 'country-filters')}
          ${createFilterGroup('ТИП ПОВЕРХНОСТИ', surfaces, 'surface-filters')}
          ${createFilterGroup('ОБЛАСТЬ ПРИМЕНЕНИЯ', uses, 'use-filters')}
          ${createFilterGroup('СТРУКТУРА ПОВЕРХНОСТИ', structs, 'struct-filters')}
          ${createFilterGroup('БРЕНД', brands, 'brand-filters')}
          ${createFilterGroup('ЦВЕТ', colors, 'color-filters')}
        </div>
      </div>
    `;
  }

  clearCategoryFilter() {
    this.categoryState.selectedCategories.clear();
    this.categoryState.showLimit = 10;
    this.applyFilters();
    this.refreshCategoryFilter();
  }
  
  showMoreCategories() {
    this.categoryState.showLimit += 10;
    this.refreshCategoryFilter();
  }
  
  refreshCategoryFilter() {
    const categoryFilterContainer = document.querySelector('.category-filter');
    if (!categoryFilterContainer) return;
    
    const filterGroup = categoryFilterContainer.parentElement;
    const newCategoryHTML = this.createCategoryFilter();
    filterGroup.innerHTML = newCategoryHTML;
    this.bindCategoryEvents();
  }

  bindCategoryEvents() {
    // Category checkboxes
    const categoryCheckboxes = document.querySelectorAll('.category-checkbox');
    if (categoryCheckboxes) {
      categoryCheckboxes.forEach(cb => {
        cb.addEventListener('change', (e) => {
          const categoryName = e.target.value;
          if (e.target.checked) {
            this.categoryState.selectedCategories.add(categoryName);
          } else {
            this.categoryState.selectedCategories.delete(categoryName);
          }
          this.applyFilters();
          this.refreshCategoryFilter();
        });
      });
    }
  }

  bindEvents() {
    // Search
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.addEventListener('input', (e) => {
      this.filters.search = e.target.value.toLowerCase();
      this.applyFilters();
    });
    
    // Category events
    this.bindCategoryEvents();
    
    // Other filter events
    const filterMappings = [
      ['#brand-filters', 'brands'],
      ['#color-filters', 'colors'],
      ['#country-filters', 'countries'],
      ['#surface-filters', 'surfaces'],
      ['#use-filters', 'uses'],
      ['#struct-filters', 'structs']
    ];
    
    filterMappings.forEach(([selector, filterKey]) => {
      const container = document.querySelector(selector);
      if (container) {
        container.addEventListener('change', (e) => {
          if (e.target.classList.contains('filter-checkbox')) {
            if (e.target.checked) {
              this.filters[filterKey].add(e.target.value);
            } else {
              this.filters[filterKey].delete(e.target.value);
            }
            this.applyFilters();
          }
        });
      }
    });
    
    // Clear filters
    const clearBtn = document.getElementById('clear-filters');
    if (clearBtn) clearBtn.addEventListener('click', () => {
      this.filters.search = '';
      Object.keys(this.filters).forEach(k => {
        if (this.filters[k] instanceof Set) this.filters[k].clear();
      });
      this.categoryState.selectedCategories.clear();
      this.categoryState.showLimit = 10;
      const checkboxes = document.querySelectorAll('.filter-checkbox, .category-checkbox');
      if (checkboxes) checkboxes.forEach(cb => cb.checked = false);
      if (searchInput) searchInput.value = '';
      this.applyFilters();
      this.refreshCategoryFilter();
    });
    
    // Sort
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) sortSelect.addEventListener('change', (e) => {
      this.currentSort = e.target.value;
      this.applyFilters();
    });
    
    // View buttons
    const viewBtns = document.querySelectorAll('.view-btn');
    if (viewBtns) {
      viewBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          document.querySelectorAll('.view-btn').forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-pressed', 'false');
          });
          e.target.classList.add('active');
          e.target.setAttribute('aria-pressed', 'true');
          this.currentView = parseInt(e.target.dataset.columns);
          const grid = document.getElementById('products-grid');
          if (grid) {
            grid.className = `products-grid grid-${this.currentView}`;
          }
        });
      });
    }
    
    // Theme toggle
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) themeBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      themeBtn.querySelector('.theme-icon').textContent = newTheme === 'dark' ? '☀️' : '🌙';
    });
  }

  applyFilters() {
    if (!this.products || !Array.isArray(this.products)) {
      console.warn('Cannot apply filters: products is not an array');
      this.filteredProducts = [];
      this.updateResultsCount();
      this.renderProducts();
      return;
    }
    
    let filtered = [...this.products];
    const s = this.filters;
    
    // Search (по нескольким полям)
    if (s.search) {
      const search = s.search;
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(search) ||
        p.brand.toLowerCase().includes(search) ||
        p.collection.toLowerCase().includes(search) ||
        p.color.toLowerCase().includes(search) ||
        p.country.toLowerCase().includes(search) ||
        (p.itemCategory && p.itemCategory.toLowerCase().includes(search))
      );
    }
    
    // Category filter - если выбраны категории
    if (this.categoryState.selectedCategories.size > 0) {
      filtered = filtered.filter(p => {
        return (p.itemCategoryList || []).some(cat => 
          this.categoryState.selectedCategories.has(cat)
        );
      });
    }
    
    // Страна
    if (s.countries.size > 0) filtered = filtered.filter(p => s.countries.has(p.country));
    // Тип поверхности
    if (s.surfaces.size > 0) filtered = filtered.filter(p => (p.itemSurfaceList || []).some(x => s.surfaces.has(x)));
    // Область применения
    if (s.uses.size > 0) filtered = filtered.filter(p => (p.areasOfUseList || []).some(x => s.uses.has(x)));
    // Структура поверхности
    if (s.structs.size > 0) filtered = filtered.filter(p => (p.surfaceStructList || []).some(x => s.structs.has(x)));
    // Brand
    if (s.brands.size > 0) filtered = filtered.filter(p => s.brands.has(p.brand));
    // Цвет
    if (s.colors.size > 0) filtered = filtered.filter(p => s.colors.has(p.color));
    
    // Сортировка
    this.sortProducts(filtered);
    this.filteredProducts = filtered;
    this.updateResultsCount();
    this.renderProducts();
  }

  sortProducts(products) {
    if (!products || !Array.isArray(products)) return;
    
    switch (this.currentSort) {
      case 'price-asc': products.sort((a, b) => a.price - b.price); break;
      case 'price-desc': products.sort((a, b) => b.price - a.price); break;
      case 'name-asc': products.sort((a, b) => a.name.localeCompare(b.name, 'ru')); break;
      case 'name-desc': products.sort((a, b) => b.name.localeCompare(a.name, 'ru')); break;
    }
  }

  updateResultsCount() {
    const counter = document.getElementById('results-count');
    if (counter) counter.textContent = `Найдено товаров: ${this.filteredProducts.length}`;
  }

  renderProducts() {
    const grid = document.getElementById('products-grid'); const nr = document.getElementById('no-results');
    if (!grid || !nr) return;
    if (!this.filteredProducts || this.filteredProducts.length === 0) { grid.innerHTML = ''; nr.classList.remove('hidden'); return; }
    nr.classList.add('hidden');
    grid.innerHTML = ''; this.renderIndex = 0;
    const renderChunk = () => {
      const slice = this.filteredProducts.slice(this.renderIndex, this.renderIndex + this.batchSize);
      const html = slice.map((p, idx) => {
        const badge = p.inStock ? '<span class="status-badge status-in-stock">В НАЛИЧИИ</span>' : '<span class="status-badge status-on-demand">ПОД ЗАКАЗ</span>';
        const img = p.image ? `<img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">` : '';
        const ph = `<div class="product-placeholder" ${p.image ? 'style="display:none"' : ''}>🏠</div>`;
        const animationDelay = (this.renderIndex + idx) % 12 * 0.1;
        return `<article class="product-card" data-product-id="${p.id}" style="animation-delay: ${animationDelay}s;">
          <div class="product-image">${img}${ph}</div>
          <div class="product-info">
            <h3 class="product-name">${p.name}</h3>
            <p class="product-brand">${p.brand}</p>
            <p class="product-color">${p.color}</p>
            ${p.size ? `<span class="product-card__size">${p.size}</span>` : ''}
            <div class="product-price">${p.price.toLocaleString('ru-RU')} ₽</div>
            <div class="product-status">${badge}</div>
          </div>
        </article>`;
      }).join('');
      grid.insertAdjacentHTML('beforeend', html);
      this.renderIndex += slice.length;
      if (this.renderIndex < this.filteredProducts.length) {
        requestAnimationFrame(renderChunk);
      } else {
        this.attachCardClicks();
        this.ensureLoadMore();
      }
    };
    requestAnimationFrame(renderChunk);
  }

  ensureLoadMore() {
    let btn = document.getElementById('load-more-btn');
    if (!btn) {
      const container = document.createElement('div');
      container.className = 'load-more-container';
      container.innerHTML = `<button id="load-more-btn" class="load-more-btn">Показать ещё</button>`;
      const productsArea = document.querySelector('.products-area');
      if (productsArea) productsArea.appendChild(container);
      btn = container.querySelector('#load-more-btn');
    }
    if (btn) {
      btn.style.display = this.renderIndex >= this.filteredProducts.length ? 'none' : 'block';
      btn.onclick = () => {
        this.batchSize += 60;
        this.renderProducts();
      };
    }
  }

  attachCardClicks() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;
    const cards = grid.querySelectorAll('.product-card');
    if (cards) {
      cards.forEach(card => {
        card.addEventListener('click', () => {
          const id = card.dataset.productId;
          const p = this.filteredProducts.find(x => x.id === id);
          if (p) this.openModal(p);
        });
      });
    }
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
    
    if (modalTitle) modalTitle.textContent = product.name;
    if (modalBrand) modalBrand.textContent = product.brand;
    if (modalColor) modalColor.textContent = product.color;
    if (modalPrice) modalPrice.textContent = `${product.price.toLocaleString('ru-RU')} ₽`;
    if (modalDesc) modalDesc.textContent = product.description || 'Описание отсутствует';
    if (modalStatus) modalStatus.textContent = product.inStock ? 'В наличии' : 'Под заказ';
    
    const img = document.getElementById('modal-image');
    const ph = document.getElementById('modal-image-ph');
    if (product.image) {
      if (img) {
        img.src = product.image;
        img.style.display = 'block';
      }
      if (ph) ph.style.display = 'none';
    } else {
      if (img) img.style.display = 'none';
      if (ph) ph.style.display = 'flex';
    }
    
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('open');
    document.body.classList.add('modal-open');
    
    const closeBtn = modal.querySelector('.modal__close');
    if (closeBtn) closeBtn.focus();
    
    const closeModal = () => {
      modal.setAttribute('aria-hidden', 'true');
      modal.classList.remove('open');
      document.body.classList.remove('modal-open');
    };
    
    const modalCloseBtn = modal.querySelector('.modal__close');
    const modalCloseBtnBottom = modal.querySelector('#modal-close-btn');
    const modalBackdrop = modal.querySelector('.modal__backdrop');
    
    if (modalCloseBtn) modalCloseBtn.onclick = closeModal;
    if (modalCloseBtnBottom) modalCloseBtnBottom.onclick = closeModal;
    if (modalBackdrop) modalBackdrop.onclick = closeModal;
    
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);
  }
}

// Initialize theme from localStorage
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
const themeIcon = document.querySelector('#theme-toggle .theme-icon');
if (themeIcon) themeIcon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

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
window.TileCatalog = catalog;
export default TileCatalog;