import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

// CORS для всех доменов
app.use(cors());
app.use(express.json());

// Утилита парсинга CSV с поддержкой чекбоксов
function parseCSV(csvText) {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return { items: [], hasCheckboxes: false, debug: 'Empty CSV' };
  
  const headers = lines[0].split(/[;,]/).map(h => h.trim().toLowerCase());
  const items = [];
  
  // Поиск колонки с чекбоксами
  const checkboxColumnIndex = headers.findIndex(h => 
    h.includes('на_сайт') || 
    h.includes('насайт') ||
    h.includes('сайт') || 
    h.includes('показывать') ||
    h === 'checkbox'
  );
  
  const hasCheckboxColumn = checkboxColumnIndex !== -1;
  let checkedCount = 0;
  let totalRows = lines.length - 1;
  
  console.log('📊 CSV Headers:', headers.slice(0, 8));
  
  if (hasCheckboxColumn) {
    console.log(`☑️ Checkbox column found at index ${checkboxColumnIndex}: "${headers[checkboxColumnIndex]}"`);
  } else {
    console.log('ℹ️ No checkbox column found - showing all valid items');
  }
  
  // Основные колонки поставщика
  const columnMap = {
    'id': headers.findIndex(h => h === 'id'),
    'brand': headers.findIndex(h => h === 'brand'), 
    'fullname': headers.findIndex(h => h === 'fullname'),
    'collection': headers.findIndex(h => h === 'collection'),
    'country': headers.findIndex(h => h === 'country'),
    'color': headers.findIndex(h => h === 'color'),
    'size': headers.findIndex(h => h === 'size'),
    'price.roznichnaya': headers.findIndex(h => h === 'price.roznichnaya'),
    'image': headers.findIndex(h => h === 'image'),
    'rest.moskow': headers.findIndex(h => h === 'rest.moskow'),
    'byorder': headers.findIndex(h => h === 'byorder')
  };
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(/[;,]/);
    if (values.length < 3) continue;
    
    try {
      // Проверяем чекбокс (если есть колонка)
      let isVisibleOnSite = true; // По умолчанию показываем
      
      if (hasCheckboxColumn && values.length > checkboxColumnIndex) {
        const checkboxValue = (values[checkboxColumnIndex] || '').trim();
        
        // Если чекбокс явно отмечен
        if (checkboxValue === 'TRUE' || checkboxValue === 'true' || checkboxValue === '1') {
          checkedCount++;
          isVisibleOnSite = true;
        }
        // Если чекбокс явно НЕ отмечен
        else if (checkboxValue === 'FALSE' || checkboxValue === 'false' || checkboxValue === '0') {
          isVisibleOnSite = false;
        }
        // Если пусто - показываем (для совместимости)
        else {
          isVisibleOnSite = true;
        }
      }
      
      if (!isVisibleOnSite) continue;
      
      // Извлекаем данные
      const id = (values[columnMap.id] || `item-${i}`).trim();
      const brand = (values[columnMap.brand] || 'Без бренда').trim();
      const fullName = (values[columnMap.fullname] || '').trim();
      const collection = (values[columnMap.collection] || '').trim();
      const country = (values[columnMap.country] || '').trim();
      const color = (values[columnMap.color] || 'Не указан').trim();
      
      // Обработка размера
      let size = (values[columnMap.size] || '').trim();
      if (size) {
        const sizeMatch = size.match(/(\d+)[x×x](\d+)/);
        if (sizeMatch) {
          size = `${sizeMatch[1]}×${sizeMatch[2]}`;
        }
      }
      
      // Парсим цену
      let price = 0;
      const priceRaw = (values[columnMap['price.roznichnaya']] || '0').trim();
      if (priceRaw && priceRaw !== 'FALSE') {
        try {
          price = parseInt(parseFloat(priceRaw.toString().replace(',', '.'))) || 0;
        } catch (e) {
          price = 0;
        }
      }
      
      // Пропускаем товары без цены
      if (price <= 0) continue;
      
      // Обрабатываем название
      let name = fullName;
      if (name) {
        name = name.replace(/\s*\([^)]*\)/g, ''); // Убираем скобки
        if (brand && name.toLowerCase().startsWith(brand.toLowerCase())) {
          name = name.substring(brand.length).trim();
        }
        name = name.replace(/^(керамогранит|плитка)\s+/i, '');
        name = name.trim();
      }
      
      if (!name || name.length < 2) {
        name = `${brand} ${collection}`.trim() || 'Плитка';
      }
      
      if (name.length > 50) {
        name = name.substring(0, 47) + '...';
      }
      
      // Определяем наличие
      const stockRaw = (values[columnMap['rest.moskow']] || '0').trim();
      let hasStock = false;
      try {
        const stockQty = parseFloat(stockRaw.toString().replace(',', '.'));
        hasStock = stockQty > 0.1;
      } catch (e) {
        hasStock = false;
      }
      
      const byOrder = (values[columnMap.byorder] || '').toLowerCase() === 'true';
      
      // Проверяем URL изображения
      let imageUrl = (values[columnMap.image] || '').trim();
      if (imageUrl && !imageUrl.startsWith('http')) {
        imageUrl = '';
      }
      
      const item = {
        id: id,
        name: name,
        brand: brand,
        color: color,
        price: price,
        description: fullName.substring(0, 150) + (fullName.length > 150 ? '...' : ''),
        image: imageUrl,
        inStock: hasStock,
        onDemand: !hasStock && (byOrder || price > 0),
        hidden: false,
        phone: '',
        category: (values[columnMap.itemcategory] || 'Плитка').trim(),
        stock: stockRaw,
        collection: collection,
        country: country,
        size: size
      };
      
      // Добавляем только доступные товары
      if (item.inStock || item.onDemand) {
        items.push(item);
      }
      
    } catch (error) {
      console.error(`Error processing row ${i}:`, error.message);
      continue;
    }
  }
  
  const debugInfo = {
    totalRows: totalRows,
    hasCheckboxColumn: hasCheckboxColumn,
    checkboxColumnName: hasCheckboxColumn ? headers[checkboxColumnIndex] : 'None',
    checkedItems: checkedCount,
    processedItems: items.length
  };
  
  return {
    items: items,
    hasCheckboxes: hasCheckboxColumn,
    debug: debugInfo
  };
}

// API эндпоинт
app.get('/api/items', async (req, res) => {
  try {
    const csvUrl = process.env.SHEET_CSV_URL;
    if (!csvUrl) {
      return res.status(500).json({ 
        error: 'SHEET_CSV_URL environment variable not set',
        success: false,
        count: 0,
        items: []
      });
    }
    
    console.log(`[${new Date().toISOString()}] Fetching CSV from:`, csvUrl);
    
    const response = await fetch(csvUrl, {
      headers: {
        'User-Agent': 'TileCatalog/1.2'
      },
      timeout: 15000
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const csvText = await response.text();
    console.log(`[${new Date().toISOString()}] CSV length:`, csvText.length);
    
    const parseResult = parseCSV(csvText);
    const items = parseResult.items;
    
    console.log(`[${new Date().toISOString()}] Debug:`, parseResult.debug);
    console.log(`[${new Date().toISOString()}] Processed ${items.length} items`);
    
    if (items.length > 0) {
      console.log('Sample items:', items.slice(0, 2).map(i => `${i.name} - ${i.price}₽`));
    }
    
    // Кэш на 30 секунд
    res.set('Cache-Control', 'public, max-age=30');
    res.set('Content-Type', 'application/json');
    
    res.json({
      success: true,
      count: items.length,
      updated_at: new Date().toISOString(),
      source_url: csvUrl.substring(0, 60) + '...',
      debug: parseResult.debug,
      note: parseResult.hasCheckboxes ? 
        (
          parseResult.debug.checkedItems > 0 ? 
          `Показываем только отмеченные товары (${parseResult.debug.checkedItems})` : 
          'Колонка чекбоксов существует, но пуста - показываем все товары'
        ) : 
        'Нет колонки чекбоксов - показываем все товары',
      items: items
    });
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error:`, error.message);
    
    res.status(500).json({
      success: false,
      error: error.message,
      count: 0,
      items: [],
      timestamp: new Date().toISOString()
    });
  }
});

// Health check для Render
app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

// Базовый роут
app.get('/', (req, res) => {
  res.json({
    service: 'Tile Catalog API',
    version: '1.2.1',
    features: ['checkbox-control', 'supplier-format', 'auto-mapping', 'smart-fallback'],
    endpoints: {
      '/api/items': 'GET - получить список товаров из Google Sheets',
      '/healthz': 'GET - проверка работоспособности'
    },
    checkbox_behavior: {
      'if_column_exists_and_filled': 'Показываем только отмеченные (TRUE)',
      'if_column_exists_but_empty': 'Показываем все (совместимость)',
      'if_no_column': 'Показываем все'
    },
    timestamp: new Date().toISOString()
  });
});

// Обработка ошибок 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    available_endpoints: ['/api/items', '/healthz'],
    timestamp: new Date().toISOString()
  });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Tile Catalog API v1.2.1 running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/healthz`);
  console.log(`📋 Items API: http://localhost:${PORT}/api/items`);
  console.log(`☑️ Feature: Smart checkbox control with fallback`);
  
  if (!process.env.SHEET_CSV_URL) {
    console.warn('⚠️ SHEET_CSV_URL not set - API will return error');
  } else {
    console.log(`📄 CSV source: ${process.env.SHEET_CSV_URL.substring(0, 60)}...`);
  }
});