document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('filters-toggle');
  const collapsible = document.getElementById('filters-collapsible');
  const sidebar = document.getElementById('filters-sidebar');
  const panel = sidebar ? sidebar.querySelector('.filters-panel') : null;

  function isMobile(){ return window.matchMedia('(max-width: 768px)').matches; }

  // Move panel between containers based on viewport
  function mountPanel(){
    if(!panel || !collapsible || !sidebar) return;
    if(isMobile()){
      if(!collapsible.contains(panel)) collapsible.appendChild(panel);
    } else {
      if(!sidebar.contains(panel)) sidebar.appendChild(panel);
      collapsible.classList.remove('open');
      collapsible.style.maxHeight = '0px';
      collapsible.style.opacity = '0';
      collapsible.style.display = '';
      if(toggle) toggle.checked = false;
    }
  }

  function setOpen(open){
    if(!collapsible) return;
    collapsible.classList.toggle('open', open);
    if(open){
      collapsible.style.display = 'block';
      // measure after mount
      const h = collapsible.scrollHeight;
      collapsible.style.maxHeight = h + 'px';
      collapsible.style.opacity = '1';
    } else {
      collapsible.style.maxHeight = '0px';
      collapsible.style.opacity = '0';
      setTimeout(()=>{ collapsible.style.display=''; }, 280);
    }
  }

  if(toggle){
    toggle.addEventListener('change', () => setOpen(toggle.checked));
  }

  // close by outside click (mobile only)
  document.addEventListener('click', (e) => {
    if(!isMobile() || !toggle || !toggle.checked) return;
    const chip = document.querySelector('.filters-toggle-chip');
    const inside = (collapsible && collapsible.contains(e.target)) || (chip && chip.contains(e.target));
    if(!inside){ toggle.checked = false; setOpen(false); }
  });

  // theme toggle (persist)
  const themeBtn = document.getElementById('theme-toggle');
  const root = document.documentElement;
  const KEY = 'tile-theme';
  function applyTheme(mode){ root.setAttribute('data-theme', mode); localStorage.setItem(KEY, mode); }
  const saved = localStorage.getItem(KEY); if(saved) applyTheme(saved);
  if(themeBtn){ themeBtn.addEventListener('click', ()=>{ applyTheme(root.getAttribute('data-theme')==='dark'?'light':'dark'); }); }

  // init and on resize
  mountPanel();
  window.addEventListener('resize', mountPanel);
});
