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
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    field += c; i++;
  }
  row.push(field); rows.push(row);
  return rows;
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
    name: idx('fullname') !== -1 ? idx('fullname') : (idx('name')!==-1? idx('name'):0),
    brand: idx('brand') !== -1 ? idx('brand') : 1,
    color: idx('color') !== -1 ? idx('color') : 2,
    price: idx('price.roznichnaya') !== -1 ? idx('price.roznichnaya') : (idx('price.diler2')!==-1? idx('price.diler2'):3),
    description: idx('description') !== -1 ? idx('description') : (idx('fullname')!==-1? idx('fullname'):4),
    image: idx('image') !== -1 ? idx('image') : 5,
    phone: idx('phone') !== -1 ? idx('phone') : 6,
    instock: idx('rest.moskow') !== -1 ? idx('rest.moskow') : 7,
    ondemand: idx('byorder') !== -1 ? idx('byorder') : 8,
    hidden: idx('hidden') !== -1 ? idx('hidden') : 9,
    collection: idx('collection') !== -1 ? idx('collection') : -1,
    country: idx('country') !== -1 ? idx('country') : -1,
    size: idx('size') !== -1 ? idx('size') : -1
  };
  const data = rows.slice(1).filter(r => r && r.length > 0);
  return data.map(r => ({
    id: 'product-'+Math.random().toString(36).slice(2,11),
    name: cs(s(r[col.name]))||'Без названия',
    brand: cs(s(r[col.brand]))||'Неизвестно', 
    color: cs(s(r[col.color]))||'Не указан',
    price: n(r[col.price])||0,
    description: cs(s(r[col.description]))||'',
    image: s(r[col.image])||'',
    phone: s(r[col.phone])||'',
    inStock: n(r[col.instock])>0,
    onDemand: b(r[col.ondemand])||true,
    hidden: b(r[col.hidden]),
    collection: cs(s(r[col.collection]))||'',
    country: cs(s(r[col.country]))||'',
    size: cs(s(r[col.size]))||''
  }));
}

class TileCatalog {
  constructor(){
    this.products=[]; this.filteredProducts=[]; this.currentSort='price-asc'; this.currentView=2;
    this.filters={ search:'', brands:new Set(), colors:new Set(), priceMin:0, priceMax:1250 };
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
    // Simple error display
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;padding:20px;border:2px solid #f44;border-radius:8px;z-index:9999;';
    errorDiv.innerHTML = `<h3>Ошибка загрузки</h3><p>${message}</p><button onclick="this.parentElement.remove();location.reload()">Перезагрузить</button>`;
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

    // Fallback CSV
    const response = await fetch(`${FALLBACK_CSV}&t=${Date.now()}`,{cache:'no-store'});
    if(!response.ok) throw new Error('CSV load failed');
    const csv = await response.text();
    const parsed = parseCSVData(csv);
    this.products = parsed.filter(p => p.price>0 && !p.hidden);
  }

  initializeFilters(){
    // Extract unique brands and colors
    const brands = [...new Set(this.products.map(p => p.brand))].sort();
    const colors = [...new Set(this.products.map(p => p.color))].sort();
    
    // Create filters UI
    this.createFiltersUI(brands, colors);
    
    // Set price range
    const prices = this.products.map(p => p.price).filter(p => p > 0);
    this.filters.priceMin = Math.min(...prices);
    this.filters.priceMax = Math.max(...prices);
  }

  createFiltersUI(brands, colors){
    const sidebar = document.getElementById('filters-sidebar');
    if(!sidebar) return;
    
    sidebar.innerHTML = `
      <div class="filters-header">
        <h2>Фильтры</h2>
        <button id="clear-filters" class="btn-clear">Сбросить</button>
      </div>
      <div class="filter-group">
        <label class="filter-label">Поиск:</label>
        <input type="text" id="search-input" class="filter-input" placeholder="Введите название...">
      </div>
      <div class="filter-group">
        <label class="filter-label">Бренды:</label>
        <div class="filter-checkboxes" id="brand-filters">
          ${brands.map(b => `<label><input type="checkbox" value="${b}">${b}</label>`).join('')}
        </div>
      </div>
      <div class="filter-group">
        <label class="filter-label">Цвета:</label>
        <div class="filter-checkboxes" id="color-filters">
          ${colors.map(c => `<label><input type="checkbox" value="${c}">${c}</label>`).join('')}
        </div>
      </div>
    `;
  }

  bindEvents(){
    // Search
    const searchInput = document.getElementById('search-input');
    if(searchInput) searchInput.addEventListener('input', (e) => {
      this.filters.search = e.target.value.toLowerCase();
      this.applyFilters();
    });

    // Brand filters
    document.querySelectorAll('#brand-filters input').forEach(cb => {
      cb.addEventListener('change', (e) => {
        if(e.target.checked) this.filters.brands.add(e.target.value);
        else this.filters.brands.delete(e.target.value);
        this.applyFilters();
      });
    });

    // Color filters
    document.querySelectorAll('#color-filters input').forEach(cb => {
      cb.addEventListener('change', (e) => {
        if(e.target.checked) this.filters.colors.add(e.target.value);
        else this.filters.colors.delete(e.target.value);
        this.applyFilters();
      });
    });

    // Clear filters
    const clearBtn = document.getElementById('clear-filters');
    if(clearBtn) clearBtn.addEventListener('click', () => {
      this.filters.search = '';
      this.filters.brands.clear();
      this.filters.colors.clear();
      document.querySelectorAll('.filter-checkboxes input').forEach(cb => cb.checked = false);
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
        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.currentView = parseInt(e.target.dataset.columns);
        const grid = document.getElementById('products-grid');
        if(grid) {
          grid.className = `products-grid grid-${this.currentView}`;
        }
      });
    });
  }

  applyFilters(){
    let filtered = [...this.products];
    
    // Search filter
    if(this.filters.search) {
      const search = this.filters.search;
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(search) ||
        p.brand.toLowerCase().includes(search) ||
        p.color.toLowerCase().includes(search)
      );
    }
    
    // Brand filter
    if(this.filters.brands.size > 0) {
      filtered = filtered.filter(p => this.filters.brands.has(p.brand));
    }
    
    // Color filter
    if(this.filters.colors.size > 0) {
      filtered = filtered.filter(p => this.filters.colors.has(p.color));
    }
    
    // Sort
    this.sortProducts(filtered);
    
    this.filteredProducts = filtered;
    this.updateResultsCount();
    this.renderProducts();
  }

  sortProducts(products){
    switch(this.currentSort) {
      case 'price-asc': products.sort((a,b) => a.price - b.price); break;
      case 'price-desc': products.sort((a,b) => b.price - a.price); break;
      case 'name-asc': products.sort((a,b) => a.name.localeCompare(b.name)); break;
      case 'name-desc': products.sort((a,b) => b.name.localeCompare(a.name)); break;
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
      const html = slice.map(p=>{ 
        const badge=p.inStock?'<span class="status-badge status-in-stock">В НАЛИЧИИ</span>':'<span class="status-badge status-on-demand">ПОД ЗАКАЗ</span>'; 
        const img=p.image?`<img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">`:''; 
        const ph=`<div class="product-placeholder" ${p.image?'style="display:none"':''}>🏠</div>`; 
        return `<article class="product-card" data-product-id="${p.id}">
          <div class="product-image">${img}${ph}</div>
          <div class="product-info">
            <h3 class="product-name">${p.name}</h3>
            <p class="product-brand">${p.brand}</p>
            <p class="product-color">${p.color}</p>
            <div class="product-price">${p.price} ₽</div>
            <div class="product-status">${badge}</div>
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
      container.innerHTML = `<button id="load-more-btn" class="load-more-btn">Показать ещё</button>`;
      document.querySelector('.products-area').appendChild(container);
      btn = container.querySelector('#load-more-btn');
    }
    btn.onclick=()=>{
      this.batchSize += 60; // увеличим порцию
      this.renderProducts();
    };
  }

  attachCardClicks(){
    const grid=document.getElementById('products-grid');
    grid.querySelectorAll('.product-card').forEach(card=>{ card.addEventListener('click',()=>{ const id=card.dataset.productId; const p=this.filteredProducts.find(x=>x.id===id); if(p) this.openModal(p); }); });
  }

  openModal(product){
    const modal = document.getElementById('product-modal');
    if(!modal) return;
    
    // Fill modal content
    document.getElementById('modal-title').textContent = product.name;
    document.getElementById('modal-brand').textContent = product.brand;
    document.getElementById('modal-color').textContent = product.color;
    document.getElementById('modal-price').textContent = `${product.price} ₽`;
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
    
    // Show modal
    modal.setAttribute('aria-hidden', 'false');
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Focus management
    const closeBtn = modal.querySelector('.modal__close');
    if(closeBtn) closeBtn.focus();
    
    // Close handlers
    const closeModal = () => {
      modal.setAttribute('aria-hidden', 'true');
      modal.style.display = 'none';
      document.body.style.overflow = '';
    };
    
    modal.querySelector('.modal__close').onclick = closeModal;
    modal.querySelector('#modal-close-btn').onclick = closeModal;
    modal.querySelector('.modal__backdrop').onclick = closeModal;
    
    // ESC key
    const handleEsc = (e) => {
      if(e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);
  }
}

let catalog=null; if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded',()=>{ catalog=new TileCatalog(); catalog.init(); }); } else { catalog=new TileCatalog(); catalog.init(); }
window.TileCatalog=catalog; export default TileCatalog;