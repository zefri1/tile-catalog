/**
 * Breadcrumbs for itemCategory taxonomy (Помещение → Тип → Материал)
 * Ничего не ломает: подключается поверх текущего каталога.
 */

(function(){
  const SLUGS = {
    place: {
      'для ванной комнаты': 'dlya-vannoy',
      'для кухни': 'dlya-kuhni',
      'для комнаты': 'dlya-komnaty',
      'для улицы': 'dlya-ulitsy'
    },
    type: {
      'настенная плитка': 'nastennaya-plitka',
      'напольная плитка': 'napolnaya-plitka',
      'декоративные элементы': 'dekorativnye-elementy',
      'ступени': 'stupeni',
      'мозаика': 'mozaika',
      'панно': 'panno',
      'бордюр': 'bordyur',
      'вставка': 'vstavka',
      'строительная плитка': 'stroitelnaya-plitka',
      'плитка': 'plitka'
    },
    material: {
      'керамика': 'keramika',
      'кафель': 'keramika',
      'керамогранит': 'keramogranit',
      'стекло': 'steklo'
    }
  };

  const NORMS = {
    place: new Map([
      ['для ванной комнаты','Для ванной комнаты'],
      ['для кухни','Для кухни'],
      ['для комнаты','Для комнаты'],
      ['для улицы','Для улицы']
    ]),
    type: new Map([
      ['настенная плитка','Настенная плитка'],
      ['напольная плитка','Напольная плитка'],
      ['декоративные элементы','Декоративные элементы'],
      ['ступени','Ступени'],
      ['мозаика','Мозаика'],
      ['панно','Панно'],
      ['бордюр','Бордюр'],
      ['вставка','Вставка'],
      ['строительная плитка','Строительная плитка'],
      ['плитка','Плитка']
    ]),
    material: new Map([
      ['керамика','Керамика'],
      ['кафель','Керамика'],
      ['керамогранит','Керамогранит'],
      ['стекло','Стекло']
    ])
  };

  function tokenize(val){
    return String(val||'')
      .split(',')
      .map(s=>s.trim())
      .filter(Boolean);
  }

  function normalizeTokens(tokens){
    const res={place:new Set(),type:new Set(),material:new Set()};
    for(const t of tokens){
      const raw=t.toLowerCase();
      // place
      for(const k of NORMS.place.keys()) if(raw.includes(k)) res.place.add(NORMS.place.get(k));
      // material first to catch kерамогранит/кафель/стекло
      for(const k of NORMS.material.keys()) if(raw.includes(k)) res.material.add(NORMS.material.get(k));
      // type
      for(const k of NORMS.type.keys()) if(raw.includes(k)) res.type.add(NORMS.type.get(k));
    }
    // Правило: если есть "Керамогранит" + "Настенная/Напольная плитка" — трактуем как материал
    if(res.material.has('Керамогранит') && (res.type.has('Настенная плитка') || res.type.has('Напольная плитка'))){
      // уже корректно распределено
    }
    // Сведение мелких типов в Декоративные элементы при необходимости
    const smallTypes=['Мозаика','Панно','Бордюр','Вставка'];
    if(smallTypes.some(x=>res.type.has(x)) && !res.type.has('Декоративные элементы')){
      // оставляем и мелкие, и агрегат — пригодится для сворачивания
      res.type.add('Декоративные элементы');
    }
    // Плитка — агрегирующая группа для настенной/напольной
    if(res.type.has('Настенная плитка')||res.type.has('Напольная плитка')) res.type.add('Плитка');
    // Керамика включает Кафель
    if([...res.material].includes('Керамика')) res.material.delete('Кафель');
    return res;
  }

  function intersectSets(sets){
    if(sets.length===0) return new Set();
    const [first,...rest]=sets; const out=new Set(first);
    for(const s of rest){ for(const v of [...out]) if(!s.has(v)) out.delete(v); }
    return out;
  }

  function computeBreadcrumb(products){
    // Собираем нормализованные наборы по каждому товару
    const normByProduct = products.map(p=>normalizeTokens(p.itemCategoryList||p.itemCategory||[]));
    const places = intersectSets(normByProduct.map(n=>n.place));
    const types = intersectSets(normByProduct.map(n=>n.type));
    const materials = intersectSets(normByProduct.map(n=>n.material));

    // Сворачивание множеств до общего предка
    const pickPlace = [...places][0] || null; // если пересечения нет — пропускаем уровень

    let pickType = null;
    if(types.size===1){ pickType=[...types][0]; }
    else if(types.size>1){
      const t = new Set(types);
      // если есть и Настенная, и Напольная → Плитка
      if(t.has('Настенная плитка') && t.has('Напольная плитка')) pickType='Плитка';
      else if(t.has('Декоративные элементы')) pickType='Декоративные элементы';
      else pickType=null; // слишком разрозненно — опускаем уровень
    }

    let pickMaterial = null;
    if(materials.size===1){ pickMaterial=[...materials][0]; }
    else if(materials.size>1){
      // Если есть общий сильный материал (напр., у всего "Керамогранит") — оставим его, иначе пропустим
      if(materials.has('Керамогранит')) pickMaterial='Керамогранит';
    }

    const chain = ['Каталог'];
    if(pickPlace) chain.push(pickPlace);
    if(pickType) chain.push(pickType);
    if(pickMaterial) chain.push(pickMaterial);
    return chain;
  }

  function renderBreadcrumb(container, chain){
    if(!container) return;
    container.classList.add('breadcrumbs');
    const segs = chain.map((name,idx)=>{
      const lower=name.toLowerCase();
      let slug = SLUGS.place[lower]||SLUGS.type[lower]||SLUGS.material[lower]||'';
      const clickable = idx<chain.length-1; // последний не кликаем
      return `<span class="bc-seg ${clickable?'bc-link':''}" data-level="${idx}" data-slug="${slug}">${name}</span>`;
    }).join('<span class="bc-sep">/</span>');
    container.innerHTML = segs;
  }

  function attachClicks(container, catalog){
    if(!container||!catalog) return;
    container.addEventListener('click', (e)=>{
      const seg = e.target.closest('.bc-link');
      if(!seg) return;
      const level = parseInt(seg.dataset.level,10);
      // level: 0 Каталог; 1 Помещение; 2 Тип; 3 Материал
      // При клике поднимаемся до уровня: очищаем более глубокие фильтры
      if(level===0){ // Каталог
        if(catalog.filters.categories) catalog.filters.categories.clear();
      }
      // Для простоты: сбрасываем категории и, если сегмент не "Каталог", применяем категориальный фильтр по сегменту
      if(level>0){
        if(!catalog.filters.categories) catalog.filters.categories = new Set();
        catalog.filters.categories.clear();
        const val = seg.textContent.trim();
        catalog.filters.categories.add(val);
      }
      catalog.applyFilters();
    });
  }

  function initBreadcrumbs(){
    const host = document.querySelector('.products-toolbar') || document.querySelector('.controls-box');
    if(!host) return;
    let wrap = document.getElementById('bc-wrap');
    if(!wrap){
      wrap = document.createElement('div');
      wrap.id = 'bc-wrap';
      wrap.style.cssText='display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;margin:6px 0;color:var(--color-text-secondary)';
      host.parentNode.insertBefore(wrap, host);
    }

    const catalog = window.catalog || window.TileCatalog;
    if(!catalog || !catalog.products) return;

    // Пересчет при каждом применении фильтров
    const recalc = ()=>{
      const items = catalog.filteredProducts && catalog.filteredProducts.length>0 ? catalog.filteredProducts : catalog.products;
      const chain = computeBreadcrumb(items);
      renderBreadcrumb(wrap, chain);
      attachClicks(wrap, catalog);
    };

    // Патчим applyFilters мягко
    if(!catalog.__bc_patched){
      const orig = catalog.applyFilters.bind(catalog);
      catalog.applyFilters = function(){
        orig();
        try { recalc(); } catch(e){ console.warn('BC recalc error', e); }
      };
      catalog.__bc_patched = true;
    }

    recalc();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', initBreadcrumbs);
  else initBreadcrumbs();
})();
