// Build hierarchical category tree (A > B > C)
function buildHierTree(products){
  const root = new Map();
  for(const p of products){
    const cats = Array.isArray(p.itemCategoryList)? p.itemCategoryList : [];
    if(cats.length===0) continue;
    for(const pathRaw of cats){
      const parts = String(pathRaw).split('>').map(s=>s.trim()).filter(Boolean);
      if(parts.length===0) continue;
      let node = root;
      let keyPath = '';
      for(const part of parts){
        keyPath = keyPath ? keyPath + ' > ' + part : part;
        if(!node.has(part)) node.set(part, { name: part, key: keyPath, count:0, children: new Map() });
        const entry = node.get(part);
        entry.count++;
        node = entry.children;
      }
    }
  }
  return root;
}

function renderTree(map){
  const entries = Array.from(map.values()).sort((a,b)=> b.count - a.count);
  return entries.map(entry => {
    const hasChildren = entry.children.size>0;
    return `
      <div class="cat-node" data-key="${entry.key}">
        ${hasChildren? '<button class="cat-toggle" aria-label="Развернуть">▸</button>': '<span class="cat-toggle" style="opacity:.3">•</span>'}
        <input type="checkbox" class="category-checkbox" value="${entry.key}">
        <span class="category-name">${entry.name}</span>
        <span class="category-count">${entry.count}</span>
      </div>
      ${hasChildren? `<div class="cat-children">${renderTree(entry.children)}</div>`: ''}
    `;
  }).join('');
}

export function createHierCategoryFilter(products){
  const tree = buildHierTree(products);
  const html = `
    <div class="filter-group">
      <div class="category-filter">
        <div class="category-header">
          <span class="category-title">КАТЕГОРИЯ</span>
          <button class="category-clear" onclick="catalog.clearCategoryFilter()">Сбросить</button>
        </div>
        <div class="category-tree">${renderTree(tree)}</div>
      </div>
    </div>`;
  return html;
}
