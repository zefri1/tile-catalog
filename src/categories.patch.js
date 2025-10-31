// Patch selection and reset wiring for categories
TileCatalog.prototype.clearCategoryFilter = function(){
  this.categoryState = this.categoryState || {};
  this.categoryState.selectedCategories = new Set();
  this.categoryState.path = [];
  this.categoryState.showLimit = 14;
  this.applyFilters();
  this.refreshCategoryFilter();
};

TileCatalog.prototype.refreshCategoryFilter = function(){
  const categoryFilterContainer = document.querySelector('.category-filter');
  if (!categoryFilterContainer) return;
  const wrap = categoryFilterContainer.parentElement;
  wrap.innerHTML = this.createCategoryFilter();
  this.bindCategoryEvents();
};
