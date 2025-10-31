/**
 * Marketplace-style Category Navigation System
 * Создаёт навигацию по категориям как на маркетплейсах
 */

class MarketplaceCategoryNavigator {
  constructor(catalog) {
    this.catalog = catalog;
    this.categories = new Map();
    this.breadcrumbs = [];
    this.currentCategory = null;
    this.isInitialized = false;
    
    // Привязка методов к контексту
    this.handleCategoryClick = this.handleCategoryClick.bind(this);
    this.handleBreadcrumbClick = this.handleBreadcrumbClick.bind(this);
  }

  /**
   * Инициализация навигатора категорий
   */
  init() {
    if (this.isInitialized) return;
    
    this.buildCategoryTree();
    this.renderCategoryNavigation();
    this.isInitialized = true;
    
    console.log('[MarketplaceCategories] Навигация по категориям инициализирована');
  }

  /**
   * Построение дерева категорий из данных каталога
   */
  buildCategoryTree() {
    const allCategories = new Set();
    
    // Собираем все категории из продуктов
    this.catalog.products.forEach(product => {
      if (product.itemCategoryList && Array.isArray(product.itemCategoryList)) {
        product.itemCategoryList.forEach(category => {
          if (category && typeof category === 'string') {
            allCategories.add(category.trim());
          }
        });
      }
    });

    // Группируем категории по принципу: если есть подкатегории, создаем иерархию
    const categoryTree = new Map();
    const sortedCategories = Array.from(allCategories).sort((a, b) => 
      a.localeCompare(b, 'ru', { numeric: true })
    );

    sortedCategories.forEach(category => {
      // Определяем родительскую категорию по общим словам
      const parentCategory = this.findParentCategory(category, sortedCategories);
      
      if (parentCategory) {
        if (!categoryTree.has(parentCategory)) {
          categoryTree.set(parentCategory, {
            name: parentCategory,
            children: [],
            productCount: 0
          });
        }
        categoryTree.get(parentCategory).children.push({
          name: category,
          children: [],
          productCount: this.getProductCountForCategory(category)
        });
      } else {
        if (!categoryTree.has(category)) {
          categoryTree.set(category, {
            name: category,
            children: [],
            productCount: this.getProductCountForCategory(category)
          });
        }
      }
    });

    // Подсчитываем количество товаров для родительских категорий
    categoryTree.forEach((categoryData, categoryName) => {
      if (categoryData.children.length > 0) {
        categoryData.productCount = categoryData.children.reduce(
          (sum, child) => sum + child.productCount, 0
        ) + this.getProductCountForCategory(categoryName);
      }
    });

    this.categories = categoryTree;
  }

  /**
   * Поиск родительской категории для подкатегории
   */
  findParentCategory(category, allCategories) {
    const categoryWords = category.toLowerCase().split(/\s+/);
    
    // Ищем категории, которые могут быть родительскими
    for (let other of allCategories) {
      if (other === category) continue;
      
      const otherWords = other.toLowerCase().split(/\s+/);
      
      // Если текущая категория содержит слова из другой категории + дополнительные слова
      if (otherWords.length < categoryWords.length && 
          otherWords.every(word => categoryWords.includes(word))) {
        return other;
      }
    }
    
    return null;
  }

  /**
   * Получение количества товаров для категории
   */
  getProductCountForCategory(categoryName) {
    return this.catalog.products.filter(product => 
      product.itemCategoryList && 
      product.itemCategoryList.includes(categoryName)
    ).length;
  }

  /**
   * Отрисовка навигации по категориям
   */
  renderCategoryNavigation() {
    const sidebar = document.getElementById('filters-sidebar');
    if (!sidebar) return;

    // Сохраняем существующие фильтры
    const existingFilters = sidebar.querySelector('.filters-content');
    
    // Создаем контейнер для категорий
    const categoryNav = document.createElement('div');
    categoryNav.className = 'category-navigation';
    categoryNav.innerHTML = this.generateCategoryHTML();
    
    // Вставляем навигацию в начало боковой панели
    const filtersPanel = sidebar.querySelector('.filters-panel');
    if (filtersPanel) {
      filtersPanel.insertBefore(categoryNav, filtersPanel.firstChild);
    }

    // Привязываем события
    this.bindCategoryEvents();
  }

  /**
   * Генерация HTML для категорий
   */
  generateCategoryHTML() {
    let html = `
      <div class="category-header">
        <h3 class="category-title">Категории</h3>
        ${this.breadcrumbs.length > 0 ? this.generateBreadcrumbsHTML() : ''}
      </div>
      <div class="category-list">
    `;

    if (this.currentCategory === null) {
      // Показываем все основные категории
      html += `<div class="category-item category-all" data-category="">
        <span class="category-name">Все категории</span>
        <span class="category-count">${this.catalog.products.length}</span>
      </div>`;
      
      this.categories.forEach((categoryData, categoryName) => {
        html += this.generateCategoryItemHTML(categoryData);
      });
    } else {
      // Показываем подкатегории выбранной категории
      const currentCategoryData = this.categories.get(this.currentCategory);
      if (currentCategoryData && currentCategoryData.children.length > 0) {
        currentCategoryData.children.forEach(child => {
          html += this.generateCategoryItemHTML(child);
        });
      }
    }

    html += '</div>';
    return html;
  }

  /**
   * Генерация HTML для отдельной категории
   */
  generateCategoryItemHTML(categoryData) {
    const hasChildren = categoryData.children && categoryData.children.length > 0;
    const isExpandable = hasChildren && categoryData.children.length > 6;
    const visibleChildren = isExpandable ? categoryData.children.slice(0, 6) : categoryData.children;
    const hiddenCount = isExpandable ? categoryData.children.length - 6 : 0;

    let html = `
      <div class="category-item ${hasChildren ? 'has-children' : ''}" data-category="${categoryData.name}">
        <div class="category-main">
          <span class="category-name">${categoryData.name}</span>
          <span class="category-count">${categoryData.productCount}</span>
          ${hasChildren ? '<span class="category-arrow">▶</span>' : ''}
        </div>
    `;

    if (hasChildren) {
      html += '<div class="category-children">';
      visibleChildren.forEach(child => {
        html += `
          <div class="category-child" data-category="${child.name}">
            <span class="category-name">${child.name}</span>
            <span class="category-count">${child.productCount}</span>
          </div>
        `;
      });
      
      if (hiddenCount > 0) {
        html += `
          <div class="category-show-more" data-parent="${categoryData.name}">
            <span>Ещё ${hiddenCount}</span>
          </div>
        `;
      }
      html += '</div>';
    }

    html += '</div>';
    return html;
  }

  /**
   * Генерация хлебных крошек
   */
  generateBreadcrumbsHTML() {
    if (this.breadcrumbs.length === 0) return '';
    
    let html = '<div class="category-breadcrumbs">';
    
    html += '<span class="breadcrumb-item breadcrumb-home" data-category="">Все категории</span>';
    
    this.breadcrumbs.forEach((crumb, index) => {
      html += `
        <span class="breadcrumb-separator">▶</span>
        <span class="breadcrumb-item" data-category="${crumb}">${crumb}</span>
      `;
    });
    
    html += '</div>';
    return html;
  }

  /**
   * Привязка событий к элементам категорий
   */
  bindCategoryEvents() {
    const categoryNav = document.querySelector('.category-navigation');
    if (!categoryNav) return;

    // Клики по категориям
    categoryNav.addEventListener('click', (e) => {
      const categoryItem = e.target.closest('.category-item, .category-child');
      const breadcrumbItem = e.target.closest('.breadcrumb-item');
      const showMoreBtn = e.target.closest('.category-show-more');

      if (showMoreBtn) {
        this.handleShowMoreClick(showMoreBtn);
      } else if (breadcrumbItem) {
        this.handleBreadcrumbClick(breadcrumbItem);
      } else if (categoryItem) {
        this.handleCategoryClick(categoryItem);
      }
    });
  }

  /**
   * Обработка клика по категории
   */
  handleCategoryClick(element) {
    const categoryName = element.dataset.category;
    
    if (categoryName === '') {
      // Сброс к "Все категории"
      this.currentCategory = null;
      this.breadcrumbs = [];
      this.applyAllCategories();
    } else {
      const categoryData = this.categories.get(categoryName);
      
      if (categoryData && categoryData.children.length > 0) {
        // Переход к подкатегориям
        this.currentCategory = categoryName;
        this.breadcrumbs = [categoryName];
      } else {
        // Фильтрация по выбранной категории
        this.applyCategoryFilter(categoryName);
      }
    }
    
    this.updateNavigation();
  }

  /**
   * Обработка клика по хлебным крошкам
   */
  handleBreadcrumbClick(element) {
    const categoryName = element.dataset.category;
    
    if (categoryName === '') {
      this.currentCategory = null;
      this.breadcrumbs = [];
      this.applyAllCategories();
    } else {
      const crumbIndex = this.breadcrumbs.indexOf(categoryName);
      if (crumbIndex !== -1) {
        this.breadcrumbs = this.breadcrumbs.slice(0, crumbIndex + 1);
        this.currentCategory = categoryName;
      }
    }
    
    this.updateNavigation();
  }

  /**
   * Обработка "Показать ещё"
   */
  handleShowMoreClick(element) {
    const parentCategory = element.dataset.parent;
    const categoryData = this.categories.get(parentCategory);
    
    if (categoryData) {
      // Показываем все дочерние категории
      const parentElement = element.closest('.category-item');
      const childrenContainer = parentElement.querySelector('.category-children');
      
      // Удаляем кнопку "Показать ещё"
      element.remove();
      
      // Добавляем скрытые категории
      const hiddenChildren = categoryData.children.slice(6);
      hiddenChildren.forEach(child => {
        const childElement = document.createElement('div');
        childElement.className = 'category-child';
        childElement.dataset.category = child.name;
        childElement.innerHTML = `
          <span class="category-name">${child.name}</span>
          <span class="category-count">${child.productCount}</span>
        `;
        childrenContainer.appendChild(childElement);
      });
    }
  }

  /**
   * Применение фильтра по всем категориям
   */
  applyAllCategories() {
    // Сбрасываем фильтр категорий в каталоге
    if (this.catalog.filters.categories) {
      this.catalog.filters.categories.clear();
    }
    this.catalog.applyFilters();
  }

  /**
   * Применение фильтра по категории
   */
  applyCategoryFilter(categoryName) {
    if (!this.catalog.filters.categories) {
      this.catalog.filters.categories = new Set();
    }
    
    // Очищаем предыдущие фильтры категорий
    this.catalog.filters.categories.clear();
    
    // Добавляем выбранную категорию
    this.catalog.filters.categories.add(categoryName);
    
    // Применяем фильтры
    this.catalog.applyFilters();
    
    // Обновляем чекбоксы в фильтрах
    this.updateCategoryCheckboxes(categoryName);
  }

  /**
   * Обновление чекбоксов категорий
   */
  updateCategoryCheckboxes(selectedCategory) {
    const categoryCheckboxes = document.querySelectorAll('#category-filters .filter-checkbox');
    categoryCheckboxes.forEach(checkbox => {
      checkbox.checked = checkbox.value === selectedCategory;
    });
  }

  /**
   * Обновление навигации
   */
  updateNavigation() {
    const categoryNav = document.querySelector('.category-navigation');
    if (categoryNav) {
      categoryNav.innerHTML = this.generateCategoryHTML();
    }
  }

  /**
   * Получение текущего состояния
   */
  getState() {
    return {
      currentCategory: this.currentCategory,
      breadcrumbs: [...this.breadcrumbs],
      categoriesCount: this.categories.size
    };
  }

  /**
   * Сброс навигации
   */
  reset() {
    this.currentCategory = null;
    this.breadcrumbs = [];
    this.updateNavigation();
    this.applyAllCategories();
  }
}

// Экспорт для использования в других модулях
window.MarketplaceCategoryNavigator = MarketplaceCategoryNavigator;
export default MarketplaceCategoryNavigator;