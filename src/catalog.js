// Lightweight native CSV parser (handles quoted fields and newlines)
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
    if (c === ',' || c === ';') { row.push(field); field = ''; i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    field += c; i++;
  }
  row.push(field); rows.push(row);
  return rows;
}

function normArray(raw) {
  return String(raw||"")
    .split(/[;,]/)
    .map(x=>String(x).trim())
    .filter(Boolean);
}

function s(v){ return v?String(v).trim():'' }
function n(v){ const x=parseFloat(String(v).replace(/[^0-9.,]/g,'').replace(',','.')); return isNaN(x)?0:Math.round(x) }
function b(v){ if(typeof v==='boolean') return v; const l=String(v||'').toLowerCase().trim(); return l==='true'||l==='1'||l==='да'||l==='yes' }
function cs(v){ if(!v) return ''; return String(v).replace(/[\'>"]/g,'').replace(/\s+/g,' ').trim() }

function parseCSVData(csvContent){
  const rows = parseCSV(csvContent);
  if (!rows || rows.length < 2) return [];
  const headers = rows[0].map(h => String(h || '').toLowerCase());
  const idx = (name) => headers.indexOf(name);
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
    priceDiler: idx('price.diler2')
  };
  const data = rows.slice(1).filter(r => r && r.length > 0);
  return data.map(r => ({
    id: s(r[col.id]),
    brand: cs(s(r[col.brand]))||'Неизвестно',
    collection: cs(s(r[col.collection]))||'',
    country: cs(s(r[col.country]))||'Не указана',
    name: cs(s(r[col.fullname]))||'Без названия',
    color: cs(s(r[col.color]))||'Не указан',
    itemCategory: cs(s(r[col.itemcategory]))||'',
    itemCategoryList: normArray(r[col.itemcategory]),
    itemSurface: cs(s(r[col.itemsurface]))||'',
    itemSurfaceList: normArray(r[col.itemsurface]),
    areasOfUse: cs(s(r[col.areasofuse]))||'',
    areasOfUseList: normArray(r[col.areasofuse]),
    surfaceStruct: cs(s(r[col.surfacestructures]))||'',
    surfaceStructList: normArray(r[col.surfacestructures]),
    image: s(r[col.image])||'',
    inStock: n(r[col.rest])>0,
    onDemand: b(r[col.byorder])||true,
    hidden: false,
    price: n(r[col.priceRozn])||n(r[col.priceDiler])||0
  }));
}

class TileCatalog {
  constructor(){
    this.products=[]; this.filteredProducts=[]; this.currentSort='price-asc'; this.currentView=2;
    this.filters={ search:'', brands:new Set(), colors:new Set(), countries:new Set(), categories:new Set(), surfaces:new Set(), uses:new Set(), structs:new Set(), priceMin:0, priceMax:1250 };
    this.isInitialized=false; this.batchSize=40; this.renderIndex=0;
  }

  showLoadingScreen(){
    const screen = document.getElementById('loading-screen');
    if(screen) screen.style.display = 'flex';
  }

  hideLoadingScreen(){
    const screen = document.getElementById('loading-screen');
    if(screen) screen.style.display = 'none';
  }

  showErrorOverlay(message){
    console.error('Error:', message);
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--color-surface-elevated);padding:2rem;border:2px solid var(--color-error);border-radius:var(--border-radius);z-index:9999;box-shadow:var(--shadow-xl);text-align:center;';
    errorDiv.innerHTML = `<div class=\"error-icon\">⚠️</div><h3>Ошибка загрузки</h3><p>${message}</p><button onclick=\"this.parentElement.remove();location.reload()\" class=\"btn btn-primary\">Перезагрузить</button>`;
    document.body.appendChild(errorDiv);
  }

  async init(){
    this.showLoadingScreen();
    try{
      await this.loadProducts();
      this.initializeFilters();
      this.bindEvents();
      this.applyFilters();
    }catch(err){
      console.error('init error', err);
      this.showErrorOverlay(err.message||'Ошибка');
    }finally{
      this.hideLoadingScreen();
      this.isInitialized=true;
    }
  }

  async loadProducts(){
    const API_URL = window.SHEET_JSON_URL || '/api/items';
    const FALLBACK_CSV = window.SHEET_CSV_URL;
    // Try API first
    try {
      const response = await fetch(API_URL,{cache:'no-store',headers:{'Accept':'application/json'}});
      if(response.ok){
        const json = await response.json();
        const items = Array.isArray(json.items)? json.items: json;
        this.products = items.filter(p => (p.inStock || p.onDemand !== false) && !p.hidden);
        if(this.products.length>0){ return; }
      }
      throw new Error('Empty API');
    } catch(e){ console.warn('API failed, using CSV', e.message); }
    const response = await fetch(`${FALLBACK_CSV}&t=${Date.now()}`,{cache:'no-store'});
    if(!response.ok) throw new Error('CSV load failed');
    const csv = await response.text();
    const parsed = parseCSVData(csv);
    this.products = parsed.filter(p => p.price>0 && !p.hidden);
  }

  initializeFilters(){
    const brands = [...new Set(this.products.map(p => p.brand))].sort();
    const colors = [...new Set(this.products.map(p => p.color))].sort();
    const countries = [...new Set(this.products.map(p => p.country))].sort();
    // flatten and de-dup arrays
    const allCats = [].concat(...this.products.map(p => p.itemCategoryList||[]));
    const categories = [...new Set(allCats)].sort();
    const allSurfs = [].concat(...this.products.map(p => p.itemSurfaceList||[]));
    const surfaces = [...new Set(allSurfs)].sort();
    const allUses = [].concat(...this.products.map(p => p.areasOfUseList||[]));
    const uses = [...new Set(allUses)].sort();
    const allStructs = [].concat(...this.products.map(p => p.surfaceStructList||[]));
    const structs = [...new Set(allStructs)].sort();
    this.createFiltersUI(brands, colors, countries, categories, surfaces, uses, structs);
    const prices = this.products.map(p => p.price).filter(p => p > 0);
    this.filters.priceMin = Math.min(...prices);
    this.filters.priceMax = Math.max(...prices);
  }

  createFiltersUI(brands, colors, countries, categories, surfaces, uses, structs){
    const sidebar = document.getElementById('filters-sidebar');
    if(!sidebar) return;
    sidebar.innerHTML = `
      <div class=\"filters-panel\">
        <div class=\"filters-header\">
          <h2>Фильтры</h2>
          <button id=\"clear-filters\" class=\"clear-btn\">Сбросить</button>
        </div>
        <div class=\"filters-content\">
          <div class=\"filter-group\">
            <label class=\"filter-label\" for=\"search-input\">ПОИСК:</label>
            <input type=\"text\" id=\"search-input\" class=\"search-input\" placeholder=\"Введите название...\" autocomplete=\"off\">
          </div>
          <div class=\"filter-group\"><label class=\"filter-label\">СТРАНА:</label>
            <div class=\"checkbox-group\" id=\"country-filters\">
              ${countries.map(val => `
                <div class=\"checkbox-item\"><input type=\"checkbox\" value=\"${val}\" class=\"filter-checkbox\"> <span class=\"checkbox-text\">${val}</span></div>`).join('')}
              ${countries.length > 8 ? '<div class=\"more-filters-hint\">Прокрутите для просмотра всех</div>' : ''}
            </div>
          </div>
          <div class=\"filter-group\"><label class=\"filter-label\">КАТЕГОРИЯ:</label>
            <div class=\"checkbox-group\" id=\"category-filters\">
              ${categories.map(val => `
                <div class=\"checkbox-item\"><input type=\"checkbox\" value=\"${val}\" class=\"filter-checkbox\"> <span class=\"checkbox-text\">${val}</span></div>`).join('')}
              ${categories.length > 8 ? '<div class=\"more-filters-hint\">Прокрутите для просмотра всех</div>' : ''}
            </div>
          </div>
          <div class=\"filter-group\"><label class=\"filter-label\">ТИП ПОВЕРХНОСТИ:</label>
            <div class=\"checkbox-group\" id=\"surface-filters\">
              ${surfaces.map(val => `<div class=\"checkbox-item\"><input type=\"checkbox\" value=\"${val}\" class=\"filter-checkbox\"> <span class=\"checkbox-text\">${val}</span></div>`).join('')}
              ${surfaces.length > 8 ? '<div class=\"more-filters-hint\">Прокрутите для просмотра всех</div>' : ''}
            </div>
          </div>
          <div class=\"filter-group\"><label class=\"filter-label\">ОБЛАСТЬ ПРИМЕНЕНИЯ:</label>
            <div class=\"checkbox-group\" id=\"use-filters\">
              ${uses.map(val => `<div class=\"checkbox-item\"><input type=\"checkbox\" value=\"${val}\" class=\"filter-checkbox\"> <span class=\"checkbox-text\">${val}</span></div>`).join('')}
              ${uses.length > 8 ? '<div class=\"more-filters-hint\">Прокрутите для просмотра всех</div>' : ''}
            </div>
          </div>
          <div class=\"filter-group\"><label class=\"filter-label\">СТРУКТУРА ПОВЕРХНОСТИ:</label>
            <div class=\"checkbox-group\" id=\"struct-filters\">
              ${structs.map(val => `<div class=\"checkbox-item\"><input type=\"checkbox\" value=\"${val}\" class=\"filter-checkbox\"> <span class=\"checkbox-text\">${val}</span></div>`).join('')}
              ${structs.length > 8 ? '<div class=\"more-filters-hint\">Прокрутите для просмотра всех</div>' : ''}
            </div>
          </div>
          <div class=\"filter-group\"><label class=\"filter-label\">БРЕНД:</label>
            <div class=\"checkbox-group\" id=\"brand-filters\">
              ${brands.map(val => `<div class=\"checkbox-item\"><input type=\"checkbox\" value=\"${val}\" class=\"filter-checkbox\"> <span class=\"checkbox-text\">${val}</span></div>`).join('')}
              ${brands.length > 8 ? '<div class=\"more-filters-hint\">Прокрутите для просмотра всех</div>' : ''}
            </div>
          </div>
          <div class=\"filter-group\"><label class=\"filter-label\">ЦВЕТ:</label>
            <div class=\"checkbox-group\" id=\"color-filters\">
              ${colors.map(val => `<div class=\"checkbox-item\"><input type=\"checkbox\" value=\"${val}\" class=\"filter-checkbox\"> <span class=\"checkbox-text\">${val}</span></div>`).join('')}
              ${colors.length > 8 ? '<div class=\"more-filters-hint\">Прокрутите для просмотра всех</div>' : ''}
            </div>
          </div>
        </div></div>`;
  }

  bindEvents(){
    // Search
    const searchInput = document.getElementById('search-input');
    if(searchInput) searchInput.addEventListener('input', (e) => {
      this.filters.search = e.target.value.toLowerCase();
      this.applyFilters();
    });
    // Filter generic
    [
      ['#brand-filters','brands'],['#color-filters','colors'],['#country-filters','countries'],['#category-filters','categories'],['#surface-filters','surfaces'],['#use-filters','uses'],['#struct-filters','structs']
    ].forEach(([selector,filterKey])=>{
      document.querySelectorAll(selector+' .filter-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
          if(e.target.checked) this.filters[filterKey].add(e.target.value);
          else this.filters[filterKey].delete(e.target.value);
          this.applyFilters();
        });
      });
    });
    // Clear filters
    const clearBtn = document.getElementById('clear-filters');
    if(clearBtn) clearBtn.addEventListener('click', () => {
      this.filters.search = '';
      Object.keys(this.filters).forEach(k=>{ if(this.filters[k] instanceof Set) this.filters[k].clear(); });
      document.querySelectorAll('.filter-checkbox').forEach(cb => cb.checked = false);
      if(searchInput) searchInput.value = '';
      this.applyFilters();
    });
    // Sort
    const sortSelect = document.getElementById('sort-select');
    if(sortSelect) sortSelect.addEventListener('change', (e) => {
      this.currentSort = e.target.value;
      this.applyFilters();
    });
    // View buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.view-btn').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        e.target.classList.add('active');
        e.target.setAttribute('aria-pressed', 'true');
        this.currentView = parseInt(e.target.dataset.columns);
        const grid = document.getElementById('products-grid');
        if(grid) {
          grid.className = `products-grid grid-${this.currentView}`;
        }
      });
    });
    // Theme toggle
    const themeBtn = document.getElementById('theme-toggle');
    if(themeBtn) themeBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      themeBtn.querySelector('.theme-icon').textContent = newTheme === 'dark' ? '☀️' : '🌙';
    });
  }

  applyFilters(){
    let filtered = [...this.products];
    const s = this.filters;
    // Search (поиск по нескольким полям)
    if(s.search) {
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
    // Страна
    if(s.countries.size > 0) filtered = filtered.filter(p => s.countries.has(p.country));
    // Категория (любая выбранная)
    if(s.categories.size > 0) filtered = filtered.filter(p => (p.itemCategoryList||[]).some(x=>s.categories.has(x)));
    // Тип поверхности
    if(s.surfaces.size > 0) filtered = filtered.filter(p => (p.itemSurfaceList||[]).some(x=>s.surfaces.has(x)));
    // Область применения
    if(s.uses.size > 0) filtered = filtered.filter(p => (p.areasOfUseList||[]).some(x=>s.uses.has(x)));
    // Структура поверхности
    if(s.structs.size > 0) filtered = filtered.filter(p => (p.surfaceStructList||[]).some(x=>s.structs.has(x)));
    // Brand
    if(s.brands.size > 0) filtered = filtered.filter(p => s.brands.has(p.brand));
    // Цвет
    if(s.colors.size > 0) filtered = filtered.filter(p => s.colors.has(p.color));
    // Сортировка
    this.sortProducts(filtered);
    this.filteredProducts = filtered;
    this.updateResultsCount();
    this.renderProducts();
  }

  sortProducts(products){
    switch(this.currentSort) {
      case 'price-asc': products.sort((a,b) => a.price - b.price); break;
      case 'price-desc': products.sort((a,b) => b.price - a.price); break;
      case 'name-asc': products.sort((a,b) => a.name.localeCompare(b.name, 'ru')); break;
      case 'name-desc': products.sort((a,b) => b.name.localeCompare(a.name, 'ru')); break;
    }
  }

  updateResultsCount(){
    const counter = document.getElementById('results-count');
    if(counter) counter.textContent = `Найдено товаров: ${this.filteredProducts.length}`;
  }

  renderProducts(){
    const grid=document.getElementById('products-grid'); const nr=document.getElementById('no-results'); 
    if(!grid||!nr) return; 
    if(this.filteredProducts.length===0){ grid.innerHTML=''; nr.classList.remove('hidden'); return; } 
    nr.classList.add('hidden'); 
    grid.innerHTML=''; this.renderIndex=0; 
    const renderChunk=()=>{
      const slice=this.filteredProducts.slice(this.renderIndex, this.renderIndex+this.batchSize);
      const html = slice.map((p, idx)=>{ 
        const badge=p.inStock?'<span class=\"status-badge status-in-stock\">В НАЛИЧИИ</span>':'<span class=\"status-badge status-on-demand\">ПОД ЗАКАЗ</span>'; 
        const img=p.image?`<img src=\"${p.image}\" alt=\"${p.name}\" loading=\"lazy\" onerror=\"this.style.display='none'; this.nextElementSibling.style.display='flex'\">`:''; 
        const ph=`<div class=\"product-placeholder\" ${p.image?'style=\"display:none\"':''}>🏠</div>`; 
        const animationDelay = (this.renderIndex + idx) % 12 * 0.1;
        return `<article class=\"product-card\" data-product-id=\"${p.id}\" style=\"animation-delay: ${animationDelay}s;\">
          <div class=\"product-image\">${img}${ph}</div>
          <div class=\"product-info\">
            <h3 class=\"product-name\">${p.name}</h3>
            <p class=\"product-brand\">${p.brand}</p>
            <p class=\"product-color\">${p.color}</p>
            ${p.size ? `<span class=\"product-card__size\">${p.size}</span>` : ''}
            <div class=\"product-price\">${p.price.toLocaleString('ru-RU')} ₽</div>
            <div class=\"product-status\">${badge}</div>
          </div>
        </article>`; 
      }).join('');
      grid.insertAdjacentHTML('beforeend', html);
      this.renderIndex += slice.length;
      if (this.renderIndex < this.filteredProducts.length){
        requestAnimationFrame(renderChunk);
      } else {
        this.attachCardClicks();
        this.ensureLoadMore();
      }
    };
    requestAnimationFrame(renderChunk);
  }

  ensureLoadMore(){
    let btn = document.getElementById('load-more-btn');
    if (!btn){
      const container = document.createElement('div');
      container.className='load-more-container';
      container.innerHTML = `<button id=\"load-more-btn\" class=\"load-more-btn\">Показать ещё</button>`;
      document.querySelector('.products-area').appendChild(container);
      btn = container.querySelector('#load-more-btn');
    }
    btn.style.display = this.renderIndex >= this.filteredProducts.length ? 'none' : 'block';
    btn.onclick=()=>{
      this.batchSize += 60;
      this.renderProducts();
    };
  }

  attachCardClicks(){
    const grid=document.getElementById('products-grid');
    if(!grid) return;
    grid.querySelectorAll('.product-card').forEach(card=>{ 
      card.addEventListener('click',()=>{ 
        const id=card.dataset.productId; 
        const p=this.filteredProducts.find(x=>x.id===id); 
        if(p) this.openModal(p); 
      }); 
    });
  }

  openModal(product){
    const modal = document.getElementById('product-modal');
    if(!modal) return;
    document.getElementById('modal-title').textContent = product.name;
    document.getElementById('modal-brand').textContent = product.brand;
    document.getElementById('modal-color').textContent = product.color;
    document.getElementById('modal-price').textContent = `${product.price.toLocaleString('ru-RU')} ₽`;
    document.getElementById('modal-desc').textContent = product.description || 'Описание отсутствует';
    document.getElementById('modal-status').textContent = product.inStock ? 'В наличии' : 'Под заказ';
    const img = document.getElementById('modal-image');
    const ph = document.getElementById('modal-image-ph');
    if(product.image) {
      img.src = product.image;
      img.style.display = 'block';
      ph.style.display = 'none';
    } else {
      img.style.display = 'none';
      ph.style.display = 'flex';
    }
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('open');
    document.body.classList.add('modal-open');
    const closeBtn = modal.querySelector('.modal__close');
    if(closeBtn) closeBtn.focus();
    const closeModal = () => {
      modal.setAttribute('aria-hidden', 'true');
      modal.classList.remove('open');
      document.body.classList.remove('modal-open');
    };
    modal.querySelector('.modal__close').onclick = closeModal;
    modal.querySelector('#modal-close-btn').onclick = closeModal;
    modal.querySelector('.modal__backdrop').onclick = closeModal;
    const handleEsc = (e) => {
      if(e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);
  }
}

const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
const themeIcon = document.querySelector('#theme-toggle .theme-icon');
if(themeIcon) themeIcon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

let catalog=null; 
if(document.readyState==='loading'){ 
  document.addEventListener('DOMContentLoaded',()=>{ 
    catalog=new TileCatalog(); 
    catalog.init(); 
  }); 
} else { 
  catalog=new TileCatalog(); 
  catalog.init(); 
}
window.TileCatalog=catalog; 
export default TileCatalog;