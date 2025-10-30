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
    // Prefer published CSV if provided via env or data-attr
    const FALLBACK_SHEET = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRfhgka5nFoR1TXYDGQ5CziYYqGSDXjhw_yJeO-MqFTb-k_RWlkjvaWxy9vBzLuKmo4KdCnz2SAdvMh/pub?gid=0&single=true&output=csv';
    const sheetUrl = window.SHEET_CSV_URL || FALLBACK_SHEET;

    try {
      const response = await fetch(sheetUrl, { cache: 'no-store' });
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

  /* rest of file unchanged */
}

let catalog = null;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { catalog = new TileCatalog(); catalog.init(); });
} else { catalog = new TileCatalog(); catalog.init(); }
window.TileCatalog = catalog;
export default TileCatalog;