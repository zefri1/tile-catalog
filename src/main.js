// Theme toggle functionality
function initTheme() {
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = themeToggle?.querySelector('.theme-icon');
  const root = document.documentElement;
  
  // Get saved theme or default to light
  const savedTheme = localStorage.getItem('theme') || 'light';
  
  // Apply theme
  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    if (themeIcon) {
      themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
    localStorage.setItem('theme', theme);
  }
  
  // Initialize with saved theme
  applyTheme(savedTheme);
  
  // Toggle theme on button click
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = root.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(newTheme);
    });
  }
}

// Filters toggle for mobile
function initFiltersToggle() {
  const filtersToggle = document.getElementById('filters-toggle');
  const filtersCollapsible = document.getElementById('filters-collapsible');
  const filtersSidebar = document.getElementById('filters-sidebar');
  
  if (filtersToggle && filtersCollapsible && filtersSidebar) {
    // Clone filters content to collapsible area for mobile
    const filtersPanel = filtersSidebar.querySelector('.filters-panel');
    if (filtersPanel) {
      filtersCollapsible.innerHTML = filtersPanel.outerHTML;
    }
    
    // Sync filter changes between sidebar and collapsible
    function syncFilters(sourceContainer, targetContainer) {
      const sourceInputs = sourceContainer.querySelectorAll('input, select');
      const targetInputs = targetContainer.querySelectorAll('input, select');
      
      sourceInputs.forEach((input, index) => {
        const targetInput = targetInputs[index];
        if (targetInput) {
          if (input.type === 'checkbox' || input.type === 'radio') {
            targetInput.checked = input.checked;
          } else {
            targetInput.value = input.value;
          }
        }
      });
    }
    
    // Listen for changes in both containers
    [filtersSidebar, filtersCollapsible].forEach(container => {
      container.addEventListener('input', (e) => {
        const otherContainer = container === filtersSidebar ? filtersCollapsible : filtersSidebar;
        syncFilters(container, otherContainer);
      });
    });
  }
}

// Initialize everything when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initFiltersToggle();
  });
} else {
  initTheme();
  initFiltersToggle();
}