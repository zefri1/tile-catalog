import { Cart } from './cart.js';

document.addEventListener('DOMContentLoaded', () => {
  // ... existing code above remains unchanged (filters, theme, etc.) ...

  // ===== Cart UI =====
  const cartBtn = document.getElementById('cart-btn');
  const cartModal = document.getElementById('cart-modal');
  const cartList = document.getElementById('cart-list');
  const cartTotal = document.getElementById('cart-total');

  function openCart(){ cartModal.classList.add('open'); cartModal.setAttribute('aria-hidden','false'); document.body.classList.add('modal-open'); renderCart(); }
  function closeCart(){ cartModal.classList.remove('open'); cartModal.setAttribute('aria-hidden','true'); document.body.classList.remove('modal-open'); }
  cartBtn?.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); openCart(); });
  cartModal?.querySelector('.modal__backdrop')?.addEventListener('click', closeCart);
  cartModal?.querySelector('.modal__close')?.addEventListener('click', closeCart);
  document.addEventListener('keydown', e=>{ if(e.key==='Escape' && cartModal?.classList.contains('open')) closeCart(); });

  function format(rub){ return new Intl.NumberFormat('ru-RU', { style:'currency', currency:'RUB', maximumFractionDigits:0 }).format(rub); }

  // Update all product card qty UIs based on cart state
  function syncAllCardQty(){
    document.querySelectorAll('.product-card').forEach(card=>{
      const id = card.dataset.productId;
      const qty = Cart.state[id]?.qty || 0;
      const wrap = card.querySelector('.product-qty');
      const val = card.querySelector('.qty-value');
      if(wrap){
        if(qty>0){ wrap.classList.add('visible'); if(val) val.textContent = String(qty); }
        else { wrap.classList.remove('visible'); if(val) val.textContent = '0'; }
      }
    });
  }

  function renderCart(){
    if(!cartList) return;
    const items = Cart.items();
    cartList.innerHTML = '';
    if(items.length===0){
      cartList.innerHTML = '<div class="cart-empty"><div class="cart-empty-icon">🧺</div><p>Корзина пуста</p></div>';
    } else {
      for(const it of items){
        const row = document.createElement('div'); row.className='cart-item';
        row.innerHTML = `
          <div class="cart-thumb">${it.image ? `<img src="${it.image}" alt="">` : '🏠'}</div>
          <div class="cart-name">${it.name}</div>
          <div class="cart-qty">
            <button class="qty-btn" data-act="dec" data-id="${it.id}">–</button>
            <span class="qty-value">${it.qty}</span>
            <button class="qty-btn" data-act="inc" data-id="${it.id}">+</button>
          </div>
          <div class="cart-price">${format((it.price||0)*it.qty)}</div>`;
        cartList.appendChild(row);
      }
    }
    if(cartTotal) cartTotal.textContent = format(Cart.totalSum());
    // also keep cards in sync
    syncAllCardQty();
  }

  document.addEventListener('cart:update', renderCart);
  renderCart();

  // Cart +/- via event delegation
  cartList?.addEventListener('click', (e)=>{
    const btn = e.target.closest('.qty-btn'); if(!btn) return;
    const id = btn.dataset.id; const act = btn.dataset.act;
    if(act==='inc'){ const it = Cart.state[id] || { id }; Cart.add(it); }
    else if(act==='dec'){ Cart.dec(id); }
  });

  // grid add-to-cart and +/-
  const grid = document.getElementById('products-grid');
  grid?.addEventListener('click', (e)=>{
    const addBtn = e.target.closest('.add-to-cart');
    const decBtn = e.target.closest('.product-qty .dec');
    const incBtn = e.target.closest('.product-qty .inc');

    if(addBtn){
      e.preventDefault(); e.stopPropagation();
      const card = addBtn.closest('.product-card'); if(!card) return;
      const id = addBtn.dataset.id || card.dataset.productId;
      const name = card.querySelector('.product-name')?.textContent?.trim() || 'Товар';
      const priceText = card.querySelector('.product-price')?.textContent || '0';
      const price = parseInt(priceText.replace(/[^0-9]/g,''),10) || 0;
      const image = card.querySelector('img')?.src || '';
      Cart.add({ id, name, price, image });
      return;
    }

    if(decBtn){ e.preventDefault(); e.stopPropagation(); const card = decBtn.closest('.product-card'); const id = card?.dataset.productId; if(id) Cart.dec(id); return; }
    if(incBtn){ e.preventDefault(); e.stopPropagation(); const card = incBtn.closest('.product-card'); const id = card?.dataset.productId; if(id) Cart.add({ id }); return; }
  });

  // modal add-to-cart with qty controls
  const modalAdd = document.getElementById('modal-add-to-cart');
  const modal = document.getElementById('product-modal');
  const modalQtyWrap = document.createElement('div');
  modalQtyWrap.className = 'product-qty';
  modalQtyWrap.innerHTML = '<button class="qty-btn dec" aria-label="Уменьшить">–</button><span class="qty-value">0</span><button class="qty-btn inc" aria-label="Увеличить">+</button>';
  modal?.querySelector('.modal__actions')?.insertBefore(modalQtyWrap, modalAdd?.nextSibling || null);

  modalAdd?.addEventListener('click', ()=>{
    const id = modalAdd.dataset.id; const name = document.getElementById('modal-title')?.textContent?.trim() || 'Товар';
    const priceText = document.getElementById('modal-price')?.textContent || '0';
    const price = parseInt(priceText.replace(/[^0-9]/g,''),10) || 0;
    const image = document.getElementById('modal-image')?.src || '';
    Cart.add({ id, name, price, image });
  });

  modalQtyWrap.addEventListener('click', (e)=>{
    const id = modalAdd?.dataset.id; if(!id) return;
    if(e.target.closest('.dec')) Cart.dec(id);
    if(e.target.closest('.inc')) Cart.add({ id });
  });

  // keep modal qty synced too
  function syncModalQty(){
    const id = modalAdd?.dataset.id; if(!id) return;
    const q = Cart.state[id]?.qty || 0; const val = modalQtyWrap.querySelector('.qty-value');
    if(val) val.textContent = String(q);
  }
  document.addEventListener('cart:update', syncModalQty);
});