const CART_KEY = 'tile-cart-v1';

function load(){ try{ return JSON.parse(localStorage.getItem(CART_KEY)||'{}'); }catch{ return {}; } }
function save(state){ localStorage.setItem(CART_KEY, JSON.stringify(state)); }
function totalCount(state){ return Object.values(state).reduce((a,i)=>a + (i.qty||0), 0); }
function totalSum(state){ return Object.values(state).reduce((a,i)=>a + (i.qty||0)*(i.price||0), 0); }

export const Cart = {
  state: load(),
  
  // Добавить товар в корзину (всегда количество = 1)
  add(item){
    this.state[item.id] = { 
      id: item.id, 
      name: item.name, 
      price: item.price || 0, 
      image: item.image || '', 
      qty: 1 
    };
    save(this.state);
    document.dispatchEvent(new CustomEvent('cart:update'));
  },
  
  // Переключить товар в корзине (добавить/удалить)
  toggle(item){
    if(this.state[item.id]) {
      // Если товар есть в корзине - удаляем
      delete this.state[item.id];
    } else {
      // Если товара нет - добавляем с количеством 1
      this.state[item.id] = { 
        id: item.id, 
        name: item.name, 
        price: item.price || 0, 
        image: item.image || '', 
        qty: 1 
      };
    }
    save(this.state);
    document.dispatchEvent(new CustomEvent('cart:update'));
  },
  
  // Увеличить количество (только для модального окна корзины)
  inc(id){ 
    if(!this.state[id]) return; 
    this.state[id].qty += 1; 
    save(this.state); 
    document.dispatchEvent(new CustomEvent('cart:update')); 
  },
  
  // Уменьшить количество
  dec(id){ 
    if(!this.state[id]) return; 
    this.state[id].qty = Math.max(0, this.state[id].qty-1); 
    if(this.state[id].qty === 0) delete this.state[id]; 
    save(this.state); 
    document.dispatchEvent(new CustomEvent('cart:update')); 
  },
  
  // Установить конкретное количество
  set(id, qty){ 
    if(qty <= 0){ 
      delete this.state[id]; 
    } else { 
      if(!this.state[id]) return; 
      this.state[id].qty = qty; 
    } 
    save(this.state); 
    document.dispatchEvent(new CustomEvent('cart:update')); 
  },
  
  // Удалить товар
  remove(id){
    delete this.state[id];
    save(this.state);
    document.dispatchEvent(new CustomEvent('cart:update'));
  },
  
  // Очистить корзину
  clear(){ 
    this.state = {}; 
    save(this.state); 
    document.dispatchEvent(new CustomEvent('cart:update')); 
  },
  
  // Получить общее количество товаров
  totalCount(){ return totalCount(this.state); },
  
  // Получить общую сумму
  totalSum(){ return totalSum(this.state); },
  
  // Получить все товары
  items(){ return Object.values(this.state); },
  
  // Получить конкретный товар
  getItem(id) { return this.state[id] || null; },
  
  // Проверить, есть ли товар в корзине
  hasItem(id) { return !!this.state[id]; }
};

// UI update functions
export function updateCartUI() {
  // Update header cart counter
  const headerCounter = document.getElementById('cart-counter');
  const count = Cart.totalCount();
  
  if (headerCounter) {
    headerCounter.textContent = count;
    if (count > 0) {
      headerCounter.classList.remove('hidden');
    } else {
      headerCounter.classList.add('hidden');
    }
  }
  
  // Update all add-to-cart buttons
  document.querySelectorAll('.add-to-cart').forEach(button => {
    const productId = button.dataset.id;
    if (!productId) return;
    
    const cartItem = Cart.getItem(productId);
    const textSpan = button.querySelector('.cart-text');
    const icon = button.querySelector('.icon use');
    
    if (cartItem && cartItem.qty > 0) {
      // Item is in cart
      button.classList.add('in-cart');
      if (textSpan) textSpan.textContent = 'В корзине';
      if (icon) icon.setAttribute('href', '#cart-check-icon');
    } else {
      // Item is not in cart
      button.classList.remove('in-cart');
      if (textSpan) textSpan.textContent = 'В корзину';
      if (icon) icon.setAttribute('href', '#cart-icon');
    }
  });
  
  // Update cart modal
  updateCartModal();
}

function updateCartModal() {
  const cartList = document.getElementById('cart-list');
  const cartTotal = document.getElementById('cart-total');
  const items = Cart.items();
  
  if (!cartList || !cartTotal) return;
  
  if (items.length === 0) {
    cartList.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">
          <svg class="icon"><use href="#cart-icon"></use></svg>
        </div>
        <p>Корзина пуста</p>
      </div>
    `;
  } else {
    cartList.innerHTML = items.map(item => `
      <div class="cart-item" data-id="${item.id}">
        <div class="cart-thumb">
          ${item.image ? `<img src="${item.image}" alt="${item.name}" loading="lazy">` : '🏠'}
        </div>
        <div class="cart-name">${item.name}</div>
        <div class="cart-qty">
          <button class="qty-btn qty-dec" data-id="${item.id}">-</button>
          <span class="qty-value">${item.qty}</span>
          <button class="qty-btn qty-inc" data-id="${item.id}">+</button>
        </div>
        <div class="cart-price">${(item.price * item.qty).toLocaleString('ru-RU')} ₽</div>
      </div>
    `).join('');
    
    // Add event listeners for quantity buttons
    cartList.querySelectorAll('.qty-dec').forEach(btn => {
      btn.addEventListener('click', () => Cart.dec(btn.dataset.id));
    });
    
    cartList.querySelectorAll('.qty-inc').forEach(btn => {
      btn.addEventListener('click', () => Cart.inc(btn.dataset.id));
    });
  }
  
  cartTotal.textContent = `${Cart.totalSum().toLocaleString('ru-RU')} ₽`;
}

// Make updateCartUI available globally
window.updateCartUI = updateCartUI;
window.Cart = Cart;

// Initialize cart UI when the document is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    updateCartUI();
    document.addEventListener('cart:update', updateCartUI);
    document.addEventListener('products:rendered', updateCartUI);
  });
} else {
  updateCartUI();
  document.addEventListener('cart:update', updateCartUI);
  document.addEventListener('products:rendered', updateCartUI);
}