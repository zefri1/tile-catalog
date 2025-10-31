import './categories.js';
// existing imports...

// Ensure sidebar scroll sizing updates on resize (for contained scroll)
(function(){
  const sidebar = document.querySelector('.filters-sidebar');
  const update = ()=>{
    if(!sidebar) return;
    const top = 120; // same as CSS
    sidebar.style.maxHeight = `calc(100vh - ${top + 20}px)`;
  };
  window.addEventListener('resize', update);
  document.addEventListener('DOMContentLoaded', update);
})();
