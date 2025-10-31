import { createHierCategoryFilter } from './categories.js';

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

// Enhanced normalizer for multi-value fields - FIXED for comma-separated values
function normArray(raw) {
  if (!raw) return [];
  const str = String(raw).trim();
  if (!str || str === '0' || str === '-' || str.toLowerCase() === 'нет') return [];
  return str.split(',').map(x=>x.trim()).filter(x=>x && x.length>1);
}

function s(v) { return v ? String(v).trim() : '' }
function n(v) { const x = parseFloat(String(v).replace(/[^0-9.,]/g, '').replace(',', '.')); return isNaN(x) ? 0 : Math.round(x) }
function b(v) { if (typeof v === 'boolean') return v; const l = String(v || '').toLowerCase().trim(); return l === 'true' || l === '1' || l === 'да' || l === 'yes' }
function cs(v) { if (!v) return ''; return String(v).replace(/[\\'>\"]/g, '').replace(/\s+/g, ' ').trim() }

function parseCSVData(csvContent) { /* unchanged */ }

class CategoryTree { /* unchanged */ }

class TileCatalog {
  constructor() {
    this.products = []; this.filteredProducts = []; this.currentSort = 'price-asc'; this.currentView = 2;
    this.filters = { search: '', brands: new Set(), colors: new Set(), countries: new Set(), surfaces: new Set(), uses: new Set(), structs: new Set(), priceMin: 0, priceMax: 1250 };
    this.categoryTree = new CategoryTree();
    this.categoryState = { selectedCategories: new Set(), selectedPaths: new Set(), showLimit: 15 };
    this.isInitialized = false; this.batchSize = 40; this.renderIndex = 0;
  }

  /* ... methods up to createFiltersUI ... */

  createFiltersUI(brands, colors, countries, surfaces, uses, structs) {
    const sidebar = document.getElementById('filters-sidebar');
    if (!sidebar) return;

    const createFilterGroup = (title, items, id) => {
      if (!items || !Array.isArray(items) || items.length === 0) return '';
      return `
        <div class="filter-group">
          <label class="filter-label">${title}:</label>
          <div class="checkbox-group scrollable" id="${id}">
            ${items.map((val, idx) => `
              <div class="checkbox-item">
                <input type="checkbox" value="${val}" class="filter-checkbox" id="${id}-${idx}">
                <label for="${id}-${idx}" class="checkbox-text">${val}</label>
              </div>
            `).join('')}
            ${items.length > 8 ? '<div class="more-filters-hint">Прокрутите для просмотра всех</div>' : ''}
          </div>
        </div>
      `;
    };

    // Use hierarchical category filter
    const categoryHTML = createHierCategoryFilter(this.products);
    
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
          ${categoryHTML}
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

  bindCategoryEvents() {
    // toggles
    document.querySelectorAll('.cat-toggle').forEach(btn => {
      btn.addEventListener('click', (e)=>{
        const node = e.currentTarget.closest('.cat-node');
        node.classList.toggle('open');
        const children = node.nextElementSibling;
        if(children && children.classList.contains('cat-children')){
          children.style.display = node.classList.contains('open') ? 'block' : 'none';
        }
      });
    });

    // path checkboxes
    document.querySelectorAll('.category-tree .category-checkbox').forEach(cb => {
      cb.addEventListener('change', (e)=>{
        const path = e.target.value;
        if(e.target.checked){ this.categoryState.selectedPaths.add(path); }
        else { this.categoryState.selectedPaths.delete(path); }
        this.applyFilters();
      });
    });
  }

  bindEvents(){
    // ... existing bindings ...
    this.bindCategoryEvents();
    // ... rest unchanged ...
  }

  applyFilters(){
    // ... existing search and other filters ...

    // Hierarchical category filter by path prefix
    if (this.categoryState.selectedPaths && this.categoryState.selectedPaths.size>0){
      const paths = Array.from(this.categoryState.selectedPaths);
      filtered = filtered.filter(p => (p.itemCategoryList||[]).some(cat => paths.some(path => cat.startsWith(path))));
    }

    // ... sort, assign and render ...
  }

  /* rest of class unchanged */
}

// Initialize theme and start
/* footer unchanged */
