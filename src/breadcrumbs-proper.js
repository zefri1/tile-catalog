/**
 * Proper Breadcrumbs Component for Tile Catalog
 * Хлебные крошки по схеме: Все категории > {Помещение?} > {Тип} > {Материал}
 * Без поломок существующего функционала
 */

class TileBreadcrumbs {
  constructor() {
    this.container = null;
    this.catalog = null;
    
    // Нормализация и маппинг
    this.taxonomy = {
      place: new Map([
        ['для ванной комнаты', 'Для ванной комнаты'],
        ['для кухни', 'Для кухни'],
        ['для комнаты', 'Для комнаты'],
        ['для улицы', 'Для улицы']
      ]),
      type: new Map([
        ['настенная плитка', 'Настенная плитка'],
        ['напольная плитка', 'Напольная плитка'],
        ['декоративные элементы', 'Декоративные элементы'],
        ['ступени', 'Ступени'],
        ['мозаика', 'Мозаика'],
        ['панно', 'Панно'],
        ['бордюр', 'Бордюр'],
        ['вставка', 'Вставка'],
        ['строительная плитка', 'Строительная плитка']
      ]),
      material: new Map([
        ['керамика', 'Керамика'],
        ['кафель', 'Керамика'], // синоним
        ['керамогранит', 'Керамогранит'],
        ['стекло', 'Стекло']
      ])
    };
    
    this.slugs = {
      'Для ванной комнаты': 'dlya-vannoy',
      'Для кухни': 'dlya-kuhni', 
      'Для комнаты': 'dlya-komnaty',
      'Для улицы': 'dlya-ulitsy',
      'Настенная плитка': 'nastennaya-plitka',
      'Напольная плитка': 'napolnaya-plitka',
      'Декоративные элементы': 'dekorativnye-elementy',
      'Ступени': 'stupeni',
      'Мозаика': 'mozaika',
      'Панно': 'panno',
      'Бордюр': 'bordyur',
      'Вставка': 'vstavka',
      'Плитка': 'plitka',
      'Керамика': 'keramika',
      'Керамогранит': 'keramogranit',
      'Стекло': 'steklo'
    };
  }

  /**
   * Инициализация компонента
   */
  init() {
    this.findCatalog();
    this.createContainer();
    this.patchCatalogFilters();
    this.render();
  }

  /**
   * Поиск экземпляра каталога
   */
  findCatalog() {
    this.catalog = window.catalog || window.TileCatalog || 
                  (window.enhancedCatalog && window.enhancedCatalog.catalog);
    
    if (!this.catalog) {
      console.warn('[Breadcrumbs] Каталог не найден');
      return;
    }
  }

  /**
   * Создание контейнера для крошек над списком товаров
   */
  createContainer() {
    const anchor = document.querySelector('.products-toolbar, .controls-box');
    if (!anchor) return;

    // Удаляем старые крошки если есть
    const existing = document.getElementById('tile-breadcrumbs');
    if (existing) existing.remove();

    this.container = document.createElement('nav');
    this.container.id = 'tile-breadcrumbs';
    this.container.className = 'tile-breadcrumbs';
    this.container.setAttribute('role', 'navigation');
    this.container.setAttribute('aria-label', 'Хлебные крошки');

    // Вставляем ДО controls-box
    anchor.parentNode.insertBefore(this.container, anchor);
  }

  /**
   * Токенизация и нормализация itemCategory
   */
  tokenizeAndNormalize(itemCategory) {
    const tokens = String(itemCategory || '')
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
    
    // Убираем дубли
    const uniqueTokens = [...new Set(tokens)];
    
    const result = {
      place: new Set(),
      type: new Set(),
      material: new Set()
    };

    // Нормализация по уровням
    uniqueTokens.forEach(token => {
      // Помещение
      for (const [key, value] of this.taxonomy.place) {
        if (token.includes(key)) {
          result.place.add(value);
        }
      }
      
      // Материал (проверяем раньше типа для корректной обработки керамогранита)
      for (const [key, value] of this.taxonomy.material) {
        if (token.includes(key)) {
          result.material.add(value);
        }
      }
      
      // Тип
      for (const [key, value] of this.taxonomy.type) {
        if (token.includes(key)) {
          result.type.add(value);
        }
      }
    });

    // Правило: если есть Керамогранит + любой тип плитки - Керамогранит материал
    if (result.material.has('Керамогранит') && 
        (result.type.has('Настенная плитка') || result.type.has('Напольная плитка'))) {
      // уже корректно распределено
    }

    // Агрегация: если есть Настенная И/ИЛИ Напольная плитка - добавляем «Плитка»
    if (result.type.has('Настенная плитка') || result.type.has('Напольная плитка')) {
      result.type.add('Плитка');
    }

    // Агрегация декоративных элементов
    const decorativeTypes = ['Мозаика', 'Панно', 'Бордюр', 'Вставка'];
    if (decorativeTypes.some(t => result.type.has(t))) {
      result.type.add('Декоративные элементы');
    }

    return result;
  }

  /**
   * Пересечение множеств для поиска общих элементов
   */
  intersectSets(sets) {
    if (sets.length === 0) return new Set();
    
    const [first, ...rest] = sets;
    const result = new Set(first);
    
    for (const set of rest) {
      for (const value of [...result]) {
        if (!set.has(value)) {
          result.delete(value);
        }
      }
    }
    
    return result;
  }

  /**
   * Вычисление пути крошек для текущих товаров
   */
  computeBreadcrumbPath() {
    if (!this.catalog || !this.catalog.products) {
      return ['Все категории'];
    }

    // Берем отфильтрованные товары или все товары
    const currentProducts = this.catalog.filteredProducts && this.catalog.filteredProducts.length > 0
      ? this.catalog.filteredProducts 
      : this.catalog.products;

    if (currentProducts.length === 0) {
      return ['Все категории'];
    }

    // Нормализуем категории для каждого товара
    const normalizedByProduct = currentProducts.map(product => 
      this.tokenizeAndNormalize(product.itemCategoryList || product.itemCategory || [])
    );

    // Находим пересечения по уровням
    const commonPlace = this.intersectSets(normalizedByProduct.map(n => n.place));
    const commonType = this.intersectSets(normalizedByProduct.map(n => n.type));
    const commonMaterial = this.intersectSets(normalizedByProduct.map(n => n.material));

    // Строим путь
    const path = ['Все категории'];

    // Помещение - берем первое если есть единственное пересечение
    if (commonPlace.size === 1) {
      path.push([...commonPlace][0]);
    }

    // Тип - с логикой сворачивания
    if (commonType.size === 1) {
      path.push([...commonType][0]);
    } else if (commonType.size > 1) {
      // Проверяем возможность сворачивания
      const types = new Set(commonType);
      if (types.has('Настенная плитка') && types.has('Напольная плитка')) {
        path.push('Плитка');
      } else if (types.has('Декоративные элементы')) {
        path.push('Декоративные элементы');
      }
      // иначе пропускаем уровень
    }

    // Материал - только если есть единственный общий
    if (commonMaterial.size === 1) {
      path.push([...commonMaterial][0]);
    }

    return path;
  }

  /**
   * Рендеринг крошек
   */
  render() {
    if (!this.container) return;

    const path = this.computeBreadcrumbPath();
    
    const segments = path.map((segment, index) => {
      const isLast = index === path.length - 1;
      const slug = this.slugs[segment] || '';
      
      if (isLast) {
        return `<span class="bc-segment bc-current" aria-current="page">${segment}</span>`;
      } else {
        return `<button class="bc-segment bc-link" data-segment="${segment}" data-slug="${slug}" data-level="${index}">${segment}</button>`;
      }
    }).join('<span class="bc-separator">></span>');

    this.container.innerHTML = segments;
    this.bindEvents();
  }

  /**
   * Привязка событий клика
   */
  bindEvents() {
    if (!this.container) return;

    this.container.addEventListener('click', (e) => {
      const segment = e.target.closest('.bc-link');
      if (!segment) return;

      const level = parseInt(segment.dataset.level, 10);
      const segmentValue = segment.dataset.segment;
      
      this.handleSegmentClick(level, segmentValue, segment.dataset.slug);
    });
  }

  /**
   * Обработка клика по сегменту
   */
  handleSegmentClick(level, segmentValue, slug) {
    if (!this.catalog) return;

    // Сброс фильтров категорий
    if (!this.catalog.filters.categories) {
      this.catalog.filters.categories = new Set();
    }
    this.catalog.filters.categories.clear();

    // Применение фильтра в зависимости от уровня
    if (level === 0) {
      // "Все категории" - полный сброс
      // фильтры уже очищены
    } else {
      // Применяем фильтр по выбранному сегменту
      // Находим все токены, которые соответствуют этому сегменту
      const matchingTokens = this.findTokensForSegment(segmentValue);
      matchingTokens.forEach(token => {
        this.catalog.filters.categories.add(token);
      });
    }

    // Обновляем URL
    this.updateURL(slug);
    
    // Применяем фильтры и перерендериваем
    this.catalog.applyFilters();
  }

  /**
   * Поиск токенов, соответствующих сегменту
   */
  findTokensForSegment(segmentValue) {
    const tokens = new Set();
    
    // Ищем в исходных категориях все токены, которые нормализуются в этот сегмент
    this.catalog.products.forEach(product => {
      const categoryList = product.itemCategoryList || product.itemCategory || [];
      const rawTokens = String(categoryList).split(',').map(s => s.trim()).filter(Boolean);
      
      rawTokens.forEach(rawToken => {
        const normalized = this.tokenizeAndNormalize([rawToken]);
        
        if (normalized.place.has(segmentValue) || 
            normalized.type.has(segmentValue) || 
            normalized.material.has(segmentValue)) {
          tokens.add(rawToken);
        }
        
        // Особые случаи для агрегированных групп
        if (segmentValue === 'Плитка' && 
            (normalized.type.has('Настенная плитка') || normalized.type.has('Напольная плитка'))) {
          tokens.add(rawToken);
        }
        
        if (segmentValue === 'Декоративные элементы' && 
            ['Мозаика', 'Панно', 'Бордюр', 'Вставка'].some(t => normalized.type.has(t))) {
          tokens.add(rawToken);
        }
      });
    });
    
    return tokens;
  }

  /**
   * Обновление URL
   */
  updateURL(slug) {
    if (!slug) return;
    
    const url = new URL(window.location);
    if (slug === '') {
      url.pathname = '/';
    } else {
      url.pathname = `/${slug}`;
    }
    
    history.pushState(null, '', url);
  }

  /**
   * Патч для каталога - автообновление крошек
   */
  patchCatalogFilters() {
    if (!this.catalog || this.catalog.__breadcrumbs_patched) return;

    const originalApplyFilters = this.catalog.applyFilters.bind(this.catalog);
    
    this.catalog.applyFilters = () => {
      originalApplyFilters();
      // Обновляем крошки после применения фильтров
      setTimeout(() => this.render(), 10);
    };
    
    this.catalog.__breadcrumbs_patched = true;
  }
}

// Стили для крошек
const breadcrumbStyles = `
.tile-breadcrumbs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  margin-bottom: 0.75rem;
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-sm);
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) transparent;
  font-size: 0.875rem;
}

.tile-breadcrumbs::-webkit-scrollbar {
  height: 4px;
}

.tile-breadcrumbs::-webkit-scrollbar-track {
  background: transparent;
}

.tile-breadcrumbs::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 2px;
}

.bc-segment {
  flex-shrink: 0;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: all var(--transition-fast);
  text-overflow: ellipsis;
  overflow: hidden;
  max-width: 200px;
}

.bc-link {
  background: none;
  border: 1px solid transparent;
  color: var(--color-primary-dark);
  cursor: pointer;
  font-weight: 500;
}

.bc-link:hover {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.bc-link:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.bc-current {
  color: var(--color-text);
  font-weight: 700;
  background: var(--color-border-light);
  border: 1px solid var(--color-border);
}

.bc-separator {
  color: var(--color-text-muted);
  font-size: 0.75rem;
  opacity: 0.6;
  margin: 0 0.25rem;
  flex-shrink: 0;
}

/* Мобильная адаптация */
@media (max-width: 768px) {
  .tile-breadcrumbs {
    padding: 0.5rem 0.75rem;
    margin-bottom: 0.5rem;
    font-size: 0.8rem;
  }
  
  .bc-segment {
    padding: 0.2rem 0.4rem;
    max-width: 150px;
  }
  
  .bc-separator {
    margin: 0 0.15rem;
  }
}

/* Темная тема */
[data-theme="dark"] .tile-breadcrumbs {
  background: var(--color-surface-elevated);
  border-color: var(--color-border);
}

[data-theme="dark"] .bc-current {
  background: var(--color-border);
}
`;

// Автоинициализация
function initBreadcrumbs() {
  // Добавляем стили
  const styleSheet = document.createElement('style');
  styleSheet.textContent = breadcrumbStyles;
  document.head.appendChild(styleSheet);
  
  // Инициализируем крошки
  const breadcrumbs = new TileBreadcrumbs();
  breadcrumbs.init();
  
  // Сохраняем в глобальной области для отладки
  window.tileBreadcrumbs = breadcrumbs;
}

// Запуск после загрузки DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBreadcrumbs);
} else {
  initBreadcrumbs();
}

export default TileBreadcrumbs;