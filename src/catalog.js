// Pure CSV parser functions
function cleanString(value) {
  if (!value) return '';
  return String(value).replace(/['"<>]/g, '').replace(/\s+/g, ' ').trim();
}

function parseNumber(value) {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return lower === 'true' || lower === '1' || lower === 'да' || lower === 'yes';
  }
  return Boolean(value);
}

function parseCSVData(csvContent) {
  try {
    const workbook = XLSX.read(csvContent, { type: 'string' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (rows.length < 2) return [];
    
    return rows.slice(1)
      .filter(row => row && row.length > 0)
      .map(row => ({
        id: 'product-' + Math.random().toString(36).slice(2, 11),
        name: cleanString(row[0]) || 'Без названия',
        brand: cleanString(row[1]) || 'Неизвестно',
        color: cleanString(row[2]) || 'Не указан',
        price: parseNumber(row[3]) || 0,
        description: cleanString(row[4]) || '',
        image: String(row[5] || '').trim(),
        phone: String(row[6] || '').trim(),
        inStock: parseBoolean(row[7]),
        onDemand: parseBoolean(row[8]),
        hidden: parseBoolean(row[9])
      }));
  } catch (error) {
    console.error('Ошибка парсинга CSV:', error);
    return [];
  }
}

// Main catalog class
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
      priceMin: 0,
      priceMax: 1250
    };
    
    this.isLoading = false;
    this.isInitialized = false;
  }

  async init() {
    try {
      this.showLoadingScreen();
      await this.loadProducts();
      this.initializeFilters();
      this.bindEvents();
      this.applyFilters();
      this.hideLoadingScreen();
      this.isInitialized = true;
    } catch (error) {
      console.error('Ошибка инициализации каталога:', error);
      this.showErrorOverlay(error.message);
    }
  }

  async loadProducts() {
    const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1nq9CmI5e9TGjfGFzJGjhJDFgRjpLjLgKLg3h_KbdJkM/export?format=csv&gid=0';
    
    try {
      const response = await fetch(SHEET_URL);
      if (!response.ok) {
        throw new Error(`Ошибка загрузки данных: ${response.status}`);
      }
      
      const csvContent = await response.text();
      this.products = parseCSVData(csvContent);
      
      if (this.products.length === 0) {
        throw new Error('Не удалось загрузить товары из таблицы');
      }
      
      console.log(`Загружено товаров: ${this.products.length}`);
    } catch (error) {
      console.error('Ошибка загрузки продуктов:', error);
      throw error;
    }
  }

  initializeFilters() {
    // Extract unique brands and colors
    const brands = new Set();
    const colors = new Set();
    let maxPrice = 0;

    this.products.forEach(product => {
      if (!product.hidden && (product.inStock || product.onDemand)) {
        brands.add(product.brand);
        colors.add(product.color);
        if (product.price > maxPrice) {
          maxPrice = product.price;
        }
      }
    });

    // Set max price
    this.filters.priceMax = Math.ceil(maxPrice) || 1250;
    
    // Update price slider
    const priceSlider = document.getElementById('price-range');
    const priceMaxInput = document.getElementById('price-max');
    if (priceSlider && priceMaxInput) {
      priceSlider.max = this.filters.priceMax;
      priceSlider.value = this.filters.priceMax;
      priceMaxInput.value = this.filters.priceMax;
    }

    // Populate brand filters
    this.populateCheckboxFilter('brand-filters', Array.from(brands).sort());
    
    // Populate color filters
    this.populateCheckboxFilter('color-filters', Array.from(colors).sort());
  }

  populateCheckboxFilter(containerId, items) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    items.forEach(item => {
      const wrapper = document.createElement('div');
      wrapper.className = 'checkbox-item';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `${containerId}-${item.toLowerCase().replace(/\s+/g, '-')}`;
      checkbox.value = item;
      
      const label = document.createElement('label');
      label.htmlFor = checkbox.id;
      label.textContent = item;
      
      wrapper.appendChild(checkbox);
      wrapper.appendChild(label);
      container.appendChild(wrapper);
    });
  }

  bindEvents() {
    // Search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filters.search = e.target.value.toLowerCase();
        this.applyFilters();
      });
    }

    // Brand filters
    const brandContainer = document.getElementById('brand-filters');
    if (brandContainer) {
      brandContainer.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
          if (e.target.checked) {
            this.filters.brands.add(e.target.value);
          } else {
            this.filters.brands.delete(e.target.value);
          }
          this.applyFilters();
        }
      });
    }

    // Color filters
    const colorContainer = document.getElementById('color-filters');
    if (colorContainer) {
      colorContainer.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
          if (e.target.checked) {
            this.filters.colors.add(e.target.value);
          } else {
            this.filters.colors.delete(e.target.value);
          }
          this.applyFilters();
        }
      });
    }

    // Price filters
    const priceMin = document.getElementById('price-min');
    const priceMax = document.getElementById('price-max');
    const priceRange = document.getElementById('price-range');
    
    if (priceMin) {
      priceMin.addEventListener('input', (e) => {
        this.filters.priceMin = parseFloat(e.target.value) || 0;
        this.applyFilters();
      });
    }
    
    if (priceMax) {
      priceMax.addEventListener('input', (e) => {
        this.filters.priceMax = parseFloat(e.target.value) || this.filters.priceMax;
        if (priceRange) priceRange.value = this.filters.priceMax;
        this.applyFilters();
      });
    }
    
    if (priceRange) {
      priceRange.addEventListener('input', (e) => {
        this.filters.priceMax = parseFloat(e.target.value);
        if (priceMax) priceMax.value = this.filters.priceMax;
        this.applyFilters();
      });
    }

    // Clear filters
    const clearBtn = document.getElementById('clear-filters');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearAllFilters();
      });
    }

    // Sort control
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.currentSort = e.target.value;
        this.applyFilters();
      });
    }

    // View controls
    const viewButtons = document.querySelectorAll('.view-btn');
    viewButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const columns = parseInt(e.target.closest('.view-btn').dataset.columns);
        this.setGridView(columns);
      });
    });

    // Product modal
    this.bindModalEvents();
  }

  bindModalEvents() {
    const modal = document.getElementById('product-modal');
    const closeBtn = document.querySelector('.modal__close');
    const closeFooterBtn = document.getElementById('modal-close-btn');
    const backdrop = document.querySelector('.modal__backdrop');

    [closeBtn, closeFooterBtn, backdrop].forEach(element => {
      if (element) {
        element.addEventListener('click', () => this.closeModal());
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal && !modal.hasAttribute('aria-hidden')) {
        this.closeModal();
      }
    });
  }

  applyFilters() {
    // Filter products
    this.filteredProducts = this.products.filter(product => {
      // Skip hidden products or products not in stock/on demand
      if (product.hidden || (!product.inStock && !product.onDemand)) {
        return false;
      }

      // Search filter
      if (this.filters.search) {
        const searchLower = this.filters.search.toLowerCase();
        const searchableText = [
          product.name,
          product.brand,
          product.color,
          product.description
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(searchLower)) {
          return false;
        }
      }

      // Brand filter
      if (this.filters.brands.size > 0 && !this.filters.brands.has(product.brand)) {
        return false;
      }

      // Color filter
      if (this.filters.colors.size > 0 && !this.filters.colors.has(product.color)) {
        return false;
      }

      // Price filter
      if (product.price < this.filters.priceMin || product.price > this.filters.priceMax) {
        return false;
      }

      return true;
    });

    // Sort products
    this.sortProducts();
    
    // Render products
    this.renderProducts();
    
    // Update results count
    this.updateResultsCount();
  }

  sortProducts() {
    this.filteredProducts.sort((a, b) => {
      switch (this.currentSort) {
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'name-asc':
          return a.name.localeCompare(b.name, 'ru');
        case 'name-desc':
          return b.name.localeCompare(a.name, 'ru');
        default:
          return 0;
      }
    });
  }

  renderProducts() {
    const grid = document.getElementById('products-grid');
    const noResults = document.getElementById('no-results');
    
    if (!grid || !noResults) return;

    if (this.filteredProducts.length === 0) {
      grid.innerHTML = '';
      noResults.classList.remove('hidden');
      return;
    }

    noResults.classList.add('hidden');
    
    grid.innerHTML = this.filteredProducts.map(product => {
      const statusBadge = product.inStock ? 
        '<span class="status-badge status-in-stock">В наличии</span>' :
        '<span class="status-badge status-on-demand">Под заказ</span>';
      
      const imageHtml = product.image ? 
        `<img src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">` :
        '';
      
      const placeholderHtml = `<div class="product-placeholder" ${product.image ? 'style="display:none"' : ''}>🏠</div>`;
      
      return `
        <article class="product-card" data-product-id="${product.id}">
          <div class="product-image">
            ${imageHtml}
            ${placeholderHtml}
          </div>
          <div class="product-info">
            <h3 class="product-name">${product.name}</h3>
            <p class="product-brand">${product.brand}</p>
            <p class="product-color">${product.color}</p>
            <div class="product-price">${product.price} ₽</div>
            <div class="product-status">${statusBadge}</div>
          </div>
        </article>
      `;
    }).join('');

    // Bind click events for product cards
    grid.querySelectorAll('.product-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const productId = card.dataset.productId;
        const product = this.products.find(p => p.id === productId);
        if (product) {
          this.openModal(product);
        }
      });
    });
  }

  updateResultsCount() {
    const resultsCount = document.getElementById('results-count');
    if (resultsCount) {
      resultsCount.textContent = `Найдено товаров: ${this.filteredProducts.length}`;
    }
  }

  openModal(product) {
    const modal = document.getElementById('product-modal');
    if (!modal) return;

    // Update modal content
    const elements = {
      title: document.getElementById('modal-title'),
      image: document.getElementById('modal-image'),
      imagePh: document.getElementById('modal-image-ph'),
      price: document.getElementById('modal-price'),
      brand: document.getElementById('modal-brand'),
      color: document.getElementById('modal-color'),
      status: document.getElementById('modal-status'),
      desc: document.getElementById('modal-desc'),
      badges: document.getElementById('modal-badges')
    };

    if (elements.title) elements.title.textContent = product.name;
    if (elements.price) elements.price.textContent = `${product.price} ₽`;
    if (elements.brand) elements.brand.textContent = product.brand;
    if (elements.color) elements.color.textContent = product.color;
    if (elements.desc) elements.desc.textContent = product.description || 'Описание отсутствует';
    
    if (elements.status) {
      elements.status.textContent = product.inStock ? 'В наличии' : 'Под заказ';
    }

    // Handle image
    if (elements.image && elements.imagePh) {
      if (product.image) {
        elements.image.src = product.image;
        elements.image.alt = product.name;
        elements.image.style.display = 'block';
        elements.imagePh.style.display = 'none';
        
        elements.image.onerror = () => {
          elements.image.style.display = 'none';
          elements.imagePh.style.display = 'flex';
        };
      } else {
        elements.image.style.display = 'none';
        elements.imagePh.style.display = 'flex';
      }
    }

    // Show modal
    modal.removeAttribute('aria-hidden');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
    const modal = document.getElementById('product-modal');
    if (modal) {
      modal.setAttribute('aria-hidden', 'true');
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  setGridView(columns) {
    const grid = document.getElementById('products-grid');
    const viewButtons = document.querySelectorAll('.view-btn');
    
    if (!grid) return;

    // Update grid class
    grid.className = `products-grid grid-${columns}`;
    this.currentView = columns;

    // Update button states
    viewButtons.forEach(btn => {
      const btnColumns = parseInt(btn.dataset.columns);
      if (btnColumns === columns) {
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      }
    });
  }

  clearAllFilters() {
    // Reset filter state
    this.filters.search = '';
    this.filters.brands.clear();
    this.filters.colors.clear();
    this.filters.priceMin = 0;
    this.filters.priceMax = Math.ceil(Math.max(...this.products.map(p => p.price))) || 1250;

    // Reset UI elements
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';

    const checkboxes = document.querySelectorAll('#brand-filters input, #color-filters input');
    checkboxes.forEach(cb => cb.checked = false);

    const priceMin = document.getElementById('price-min');
    const priceMax = document.getElementById('price-max');
    const priceRange = document.getElementById('price-range');
    
    if (priceMin) priceMin.value = this.filters.priceMin;
    if (priceMax) priceMax.value = this.filters.priceMax;
    if (priceRange) {
      priceRange.max = this.filters.priceMax;
      priceRange.value = this.filters.priceMax;
    }

    // Reapply filters
    this.applyFilters();
  }

  showLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.style.display = 'flex';
    }
  }

  hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.style.display = 'none';
    }
  }

  showErrorOverlay(message) {
    this.hideLoadingScreen();
    
    // Create error overlay
    const errorOverlay = document.createElement('div');
    errorOverlay.className = 'error-overlay';
    errorOverlay.innerHTML = `
      <div class="error-content">
        <div class="error-icon">⚠️</div>
        <h3>Ошибка загрузки</h3>
        <p>${message}</p>
        <button class="btn btn-primary" onclick="location.reload()">Перезагрузить</button>
      </div>
    `;
    
    document.body.appendChild(errorOverlay);
  }
}

// Initialize catalog when DOM is loaded
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

// Export for global access
window.TileCatalog = catalog;

export default TileCatalog;