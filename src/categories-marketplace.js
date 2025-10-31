/**
 * Marketplace-style Category Navigation System (no sidebar breadcrumbs)
 */

class MarketplaceCategoryNavigator {
  constructor(catalog) {
    this.catalog = catalog;
    this.categories = new Map();
    this.currentCategory = null;
    this.isInitialized = false;
    this.handleCategoryClick = this.handleCategoryClick.bind(this);
  }

  init() {
    if (this.isInitialized) return;
    this.buildCategoryTree();
    this.renderCategoryNavigation();
    this.isInitialized = true;
  }

  buildCategoryTree() {
    const all = new Set();
    this.catalog.products.forEach(p=>{
      (p.itemCategoryList||[]).forEach(c=>{ if(c && typeof c==='string') all.add(c.trim()); });
    });
    const categoryTree = new Map();
    const sorted = Array.from(all).sort((a,b)=>a.localeCompare(b,'ru',{numeric:true}));

    const mainGroups = {
      'Плитка':[ 'керамическая плитка','настенная плитка','напольная плитка','плитка для ванной','плитка для кухни','декоративная плитка','плитка под дерево','плитка под камень' ],
      'Керамогранит':[ 'керамогранит','полированный керамогранит','матовый керамогранит','структурированный керамогранит','керамогранит под дерево','керамогранит под камень' ],
      'Мозаика':[ 'мозаика','стеклянная мозаика','каменная мозаика','керамическая мозаика','металлическая мозаика' ],
      'Декор':[ 'декор','бордюр','панно','вставки','декоративные элементы' ]
    };

    sorted.forEach(cat=>{
      const l=cat.toLowerCase();
      let found=null;
      for(const [group,keys] of Object.entries(mainGroups)){
        if(keys.some(k=>l.includes(k))){found=group;break;}
      }
      const parent=found||'Другое';
      if(!categoryTree.has(parent)) categoryTree.set(parent,{name:parent,children:[],productCount:0});
      categoryTree.get(parent).children.push({name:cat,children:[],productCount:this.getProductCountForCategory(cat)});
    });

    categoryTree.forEach(v=>{ v.productCount = v.children.reduce((s,c)=>s+c.productCount,0); });
    this.categories = categoryTree;
  }

  getProductCountForCategory(name){
    return this.catalog.products.filter(p=> (p.itemCategoryList||[]).includes(name)).length;
  }

  renderCategoryNavigation(){
    const sidebar=document.getElementById('filters-sidebar'); if(!sidebar) return;
    const el=document.createElement('div'); el.className='category-navigation';
    el.innerHTML = this.generateCategoryListHTML();
    const panel=sidebar.querySelector('.filters-panel'); if(panel){ panel.insertBefore(el,panel.firstChild); }
    this.bindCategoryEvents();
  }

  generateCategoryListHTML(){
    let html = `
      <div class="category-header">
        <h3 class="category-title">Категории</h3>
      </div>
      <div class="category-list">
        <div class="category-item category-all" data-category="">
          <div class="category-main">
            <span class="category-name">Все категории</span>
            <span class="category-count">${this.catalog.products.length}</span>
          </div>
        </div>`;
    this.categories.forEach(c=>{ html += this.generateCategoryItemHTML(c); });
    html += '</div>'; return html;
  }

  generateCategoryItemHTML(data){
    const hasChildren = data.children && data.children.length>0;
    let html = `<div class="category-item ${hasChildren?'has-children':''}" data-category="${data.name}">
      <div class="category-main">
        <span class="category-name">${data.name}</span>
        <span class="category-count">${data.productCount}</span>
        ${hasChildren?'<span class="category-arrow">▶</span>':''}
      </div>`;
    if(hasChildren){
      html += '<div class="category-children">';
      const seen=new Set();
      data.children.forEach(child=>{
        if(seen.has(child.name)) return; // убираем самовложенные дубли
        seen.add(child.name);
        html += `<div class="category-child" data-category="${child.name}">
          <span class="category-name">${child.name}</span>
          <span class="category-count">${child.productCount}</span>
        </div>`;
      });
      html += '</div>';
    }
    html += '</div>'; return html;
  }

  bindCategoryEvents(){
    const root=document.querySelector('.category-navigation'); if(!root) return;
    root.addEventListener('click',(e)=>{
      const item=e.target.closest('.category-item, .category-child');
      if(!item) return; this.handleCategoryClick(item);
    });
  }

  handleCategoryClick(el){
    const name = el.dataset.category;
    if(name===''){ if(this.catalog.filters.categories) this.catalog.filters.categories.clear(); this.catalog.applyFilters(); return; }
    if(!this.catalog.filters.categories) this.catalog.filters.categories=new Set();
    this.catalog.filters.categories.clear();
    this.catalog.filters.categories.add(name);
    this.catalog.applyFilters();
  }
}

window.MarketplaceCategoryNavigator = MarketplaceCategoryNavigator;
export default MarketplaceCategoryNavigator;
