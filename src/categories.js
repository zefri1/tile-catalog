// Category taxonomy builder from itemCategory values
// Expected formats: "Головные уборы/Бейсболки", "Аксессуары/Балаклавы" или просто "Керамогранит"

function buildCategoryTreeFromProducts(products){
  const root = { name: 'root', children: new Map(), count: 0 };
  const SEP = /[\/›>]/; // support '/', '>', '›'
  const addPath = (parts, productId) => {
    let node = root;
    parts.forEach((raw,i)=>{
      const name = String(raw||'').trim();
      if(!name) return;
      if(!node.children.has(name)) node.children.set(name,{ name, children:new Map(), count:0, products:new Set()});
      node = node.children.get(name);
      node.products.add(productId);
      node.count = node.products.size;
    });
  };
  (products||[]).forEach(p=>{
    const cats = Array.isArray(p.itemCategoryList)? p.itemCategoryList: [];
    cats.forEach(cLine=>{
      const cleanLine = String(cLine||'').replace(/\s*[-–—]\s*/g,'').trim();
      if(!cleanLine) return;
      const parts = cleanLine.split(SEP).map(x=>x.trim()).filter(Boolean);
      if(parts.length===0){
        // fallback: treat as top-level
        addPath([cleanLine], p.id);
      } else {
        addPath(parts, p.id);
      }
    });
  });
  return root;
}

function treeLevelToArray(node){
  return Array.from(node.children.values())
    .sort((a,b)=> b.count-a.count || a.name.localeCompare(b.name,'ru'));
}

TileCatalog.prototype.buildCategoryTree = function(){
  this.categoryRoot = buildCategoryTreeFromProducts(this.products);
  // default view level is root
  this.categoryState = this.categoryState || {};
  this.categoryState.path = this.categoryState.path || [];
};

TileCatalog.prototype.setCategoryPath = function(path){
  this.categoryState.path = path.slice();
  this.refreshCategoryFilter();
  this.applyFilters();
};

TileCatalog.prototype.getCurrentCategoryNode = function(){
  let node = this.categoryRoot;
  for(const seg of (this.categoryState.path||[])){
    const next = node.children.get(seg);
    if(!next) return node; // invalid path fallback
    node = next;
  }
  return node;
};

TileCatalog.prototype.createCategoryFilter = function(){
  const node = this.getCurrentCategoryNode();
  const level = treeLevelToArray(node);
  const path = this.categoryState.path||[];
  const hiddenCount = Math.max(0, level.length - 14);
  const visible = hiddenCount>0? level.slice(0,14): level;
  const breadcrumbs = ['Все категории', ...path];
  
  const crumbs = breadcrumbs.map((label,idx)=>{
    if(idx===0) return `<button class="breadcrumb-link" onclick="catalog.setCategoryPath([])">Все категории</button>`;
    const goPath = path.slice(0, idx);
    return `<button class="breadcrumb-link" onclick='catalog.setCategoryPath(${JSON.stringify(goPath)})'>${label}</button>`;
  }).join('<span class="breadcrumb-separator">›</span>');
  
  return `
    <div class="filter-group">
      <div class="category-filter">
        <div class="category-header">
          <span class="category-title">КАТЕГОРИЯ</span>
          <button class="category-clear" onclick="catalog.clearCategoryFilter()">Сбросить</button>
        </div>
        <div class="breadcrumb-nav"><div class="breadcrumbs">${crumbs}</div></div>
        <div class="category-list">
          ${visible.map(cat=>`
            <div class="category-item">
              <span class="category-name" onclick='catalog.setCategoryPath(${JSON.stringify([...path, cat.name])})'>${cat.name}</span>
              <span class="category-count">${cat.count}</span>
              <input type="checkbox" class="category-checkbox" value="${[...path, cat.name].join(' / ')}">
            </div>`).join('')}
          ${hiddenCount>0?`<button class="show-more-btn" onclick="catalog.categoryState.showLimit=(catalog.categoryState.showLimit||14)+14; catalog.refreshCategoryFilter()">Ещё ${hiddenCount}</button>`:''}
        </div>
      </div>
    </div>`;
};

// Filter: include products that belong to selected category nodes (by path prefix)
TileCatalog.prototype.categoryMatch = function(product){
  const selected = Array.from(this.categoryState.selectedCategories||[]);
  if(selected.length===0) return true;
  const lines = Array.isArray(product.itemCategoryList)? product.itemCategoryList: [];
  return selected.some(sel=>{
    const normSel = String(sel).toLowerCase();
    return lines.some(line=> String(line).toLowerCase().includes(normSel));
  });
};

// Bind category checkbox events
TileCatalog.prototype.bindCategoryEvents = function(){
  document.querySelectorAll('.category-checkbox').forEach(cb=>{
    cb.addEventListener('change', (e)=>{
      this.categoryState.selectedCategories = this.categoryState.selectedCategories || new Set();
      if(e.target.checked) this.categoryState.selectedCategories.add(e.target.value);
      else this.categoryState.selectedCategories.delete(e.target.value);
      this.applyFilters();
    });
  });
};
