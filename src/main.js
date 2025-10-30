document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('filters-toggle');
  const collapsible = document.getElementById('filters-collapsible');
  const sidebar = document.getElementById('filters-sidebar');
  const panel = sidebar ? sidebar.querySelector('.filters-panel') : null;

  const chip = document.querySelector('.filters-toggle-chip');

  function isMobile(){ return window.matchMedia('(max-width: 768px)').matches; }

  // Ensure aria attributes for accessibility and robust behavior
  function syncAria(open){
    if(chip){ chip.setAttribute('aria-expanded', String(open)); }
    if(collapsible){ collapsible.setAttribute('aria-hidden', String(!open)); }
  }

  // Move panel between containers based on viewport
  function mountPanel(){
    if(!panel || !collapsible || !sidebar) return;
    if(isMobile()){
      if(!collapsible.contains(panel)) collapsible.appendChild(panel);
      // keep state consistent after move
      syncAria(toggle && toggle.checked);
    } else {
      if(!sidebar.contains(panel)) sidebar.appendChild(panel);
      setOpen(false, true); // force close on desktop
    }
  }

  function setOpen(open, immediate=false){
    if(!collapsible) return;
    if(open){
      collapsible.style.display = 'block';
      // Force reflow
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

  // Guard: if input is missing (some browsers strip hidden checkbox), rely only on chip
  function toggleOpen(){
    const newState = !(toggle ? toggle.checked : collapsible.classList.contains('open'));
    if(toggle) toggle.checked = newState;
    setOpen(newState);
  }

  // Bind events
  if(toggle){
    toggle.addEventListener('change', (e) => { e.preventDefault(); e.stopPropagation(); setOpen(toggle.checked); });
  }
  if(chip){
    chip.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); toggleOpen(); });
    chip.addEventListener('keydown', (e)=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); toggleOpen(); }});
  }

  // Close by outside click (mobile only)
  document.addEventListener('click', (e) => {
    if(!isMobile() || !(toggle ? toggle.checked : collapsible.classList.contains('open'))) return;
    const inside = collapsible.contains(e.target) || (chip && chip.contains(e.target));
    if(!inside){ if(toggle) toggle.checked = false; setOpen(false); }
  });

  // Prevent bubbling from panel
  if(collapsible){ collapsible.addEventListener('click', (e)=> e.stopPropagation()); }

  // ESC to close
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && isMobile() && (toggle ? toggle.checked : collapsible.classList.contains('open'))) { if(toggle) toggle.checked=false; setOpen(false); }});

  // Theme toggle (persist)
  const themeBtn = document.getElementById('theme-toggle');
  const root = document.documentElement;
  const KEY = 'tile-theme';
  function applyTheme(mode){ root.setAttribute('data-theme', mode); localStorage.setItem(KEY, mode); const icon = themeBtn && themeBtn.querySelector('.theme-icon'); if(icon) icon.textContent = mode==='dark'?'☀️':'🌙'; }
  const saved = localStorage.getItem(KEY); if(saved) applyTheme(saved); else applyTheme(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
  if(themeBtn){ themeBtn.addEventListener('click', ()=> applyTheme(root.getAttribute('data-theme')==='dark'?'light':'dark')); }

  // Initialize and handle resize
  mountPanel();
  let rid; window.addEventListener('resize', ()=>{ cancelAnimationFrame(rid); rid = requestAnimationFrame(()=>{ mountPanel(); if(isMobile() && (toggle ? toggle.checked : collapsible.classList.contains('open'))){ const h = collapsible.scrollHeight; collapsible.style.maxHeight = h + 'px'; } }); });
});