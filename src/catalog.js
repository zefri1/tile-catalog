/**
 * Каталог плитки - Sync fixes: single render after data load, proper filters init
 */

class TileCatalog {
  constructor() {
    this.config = { csvUrl:'https://docs.google.com/spreadsheets/d/e/2PACX-1vRfhgka5nFoR1TXYDGQ5CziYYqGSDXjhw_yJeO-MqFTb-k_RWlkjvaWxy9vBzLuKmo4KdCnz2SAdvMh/pub?gid=0&single=true&output=csv', themes:{light:'light',dark:'dark'}, phoneFallback:'+7 (495) 123-45-67', vkLink:'https://vk.com/plitochik44' };
    this.state = { products:[], filteredProducts:[], filters:{search:'',brands:new Set(),colors:new Set(),priceMin:0,priceMax:10000}, sort:'price-desc', theme:this.getStoredTheme(), viewMode:[1,2].includes(Number(localStorage.getItem('viewMode')))?Number(localStorage.getItem('viewMode')):2, loading:true };
    this.elements = {}; this.init();
  }

  async init(){
    this.initElements();
    this.initTheme();
    this.initEventListeners();
    await this.loadData(); // ждём данные
    this.initFilters();    // инициализируем фильтры по реальным данным
    this.applyFilters();   // один раз применяем
    this.renderProducts(); // и рендерим
    this.hideLoadingScreen();
    const isOpen=this.elements.filtersToggle?.checked||false; this.syncFiltersPlacement(isOpen);
  }

  // ===== DOM refs =====
  initElements(){ const sel={loadingScreen:'#loading-screen',themeToggle:'#theme-toggle',themeIcon:'.theme-icon',searchInput:'#search-input',brandFilters:'#brand-filters',colorFilters:'#color-filters',priceRange:'#price-range',priceMin:'#price-min',priceMax:'#price-max',clearFilters:'#clear-filters',sortSelect:'#sort-select',resultsCount:'#results-count',productsGrid:'#products-grid',noResults:'#no-results',filtersSidebar:'#filters-sidebar',filtersToggle:'#filters-toggle',filtersCollapsible:'#filters-collapsible',viewGrid1:'#view-grid-1',viewGrid2:'#view-grid-2'}; for(const[k,s] of Object.entries(sel)) this.elements[k]=document.querySelector(s); }

  // ===== Theme =====
  initTheme(){ this.applyTheme(this.state.theme);} applyTheme(t){ document.documentElement.setAttribute('data-theme',t); localStorage.setItem('theme',t); if(this.elements.themeIcon) this.elements.themeIcon.textContent=t==='dark'?'☀️':'🌙'; this.state.theme=t; } toggleTheme(){ this.applyTheme(this.state.theme==='dark'?'light':'dark'); } getStoredTheme(){ const s=localStorage.getItem('theme'); return s|| (matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'); }

  // ===== Events =====
  initEventListeners(){
    this.elements.themeToggle?.addEventListener('click',()=>this.toggleTheme());
    this.elements.searchInput?.addEventListener('input',e=>{ this.state.filters.search=e.target.value.toLowerCase().trim(); this.applyFilters(); this.renderProducts(); });
    this.elements.priceRange?.addEventListener('input',e=>{ const v=parseInt(e.target.value)||0; this.state.filters.priceMax=v; if(this.elements.priceMax) this.elements.priceMax.value=v; this.applyFilters(); this.renderProducts(); });
    this.elements.priceMin?.addEventListener('input',e=>{ const v=parseInt(e.target.value)||0; this.state.filters.priceMin=Math.min(v,this.state.filters.priceMax-1); e.target.value=this.state.filters.priceMin; this.applyFilters(); this.renderProducts(); });
    this.elements.priceMax?.addEventListener('input',e=>{ const v=parseInt(e.target.value)||0; const min=this.state.filters.priceMin; const smax=parseInt(this.elements.priceRange?.max)||10000; this.state.filters.priceMax=Math.max(Math.min(v,smax),min+1); e.target.value=this.state.filters.priceMax; if(this.elements.priceRange) this.elements.priceRange.value=this.state.filters.priceMax; this.applyFilters(); this.renderProducts(); });
    this.elements.clearFilters?.addEventListener('click',()=>this.clearAllFilters());

    if(this.elements.sortSelect){ const opts=[{v:'price-asc',t:'По цене ↑'},{v:'price-desc',t:'По цене ↓'},{v:'name-asc',t:'По названию А-Я'},{v:'name-desc',t:'По названию Я-А'}]; this.elements.sortSelect.innerHTML=opts.map(o=>`<option value="${o.v}">${o.t}</option>`).join(''); this.elements.sortSelect.value=this.state.sort; this.elements.sortSelect.addEventListener('change',e=>{ this.state.sort=e.target.value; this.renderProducts(); }); }

    this.elements.viewGrid1?.addEventListener('click',()=>this.changeViewMode(1));
    this.elements.viewGrid2?.addEventListener('click',()=>this.changeViewMode(2));

    this.elements.filtersToggle?.addEventListener('change',e=>{ const o=e.target.checked; this.elements.filtersToggle.setAttribute('aria-expanded',String(o)); this.syncFiltersPlacement(o); });
    let t; addEventListener('resize',()=>{ clearTimeout(t); t=setTimeout(()=>{ const o=this.elements.filtersToggle?.checked||false; this.syncFiltersPlacement(o); },120); });

    this.elements.productsGrid?.addEventListener('click',(e)=>{ const contact=e.target.closest('.product-contact'); if(contact){ e.preventDefault(); e.stopPropagation(); const card=contact.closest('.product-card'); const id=card?.dataset.id; const p=this.state.filteredProducts.find(x=>x.id===id)||this.state.products.find(x=>x.id===id); if(p) this.openContactModal(p); return; } const card=e.target.closest('.product-card'); if(!card) return; const id=card.dataset.id; const p=this.state.filteredProducts.find(x=>x.id===id)||this.state.products.find(x=>x.id===id); if(p) this.openProductModal(p); });
  }

  // ===== Data =====
  async loadData(){ try{ const url=`${this.config.csvUrl}&_cachebust=${Date.now()}`; const r=await fetch(url,{headers:{Accept:'text/csv,application/csv,text/plain','Cache-Control':'no-cache'},cache:'no-store'}); if(!r.ok) throw new Error('http'); const csv=await r.text(); if(csv.length<50) throw new Error('short'); this.parseCSVData(csv); }catch{ this.loadDemoData(); } }
  parseCSVData(csv){ try{ const wb=XLSX.read(csv,{type:'string'}); const ws=wb.Sheets[wb.SheetNames[0]]; const rows=XLSX.utils.sheet_to_json(ws,{header:1}); if(rows.length<2) throw new Error('no rows'); this.state.products=rows.slice(1).filter(r=>r&&r.length>0).map(r=>({ id:this.generateId(), name:this.cleanString(this.getString(r[0]))||'Без названия', brand:this.cleanString(this.getString(r[1]))||'Неизвестно', color:this.cleanString(this.getString(r[2]))||'Не указан', price:this.getNumber(r[3])||0, description:this.cleanString(this.getString(r[4]))||'', image:this.getString(r[5])||'', phone:this.getString(r[6])||this.config.phoneFallback, inStock:this.getBoolean(r[7]), onDemand:this.getBoolean(r[8]), hidden:this.getBoolean(r[9]) })).filter(p=>(p.inStock||p.onDemand)&&!p.hidden&&p.name!=='Без названия'); }catch{ this.loadDemoData(); } }
  loadDemoData(){ this.state.products=[{id:'demo-1',name:'Marble Effect',brand:'Luxury Line',color:'Золотистый',price:3200,description:'Эффект мраморной поверхности',image:'',phone:this.config.phoneFallback,inStock:true,onDemand:false,hidden:false},{id:'demo-2',name:'Mosaic Pattern',brand:'Art Collection',color:'Многоцветный',price:2800,description:'Мозаичный узор для акцентных стен',image:'',phone:this.config.phoneFallback,inStock:true,onDemand:false,hidden:false},{id:'demo-3',name:'Natural Stone Look',brand:'Natural Design',color:'Бежевый',price:2100,description:'Имитация натурального камня',image:'',phone:this.config.phoneFallback,inStock:true,onDemand:false,hidden:false},{id:'demo-4',name:'Industrial Style',brand:'Loft Design',color:'Металлик',price:1950,description:'Промышленный стиль для современных интерьеров',image:'',phone:this.config.phoneFallback,inStock:false,onDemand:true,hidden:false},{id:'demo-5',name:'Vintage Pattern',brand:'Retro Style',color:'Серый',price:1890,description:'Винтажная плитка с уникальным узором',image:'',phone:this.config.phoneFallback,inStock:true,onDemand:false,hidden:false},{id:'demo-6',name:'Hexagon Modern',brand:'Geometric',color:'Синий',price:1650,description:'Современная шестигранная плитка',image:'',phone:this.config.phoneFallback,inStock:true,onDemand:false,hidden:false},{id:'demo-7',name:'Wood Look Classic',brand:'Traditional',color:'Коричневый',price:1450,description:'Классическая плитка под дерево',image:'',phone:this.config.phoneFallback,inStock:true,onDemand:false,hidden:false},{id:'demo-8',name:'Metro Tiles',brand:'Urban Collection',color:'Белый',price:1200,description:'Плитка в стиле метро',image:'',phone:this.config.phoneFallback,inStock:true,onDemand:false,hidden:false},{id:'demo-9',name:'Stone Texture',brand:'Nature Plus',color:'Кремовый',price:980,description:'Текстура натурального камня',image:'',phone:this.config.phoneFallback,inStock:true,onDemand:false,hidden:false}]; }

  // ===== Filters init (after data) =====
  initFilters(){ const brands=[...new Set(this.state.products.map(p=>p.brand))].sort(); const colors=[...new Set(this.state.products.map(p=>p.color))].sort(); if(this.elements.brandFilters){ this.elements.brandFilters.innerHTML=brands.map(b=>this.createCheckboxFilter('brand',b)).join(''); this.elements.brandFilters.addEventListener('change',e=>{ if(e.target.type==='checkbox'){ e.target.checked?this.state.filters.brands.add(e.target.value):this.state.filters.brands.delete(e.target.value); this.applyFilters(); this.renderProducts(); } }); } if(this.elements.colorFilters){ this.elements.colorFilters.innerHTML=colors.map(c=>this.createCheckboxFilter('color',c)).join(''); this.elements.colorFilters.addEventListener('change',e=>{ if(e.target.type==='checkbox'){ e.target.checked?this.state.filters.colors.add(e.target.value):this.state.filters.colors.delete(e.target.value); this.applyFilters(); this.renderProducts(); } }); } const prices=this.state.products.map(p=>p.price).filter(Number.isFinite); const max=prices.length?Math.max(...prices):0; this.state.filters.priceMin=0; this.state.filters.priceMax=max; if(this.elements.priceRange){ this.elements.priceRange.max=String(max); this.elements.priceRange.value=String(max); } if(this.elements.priceMax) this.elements.priceMax.value=String(max); if(this.elements.priceMin) this.elements.priceMin.value='0'; }

  // ===== Apply & Render =====
  applyFilters(){ this.state.filteredProducts=this.state.products.filter(p=>{ if(this.state.filters.search){ const s=(p.name+' '+p.brand+' '+p.color+' '+p.description).toLowerCase(); if(!s.includes(this.state.filters.search)) return false; } if(this.state.filters.brands.size>0&&!this.state.filters.brands.has(p.brand)) return false; if(this.state.filters.colors.size>0&&!this.state.filters.colors.has(p.color)) return false; if(p.price<this.state.filters.priceMin||p.price>this.state.filters.priceMax) return false; return true; }); }
  renderProducts(){ if(!this.elements.productsGrid) return; this.sortProducts(); this.updateResultsCount(); if(this.state.filteredProducts.length===0){ this.showNoResults(); return; } this.hideNoResults(); this.elements.productsGrid.innerHTML=this.state.filteredProducts.map(p=>this.createProductCard(p)).join(''); }
  sortProducts(){ const s=this.state.sort; const t=(a,b)=>a.localeCompare(b,'ru',{sensitivity:'base'}); const n=(a,b)=>a-b; this.state.filteredProducts.sort((a,b)=>{ if(s==='price-asc') return n(a.price,b.price); if(s==='price-desc') return n(b.price,a.price); if(s==='name-asc') return t(a.name,b.name); if(s==='name-desc') return t(b.name,a.name); return 0; }); }

  // ===== UI helpers etc. (оставлены без изменений) =====
  createCheckboxFilter(t,v){ const id=`${t}-${v.replace(/\s+/g,'-').toLowerCase()}`; return `<div class="checkbox-item"><input type="checkbox" id="${id}" value="${v}"><label for="${id}" class="checkbox-text">${v}</label></div>`; }
  showNoResults(){ this.elements.noResults?.classList.remove('hidden'); if(this.elements.productsGrid) this.elements.productsGrid.innerHTML=''; }
  hideNoResults(){ this.elements.noResults?.classList.add('hidden'); }
  updateResultsCount(){ if(this.elements.resultsCount){ const total=this.state.products.length; const filtered=this.state.filteredProducts.length; this.elements.resultsCount.textContent=`Найдено товаров: ${filtered} из ${total}`; } }
  changeViewMode(n){ const next=n===1?1:2; this.state.viewMode=next; this.updateViewButtons(); this.updateGridClass(); localStorage.setItem('viewMode',String(next)); }
  updateViewButtons(){ document.querySelectorAll('.view-btn').forEach(b=>{ b.classList.remove('active'); b.setAttribute('aria-pressed','false'); }); const a=document.querySelector(`[data-columns="${this.state.viewMode}"]`); a?.classList.add('active'); a?.setAttribute('aria-pressed','true'); }
  updateGridClass(){ if(!this.elements.productsGrid) return; this.elements.productsGrid.classList.remove('grid-1','grid-2'); this.elements.productsGrid.classList.add(`grid-${this.state.viewMode}`); }

  // Contact modal, Product modal, accessibility helpers — без изменений в этой правке
  openContactModal(p){ /* ... остаётся как в текущей ветке ... */ }
  openProductModal(p){ /* ... остаётся как в текущей ветке ... */ }

  // Utils
  hideLoadingScreen(){ if(this.elements.loadingScreen){ this.elements.loadingScreen.style.opacity='0'; setTimeout(()=>{ this.elements.loadingScreen.style.display='none'; },300);} }
  getString(v){ return v?String(v).trim():''; } getNumber(v){ const n=parseFloat(v); return isNaN(n)?0:n; } getBoolean(v){ if(typeof v==='boolean') return v; if(typeof v==='string'){ const l=v.toLowerCase().trim(); return l==='true'||l==='1'||l==='да'||l==='yes'; } return Boolean(v); } generateId(){ return 'product-'+Math.random().toString(36).slice(2,11); }
}

window.TileCatalog=TileCatalog;
