import { Cart, updateCartUI } from './cart.js';

// Глобальные переменные для отслеживания состояния
let themeObserver = null;
let isUpdatingIcons = false;
let iconUpdateTimeout = null;

// Оптимизированная функция для обновления SVG иконок
function updateCartIconsForTheme(theme) {
  if (isUpdatingIcons) return;
  isUpdatingIcons = true;
  
  const isDark = theme === 'dark';
  const iconColor = isDark ? '#f1f5f9' : '#1e293b';
  
  // Обновляем только необходимые иконки
  const svgSelectors = [
    '#cart-btn svg',
    '.modal svg use[href="#cart-icon"]',
    '.modal svg use[href="#cart-check-icon"]',
    '.modal svg use[href="#vk-icon"]',
    '.add-to-cart svg',
    '.header-actions svg'
  ];
  
  svgSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      const svg = el.tagName === 'svg' ? el : el.closest('svg');
      if (svg && svg.style) {
        // Применяем стили через CSS классы вместо инлайновых стилей
        svg.setAttribute('data-theme-updated', theme);
      }
    });
  });
  
  // Очищаем флаг через короткий таймаут
  setTimeout(() => {
    isUpdatingIcons = false;
  }, 50);
}

// Оптимизированная функция принудительного обновления
function debounceIconUpdate() {
  if (iconUpdateTimeout) {
    clearTimeout(iconUpdateTimeout);
  }
  
  iconUpdateTimeout = setTimeout(() => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    updateCartIconsForTheme(currentTheme);
  }, 100);
}

// Очистка ресурсов
function cleanup() {
  if (themeObserver) {
    themeObserver.disconnect();
    themeObserver = null;
  }
  
  if (iconUpdateTimeout) {
    clearTimeout(iconUpdateTimeout);
    iconUpdateTimeout = null;
  }
  
  isUpdatingIcons = false;
}

// Обработчик выгрузки страницы
window.addEventListener('beforeunload', cleanup);
window.addEventListener('pagehide', cleanup);

document.addEventListener('DOMContentLoaded', () => {
  // Initialize cart UI
  updateCartUI();
  
  // Theme toggle functionality - улучшенная логика
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = themeToggle?.querySelector('.theme-icon');
  const currentTheme = localStorage.getItem('theme') || 'light';
  
  // Применяем тему при загрузке
  document.documentElement.setAttribute('data-theme', currentTheme);
  if (themeIcon) {
    themeIcon.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
  }
  
  // Однократное обновление иконок при загрузке
  requestAnimationFrame(() => {
    updateCartIconsForTheme(currentTheme);
  });

  // Обработчик переключения темы - без дублирования
  if (themeToggle) {
    // Убираем все старые обработчики
    const newThemeToggle = themeToggle.cloneNode(true);
    themeToggle.parentNode.replaceChild(newThemeToggle, themeToggle);
    const newThemeIcon = newThemeToggle.querySelector('.theme-icon');
    
    newThemeToggle.addEventListener('click', (e) => {
      e.preventDefault();
      
      const current = document.documentElement.getAttribute('data-theme');
      const newTheme = current === 'dark' ? 'light' : 'dark';
      
      // Применяем новую тему
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      
      if (newThemeIcon) {
        newThemeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
      }
      
      // Отложенное обновление иконок
      debounceIconUpdate();
    });
  }

  // Cart modal functionality
  const cartBtn = document.getElementById('cart-btn');
  const cartModal = document.getElementById('cart-modal');

  function openCart() {
    if (cartModal) {
      cartModal.classList.add('open');
      cartModal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      // Обновляем иконки только в модальном окне
      debounceIconUpdate();
    }
  }

  function closeCart() {
    if (cartModal) {
      cartModal.classList.remove('open');
      cartModal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
    }
  }

  cartBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openCart();
  });

  // Оптимизированные обработчики закрытия модальных окон
  const backdropHandler = (e) => {
    if (e.target.classList.contains('modal__backdrop')) {
      closeCart();
    }
  };
  
  const closeHandler = (e) => {
    if (e.target.classList.contains('modal__close')) {
      closeCart();
    }
  };
  
  cartModal?.addEventListener('click', backdropHandler);
  cartModal?.addEventListener('click', closeHandler);
  
  // Обработчик ESC - только один
  const escapeHandler = (e) => {
    if (e.key === 'Escape') {
      if (cartModal?.classList.contains('open')) {
        closeCart();
      }
      if (productModal?.classList.contains('open')) {
        closeProductModal();
      }
    }
  };
  
  document.addEventListener('keydown', escapeHandler);

  // Product modal functionality
  const productModal = document.getElementById('product-modal');
  const modalImage = document.getElementById('modal-image');
  const modalTitle = document.getElementById('modal-title');
  const modalPrice = document.getElementById('modal-price');
  const modalBrand = document.getElementById('modal-brand');
  const modalColor = document.getElementById('modal-color');
  const modalStatus = document.getElementById('modal-status');
  const modalDesc = document.getElementById('modal-desc');
  const modalAddToCart = document.getElementById('modal-add-to-cart');

  function openProductModal(product) {
    if (!productModal) return;
    
    if (modalImage) modalImage.src = product.image || '';
    if (modalTitle) modalTitle.textContent = product.name || '';
    if (modalPrice) modalPrice.textContent = `${product.price || 0} ₽`;
    if (modalBrand) modalBrand.textContent = product.brand || '';
    if (modalColor) modalColor.textContent = product.color || '';
    if (modalStatus) modalStatus.textContent = product.status || '';
    if (modalDesc) modalDesc.textContent = product.description || '';
    if (modalAddToCart) modalAddToCart.dataset.id = product.id;

    productModal.classList.add('open');
    productModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    
    updateCartUI();
    debounceIconUpdate();
  }

  function closeProductModal() {
    if (productModal) {
      productModal.classList.remove('open');
      productModal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
    }
  }

  // Обработчики для product modal
  const productModalBackdropHandler = (e) => {
    if (e.target.classList.contains('modal__backdrop')) {
      closeProductModal();
    }
  };
  
  const productModalCloseHandler = (e) => {
    if (e.target.classList.contains('modal__close')) {
      closeProductModal();
    }
  };
  
  productModal?.addEventListener('click', productModalBackdropHandler);
  productModal?.addEventListener('click', productModalCloseHandler);

  // Оптимизированный обработчик добавления в корзину
  const addToCartHandler = (e) => {
    const addToCartBtn = e.target.closest('.add-to-cart');
    if (!addToCartBtn) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const productId = addToCartBtn.dataset.id;
    if (!productId) return;
    
    // Get product data
    const card = addToCartBtn.closest('.product-card');
    const modal = addToCartBtn.closest('.modal');
    
    let product = {};
    
    if (card) {
      const img = card.querySelector('img');
      const nameEl = card.querySelector('.product-name');
      const priceEl = card.querySelector('.product-price');
      
      product = {
        id: productId,
        name: nameEl?.textContent?.trim() || 'Товар',
        price: parseInt((priceEl?.textContent || '0').replace(/[^0-9]/g, ''), 10) || 0,
        image: img?.src || ''
      };
    } else if (modal) {
      product = {
        id: productId,
        name: modalTitle?.textContent?.trim() || 'Товар',
        price: parseInt((modalPrice?.textContent || '0').replace(/[^0-9]/g, ''), 10) || 0,
        image: modalImage?.src || ''
      };
    }
    
    Cart.toggle(product);
  };
  
  // Единый обработчик кликов
  document.addEventListener('click', addToCartHandler);

  // Grid view controls
  const viewButtons = document.querySelectorAll('.view-btn');
  const productsGrid = document.getElementById('products-grid');
  
  const updateViewButtons = () => {
    viewButtons.forEach(btn => {
      const columns = parseInt(btn.dataset.columns);
      const mobileDigit = btn.querySelector('.view-digit--mobile');
      const desktopDigit = btn.querySelector('.view-digit--desktop');
      
      if (mobileDigit && desktopDigit) {
        mobileDigit.textContent = columns;
        desktopDigit.textContent = columns === 1 ? '4' : '5';
      }
    });
  };
  
  updateViewButtons();
  
  viewButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      viewButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      
      const columns = btn.dataset.columns;
      if (productsGrid) {
        productsGrid.className = productsGrid.className.replace(/grid-\d+/g, '');
        productsGrid.classList.add(`grid-${columns}`);
      }
    });
  });

  // Оптимизированный обработчик обновления корзины
  const cartUpdateHandler = () => {
    updateCartUI();
    debounceIconUpdate();
  };
  
  document.addEventListener('cart:update', cartUpdateHandler);
  
  // Оптимизированный обработчик кликов по карточкам
  const productCardHandler = (e) => {
    const productCard = e.target.closest('.product-card');
    if (!productCard) return;
    
    // Don't open modal if clicking on buttons
    if (e.target.closest('.add-to-cart, .qty-btn, button')) return;
    
    const img = productCard.querySelector('img');
    const nameEl = productCard.querySelector('.product-name');
    const priceEl = productCard.querySelector('.product-price');
    
    const product = {
      id: productCard.dataset.productId || Date.now().toString(),
      name: nameEl?.textContent?.trim() || 'Товар',
      price: parseInt((priceEl?.textContent || '0').replace(/[^0-9]/g, ''), 10) || 0,
      image: img?.src || '',
      brand: 'Бренд',
      color: 'Цвет',
      status: 'В наличии',
      description: 'Описание товара'
    };
    
    openProductModal(product);
  };
  
  document.addEventListener('click', productCardHandler);
  
  // Оптимизированный MutationObserver - только для смены темы
  themeObserver = new MutationObserver((mutations) => {
    let shouldUpdateIcons = false;
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && 
          mutation.attributeName === 'data-theme') {
        shouldUpdateIcons = true;
      }
    });
    
    if (shouldUpdateIcons) {
      debounceIconUpdate();
    }
  });
  
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  });
});