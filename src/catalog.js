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
function cs(v){ if(!v) return ''; return String(v).replace(/[\'">]/g,'').replace(/\s+/g,' ').trim() }

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

  // ... omitted unchanged methods ...

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
}

let catalog=null; if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded',()=>{ catalog=new TileCatalog(); catalog.init(); }); } else { catalog=new TileCatalog(); catalog.init(); }
window.TileCatalog=catalog; export default TileCatalog;