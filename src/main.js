document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('filters-toggle');
  const collapsible = document.getElementById('filters-collapsible');
  const sidebar = document.getElementById('filters-sidebar');
  const panel = sidebar ? sidebar.querySelector('.filters-panel') : null;

  // Mount/unmount panel depending on viewport
  function syncPanelPlacement(){
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if(!panel || !collapsible || !sidebar) return;
    if(isMobile){
      if(!collapsible.contains(panel)) collapsible.appendChild(panel);
    }else{
      if(!sidebar.contains(panel)) sidebar.appendChild(panel);
      // Ensure collapsed on desktop
      if(collapsible.classList.contains('open')) collapsible.classList.remove('open');
    }
  }

  function setOpen(open){
    if(!collapsible) return;
    collapsible.classList.toggle('open', open);
    if(open){
      collapsible.style.display = 'block';
      collapsible.style.maxHeight = collapsible.scrollHeight + 'px';
    } else {
      collapsible.style.maxHeight = '0px';
      setTimeout(()=>{ collapsible.style.display='none'; }, 300);
    }
  }

  if(toggle){
    setOpen(toggle.checked);
    toggle.addEventListener('change', () => setOpen(toggle.checked));
  }

  // Close on outside tap (mobile only)
  document.addEventListener('click', (e) => {
    if(!window.matchMedia('(max-width: 768px)').matches) return;
    const chip = document.querySelector('.filters-toggle-chip');
    const inside = (collapsible && collapsible.contains(e.target)) || (chip && chip.contains(e.target));
    if(!inside && toggle && toggle.checked){ toggle.checked = false; setOpen(false); }
  });

  // React to viewport changes
  syncPanelPlacement();
  window.addEventListener('resize', syncPanelPlacement);

  // Theme toggle: add attribute on <html>
  const themeBtn = document.getElementById('theme-toggle');
  const root = document.documentElement;
  const STORAGE_KEY = 'tile-theme';
  function applyTheme(mode){ root.setAttribute('data-theme', mode); localStorage.setItem(STORAGE_KEY, mode); }
  // Initialize
  const saved = localStorage.getItem(STORAGE_KEY);
  if(saved){ applyTheme(saved); }
  if(themeBtn){
    themeBtn.addEventListener('click', () => {
      const current = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(current);
    });
  }
});
