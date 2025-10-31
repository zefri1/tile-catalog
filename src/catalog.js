// Каталог продуктов с пагинацией и расширенными фильтрами

class ProductCatalog {
    constructor() {
        this.allProducts = [];
        this.filteredProducts = [];
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.loading = false;
        this.filters = {
            search: '',
            brands: new Set(),
            colors: new Set(),
            collections: new Set(),
            countries: new Set(),
            sizes: new Set(),
            priceMin: 0,
            priceMax: 5000
        };
        
        this.init();
    }
    
    async init() {
        await this.loadProducts();
        this.setupEventListeners();
        this.setupModal();
        this.displayProducts();
        this.hideLoadingScreen();
    }
    
    async loadProducts() {
        try {
            console.log('🔄 Загружаем каталог...');
            
            // Пробуем API сначала
            let response = await fetch(window.SHEET_JSON_URL);
            
            if (response.ok) {
                const data = await response.json();
                console.log(`✅ API вернул ${data.count} товаров`);
                
                if (data.items && data.items.length > 0) {
                    // Фильтруем только товары с ценой > 0 и не скрытые
                    this.allProducts = data.items.filter(item => 
                        item.price > 0 && (item.inStock || item.onDemand) && !item.hidden
                    );
                    console.log(`✅ Отфильтровано ${this.allProducts.length} товаров`);
                    return;
                }
            }
            
            throw new Error('Не удалось загрузить данные');
            
        } catch (error) {
            console.error('❌ Ошибка загрузки:', error);
            this.showError('Ошибка загрузки каталога');
        }
    }
    
    setupEventListeners() {
        // Поиск
        document.getElementById('search-input').addEventListener('input', (e) => {
            this.filters.search = e.target.value.toLowerCase();
            this.applyFiltersAndDisplay();
        });
        
        // Очистка фильтров
        document.querySelector('.clear-btn').addEventListener('click', () => {
            this.clearFilters();
        });
        
        // Сортировка
        document.getElementById('sort-select').addEventListener('change', (e) => {
            this.sortProducts(e.target.value);
        });
        
        // Переключение вида
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchView(e.target.getAttribute('data-columns'));
            });
        });
        
        // Слайдер цены
        document.getElementById('price-range').addEventListener('input', (e) => {
            this.filters.priceMax = parseInt(e.target.value);
            document.getElementById('price-max').value = this.filters.priceMax;
            this.applyFiltersAndDisplay();
        });
        
        // Поля цены
        document.getElementById('price-min').addEventListener('change', (e) => {
            this.filters.priceMin = parseInt(e.target.value) || 0;
            this.applyFiltersAndDisplay();
        });
        
        document.getElementById('price-max').addEventListener('change', (e) => {
            this.filters.priceMax = parseInt(e.target.value) || 5000;
            document.getElementById('price-range').value = this.filters.priceMax;
            this.applyFiltersAndDisplay();
        });
    }
    
    setupModal() {
        const modal = document.getElementById('product-modal');
        const backdrop = modal.querySelector('.modal__backdrop');
        const closeBtn = modal.querySelector('.modal__close');
        const closeModalBtn = modal.getElementById('modal-close-btn');
        
        [backdrop, closeBtn, closeModalBtn].forEach(element => {
            element?.addEventListener('click', () => {
                this.closeModal();
            });
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });
    }
    
    applyFiltersAndDisplay() {
        this.currentPage = 1;
        this.applyFilters();
        this.displayProducts();
    }
    
    applyFilters() {
        this.filteredProducts = this.allProducts.filter(product => {
            // Поиск по названию, бренду, описанию
            if (this.filters.search) {
                const searchText = [product.name, product.brand, product.description, product.color, product.collection]
                    .join(' ').toLowerCase();
                if (!searchText.includes(this.filters.search)) return false;
            }
            
            // Фильтр по брендам
            if (this.filters.brands.size > 0 && !this.filters.brands.has(product.brand)) {
                return false;
            }
            
            // Фильтр по цветам
            if (this.filters.colors.size > 0 && !this.filters.colors.has(product.color)) {
                return false;
            }
            
            // Фильтр по коллекциям
            if (this.filters.collections.size > 0 && !this.filters.collections.has(product.collection)) {
                return false;
            }
            
            // Фильтр по странам
            if (this.filters.countries.size > 0 && !this.filters.countries.has(product.country)) {
                return false;
            }
            
            // Фильтр по размерам
            if (this.filters.sizes.size > 0) {
                const normalizedSize = this.normalizeSize(product.size);
                if (!this.filters.sizes.has(normalizedSize)) return false;
            }
            
            // Фильтр по цене
            if (product.price < this.filters.priceMin || product.price > this.filters.priceMax) {
                return false;
            }
            
            return true;
        });
    }
    
    normalizeSize(size) {
        if (!size) return '';
        // Преобразуем 30x30x0,8 -> 30×30, 20×40, и т.д.
        const match = size.match(/(\d+)[xхx](\d+)/);
        return match ? `${match[1]}×${match[2]}` : size;
    }
    
    getVisibleProducts() {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        return this.filteredProducts.slice(startIndex, endIndex);
    }
    
    displayProducts() {
        this.updateFiltersUI();
        this.updateResultsInfo();
        
        const grid = document.getElementById('products-grid');
        const visibleProducts = this.getVisibleProducts();
        
        if (visibleProducts.length === 0) {
            this.showNoResults();
            return;
        }
        
        this.hideNoResults();
        
        // Отображаем товары с ленивой загрузкой изображений
        grid.innerHTML = visibleProducts.map(product => this.createProductCard(product)).join('');
        
        // Настраиваем ленивую загрузку
        this.setupLazyLoading();
        
        // Обновляем пагинацию
        this.updatePagination();
        
        // Обновляем событие клика на карточки
        this.setupProductCards();
    }
    
    createProductCard(product) {
        const statusClass = product.inStock ? 'in-stock' : 'on-demand';
        const statusText = product.inStock ? 'В НАЛИЧИИ' : 'ПОД ЗАКАЗ';
        const normalizedSize = this.normalizeSize(product.size);
        
        return `
            <div class="product-card" data-product-id="${product.id}">
                <div class="product-card__image">
                    <img data-src="${product.image}" alt="${product.name}" loading="lazy" class="lazy-image" style="display: none;">
                    <div class="image-placeholder">🏠</div>
                </div>
                <div class="product-card__info">
                    <h3 class="product-card__name">${product.name}</h3>
                    <div class="product-card__brand">${product.brand}</div>
                    ${product.collection ? `<div class="product-card__collection">${product.collection}</div>` : ''}
                    <div class="product-card__color">${product.color}</div>
                    ${normalizedSize ? `<div class="product-card__size">${normalizedSize}</div>` : ''}
                </div>
                <div class="product-card__footer">
                    <div class="product-card__price">${product.price.toLocaleString()} ₽</div>
                    <div class="product-card__status ${statusClass}">${statusText}</div>
                </div>
            </div>
        `;
    }
    
    setupLazyLoading() {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const src = img.getAttribute('data-src');
                    
                    if (src && src.startsWith('http')) {
                        img.src = src;
                        img.style.display = 'block';
                        
                        img.onload = () => {
                            const placeholder = img.parentElement.querySelector('.image-placeholder');
                            if (placeholder) {
                                placeholder.style.display = 'none';
                            }
                            img.parentElement.classList.add('image-loaded');
                        };
                        
                        img.onerror = () => {
                            img.style.display = 'none';
                            const placeholder = img.parentElement.querySelector('.image-placeholder');
                            if (placeholder) {
                                placeholder.style.display = 'flex';
                            }
                        };
                    }
                    
                    imageObserver.unobserve(img);
                }
            });
        }, {
            rootMargin: '100px 0px' // Начинаем загрузку за 100px
        });
        
        document.querySelectorAll('.lazy-image').forEach(img => {
            imageObserver.observe(img);
        });
    }
    
    setupProductCards() {
        document.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', () => {
                const productId = card.dataset.productId;
                const product = this.allProducts.find(p => p.id === productId);
                if (product) {
                    this.openModal(product);
                }
            });
        });
    }
    
    updateFiltersUI() {
        this.updateBrandFilters();
        this.updateColorFilters();
        this.updateCollectionFilters();
        this.updateCountryFilters();
        this.updateSizeFilters();
    }
    
    updateBrandFilters() {
        const brands = [...new Set(this.allProducts.map(p => p.brand))].sort();
        this.updateFilterGroup('brand-filters', brands, this.filters.brands, 'БРЕНДЫ');
    }
    
    updateColorFilters() {
        const colors = [...new Set(this.allProducts.map(p => p.color))]
            .filter(c => c && c !== 'Не указан')
            .sort();
        this.updateFilterGroup('color-filters', colors, this.filters.colors, 'ЦВЕТА');
    }
    
    updateCollectionFilters() {
        const collections = [...new Set(this.allProducts.map(p => p.collection))]
            .filter(c => c && c.length > 0)
            .sort();
        
        if (!document.getElementById('collection-filters')) {
            this.createFilterGroup('collection', 'КОЛЛЕКЦИИ');
        }
        
        this.updateFilterGroup('collection-filters', collections, this.filters.collections);
    }
    
    updateCountryFilters() {
        const countries = [...new Set(this.allProducts.map(p => p.country))]
            .filter(c => c && c.length > 0)
            .sort();
        
        if (!document.getElementById('country-filters')) {
            this.createFilterGroup('country', 'СТРАНА');
        }
        
        this.updateFilterGroup('country-filters', countries, this.filters.countries);
    }
    
    updateSizeFilters() {
        const sizes = [...new Set(this.allProducts.map(p => this.normalizeSize(p.size)))]
            .filter(s => s && s.length > 0)
            .sort((a, b) => {
                // Сортировка по числовому значению
                const aNum = parseInt(a.split('×')[0]) || 0;
                const bNum = parseInt(b.split('×')[0]) || 0;
                return aNum - bNum;
            });
        
        if (!document.getElementById('size-filters')) {
            this.createFilterGroup('size', 'РАЗМЕРЫ');
        }
        
        this.updateFilterGroup('size-filters', sizes, this.filters.sizes);
    }
    
    createFilterGroup(type, title) {
        const filtersContent = document.querySelector('.filters-content');
        const group = document.createElement('div');
        group.className = 'filter-group';
        group.innerHTML = `
            <label class="filter-label">${title}</label>
            <div id="${type}-filters" class="checkbox-group"></div>
        `;
        filtersContent.appendChild(group);
    }
    
    updateFilterGroup(containerId, items, activeSet, title) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        // Ограничиваем количество для производительности
        const displayItems = items.slice(0, 12);
        
        container.innerHTML = displayItems.map(item => `
            <label class="checkbox-label">
                <input type="checkbox" class="filter-checkbox" value="${item}" ${activeSet.has(item) ? 'checked' : ''}>
                <span class="checkbox-text">${item}</span>
            </label>
        `).join('');
        
        // Показываем сколько ещё
        if (items.length > 12) {
            const moreEl = document.createElement('div');
            moreEl.className = 'more-filters-hint';
            moreEl.textContent = `... и ещё ${items.length - 12}`;
            container.appendChild(moreEl);
        }
        
        // Добавляем обработчики
        container.querySelectorAll('.filter-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const filterType = containerId.replace('-filters', '');
                this.handleFilterChange(filterType, e.target.value, e.target.checked);
            });
        });
    }
    
    handleFilterChange(filterType, value, checked) {
        const filterMap = {
            'brand': this.filters.brands,
            'color': this.filters.colors,
            'collection': this.filters.collections,
            'country': this.filters.countries,
            'size': this.filters.sizes
        };
        
        const targetSet = filterMap[filterType];
        if (!targetSet) return;
        
        if (checked) {
            targetSet.add(value);
        } else {
            targetSet.delete(value);
        }
        
        this.applyFiltersAndDisplay();
    }
    
    updatePagination() {
        const totalItems = this.filteredProducts.length;
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        
        // Убираем старую пагинацию
        const existingPagination = document.querySelector('.pagination');
        if (existingPagination) {
            existingPagination.remove();
        }
        
        if (totalPages <= 1) return;
        
        const pagination = document.createElement('div');
        pagination.className = 'pagination';
        
        let paginationHTML = '<div class="pagination-controls">';
        
        // Предыдущая страница
        if (this.currentPage > 1) {
            paginationHTML += `<button class="pagination-btn pagination-prev" data-page="${this.currentPage - 1}">←</button>`;
        }
        
        // Номера страниц
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);
        
        if (startPage > 1) {
            paginationHTML += `<button class="pagination-btn" data-page="1">1</button>`;
            if (startPage > 2) {
                paginationHTML += `<span class="pagination-dots">...</span>`;
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === this.currentPage ? 'pagination-btn--active' : '';
            paginationHTML += `<button class="pagination-btn ${isActive}" data-page="${i}">${i}</button>`;
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<span class="pagination-dots">...</span>`;
            }
            paginationHTML += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
        }
        
        // Следующая страница
        if (this.currentPage < totalPages) {
            paginationHTML += `<button class="pagination-btn pagination-next" data-page="${this.currentPage + 1}">→</button>`;
        }
        
        paginationHTML += '</div>';
        
        // Кнопка "Показать ещё"
        if (this.currentPage < totalPages) {
            const remaining = totalItems - this.currentPage * this.itemsPerPage;
            paginationHTML += `
                <div class="load-more-container">
                    <button id="load-more-btn" class="load-more-btn">
                        Показать ещё ${Math.min(this.itemsPerPage, remaining)} товаров
                    </button>
                </div>
            `;
        }
        
        // Инфо о страницах
        paginationHTML += `
            <div class="pagination-info">
                Страница ${this.currentPage} из ${totalPages} • Показываем ${this.getVisibleProducts().length} из ${totalItems} товаров
            </div>
        `;
        
        pagination.innerHTML = paginationHTML;
        
        document.querySelector('.products-area').appendChild(pagination);
        
        // События пагинации
        pagination.querySelectorAll('.pagination-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = parseInt(e.target.dataset.page);
                if (page && page !== this.currentPage) {
                    this.currentPage = page;
                    this.displayProducts();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });
        
        // Событие "Показать ещё"
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.loadMore();
            });
        }
    }
    
    loadMore() {
        this.currentPage++;
        
        const grid = document.getElementById('products-grid');
        const newProducts = this.getVisibleProducts();
        
        // Добавляем новые товары в конец сетки
        newProducts.forEach(product => {
            const cardHTML = this.createProductCard(product);
            grid.insertAdjacentHTML('beforeend', cardHTML);
        });
        
        // Перенастраиваем lazy loading для новых изображений
        this.setupLazyLoading();
        this.setupProductCards();
        
        // Обновляем пагинацию
        this.updatePagination();
    }
    
    updateResultsInfo() {
        const resultsCount = document.getElementById('results-count');
        const totalFiltered = this.filteredProducts.length;
        const showing = Math.min(this.currentPage * this.itemsPerPage, totalFiltered);
        
        resultsCount.textContent = `Найдено товаров: ${totalFiltered}`;
    }
    
    showNoResults() {
        document.getElementById('products-grid').innerHTML = '';
        document.getElementById('no-results').classList.remove('hidden');
    }
    
    hideNoResults() {
        document.getElementById('no-results').classList.add('hidden');
    }
    
    clearFilters() {
        this.filters = {
            search: '',
            brands: new Set(),
            colors: new Set(),
            collections: new Set(),
            countries: new Set(),
            sizes: new Set(),
            priceMin: 0,
            priceMax: 5000
        };
        
        // Очищаем UI
        document.getElementById('search-input').value = '';
        document.getElementById('price-min').value = 0;
        document.getElementById('price-max').value = 5000;
        document.getElementById('price-range').value = 5000;
        
        document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        this.applyFiltersAndDisplay();
    }
    
    sortProducts(sortType) {
        this.currentSort = sortType || this.currentSort;
        
        switch (this.currentSort) {
            case 'price-asc':
                this.filteredProducts.sort((a, b) => a.price - b.price);
                break;
            case 'price-desc':
                this.filteredProducts.sort((a, b) => b.price - a.price);
                break;
            case 'name-asc':
                this.filteredProducts.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
                break;
            case 'name-desc':
                this.filteredProducts.sort((a, b) => b.name.localeCompare(a.name, 'ru'));
                break;
        }
        
        if (sortType) {
            this.currentPage = 1;
            this.displayProducts();
        }
    }
    
    switchView(columns) {
        const grid = document.getElementById('products-grid');
        const buttons = document.querySelectorAll('.view-btn');
        
        // Обновляем классы
        buttons.forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-columns="${columns}"]`).classList.add('active');
        
        // Меняем сетку
        grid.className = `products-grid grid-${columns}`;
        this.currentView = parseInt(columns);
    }
    
    openModal(product) {
        const modal = document.getElementById('product-modal');
        const modalImage = document.getElementById('modal-image');
        const modalImagePh = document.getElementById('modal-image-ph');
        
        // Заполняем данные
        document.getElementById('modal-title').textContent = product.name;
        document.getElementById('modal-brand').textContent = product.brand;
        document.getElementById('modal-color').textContent = product.color;
        document.getElementById('modal-price').textContent = `${product.price.toLocaleString()} ₽`;
        document.getElementById('modal-desc').textContent = product.description || 'Описание отсутствует';
        
        // Статус
        const statusText = product.inStock ? 'В наличии' : 'Под заказ';
        const statusClass = product.inStock ? 'status-success' : 'status-warning';
        document.getElementById('modal-status').innerHTML = `<span class="status-badge ${statusClass}">${statusText}</span>`;
        
        // Бейджи
        const badges = document.getElementById('modal-badges');
        badges.innerHTML = '';
        
        if (product.collection) {
            badges.innerHTML += `<span class="badge badge-info">${product.collection}</span>`;
        }
        
        const normalizedSize = this.normalizeSize(product.size);
        if (normalizedSize) {
            badges.innerHTML += `<span class="badge badge-secondary">${normalizedSize}</span>`;
        }
        
        if (product.country) {
            badges.innerHTML += `<span class="badge badge-outline">${product.country}</span>`;
        }
        
        // Изображение
        if (product.image && product.image.startsWith('http')) {
            modalImage.src = product.image;
            modalImage.style.display = 'block';
            modalImagePh.style.display = 'none';
            
            modalImage.onload = () => {
                modalImage.parentElement.classList.add('loaded');
            };
            
            modalImage.onerror = () => {
                modalImage.style.display = 'none';
                modalImagePh.style.display = 'flex';
            };
        } else {
            modalImage.style.display = 'none';
            modalImagePh.style.display = 'flex';
        }
        
        // Показываем модал
        modal.classList.add('modal--open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
        
        // Фокус для доступности
        modal.querySelector('.modal__close').focus();
    }
    
    closeModal() {
        const modal = document.getElementById('product-modal');
        modal.classList.remove('modal--open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
    }
    
    showError(message) {
        const grid = document.getElementById('products-grid');
        grid.innerHTML = `
            <div class="error-message">
                <div class="error-icon">⚠️</div>
                <h3>Ошибка загрузки</h3>
                <p>${message}</p>
                <button onclick="location.reload()" class="retry-btn">Попробовать снова</button>
            </div>
        `;
    }
    
    showLoadingScreen() {
        const el = document.getElementById('loading-screen');
        if (el) el.style.display = 'flex';
    }
    
    hideLoadingScreen() {
        setTimeout(() => {
            const el = document.getElementById('loading-screen');
            if (el) el.classList.add('loaded');
        }, 500);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.catalog = new ProductCatalog();
});