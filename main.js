// Инициализация каталога плитки
document.addEventListener('DOMContentLoaded', function() {
    // Проверяем, что класс TileCatalog загружен
    if (typeof TileCatalog !== 'undefined') {
        // Создаем экземпляр каталога
        window.tileCatalog = new TileCatalog();
    } else {
        console.error('TileCatalog class not found');
    }
});
