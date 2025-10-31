// Inject breadcrumbs-based category control
function buildCategorySet(products){
  const counts = new Map();
  for(const p of products){
    for(const c of (p.itemCategoryList||[])){
      counts.set(c, (counts.get(c)||0)+1);
    }
  }
  return Array.from(counts.entries()).sort((a,b)=>b[1]-a[1]);
}

export function renderCategoryBreadcrumbs(products, selected = []){
  const list = buildCategorySet(products);
  const crumbs = ['Все категории', ...selected];
  const crumbsHTML = crumbs.map((c,i)=>{
    const label = i===0? 'Все категории' : c;
    const active = i===crumbs.length-1? 'active' : '';
    return `<span class="crumb ${active}" data-idx="${i}">${label}</span>${i<crumbs.length-1? '<span class="sep">›</span>':''}`;
  }).join('');

  const optionsHTML = list.map(([name,count])=>`<div class="category-item"><input type="checkbox" class="filter-checkbox" value="${name}"><span class="checkbox-text">${name}</span><span class="category-count">${count}</span></div>`).join('');

  return `
    <div class="filter-group">
      <div class="category-filter">
        <div class="category-header"><span class="category-title">КАТЕГОРИЯ</span></div>
        <div class="breadcrumbs" id="cat-breadcrumbs">${crumbsHTML}</div>
        <div class="checkbox-group" id="category-filters">${optionsHTML}</div>
      </div>
    </div>`;
}
