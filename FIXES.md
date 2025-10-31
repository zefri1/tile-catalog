# Исправления кривого скролла и категорий

## Проблемы, которые были решены:

### 1. Кривой скролл в блоке фильтров

**Проблема**: Скроллбар в `.checkbox-group` выходил за границы контейнера.

**Решение**: В `src/patches.css` добавлены стили:
```css
.checkbox-group {
  max-height: 140px;
  overflow-y: auto;
  padding-right: 4px; /* Отступ для скроллбара */
  border: 1px solid var(--color-border-light);
  border-radius: var(--border-radius-sm);
  padding: 0.5rem;
  background: var(--color-surface);
  scrollbar-width: thin;
  scrollbar-color: var(--color-primary) transparent;
}
```

### 2. Категории не отображались

**Проблема**: Категории не парсились из CSV файла из-за неправильного поиска колонки.

**Решение**: 
1. Улучшена функция `findCategoryColumn()` в `catalog.js`:
```javascript
const findCategoryColumn = () => {
  const patterns = ['itemcategory', 'category', 'категория', 'categories', 'item_category'];
  for (const pattern of patterns) {
    const index = headers.findIndex(h => h.includes(pattern.toLowerCase()));
    if (index !== -1) {
      console.log(`Found category column at index ${index}: ${headers[index]}`);
      return index;
    }
  }
  return -1;
};
```

2. Улучшена функция `normArray()` для лучшего разбора многозначных полей.

3. Добавлена более подробная отладочная информация.

### 3. Улучшения UI категорий

Добавлены стили для:
- Отображения количества товаров в категории
- Кнопки "Показать еще"
- Хлебных крошек для навигации
- Кнопки "Сбросить" фильтр

## Файлы, которые были изменены:

1. **`src/patches.css`** - добавлены фиксы для скролла и стили категорий
2. **`src/catalog.js`** - улучшен парсинг категорий и отладка
3. **`src/categories.patch.js`** - создан патч для категорий
4. **`index.html`** - обновлен cache buster до v=7

## Как проверить, что все работает:

1. **Проверьте скролл**: Откройте фильтры, прокрутите список брендов - скролл не должен выходить за границы

2. **Проверьте категории**: Откройте консоль браузера (F12) и посмотрите логи:
   - Должно быть `Found category column at index X: itemCategory`
   - Должно быть `Category tree built: X categories from Y products`
   - В фильтрах должен появиться блок "КАТЕГОРИЯ" с чекбоксами

3. **Проверьте фильтрацию**: Выберите категорию - товары должны отфильтроваться

## Отладочная информация:

Для получения подробной информации о работе каталога:
1. Откройте консоль браузера (F12)
2. Перезагрузите страницу
3. Посмотрите логи о парсинге CSV и построении дерева категорий

## Важно:

- Кэш браузера обновлен до v=7, поэтому старые файлы не будут использоваться
- Если проблемы остались, очистите кэш браузера (Ctrl+Shift+R)
- Проверьте консоль на наличие ошибок JavaScript