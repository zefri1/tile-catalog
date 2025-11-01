/**
 * Система управления темами
 * Поддерживает светлую/тёмную тему с сохранением в localStorage
 */

const THEME_KEY = 'tile-catalog-theme';
const THEME_LIGHT = 'light';
const THEME_DARK = 'dark';

/**
 * Применить тему к документу
 */
function applyTheme(theme) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  
  // Обновить иконку переключателя
  const themeIcon = document.querySelector('#theme-toggle .theme-icon');
  if (themeIcon) {
    themeIcon.textContent = theme === THEME_DARK ? '☀️' : '🌙';
  }
  
  // Обновить title кнопки
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.title = theme === THEME_DARK ? 'Светлая тема' : 'Тёмная тема';
    themeBtn.setAttribute('aria-label', theme === THEME_DARK ? 'Светлая тема' : 'Тёмная тема');
  }
}

/**
 * Получить системную тему
 */
function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? THEME_DARK : THEME_LIGHT;
}

/**
 * Инициализация темы
 */
export function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  const systemTheme = getSystemTheme();
  const initialTheme = savedTheme || systemTheme;
  
  applyTheme(initialTheme);
  
  // Слушать изменения системной темы, если пользователь не выбрал свою
  if (!savedTheme) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      // Применяем системную тему только если пользователь не сохранил своё предпочтение
      if (!localStorage.getItem(THEME_KEY)) {
        applyTheme(e.matches ? THEME_DARK : THEME_LIGHT);
      }
    });
  }
}

/**
 * Переключить тему
 */
export function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === THEME_DARK ? THEME_LIGHT : THEME_DARK;
  
  applyTheme(newTheme);
  localStorage.setItem(THEME_KEY, newTheme);
  
  // Вызвать событие для обновления UI
  document.dispatchEvent(new CustomEvent('theme:changed', {
    detail: { theme: newTheme }
  }));
}

/**
 * Получить текущую тему
 */
export function getCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') || THEME_LIGHT;
}

/**
 * Настроить обработчик переключателя темы
 */
export function setupThemeToggle() {
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
}

// Автоматическая инициализация при загрузке модуля
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupThemeToggle();
  });
} else {
  initTheme();
  setupThemeToggle();
}