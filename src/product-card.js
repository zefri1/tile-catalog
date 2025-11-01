/**
 * Компонент карточки товара с кнопками +/− и правильной интеграцией с корзиной
 */

import { Cart } from './cart.js';

/**
 * Создать карточку товара с кнопками управления количеством
 */
export function createProductCard(product) {
  const cartItem = Cart.getItem(product.id);
  const inCart = cartItem && cartItem.qty > 0;
  const quantity = inCart ? cartItem.qty : 0;
  
  // Проверка и подготовка данных
  const price = parseFloat(product.price) || 0;
  const imageUrl = product.image?.trim() || '';
  const hasImage = imageUrl && imageUrl !== '' && imageUrl !== 'null' && imageUrl !== 'undefined';
  
  return `
    <article class="product-card" data-id="${product.id}" tabindex="0">
      <div class="product-card__image">
        ${hasImage 
          ? `<img src="${imageUrl}" alt="${product.name}" class="lazy-image" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` 
          : ''
        }
        <div class="image-placeholder" style="${hasImage ? 'display: none;' : 'display: flex;'}">🏠</div>
      </div>
      
      <div class="product-card__content">
        <div class="product-card__info">
          <h3 class="product-card__name">${product.name}</h3>
          ${product.brand ? `<div class="product-card__brand">${product.brand}</div>` : ''}
          ${product.color ? `<div class="product-card__color">${product.color}</div>` : ''}
          ${product.collection ? `<div class="product-card__collection">${product.collection}</div>` : ''}
          ${product.size ? `<div class="product-card__size">${product.size}</div>` : ''}
        </div>
        
        <div class="product-card__footer">
          <div class="product-card__price">${price > 0 ? price.toLocaleString('ru-RU') + ' ₽' : 'Цена по запросу'}</div>
          
          <!-- Кнопки управления корзиной -->
          <div class="product-card__cart-controls">
            ${inCart ? `
              <!-- Товар в корзине: показываем кнопки +/− -->
              <div class="quantity-controls">
                <button class="qty-btn qty-btn--dec" data-id="${product.id}" aria-label="Уменьшить количество">
                  −
                </button>
                <span class="qty-display">${quantity}</span>
                <button class="qty-btn qty-btn--inc" data-id="${product.id}" aria-label="Увеличить количество">
                  +
                </button>
              </div>
            ` : `
              <!-- Товара нет в корзине: показываем кнопку "В корзину" -->
              <button class="add-to-cart-btn" data-id="${product.id}" aria-label="Добавить в корзину">
                <svg class="icon"><use href="#cart-icon"></use></svg>
                <span>В корзину</span>
              </button>
            `}
          </div>
        </div>
        
        ${product.status ? `<div class="product-card__status"><span class="status-badge status-${product.status.toLowerCase().replace(/\s+/g, '-')}">${product.status}</span></div>` : ''}
      </div>
    </article>
  `;
}

/**
 * Настроить обработчики событий для карточек товаров
 */
export function setupProductCardEvents() {
  const productsGrid = document.getElementById('products-grid');
  if (!productsGrid) return;
  
  // Делегирование событий для всех кнопок в сетке товаров
  productsGrid.addEventListener('click', (e) => {
    const target = e.target.closest('button');
    if (!target) return;
    
    const productId = target.dataset.id;
    if (!productId) return;
    
    e.stopPropagation(); // Предотвращаем открытие модалки при клике на кнопки
    
    if (target.classList.contains('add-to-cart-btn')) {
      // Добавление товара в корзину
      handleAddToCart(productId, target);
    } else if (target.classList.contains('qty-btn--inc')) {
      // Увеличение количества
      Cart.inc(productId);
    } else if (target.classList.contains('qty-btn--dec')) {
      // Уменьшение количества
      Cart.dec(productId);
    }
  });
  
  // Открытие модалки при клике на карточку (но не на кнопки)
  productsGrid.addEventListener('click', (e) => {
    const productCard = e.target.closest('.product-card');
    const isButton = e.target.closest('button');
    
    if (productCard && !isButton) {
      const productId = productCard.dataset.id;
      if (productId && window.openProductModal) {
        window.openProductModal(productId);
      }
    }
  });
}

/**
 * Обработать добавление товара в корзину
 */
function handleAddToCart(productId, buttonElement) {
  // Найти данные товара
  const productCard = buttonElement.closest('.product-card');
  if (!productCard) return;
  
  // Получить данные товара из глобального хранилища или из DOM
  const product = getProductData(productId, productCard);
  if (product) {
    Cart.add(product);
    
    // Визуальная обратная связь
    buttonElement.style.transform = 'scale(0.95)';
    setTimeout(() => {
      buttonElement.style.transform = '';
    }, 150);
  }
}

/**
 * Получить данные товара для добавления в корзину
 */
function getProductData(productId, productCard) {
  // Попробовать получить из глобального хранилища
  if (window.productsData && window.productsData[productId]) {
    return window.productsData[productId];
  }
  
  // Извлечь из DOM как fallback
  const nameElement = productCard.querySelector('.product-card__name');
  const priceElement = productCard.querySelector('.product-card__price');
  const imageElement = productCard.querySelector('.lazy-image');
  
  if (!nameElement) return null;
  
  const priceText = priceElement?.textContent || '';
  const price = parseFloat(priceText.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
  
  return {
    id: productId,
    name: nameElement.textContent?.trim() || '',
    price: price,
    image: imageElement?.src || ''
  };
}

/**
 * Обновить все карточки товаров после изменения корзины
 */
export function updateProductCards() {
  const productCards = document.querySelectorAll('.product-card');
  
  productCards.forEach(card => {
    const productId = card.dataset.id;
    if (!productId) return;
    
    const cartItem = Cart.getItem(productId);
    const inCart = cartItem && cartItem.qty > 0;
    const quantity = inCart ? cartItem.qty : 0;
    
    const controlsContainer = card.querySelector('.product-card__cart-controls');
    if (!controlsContainer) return;
    
    // Обновить содержимое контролов корзины
    if (inCart) {
      // Показать кнопки +/−
      controlsContainer.innerHTML = `
        <div class="quantity-controls">
          <button class="qty-btn qty-btn--dec" data-id="${productId}" aria-label="Уменьшить количество">
            −
          </button>
          <span class="qty-display">${quantity}</span>
          <button class="qty-btn qty-btn--inc" data-id="${productId}" aria-label="Увеличить количество">
            +
          </button>
        </div>
      `;
    } else {
      // Показать кнопку "В корзину"
      controlsContainer.innerHTML = `
        <button class="add-to-cart-btn" data-id="${productId}" aria-label="Добавить в корзину">
          <svg class="icon"><use href="#cart-icon"></use></svg>
          <span>В корзину</span>
        </button>
      `;
    }
  });
}

// Автоматическая настройка при загрузке модуля
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupProductCardEvents);
} else {
  setupProductCardEvents();
}

// Слушать изменения корзины
document.addEventListener('cart:update', updateProductCards);

// Экспорт для глобального доступа
window.updateProductCards = updateProductCards;