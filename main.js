// Инициализация каталога плитки
// Единая точка входа: не создаем второй экземпляр, если уже инициализирован
(function(){
  document.addEventListener('DOMContentLoaded', function() {
    if (window.TileCatalog && !window.catalog) {
      window.catalog = new TileCatalog();
    }
  });
})();
