import { Cart, updateCartUI } from './cart.js';

// Функция для обновления SVG иконок при переключении темы
function updateCartIconsForTheme(theme) {
  const isDark = theme === 'dark';
  const iconColor = isDark ? '#f1f5f9' : '#1e293b';
  
  // Обновляем все SVG иконки корзины
  const cartIcons = document.querySelectorAll('svg use[href="#cart-icon"], svg use[href="#cart-check-icon"]');
  cartIcons.forEach(icon => {
    const svg = icon.closest('svg');
    if (svg) {
      svg.style.color = iconColor;
      // Принудительно обновляем стили
      svg.style.stroke = iconColor;
      svg.style.fill = iconColor;
    }
  });
  
  // Обновляем VK иконки
  const vkIcons = document.querySelectorAll('svg use[href="#vk-icon"]');
  vkIcons.forEach(icon => {
    const svg = icon.closest('svg');
    if (svg) {
      svg.style.color = iconColor;
      svg.style.fill = iconColor;
    }
  });
  
  // Обновляем все иконки с классом .icon
  const allIconSvgs = document.querySelectorAll('.icon svg, svg.icon');
  allIconSvgs.forEach(svg => {
    svg.style.color = iconColor;
    if (svg.querySelector('use[href="#cart-icon"], use[href="#cart-check-icon"], use[href="#vk-icon"]')) {
      svg.style.stroke = iconColor;
      svg.style.fill = iconColor;
    }
  });
  
  // Диспатчим событие для уведомления о смене темы
  document.dispatchEvent(new CustomEvent('theme:changed', { detail: { theme } }));
}

// Дополнительная функция для принудительного обновления всех иконок
function forceUpdateAllIcons() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  updateCartIconsForTheme(currentTheme);
  
  // Принудительно перерисовываем все SVG
  document.querySelectorAll('svg').forEach(svg => {
    svg.style.display = 'none';
    svg.offsetHeight; // trigger reflow
    svg.style.display = '';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // Initialize cart UI
  updateCartUI();
  
  // Theme toggle functionality
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = themeToggle?.querySelector('.theme-icon');
  const currentTheme = localStorage.getItem('theme') || 'light';
  
  // Применяем тему при загрузке
  document.documentElement.setAttribute('data-theme', currentTheme);
  if (themeIcon) themeIcon.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
  
  // Обновляем иконки при загрузке с небольшой задержкой
  setTimeout(() => {
    updateCartIconsForTheme(currentTheme);
    forceUpdateAllIcons();
  }, 100);

  themeToggle?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    
    // Применяем новую тему
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    if (themeIcon) themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    
    // Обновляем SVG иконки с задержкой для корректного применения CSS
    setTimeout(() => {
      updateCartIconsForTheme(newTheme);
      forceUpdateAllIcons();
    }, 50);
  });

  // Cart modal functionality
  const cartBtn = document.getElementById('cart-btn');
  const cartModal = document.getElementById('cart-modal');

  function openCart() {
    cartModal.classList.add('open');
    cartModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    // Обновляем иконки при открытии модального окна
    setTimeout(forceUpdateAllIcons, 50);
  }

  function closeCart() {
    cartModal.classList.remove('open');
    cartModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  cartBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openCart();
  });

  cartModal?.querySelector('.modal__backdrop')?.addEventListener('click', closeCart);
  cartModal?.querySelector('.modal__close')?.addEventListener('click', closeCart);
  
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && cartModal?.classList.contains('open')) {
      closeCart();
    }
  });

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
    
    // Update the modal button state and icons
    updateCartUI();
    setTimeout(forceUpdateAllIcons, 50);
  }

  function closeProductModal() {
    productModal.classList.remove('open');
    productModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  productModal?.querySelector('.modal__backdrop')?.addEventListener('click', closeProductModal);
  productModal?.querySelector('.modal__close')?.addEventListener('click', closeProductModal);
  
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && productModal?.classList.contains('open')) {
      closeProductModal();
    }
  });

  // Add to cart functionality with TOGGLE logic for proper state switching
  document.addEventListener('click', (e) => {
    const addToCartBtn = e.target.closest('.add-to-cart');
    if (!addToCartBtn) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const productId = addToCartBtn.dataset.id;
    if (!productId) return;
    
    // Get product data from the card or modal
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
    
    // Используем toggle для правильного переключения состояния
    Cart.toggle(product);
    
    // Обновляем иконки после изменения корзины
    setTimeout(forceUpdateAllIcons, 100);
  });

  // Grid view controls with proper column mapping
  const viewButtons = document.querySelectorAll('.view-btn');
  const productsGrid = document.getElementById('products-grid');
  
  // Правильное отображение количества колонок
  const updateViewButtons = () => {
    viewButtons.forEach(btn => {
      const columns = parseInt(btn.dataset.columns);
      const mobileDigit = btn.querySelector('.view-digit--mobile');
      const desktopDigit = btn.querySelector('.view-digit--desktop');
      
      if (mobileDigit && desktopDigit) {
        // На мобильных: 1 или 2 колонки
        // На десктопе: 4 или 5 колонок
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
        // Убираем все классы grid-* и добавляем новый
        productsGrid.className = productsGrid.className.replace(/grid-\d+/g, '');
        productsGrid.classList.add(`grid-${columns}`);
        
        // Проверяем, что класс применился
        console.log(`Grid view changed to: ${columns} columns, classes:`, productsGrid.className);
      }
    });
  });

  // Listen for cart updates
  document.addEventListener('cart:update', () => {
    updateCartUI();
    setTimeout(forceUpdateAllIcons, 50);
  });
  
  // Product card click handlers
  document.addEventListener('click', (e) => {
    const productCard = e.target.closest('.product-card');
    if (!productCard) return;
    
    // Don't open modal if clicking on buttons
    if (e.target.closest('.add-to-cart, .qty-btn, button')) return;
    
    // Mock product data - in real app this would come from your data source
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
  });
  
  // Дополнительное обновление иконок при изменении DOM
  const observer = new MutationObserver(() => {
    setTimeout(forceUpdateAllIcons, 100);
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'data-theme']
  });
});