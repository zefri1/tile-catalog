/**
 * Каталог плитки - Современная реализация
 * Полный рефакторинг 2025
 */

class TileCatalog {
    constructor() {
        // Конфигурация
        this.config = {
            csvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRfhgka5nFoR1TXYDGQ5CziYYqGSDXjhw_yJeO-MqFTb-k_RWlkjvaWxy9vBzLuKmo4KdCnz2SAdvMh/pub?gid=0&single=true&output=csv',
            themes: {
                light: 'light',
                dark: 'dark'
            }
        };

        // Состояние приложения
        this.state = {
            products: [],
            filteredProducts: [],
            filters: {
                search: '',
                brands: new Set(),
                colors: new Set(),
                priceMin: 0,
                priceMax: 10000
            },
            sort: 'price-asc',
            theme: this.getStoredTheme(),
            loading: true,
            viewMode: 2  // NEW: Режим отображения (1 или 2 колонки)
        };

        // DOM элементы
        this.elements = {};

        // Инициализация
        this.init();
    }

    /**
     * Инициализация приложения
     */
    async init() {
        this.log('🚀 Инициализация каталога');
        
        try {
            // Инициализируем DOM элементы
            this.initElements();
            
            // Инициализируем тему
            this.initTheme();
            
            // Инициализируем обработчики событий
            this.initEventListeners();
            
            // Загружаем данные
            await this.loadData();
            
            // Инициализируем фильтры
            this.initFilters();
            
            // NEW: Загружаем сохранённый режим отображения
            this.loadStoredViewMode();
            this.updateViewButtons();
            this.updateGridClass();
            
            // Рендерим продукты
            this.renderProducts();
            
            // Скрываем экран загрузки
            this.hideLoadingScreen();
            
            this.log('✅ Каталог успешно инициализирован');

            // Синхронизируем расположение фильтров для текущей ширины
            const isOpen = this.elements.filtersToggle?.checked || false;
            this.syncFiltersPlacement(isOpen);
        } catch (error) {
            this.handleError('Ошибка инициализации', error);
        }
    }

    /**
     * Инициализация DOM элементов
     */
    initElements() {
        const selectors = {
            loadingScreen: '#loading-screen',
            themeToggle: '#theme-toggle',
            themeIcon: '.theme-icon',
            searchInput: '#search-input',
            brandFilters: '#brand-filters',
            colorFilters: '#color-filters',
            priceRange: '#price-range',
            priceMin: '#price-min',
            priceMax: '#price-max',
            clearFilters: '#clear-filters',
            sortSelect: '#sort-select',
            resultsCount: '#results-count',
            productsGrid: '#products-grid',
            noResults: '#no-results',
            // Toggle фильтров (мобайл)
            filtersSidebar: '#filters-sidebar',
            filtersToggle: '#filters-toggle',
            filtersCollapsible: '#filters-collapsible',
            // NEW: Селекторы для кнопок переключения вида
            viewGrid1: '#view-grid-1',
            viewGrid2: '#view-grid-2'
        };

        for (const [key, selector] of Object.entries(selectors)) {
            this.elements[key] = document.querySelector(selector);
            if (!this.elements[key]) {
                this.log(`⚠️ Элемент не найден: ${selector}`);
            }
        }
    }

    /**
     * Инициализация темы
     */
    initTheme() {
        this.log('🎨 Инициализация темы:', this.state.theme);
        this.applyTheme(this.state.theme);
    }

    /**
     * Применение темы
     */
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        if (this.elements.themeIcon) {
            this.elements.themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
        
        this.state.theme = theme;
        this.log('🎨 Тема применена:', theme);
    }

    /**
     * Переключение темы
     */
    toggleTheme() {
        const newTheme = this.state.theme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
    }

    /**
     * Получение сохраненной темы
     */
    getStoredTheme() {
        const stored = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return stored || (systemPrefersDark ? 'dark' : 'light');
    }

    /**
     * Инициализация обработчиков событий
     */
    initEventListeners() {
        // Переключение темы
        this.elements.themeToggle?.addEventListener('click', () => this.toggleTheme());

        // Поиск
        this.elements.searchInput?.addEventListener('input', (e) => {
            this.state.filters.search = e.target.value.toLowerCase().trim();
            this.filterAndRenderProducts();
        });

        // Ценовой слайдер
        this.elements.priceRange?.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.state.filters.priceMax = value;
            if (this.elements.priceMax) {
                this.elements.priceMax.value = value;
            }
            this.updatePriceDisplay();
            this.filterAndRenderProducts();
        });

        // Ценовые поля
        this.elements.priceMin?.addEventListener('input', (e) => {
            const value = parseInt(e.target.value) || 0;
            const maxValue = this.state.filters.priceMax;
            this.state.filters.priceMin = Math.min(value, maxValue - 1);
            e.target.value = this.state.filters.priceMin;
            this.filterAndRenderProducts();
        });

        this.elements.priceMax?.addEventListener('input', (e) => {
            const value = parseInt(e.target.value) || 0;
            const minValue = this.state.filters.priceMin;
            const sliderMax = parseInt(this.elements.priceRange?.max) || 10000;
            this.state.filters.priceMax = Math.max(Math.min(value, sliderMax), minValue + 1);
            e.target.value = this.state.filters.priceMax;
            
            // Синхронизируем слайдер
            if (this.elements.priceRange) {
                this.elements.priceRange.value = this.state.filters.priceMax;
            }
            this.filterAndRenderProducts();
        });

        // Сортировка
        this.elements.sortSelect?.addEventListener('change', (e) => {
            this.state.sort = e.target.value;
            this.renderProducts();
        });

        // Очистка фильтров
        this.elements.clearFilters?.addEventListener('click', () => this.clearAllFilters());

        // NEW: Обработчики переключения вида
        this.elements.viewGrid1?.addEventListener('click', () => this.changeViewMode(1));
        this.elements.viewGrid2?.addEventListener('click', () => this.changeViewMode(2));
        // Только 1 и 2

        // Переключатель панели фильтров (мобайл)
        this.elements.filtersToggle?.addEventListener('change', (e) => {
            const isOpen = e.target.checked;
            this.elements.filtersToggle.setAttribute('aria-expanded', String(isOpen));
            this.syncFiltersPlacement(isOpen);
        });

        // Реакция на изменение ширины экрана: переносим панель туда, где нужно
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                const isOpen = this.elements.filtersToggle?.checked || false;
                this.syncFiltersPlacement(isOpen);
            }, 120);
        });
    }

    /**
     * NEW: Изменение режима отображения
     */
    changeViewMode(columns) {
        // Разрешаем только 1 или 2 колонки, остальные значения игнорируем
        const next = Number(columns) === 1 ? 1 : 2;
        this.state.viewMode = next;
        this.updateViewButtons();
        this.updateGridClass();
        localStorage.setItem('viewMode', String(next));
        this.log(`🔀 Режим отображения изменен на ${next} колонки`);
    }

    /**
     * NEW: Перенос и показ фильтров вниз на мобилке
     */
    syncFiltersPlacement(isOpen) {
        const sidebar = this.elements.filtersSidebar;
        const collapsible = this.elements.filtersCollapsible;
        if (!sidebar || !collapsible) return;

        const isMobile = window.innerWidth <= 768;
        const panel = sidebar.querySelector('.filters-panel') || collapsible.querySelector('.filters-panel');
        if (!panel) return;

        if (isMobile) {
            // Переносим панель в коллапс под тулбаром (без inline display)
            if (!collapsible.contains(panel)) {
                collapsible.appendChild(panel);
            }
            collapsible.classList.toggle('open', isOpen);
            if (isOpen) {
                collapsible.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } else {
            // Возвращаем панель обратно в сайдбар
            if (!sidebar.contains(panel)) {
                sidebar.appendChild(panel);
            }
            collapsible.classList.remove('open');
            collapsible.style.removeProperty('display');
            // Сбрасываем состояние переключателя на десктопе
            if (this.elements.filtersToggle) {
                this.elements.filtersToggle.checked = false;
                this.elements.filtersToggle.setAttribute('aria-expanded', 'false');
            }
        }
    }

    /**
     * NEW: Обновление активной кнопки вида
     */
    updateViewButtons() {
        // Сбрасываем состояние на всех возможных кнопках
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
        });

        // Поддержка как по data-атрибуту, так и по конкретным ID
        const activeByData = document.querySelector(`[data-columns="${this.state.viewMode}"]`);
        if (activeByData) {
            activeByData.classList.add('active');
            activeByData.setAttribute('aria-pressed', 'true');
        }

        const { viewGrid1, viewGrid2 } = this.elements;
        if (viewGrid1) {
            viewGrid1.classList.toggle('active', this.state.viewMode === 1);
            viewGrid1.setAttribute('aria-pressed', String(this.state.viewMode === 1));
        }
        if (viewGrid2) {
            viewGrid2.classList.toggle('active', this.state.viewMode === 2);
            viewGrid2.setAttribute('aria-pressed', String(this.state.viewMode === 2));
        }
    }

    /**
     * NEW: Обновление класса сетки
     */
    updateGridClass() {
        if (!this.elements.productsGrid) return;
        
        // Убираем все классы режимов
        this.elements.productsGrid.classList.remove('grid-1', 'grid-2');
        
        // Добавляем нужный класс
        this.elements.productsGrid.classList.add(`grid-${this.state.viewMode}`);
    }

    /**
     * NEW: Загрузка сохранённого режима отображения
     */
    loadStoredViewMode() {
        const storedMode = localStorage.getItem('viewMode');
        if (storedMode && ['1', '2'].includes(storedMode)) {
            this.state.viewMode = parseInt(storedMode);
        } else {
            // Гарантируем корректное начальное значение и синхронизацию
            localStorage.setItem('viewMode', String(this.state.viewMode));
        }
    }

    /**
     * Обновление отображения цены
     */
    updatePriceDisplay() {
        if (this.elements.priceMin && this.elements.priceMax) {
            this.log(`💰 Диапазон цен: ${this.state.filters.priceMin} - ${this.state.filters.priceMax}`);
        }
    }

    /**
     * Загрузка данных
     */
    async loadData() {
        this.log('📥 Начинаем загрузку данных');
        
        try {
            // Пробуем загрузить из Google Sheets
            await this.loadFromGoogleSheets();
        } catch (error) {
            this.log('❌ Ошибка загрузки из Google Sheets:', error.message);
            // Загружаем демо данные
            this.loadDemoData();
        }
    }

    /**
     * Загрузка из Google Sheets
     */
    async loadFromGoogleSheets() {
        const url = `${this.config.csvUrl}&_cachebust=${Date.now()}`;
        this.log('🔗 Запрос к URL:', url);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'text/csv,application/csv,text/plain',
                'Cache-Control': 'no-cache'
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const csvText = await response.text();
        this.log('📄 Получено данных:', csvText.length, 'символов');

        if (csvText.length < 50) {
            throw new Error('Слишком короткий ответ от сервера');
        }

        this.parseCSVData(csvText);
    }

    /**
     * Парсинг CSV данных
     */
    parseCSVData(csvText) {
        this.log('🔍 Парсинг CSV данных');
        
        try {
            // Используем XLSX для парсинга CSV
            const workbook = XLSX.read(csvText, { type: 'string' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            this.log('📊 Строк получено:', jsonData.length);

            if (jsonData.length < 2) {
                throw new Error('Недостаточно данных в CSV');
            }

            // Предполагаем, что первая строка - заголовки
            const headers = jsonData[0];
            const rows = jsonData.slice(1);

            // Маппинг данных с улучшенной обработкой
            this.state.products = rows
                .filter(row => row && row.length > 0)
                .map(row => ({
                    id: this.generateId(),
                    name: this.cleanString(this.getString(row[0])) || 'Без названия',
                    brand: this.cleanString(this.getString(row[1])) || 'Неизвестно',
                    color: this.cleanString(this.getString(row[2])) || 'Не указан',
                    price: this.getNumber(row[3]) || 0,
                    description: this.cleanString(this.getString(row[4])) || '',
                    image: this.getString(row[5]) || '',
                    inStock: this.getBoolean(row[6]),
                    onDemand: this.getBoolean(row[7]),
                    hidden: this.getBoolean(row[8])
                }))
                .filter(product => {
                    // Показываем только доступные товары
                    const isAvailable = (product.inStock || product.onDemand) && !product.hidden;
                    if (!isAvailable) {
                        this.log('🚫 Товар скрыт:', product.name);
                    }
                    return isAvailable && product.name !== 'Без названия';
                });

            this.log('✅ Обработано товаров:', this.state.products.length);
            this.log('📦 Товары:', this.state.products);
        } catch (error) {
            this.log('❌ Ошибка парсинга CSV:', error);
            this.loadDemoData();
        }
    }

    /**
     * Очистка строк от HTML и лишних символов
     */
    cleanString(str) {
        if (!str) return '';
        return str
            .replace(/['\"<>]/g, '') // Удаляем кавычки и HTML символы
            .replace(/\s+/g, ' ') // Заменяем множественные пробелы на один
            .trim(); // Убираем пробелы в начале и конце
    }

    /**
     * Загрузка демо данных
     */
    loadDemoData() {
        this.log('🎭 Загружаем демо данные');
        
        this.state.products = [
            {
                id: 'demo-1',
                name: 'Керамическая плитка Marmo',
                brand: 'Ceramica',
                color: 'Белый',
                price: 1250,
                description: 'Элегантная керамическая плитка с мраморным узором. Идеально подходит для ванной комнаты и кухни.',
                image: '',
                inStock: true,
                onDemand: false,
                hidden: false
            },
            {
                id: 'demo-2',
                name: 'Плитка Modern Pattern',
                brand: 'ContempoStyle',
                color: 'Серый',
                price: 890,
                description: 'Современная плитка с геометрическим рисунком.',
                image: '',
                inStock: true,
                onDemand: false,
                hidden: false
            },
            {
                id: 'demo-3',
                name: 'Мозаика Vintage',
                brand: 'Retro Style',
                color: 'Бежевый',
                price: 1890,
                description: 'Винтажная мозаика для создания уютной и теплой атмосферы в доме.',
                image: '',
                inStock: false,
                onDemand: true,
                hidden: false
            },
            {
                id: 'demo-4',
                name: 'Плитка Wood Look',
                brand: 'Natural',
                color: 'Коричневый',
                price: 1450,
                description: 'Керамическая плитка под дерево. Натуральный вид без недостатков дерева.',
                image: '',
                inStock: true,
                onDemand: false,
                hidden: false
            },
            {
                id: 'demo-5',
                name: 'Глянцевая плитка Metro',
                brand: 'Classic',
                color: 'Черный',
                price: 750,
                description: 'Классическая глянцевая плитка в стиле метро. Универсальное решение для любого интерьера.',
                image: '',
                inStock: true,
                onDemand: false,
                hidden: false
            }
        ];
        
        this.log('✅ Демо данные загружены:', this.state.products.length, 'товаров');
    }

    /**
     * Инициализация фильтров
     */
    initFilters() {
        this.log('🔧 Инициализация фильтров');

        // Получаем уникальные бренды и цвета
        const brands = [...new Set(this.state.products.map(p => p.brand))].sort();
        const colors = [...new Set(this.state.products.map(p => p.color))].sort();

        // Создаем фильтры брендов
        if (this.elements.brandFilters) {
            this.elements.brandFilters.innerHTML = brands.map(brand => 
                this.createCheckboxFilter('brand', brand)
            ).join('');

            // Добавляем обработчики
            this.elements.brandFilters.addEventListener('change', (e) => {
                if (e.target.type === 'checkbox') {
                    if (e.target.checked) {
                        this.state.filters.brands.add(e.target.value);
                    } else {
                        this.state.filters.brands.delete(e.target.value);
                    }
                    this.filterAndRenderProducts();
                }
            });
        }

        // Создаем фильтры цветов
        if (this.elements.colorFilters) {
            this.elements.colorFilters.innerHTML = colors.map(color => 
                this.createCheckboxFilter('color', color)
            ).join('');

            // Добавляем обработчики
            this.elements.colorFilters.addEventListener('change', (e) => {
                if (e.target.type === 'checkbox') {
                    if (e.target.checked) {
                        this.state.filters.colors.add(e.target.value);
                    } else {
                        this.state.filters.colors.delete(e.target.value);
                    }
                    this.filterAndRenderProducts();
                }
            });
        }

        // Устанавливаем максимальную цену
        const maxPrice = Math.max(...this.state.products.map(p => p.price));
        this.state.filters.priceMax = maxPrice;

        if (this.elements.priceRange) {
            this.elements.priceRange.max = maxPrice;
            this.elements.priceRange.value = maxPrice;
        }

        if (this.elements.priceMax) {
            this.elements.priceMax.value = maxPrice;
        }

        this.log('✅ Фильтры инициализированы');
    }

    /**
     * Создание чекбокса для фильтра
     */
    createCheckboxFilter(type, value) {
        const id = `${type}-${value.replace(/\s+/g, '-').toLowerCase()}`;
        return `
            <div class="checkbox-item">
                <input type="checkbox" id="${id}" value="${value}">
                <label for="${id}" class="checkbox-text">${value}</label>
            </div>
        `;
    }

    /**
     * Применение фильтров и рендеринг
     */
    filterAndRenderProducts() {
        this.applyFilters();
        this.renderProducts();
    }

    /**
     * Применение фильтров
     */
    applyFilters() {
        this.state.filteredProducts = this.state.products.filter(product => {
            // Фильтр поиска
            if (this.state.filters.search) {
                const searchText = (product.name + ' ' + product.brand + ' ' + product.color + ' ' + product.description).toLowerCase();
                if (!searchText.includes(this.state.filters.search)) {
                    return false;
                }
            }

            // Фильтр по брендам
            if (this.state.filters.brands.size > 0 && !this.state.filters.brands.has(product.brand)) {
                return false;
            }

            // Фильтр по цветам
            if (this.state.filters.colors.size > 0 && !this.state.filters.colors.has(product.color)) {
                return false;
            }

            // Фильтр по цене
            if (product.price < this.state.filters.priceMin || product.price > this.state.filters.priceMax) {
                return false;
            }

            return true;
        });
    }

    /**
     * Рендеринг товаров
     */
    renderProducts() {
        if (!this.elements.productsGrid) return;

        this.applyFilters();
        this.sortProducts();
        this.updateResultsCount();

        if (this.state.filteredProducts.length === 0) {
            this.showNoResults();
        } else {
            this.hideNoResults();
            this.elements.productsGrid.innerHTML = this.state.filteredProducts
                .map(product => this.createProductCard(product))
                .join('');
        }
    }

    /**
     * Сортировка товаров
     */
    sortProducts() {
        this.state.filteredProducts.sort((a, b) => {
            switch (this.state.sort) {
                case 'price-asc':
                    return a.price - b.price;
                case 'price-desc':
                    return b.price - a.price;
                case 'name-asc':
                    return a.name.localeCompare(b.name, 'ru');
                case 'name-desc':
                    return b.name.localeCompare(a.name, 'ru');
                default:
                    return 0;
            }
        });
    }

    /**
     * Создание карточки товара
     */
    createProductCard(product) {
        // Подготавливаем бейджи
        const badges = [];
        if (product.inStock) {
            badges.push('<span class="badge badge-success">В наличии</span>');
        }
        if (product.onDemand) {
            badges.push('<span class="badge badge-warning">Под заказ</span>');
        }

        // Обработка изображения
        const imageHtml = product.image && product.image.trim() 
            ? `<img src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.style.display='none'; this.parentNode.querySelector('.product-placeholder').style.display='flex';">`
            : '';

        const priceDisplay = product.price > 0 ? product.price.toLocaleString('ru-RU') + ' ₽' : 'По запросу';

        return `
            <article class="product-card">
                <div class="product-image">
                    ${imageHtml}
                    <div class="product-placeholder" style="${product.image ? 'display: none;' : 'display: flex;'}">🏠</div>
                    ${badges.length > 0 ? `<div class="product-status">${badges[0].replace('<span class="badge badge-success">', '').replace('<span class="badge badge-warning">', '').replace('</span>', '')}</div>` : ''}
                </div>
                <div class="product-content">
                    <div class="product-header">
                        <h3 class="product-title">${product.name}</h3>
                        <div class="product-price">${priceDisplay}</div>
                    </div>
                    <div class="product-meta">
                        <span class="product-brand"><strong>Бренд:</strong> ${product.brand}</span>
                        <span class="product-color"><strong>Цвет:</strong> ${product.color}</span>
                    </div>
                    ${product.description ? `<p class="product-description">${product.description}</p>` : ''}
                    <div class="product-badges">
                        ${badges.join('')}
                    </div>
                    <a href="https://vk.com/plitochik44" target="_blank" class="product-contact">
                        Связаться
                    </a>
                </div>
            </article>
        `;
    }

    /**
     * Обновление счетчика результатов
     */
    updateResultsCount() {
        if (this.elements.resultsCount) {
            const total = this.state.products.length;
            const filtered = this.state.filteredProducts.length;
            this.elements.resultsCount.textContent = `Найдено товаров: ${filtered} из ${total}`;
        }
    }

    /**
     * Показать сообщение "Ничего не найдено"
     */
    showNoResults() {
        if (this.elements.noResults) {
            this.elements.noResults.classList.remove('hidden');
        }
        if (this.elements.productsGrid) {
            this.elements.productsGrid.innerHTML = '';
        }
    }

    /**
     * Скрыть сообщение "Ничего не найдено"
     */
    hideNoResults() {
        if (this.elements.noResults) {
            this.elements.noResults.classList.add('hidden');
        }
    }

    /**
     * Очистка всех фильтров
     */
    clearAllFilters() {
        // Очищаем поиск
        this.state.filters.search = '';
        if (this.elements.searchInput) {
            this.elements.searchInput.value = '';
        }

        // Очищаем фильтры брендов
        this.state.filters.brands.clear();
        const brandCheckboxes = this.elements.brandFilters?.querySelectorAll('input[type="checkbox"]');
        brandCheckboxes?.forEach(cb => cb.checked = false);

        // Очищаем фильтры цветов
        this.state.filters.colors.clear();
        const colorCheckboxes = this.elements.colorFilters?.querySelectorAll('input[type="checkbox"]');
        colorCheckboxes?.forEach(cb => cb.checked = false);

        // Сбрасываем ценовые фильтры
        const maxPrice = Math.max(...this.state.products.map(p => p.price));
        this.state.filters.priceMin = 0;
        this.state.filters.priceMax = maxPrice;

        if (this.elements.priceMin) {
            this.elements.priceMin.value = 0;
        }
        if (this.elements.priceMax) {
            this.elements.priceMax.value = maxPrice;
        }
        if (this.elements.priceRange) {
            this.elements.priceRange.value = maxPrice;
            this.elements.priceRange.max = maxPrice;
        }

        this.filterAndRenderProducts();
        this.log('🧹 Все фильтры очищены');
    }

    /**
     * Скрытие экрана загрузки
     */
    hideLoadingScreen() {
        if (this.elements.loadingScreen) {
            this.elements.loadingScreen.style.opacity = '0';
            setTimeout(() => {
                this.elements.loadingScreen.style.display = 'none';
            }, 300);
        }
    }

    /**
     * Обработка ошибок
     */
    handleError(message, error) {
        this.log('❌', message, error);
        this.hideLoadingScreen();
    }

    // Утилиты
    getString(value) {
        return value ? String(value).trim() : '';
    }

    getNumber(value) {
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
    }

    getBoolean(value) {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
            const lower = value.toLowerCase().trim();
            return lower === 'true' || lower === '1' || lower === 'да' || lower === 'yes';
        }
        return Boolean(value);
    }

    generateId() {
        return 'product-' + Math.random().toString(36).substr(2, 9);
    }

    log(...args) {
        console.log('[TileCatalog]', ...args);
    }
}

// Создаем и инициализируем каталог
document.addEventListener('DOMContentLoaded', () => {
    window.catalog = new TileCatalog();
});

// Экспорт для использования в других скриптах
window.TileCatalog = TileCatalog;
