document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('filters-toggle');
  const collapsible = document.getElementById('filters-collapsible');
  const sidebar = document.getElementById('filters-sidebar');

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
    // initialize from checkbox state
    setOpen(toggle.checked);
    toggle.addEventListener('change', () => setOpen(toggle.checked));
  }

  // Close on outside click for mobile
  document.addEventListener('click', (e) => {
    const isInside = (sidebar && sidebar.contains(e.target)) || (collapsible && collapsible.contains(e.target));
    const chip = document.querySelector('.filters-toggle-chip');
    if(!isInside && toggle && toggle.checked && !(chip && chip.contains(e.target))){
      toggle.checked = false;
      setOpen(false);
    }
  });
});
