import { renderCategoryBreadcrumbs } from './categories.js';

// ... existing code above

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
          <label class="filter-label">${title}:</label>
          <div class="checkbox-group scrollable" id="${id}">
            ${items.map(val => `
              <div class="checkbox-item">
                <input type="checkbox" value="${val}" class="filter-checkbox">
                <span class="checkbox-text">${val}</span>
              </div>
            `).join('')}
          </div>
        </div>`;
    };

    const categoriesHTML = renderCategoryBreadcrumbs(this.products);

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
          ${categoriesHTML}
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

    const crumbs = document.getElementById('cat-breadcrumbs');
    if (crumbs) {
      crumbs.addEventListener('click', (e)=>{
        const node = e.target.closest('.crumb');
        if(!node) return;
        // Для MVP: клик по "Все категории" сбрасывает категории
        if(node.dataset.idx === '0'){
          this.filters.categories = new Set();
          const checks = document.querySelectorAll('#category-filters .filter-checkbox');
          checks.forEach(cb=> cb.checked=false);
          this.applyFilters();
        }
      });
    }

    const clearBtn = document.getElementById('clear-filters');
    if (clearBtn) clearBtn.addEventListener('click', () => { this.filters.search=''; Object.keys(this.filters).forEach(k=>{ if(this.filters[k] instanceof Set) this.filters[k].clear();}); document.querySelectorAll('.filter-checkbox').forEach(cb=>cb.checked=false); if(searchInput) searchInput.value=''; this.applyFilters(); });

    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) sortSelect.addEventListener('change', (e) => { this.currentSort = e.target.value; this.applyFilters(); });

    const viewBtns = document.querySelectorAll('.view-btn');
    if (viewBtns) viewBtns.forEach(btn => { btn.addEventListener('click', (e) => { document.querySelectorAll('.view-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false');}); e.target.classList.add('active'); e.target.setAttribute('aria-pressed','true'); this.currentView = parseInt(e.target.dataset.columns); const grid=document.getElementById('products-grid'); if(grid) grid.className=`products-grid grid-${this.currentView}`; }); });
  }
