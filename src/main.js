/**
 * Маин-скрипт каталога
 * Инициализирует TileCatalog после загрузки DOM
 */

// Импорт класса каталога
import './catalog.js';

// Инициализация каталога после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM загружен, инициализируем каталог...');
    
    // Проверяем доступность XLSX через CDN
    if (typeof XLSX === 'undefined') {
        console.warn('⚠️ XLSX не загружен через CDN');
    }
    
    // Проверяем доступность класса TileCatalog
    if (typeof window.TileCatalog === 'undefined') {
        console.error('❌ TileCatalog класс не доступен');
        return;
    }
    
    // Создаём экземпляр каталога
    try {
        window.catalog = new window.TileCatalog();
        console.log('✅ Каталог успешно инициализирован');
    } catch (error) {
        console.error('❌ Ошибка инициализации каталога:', error);
        
        // Показываем ошибку пользователю
        const errorMsg = document.createElement('div');
        errorMsg.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #f87171; color: white; padding: 1rem 2rem;
            border-radius: 8px; font-size: 14px; z-index: 10000;
        `;
        errorMsg.textContent = 'Ошибка загрузки каталога';
        document.body.appendChild(errorMsg);
        
        // Скрываем экран загрузки
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }
});