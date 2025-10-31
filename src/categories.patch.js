// Patch for category parsing in catalog.js
// This fixes the category implementation

// Enhanced category normalization function
function normArray(raw) {
  if (!raw) return [];
  const str = String(raw).trim();
  if (!str || str === '0' || str === '-' || str.toLowerCase() === 'нет') return [];
  
  // Разбираем по различным разделителям
  return str
    .split(/[;,|\n\r]+/)
    .map(x => x.replace(/[-–—]/g, '').trim())
    .filter(x => x && x.length > 0 && x.toLowerCase() !== 'нет' && x !== '0' && x !== '-')
    .map(x => {
      // Очищаем от лишних символов
      return x.replace(/^[\s\-–—]+|[\s\-–—]+$/g, '');
    })
    .filter(x => x.length > 0);
}

// Фикс для parseCSVData - поиск колонки категорий
function findCategoryColumn(headers) {
  const categoryPatterns = [
    'itemcategory',
    'category', 
    'категория',
    'categories',
    'item_category'
  ];
  
  for (const pattern of categoryPatterns) {
    const index = headers.findIndex(h => h.toLowerCase().includes(pattern));
    if (index !== -1) {
      console.log(`Found category column at index ${index}: ${headers[index]}`);
      return index;
    }
  }
  
  console.warn('Category column not found in headers:', headers);
  return -1;
}

// Патч для правильного парсинга категорий
if (typeof window !== 'undefined') {
  window.categoryPatch = {
    normArray,
    findCategoryColumn
  };
}