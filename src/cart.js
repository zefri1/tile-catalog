const CART_KEY = 'tile-cart-v1';

function load(){ try{ return JSON.parse(localStorage.getItem(CART_KEY)||'{}'); }catch{ return {}; } }
function save(state){ localStorage.setItem(CART_KEY, JSON.stringify(state)); }
function totalCount(state){ return Object.values(state).reduce((a,i)=>a + (i.qty||0), 0); }
function totalSum(state){ return Object.values(state).reduce((a,i)=>a + (i.qty||0)*(i.price||0), 0); }

export const Cart = {
  state: load(),
  add(item){
    const cur = this.state[item.id] || { id:item.id, name:item.name, price:item.price||0, image:item.image||'', qty:0 };
    cur.qty += 1; this.state[item.id]=cur; save(this.state);
    document.dispatchEvent(new CustomEvent('cart:update'));
  },
  dec(id){ if(!this.state[id]) return; this.state[id].qty = Math.max(0, this.state[id].qty-1); if(this.state[id].qty===0) delete this.state[id]; save(this.state); document.dispatchEvent(new CustomEvent('cart:update')); },
  set(id, qty){ if(qty<=0){ delete this.state[id]; } else { if(!this.state[id]) return; this.state[id].qty = qty; } save(this.state); document.dispatchEvent(new CustomEvent('cart:update')); },
  clear(){ this.state={}; save(this.state); document.dispatchEvent(new CustomEvent('cart:update')); },
  totalCount(){ return totalCount(this.state); },
  totalSum(){ return totalSum(this.state); },
  items(){ return Object.values(this.state); }
};

// UI wiring will be done in main.js