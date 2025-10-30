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
      if(!collapsible.contains(panel)) {
        collapsible.appendChild(panel);
      }
    } else {
      if(!sidebar.contains(panel)) {
        sidebar.appendChild(panel);
      }
      // Reset mobile state when switching to desktop
      collapsible.classList.remove('open');
      collapsible.style.maxHeight = '0px';
      collapsible.style.opacity = '0';
      collapsible.style.display = 'none';
      if(toggle) toggle.checked = false;
    }
  }

  function setOpen(open){
    if(!collapsible) return;
    
    if(open){
      collapsible.style.display = 'block';
      // Force reflow before measuring
      collapsible.offsetHeight;
      // Add class and measure
      collapsible.classList.add('open');
      // Measure actual height after content is rendered
      const h = collapsible.scrollHeight;
      collapsible.style.maxHeight = h + 'px';
      collapsible.style.opacity = '1';
    } else {
      collapsible.classList.remove('open');
      collapsible.style.maxHeight = '0px';
      collapsible.style.opacity = '0';
      // Wait for animation to complete before hiding
      setTimeout(() => {
        if(!collapsible.classList.contains('open')) {
          collapsible.style.display = 'none';
        }
      }, 300);
    }
  }

  // Toggle button event - IMPROVED
  if(toggle){
    toggle.addEventListener('change', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Filter toggle clicked:', toggle.checked); // Debug
      setOpen(toggle.checked);
    });
    
    // Also handle clicks on the label
    const chip = document.querySelector('.filters-toggle-chip');
    if(chip) {
      chip.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Filter chip clicked'); // Debug
        toggle.checked = !toggle.checked;
        setOpen(toggle.checked);
      });
      
      // Prevent double handling
      chip.addEventListener('touchstart', (e) => {
        e.preventDefault();
      }, { passive: false });
    }
  }

  // Close by outside click (mobile only)
  document.addEventListener('click', (e) => {
    if(!isMobile() || !toggle || !toggle.checked) return;
    
    const chip = document.querySelector('.filters-toggle-chip');
    const isInsideCollapsible = collapsible && collapsible.contains(e.target);
    const isChipClick = chip && chip.contains(e.target);
    
    if(!isInsideCollapsible && !isChipClick) {
      toggle.checked = false;
      setOpen(false);
    }
  });

  // Prevent filter panel clicks from closing
  if(collapsible) {
    collapsible.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  // Theme toggle (persist)
  const themeBtn = document.getElementById('theme-toggle');
  const root = document.documentElement;
  const KEY = 'tile-theme';
  
  function applyTheme(mode) { 
    root.setAttribute('data-theme', mode); 
    localStorage.setItem(KEY, mode);
    
    // Update theme icon
    if(themeBtn) {
      const icon = themeBtn.querySelector('.theme-icon');
      if(icon) {
        icon.textContent = mode === 'dark' ? '☀️' : '🌙';
      }
    }
  }
  
  // Load saved theme
  const saved = localStorage.getItem(KEY);
  if(saved) {
    applyTheme(saved);
  } else {
    // Check system preference
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  }
  
  if(themeBtn) {
    themeBtn.addEventListener('click', () => {
      const currentTheme = root.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(newTheme);
    });
  }

  // Initialize and handle resize
  mountPanel();
  
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      mountPanel();
      
      // Recalculate collapsible height if open
      if(isMobile() && toggle && toggle.checked && collapsible && collapsible.classList.contains('open')) {
        const h = collapsible.scrollHeight;
        collapsible.style.maxHeight = h + 'px';
      }
    }, 100);
  });

  // Handle escape key to close filters
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape' && isMobile() && toggle && toggle.checked) {
      toggle.checked = false;
      setOpen(false);
    }
  });

  // Debug: Log initial state
  console.log('Mobile filter setup complete:', {
    toggle: !!toggle,
    collapsible: !!collapsible,
    sidebar: !!sidebar,
    panel: !!panel,
    isMobile: isMobile()
  });
});