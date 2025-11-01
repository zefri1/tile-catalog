import { Cart } from './cart.js';

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('filters-toggle');
  const collapsible = document.getElementById('filters-collapsible');
  const sidebar = document.getElementById('filters-sidebar');
  const panel = sidebar ? sidebar.querySelector('.filters-panel') : null;

  const chip = document.querySelector('.filters-toggle-chip');

  function isMobile(){ return window.matchMedia('(max-width: 768px)').matches; }

  function syncAria(open){
    if(chip){ chip.setAttribute('aria-expanded', String(open)); }
    if(collapsible){ collapsible.setAttribute('aria-hidden', String(!open)); }
  }

  function mountPanel(){
    if(!panel || !collapsible || !sidebar) return;
    if(isMobile()){
      if(!collapsible.contains(panel)) collapsible.appendChild(panel);
      syncAria(toggle && toggle.checked);
    } else {
      if(!sidebar.contains(panel)) sidebar.appendChild(panel);
      setOpen(false, true);
    }
  }

  function setOpen(open, immediate=false){
    if(!collapsible) return;
    if(open){
      collapsible.style.display = 'block';
      void collapsible.offsetHeight;
      collapsible.classList.add('open');
      const h = collapsible.scrollHeight;
      collapsible.style.maxHeight = immediate ? 'none' : h + 'px';
      collapsible.style.opacity = '1';
    } else {
      collapsible.classList.remove('open');
      collapsible.style.maxHeight = '0px';
      collapsible.style.opacity = '0';
      setTimeout(() => { if(!collapsible.classList.contains('open')) collapsible.style.display = 'none'; }, immediate ? 0 : 300);
    }
    syncAria(open);
  }

  function toggleOpen(){
    const newState = !(toggle ? toggle.checked : collapsible.classList.contains('open'));
    if(toggle) toggle.checked = newState;
    setOpen(newState);
  }

  if(toggle){
    toggle.addEventListener('change', (e) => { e.preventDefault(); e.stopPropagation(); setOpen(toggle.checked); });
  }
  if(chip){
    chip.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); toggleOpen(); });
    chip.addEventListener('keydown', (e)=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); toggleOpen(); }});
  }

  document.addEventListener('click', (e) => {
    if(!isMobile() || !(toggle ? toggle.checked : collapsible.classList.contains('open'))) return;
    const inside = collapsible.contains(e.target) || (chip && chip.contains(e.target));
    if(!inside){ if(toggle) toggle.checked = false; setOpen(false); }
  });

  if(collapsible){ collapsible.addEventListener('click', (e)=> e.stopPropagation()); }

  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && isMobile() && (toggle ? toggle.checked : collapsible.classList.contains('open'))) { if(toggle) toggle.checked=false; setOpen(false); }});

  const themeBtn = document.getElementById('theme-toggle');
  const root = document.documentElement;
  const KEY = 'tile-theme';
  function applyTheme(mode){ root.setAttribute('data-theme', mode); localStorage.setItem(KEY, mode); const icon = themeBtn && themeBtn.querySelector('.theme-icon'); if(icon) icon.textContent = mode==='dark'?'☀️':'🌙'; }
  const saved = localStorage.getItem(KEY); if(saved) applyTheme(saved); else applyTheme(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
  if(themeBtn){ themeBtn.addEventListener('click', ()=> applyTheme(root.getAttribute('data-theme')==='dark'?'light':'dark')); }

  mountPanel();
  let rid; window.addEventListener('resize', ()=>{ cancelAnimationFrame(rid); rid = requestAnimationFrame(()=>{ mountPanel(); if(isMobile() && (toggle ? toggle.checked : collapsible.classList.contains('open'))){ const h = collapsible.scrollHeight; collapsible.style.maxHeight = h + 'px'; } }); });

  // ===== Cart UI =====
  const cartBtn = document.getElementById('cart-btn');
  const cartModal = document.getElementById('cart-modal');
  const cartList = document.getElementById('cart-list');
  const cartTotal = document.getElementById('cart-total');

  function openCart(){ cartModal.classList.add('open'); cartModal.setAttribute('aria-hidden','false'); document.body.classList.add('modal-open'); }
  function closeCart(){ cartModal.classList.remove('open'); cartModal.setAttribute('aria-hidden','true'); document.body.classList.remove('modal-open'); }
  cartBtn?.addEventListener('click', openCart);
  cartModal?.querySelector('.modal__backdrop')?.addEventListener('click', closeCart);
  cartModal?.querySelector('.modal__close')?.addEventListener('click', closeCart);
  document.addEventListener('keydown', e=>{ if(e.key==='Escape' && cartModal?.classList.contains('open')) closeCart(); });

  function format(rub){ return new Intl.NumberFormat('ru-RU', { style:'currency', currency:'RUB', maximumFractionDigits:0 }).format(rub); }
  function renderCart(){
    if(!cartList) return;
    const items = Cart.items();
    cartList.innerHTML = '';
    if(items.length===0){
      cartList.innerHTML = '<div class="cart-empty"><div class="cart-empty-icon">🧭</div><p>Корзина пуста</p></div>';
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
  }
  document.addEventListener('cart:update', renderCart);
  renderCart();

  cartList?.addEventListener('click', (e)=>{
    const btn = e.target.closest('.qty-btn'); if(!btn) return;
    const id = btn.dataset.id; const act = btn.dataset.act;
    if(act==='inc') Cart.add({ id }); else if(act==='dec') Cart.dec(id);
  });

  // grid add-to-cart
  const grid = document.getElementById('products-grid');
  grid?.addEventListener('click', (e)=>{
    const addBtn = e.target.closest('.add-to-cart'); if(!addBtn) return;
    const card = addBtn.closest('.product-card'); if(!card) return;
    const id = addBtn.dataset.id || card.dataset.id || crypto.randomUUID();
    const name = card.querySelector('.product-name')?.textContent?.trim() || 'Товар';
    const priceText = card.querySelector('.product-price')?.textContent || '0';
    const price = parseInt(priceText.replace(/[^0-9]/g,''),10) || 0;
    const image = card.querySelector('img')?.src || '';
    Cart.add({ id, name, price, image });

    // локальный счётчик на карточке
    const qtyWrap = card.querySelector('.product-qty');
    if(qtyWrap){
      qtyWrap.classList.add('visible');
      const val = qtyWrap.querySelector('.qty-value');
      const cur = Cart.state[id]?.qty || 0;
      if(val) val.textContent = String(cur);
    }
  });

  // modal add-to-cart
  const modalAdd = document.getElementById('modal-add-to-cart');
  if(modalAdd){
    modalAdd.addEventListener('click', ()=>{
      const id = modalAdd.dataset.id || crypto.randomUUID();
      const name = document.getElementById('modal-title')?.textContent?.trim() || 'Товар';
      const priceText = document.getElementById('modal-price')?.textContent || '0';
      const price = parseInt(priceText.replace(/[^0-9]/g,''),10) || 0;
      const image = document.getElementById('modal-image')?.src || '';
      Cart.add({ id, name, price, image });
    });
  }
});