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
function n(v){ const x=parseFloat(v); return isNaN(x)?0:x }
function b(v){ if(typeof v==='boolean') return v; if(typeof v==='string'){ const l=v.toLowerCase().trim(); return l==='true'||l==='1'||l==='да'||l==='yes' } return Boolean(v) }
function cs(v){ if(!v) return ''; return String(v).replace(/[\'">]/g,'').replace(/\s+/g,' ').trim() }

function parseCSVData(csvContent){
  const rows = parseCSV(csvContent);
  if (!rows || rows.length < 2) return [];
  const headers = rows[0].map(h => String(h || '').toLowerCase());
  const idx = (name) => headers.indexOf(name);
  // поддержка имён колонок в первом ряду
  const col = {
    name: idx('name') !== -1 ? idx('name') : 0,
    brand: idx('brand') !== -1 ? idx('brand') : 1,
    color: idx('color') !== -1 ? idx('color') : 2,
    price: idx('price') !== -1 ? idx('price') : 3,
    description: idx('description') !== -1 ? idx('description') : 4,
    image: idx('image') !== -1 ? idx('image') : 5,
    phone: idx('phone') !== -1 ? idx('phone') : 6,
    instock: idx('instock') !== -1 ? idx('instock') : 7,
    ondemand: idx('ondemand') !== -1 ? idx('ondemand') : 8,
    hidden: idx('hidden') !== -1 ? idx('hidden') : 9,
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
    inStock: b(r[col.instock]),
    onDemand: b(r[col.ondemand]),
    hidden: b(r[col.hidden])
  }));
}

// Parse JSON API response
function parseJSONData(jsonData) {
  try {
    let items;
    
    // Handle different API response formats
    if (jsonData.items && Array.isArray(jsonData.items)) {
      items = jsonData.items;
    } else if (Array.isArray(jsonData)) {
      items = jsonData;
    } else {
      throw new Error('Invalid JSON format');
    }
    
    return items.map(item => ({
      id: item.id || 'product-' + Math.random().toString(36).slice(2, 11),
      name: cs(s(item.name)) || 'Без названия',
      brand: cs(s(item.brand)) || 'Неизвестно', 
      color: cs(s(item.color)) || 'Не указан',
      price: n(item.price) || 0,
      description: cs(s(item.description)) || '',
      image: s(item.image || item.image_url) || '',
      phone: s(item.phone) || '',
      inStock: b(item.inStock || item.instock),
      onDemand: b(item.onDemand || item.ondemand), 
      hidden: b(item.hidden)
    }));
  } catch (error) {
    console.error('JSON parsing error:', error);
    return [];
  }
}

class TileCatalog {
  constructor(){
    this.products=[]; this.filteredProducts=[]; this.currentSort='price-asc'; this.currentView=2;
    this.filters={ search:'', brands:new Set(), colors:new Set(), priceMin:0, priceMax:1250 };
    this.isInitialized=false;
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
    console.log('🔄 Loading products...');
    
    // Primary: API endpoint
    const API_URL = window.SHEET_JSON_URL || '/api/items';
    
    // Fallback: Direct CSV
    const FALLBACK_CSV = window.SHEET_CSV_URL || 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRfhgka5nFoR1TXYDGQ5CziYYqGSDXjhw_yJeO-MqFTb-k_RWlkjvaWxy9vBzLuKmo4KdCnz2SAdvMh/pub?gid=0&single=true&output=csv';
    
    // Try API first
    try {
      console.log('🚀 Trying API:', API_URL);
      const response = await fetch(API_URL, { 
        cache: 'no-store',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const jsonData = await response.json();
        this.products = parseJSONData(jsonData).filter(p => (p.inStock || p.onDemand) && !p.hidden);
        
        if (this.products.length > 0) {
          console.log(`✅ Loaded ${this.products.length} products from API`);
          return;
        }
      }
      
      throw new Error(`API failed: ${response.status}`);
      
    } catch (apiError) {
      console.warn('⚠️ API failed, trying CSV fallback:', apiError.message);
    }
    
    // Fallback to CSV
    try {
      const cacheBuster = window.SHEET_CACHE_BUSTER || 'v=1';
      const csvUrl = `${FALLBACK_CSV}&${cacheBuster}&t=${Date.now()}`;
      
      console.log('📄 Trying CSV:', csvUrl);
      
      const response = await fetch(csvUrl, { cache: 'no-store' });
      
      if (!response.ok) {
        throw new Error(`CSV failed: HTTP ${response.status}`);
      }
      
      const csvText = await response.text();
      
      if (!csvText || csvText.length < 20) {
        throw new Error('Empty CSV response');
      }
      
      this.products = parseCSVData(csvText).filter(p => (p.inStock || p.onDemand) && !p.hidden);
      
      if (this.products.length === 0) {
        throw new Error('No valid products found in CSV');
      }
      
      console.log(`✅ Loaded ${this.products.length} products from CSV`);
      
    } catch (csvError) {
      console.error('❌ Both API and CSV failed:', csvError.message);
      throw new Error(`Не удалось загрузить данные: ${csvError.message}`);
    }
  }

  initializeFilters(){
    const brands=new Set(), colors=new Set(); let maxPrice=0;
    this.products.forEach(p=>{ if(p.brand) brands.add(p.brand); if(p.color) colors.add(p.color); if(p.price>maxPrice) maxPrice=p.price; });
    this.filters.priceMax=Math.ceil(maxPrice)||1250;
    const slider=document.getElementById('price-range'); const max=document.getElementById('price-max');
    if(slider&&max){ slider.max=this.filters.priceMax; slider.value=this.filters.priceMax; max.value=this.filters.priceMax; }
    this.populateCheckboxFilter('brand-filters', Array.from(brands).sort());
    this.populateCheckboxFilter('color-filters', Array.from(colors).sort());
  }

  populateCheckboxFilter(id, items){ const c=document.getElementById(id); if(!c) return; c.innerHTML=''; items.forEach(it=>{ const w=document.createElement('div'); w.className='checkbox-item'; const cb=document.createElement('input'); cb.type='checkbox'; cb.id=`${id}-${it.toLowerCase().replace(/\s+/g,'-')}`; cb.value=it; const l=document.createElement('label'); l.htmlFor=cb.id; l.textContent=it; l.className='checkbox-text'; w.appendChild(cb); w.appendChild(l); c.appendChild(w); }); }

  bindEvents(){
    const search=document.getElementById('search-input'); if(search){ search.addEventListener('input',e=>{ this.filters.search=e.target.value.toLowerCase(); this.applyFilters(); }); }
    const bf=document.getElementById('brand-filters'); if(bf){ bf.addEventListener('change',e=>{ const t=e.target; if(t && t.type==='checkbox'){ if(t.checked){ this.filters.brands.add(t.value); } else { this.filters.brands.delete(t.value); } this.applyFilters(); } }); }
    const cf=document.getElementById('color-filters'); if(cf){ cf.addEventListener('change',e=>{ const t=e.target; if(t && t.type==='checkbox'){ if(t.checked){ this.filters.colors.add(t.value); } else { this.filters.colors.delete(t.value); } this.applyFilters(); } }); }
    const pmin=document.getElementById('price-min'); const pmax=document.getElementById('price-max'); const pr=document.getElementById('price-range');
    if(pmin){ pmin.addEventListener('input',e=>{ this.filters.priceMin=parseFloat(e.target.value)||0; this.applyFilters(); }); }
    if(pmax){ pmax.addEventListener('input',e=>{ this.filters.priceMax=parseFloat(e.target.value)||this.filters.priceMax; if(pr) pr.value=this.filters.priceMax; this.applyFilters(); }); }
    if(pr){ pr.addEventListener('input',e=>{ this.filters.priceMax=parseFloat(e.target.value); if(pmax) pmax.value=this.filters.priceMax; this.applyFilters(); }); }
    const sort=document.getElementById('sort-select'); if(sort){ sort.addEventListener('change',e=>{ this.currentSort=e.target.value; this.applyFilters(); }); }
    document.querySelectorAll('.view-btn').forEach(btn=>{ btn.addEventListener('click',e=>{ const col=parseInt(e.currentTarget.dataset.columns); this.setGridView(col); }); });
    const clearBtn=document.querySelector('.clear-btn'); if(clearBtn){ clearBtn.addEventListener('click',()=>{ this.clearFilters(); }); }
    this.bindModalEvents();
  }

  clearFilters() {
    // Reset search
    const search = document.getElementById('search-input');
    if (search) search.value = '';
    this.filters.search = '';
    
    // Uncheck all brand filters
    document.querySelectorAll('#brand-filters input[type="checkbox"]').forEach(cb => cb.checked = false);
    this.filters.brands.clear();
    
    // Uncheck all color filters  
    document.querySelectorAll('#color-filters input[type="checkbox"]').forEach(cb => cb.checked = false);
    this.filters.colors.clear();
    
    // Reset price range
    const pmin = document.getElementById('price-min');
    const pmax = document.getElementById('price-max'); 
    const slider = document.getElementById('price-range');
    
    this.filters.priceMin = 0;
    if (pmin) pmin.value = 0;
    
    const maxPrice = Math.max(...this.products.map(p => p.price));
    this.filters.priceMax = maxPrice;
    if (pmax) pmax.value = maxPrice;
    if (slider) { slider.value = maxPrice; slider.max = maxPrice; }
    
    this.applyFilters();
  }

  applyFilters(){
    this.filteredProducts=this.products.filter(p=>{
      if(this.filters.search){ const hay=[p.name,p.brand,p.color,p.description].join(' ').toLowerCase(); if(!hay.includes(this.filters.search)) return false; }
      if(this.filters.brands.size>0 && !this.filters.brands.has(p.brand)) return false;
      if(this.filters.colors.size>0 && !this.filters.colors.has(p.color)) return false;
      if(p.price < this.filters.priceMin || p.price > this.filters.priceMax) return false;
      return true;
    });
    this.sortProducts(); this.renderProducts(); this.updateResultsCount();
  }

  sortProducts(){ this.filteredProducts.sort((a,b)=>{ switch(this.currentSort){ case 'price-asc': return a.price-b.price; case 'price-desc': return b.price-a.price; case 'name-asc': return a.name.localeCompare(b.name,'ru'); case 'name-desc': return b.name.localeCompare(a.name,'ru'); default: return 0; } }); }

  renderProducts(){ 
    const grid=document.getElementById('products-grid'); const nr=document.getElementById('no-results'); 
    if(!grid||!nr) return; 
    if(this.filteredProducts.length===0){ grid.innerHTML=''; nr.classList.remove('hidden'); return; } 
    nr.classList.add('hidden'); 
    grid.innerHTML=this.filteredProducts.map(p=>{ 
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
    grid.querySelectorAll('.product-card').forEach(card=>{ card.addEventListener('click',()=>{ const id=card.dataset.productId; const p=this.products.find(x=>x.id===id); if(p) this.openModal(p); }); }); 
  }

  updateResultsCount(){ const el=document.getElementById('results-count'); if(el){ el.textContent=`Найдено товаров: ${this.filteredProducts.length}`; } }

  bindModalEvents(){ const modal=document.getElementById('product-modal'); const closeBtn=document.querySelector('.modal__close'); const closeFooterBtn=document.getElementById('modal-close-btn'); const backdrop=document.querySelector('.modal__backdrop'); [closeBtn,closeFooterBtn,backdrop].forEach(e=>{ if(e) e.addEventListener('click',()=>this.closeModal()); }); document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&modal&&!modal.hasAttribute('aria-hidden')) this.closeModal(); }); }

  openModal(p){ 
    const m=document.getElementById('product-modal'); 
    if(!m) return; 
    const els={ 
      title:document.getElementById('modal-title'), 
      image:document.getElementById('modal-image'), 
      imagePh:document.getElementById('modal-image-ph'), 
      price:document.getElementById('modal-price'), 
      brand:document.getElementById('modal-brand'), 
      color:document.getElementById('modal-color'), 
      status:document.getElementById('modal-status'), 
      desc:document.getElementById('modal-desc') 
    }; 
    if(els.title) els.title.textContent=p.name; 
    if(els.price) els.price.textContent=`${p.price} ₽`; 
    if(els.brand) els.brand.textContent=p.brand; 
    if(els.color) els.color.textContent=p.color; 
    if(els.desc) els.desc.textContent=p.description||'Описание отсутствует'; 
    if(els.status) els.status.textContent=p.inStock?'В наличии':'Под заказ'; 
    if(els.image&&els.imagePh){ 
      if(p.image){ 
        els.image.src=p.image; els.image.alt=p.name; els.image.style.display='block'; els.imagePh.style.display='none'; 
        els.image.onerror=()=>{ els.image.style.display='none'; els.imagePh.style.display='flex'; }; 
      } else { 
        els.image.style.display='none'; els.imagePh.style.display='flex'; 
      } 
    } 
    m.removeAttribute('aria-hidden'); m.style.display='flex'; document.body.style.overflow='hidden'; 
  }
  
  closeModal(){ const m=document.getElementById('product-modal'); if(m){ m.setAttribute('aria-hidden','true'); m.style.display='none'; document.body.style.overflow=''; } }

  setGridView(columns){ const grid=document.getElementById('products-grid'); const btns=document.querySelectorAll('.view-btn'); if(!grid) return; grid.className=`products-grid grid-${columns}`; this.currentView=columns; btns.forEach(b=>{ const c=parseInt(b.dataset.columns); if(c===columns){ b.classList.add('active'); b.setAttribute('aria-pressed','true'); } else { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); } }); }

  showLoadingScreen(){ const el=document.getElementById('loading-screen'); if(el) el.style.display='flex'; }
  hideLoadingScreen(){ const el=document.getElementById('loading-screen'); if(el) el.style.display='none'; }
  showErrorOverlay(msg){ const el=document.createElement('div'); el.className='error-overlay'; el.innerHTML=`<div class="error-content"><div class="error-icon">⚠️</div><h3>Ошибка загрузки</h3><p>${msg}</p><button class="btn btn-primary" onclick="location.reload()">Перезагрузить</button></div>`; document.body.appendChild(el); }
}

let catalog=null; if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded',()=>{ catalog=new TileCatalog(); catalog.init(); }); } else { catalog=new TileCatalog(); catalog.init(); }
window.TileCatalog=catalog; export default TileCatalog;