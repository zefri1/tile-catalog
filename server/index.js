import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Парсинг CSV с правильной обработкой чекбоксов
function parseCSV(csvText) {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return { items: [], debug: 'Empty CSV' };
  
  const headers = lines[0].split(/[;,]/).map(h => h.trim().toLowerCase());
  const items = [];
  
  // Поиск колонки с чекбоксами  
  const checkboxColumnIndex = headers.findIndex(h => 
    h.includes('на_сайт') || 
    h.includes('насайт') ||
    h.includes('сайт') || 
    h === 'checkbox'
  );
  
  const hasCheckboxColumn = checkboxColumnIndex !== -1;
  let checkedCount = 0;
  let validPriceCount = 0;
  
  console.log('📊 CSV Headers:', headers.slice(0, 12));
  
  if (hasCheckboxColumn) {
    console.log(`☑️ Checkbox column found at index ${checkboxColumnIndex}: "${headers[checkboxColumnIndex]}"`);
  }
  
  // Маппинг основных колонок
  const columnIndexes = {
    checkbox: checkboxColumnIndex,
    id: headers.indexOf('id'),
    brand: headers.indexOf('brand'),
    fullname: headers.indexOf('fullname'),
    collection: headers.indexOf('collection'),
    country: headers.indexOf('country'),
    color: headers.indexOf('color'),
    size: headers.indexOf('size'),
    priceRozn: headers.indexOf('price.roznichnaya'),
    image: headers.indexOf('image'),
    stock: headers.indexOf('rest.moskow'),
    byOrder: headers.indexOf('byorder'),
    category: headers.indexOf('itemcategory'),
    weight: headers.indexOf('weight')
  };
  
  console.log('🗂️ Column mapping:', columnIndexes);
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(/[;,]/).map(v => (v || '').trim().replace(/^"(.*)"$/, '$1'));
    
    if (values.length < 3) continue;
    
    try {
      // Проверяем чекбокс
      let isVisibleOnSite = true;
      
      if (hasCheckboxColumn && values.length > checkboxColumnIndex) {
        const checkboxValue = values[checkboxColumnIndex];
        
        if (checkboxValue === 'TRUE' || checkboxValue === 'true' || checkboxValue === '1') {
          checkedCount++;
          isVisibleOnSite = true;
        } else if (checkboxValue === 'FALSE' || checkboxValue === 'false' || checkboxValue === '0') {
          isVisibleOnSite = false;
        } else {
          // Пустой чекбокс - показываем
          isVisibleOnSite = true;
        }
      }
      
      if (!isVisibleOnSite) continue;
      
      // Извлекаем данные
      const id = values[columnIndexes.id] || `item-${i}`;
      const brand = values[columnIndexes.brand] || 'Без бренда';
      const fullName = values[columnIndexes.fullname] || '';
      const collection = values[columnIndexes.collection] || '';
      const country = values[columnIndexes.country] || '';
      const color = values[columnIndexes.color] || 'Не указан';
      const size = values[columnIndexes.size] || '';
      const category = values[columnIndexes.category] || 'Плитка';
      const imageUrl = values[columnIndexes.image] || '';
      
      // КРИТИЧНО: Парсим цену более надёжно
      let price = 0;
      if (columnIndexes.priceRozn >= 0) {
        const priceRaw = values[columnIndexes.priceRozn];
        if (priceRaw && priceRaw !== 'FALSE' && priceRaw !== '') {
          try {
            // Убираем все кроме цифр, точек и запятых
            const cleanPrice = priceRaw.toString()
              .replace(/[^\d.,]/g, '') // Убираем ₽, пробелы и т.д.
              .replace(',', '.'); // Заменяем запятую на точку
            
            const parsed = parseFloat(cleanPrice);
            if (!isNaN(parsed) && parsed > 0) {
              price = Math.round(parsed);
              validPriceCount++;
            }
          } catch (e) {
            console.log(`⚠️ Price parsing error for row ${i}: "${priceRaw}" -> 0`);
          }
        }
      }
      
      // Пропускаем только если цена явно 0 или отрицательная
      if (price <= 0) {
        console.log(`❌ Skipping item ${i}: price=${price}, raw="${values[columnIndexes.priceRozn]}"`);
        continue;
      }
      
      // Обрабатываем размер
      let normalizedSize = size;
      if (size) {
        const sizeMatch = size.match(/(\\d+)[x×x](\\d+)/);
        if (sizeMatch) {
          normalizedSize = `${sizeMatch[1]}×${sizeMatch[2]}`;
        }
      }
      
      // Создаём читаемое название
      let name = fullName;
      if (name) {
        name = name
          .replace(/\\s*\\([^)]*\\)/g, '') // Убираем скобки
          .replace(new RegExp(`^${brand}\\s+`, 'i'), '') // Убираем дублирующийся бренд
          .replace(/^(керамогранит|плитка керамическая|плитка)\\s+/i, '') // Убираем типы
          .trim();
      }
      
      if (!name || name.length < 2) {
        name = `${brand} ${collection}`.trim() || 'Плитка';
      }
      
      if (name.length > 60) {
        name = name.substring(0, 57) + '...';
      }
      
      // Определяем наличие (упрощённо)
      const stockRaw = values[columnIndexes.stock] || '0';
      let hasStock = false;
      try {
        const stockQty = parseFloat(stockRaw.toString().replace(',', '.'));
        hasStock = stockQty > 0.1;
      } catch (e) {
        hasStock = false;
      }
      
      // Если нет в наличии, считаем что под заказ (если есть цена)
      const isOnDemand = !hasStock && price > 0;
      
      const item = {
        id: id,
        name: name,
        brand: brand,
        color: color,
        price: price,
        description: fullName.substring(0, 200) + (fullName.length > 200 ? '...' : ''),
        image: imageUrl && imageUrl.startsWith('http') ? imageUrl : '',
        inStock: hasStock,
        onDemand: isOnDemand,
        hidden: false,
        phone: '',
        category: category,
        collection: collection,
        country: country,
        size: normalizedSize
      };
      
      // Добавляем ЛЮБОЙ товар с валидной ценой
      if (price > 0) {
        items.push(item);
      }
      
    } catch (error) {
      console.error(`Error processing row ${i}:`, error.message);
      continue;
    }
  }
  
  const debugInfo = {
    totalRows: lines.length - 1,
    hasCheckboxColumn: hasCheckboxColumn,
    checkboxColumnName: hasCheckboxColumn ? headers[checkboxColumnIndex] : 'None',
    checkedItems: checkedCount,
    validPriceItems: validPriceCount,
    processedItems: items.length
  };
  
  return {
    items: items,
    debug: debugInfo
  };
}

// API endpoint
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
        'User-Agent': 'TileCatalog/1.3'
      },
      timeout: 20000
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const csvText = await response.text();
    console.log(`[${new Date().toISOString()}] CSV length:`, csvText.length);
    
    const parseResult = parseCSV(csvText);
    const items = parseResult.items;
    
    console.log(`[${new Date().toISOString()}] Debug:`, parseResult.debug);
    console.log(`[${new Date().toISOString()}] Final result: ${items.length} items`);
    
    if (items.length > 0) {
      console.log('✅ Sample items:', items.slice(0, 3).map(i => `${i.name} - ${i.price}₽ (${i.brand})`));
    } else {
      console.log('❌ No items processed - check price column format');
    }
    
    // Короткий кэш для быстрых обновлений
    res.set('Cache-Control', 'public, max-age=30');
    res.set('Content-Type', 'application/json');
    
    res.json({
      success: true,
      count: items.length,
      updated_at: new Date().toISOString(),
      debug: parseResult.debug,
      note: items.length > 0 ? 
        `Показано ${items.length} товаров с валидной ценой из ${parseResult.debug.checkedItems} отмеченных чекбоксом` :
        'Нет товаров с валидной ценой - проверьте формат колонки Price.Roznichnaya',
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

app.get('/healthz', (req, res) => {
  res.status(200).send('OK - Tile Catalog API v1.3');
});

app.get('/', (req, res) => {
  res.json({
    service: 'Tile Catalog API',
    version: '1.3.0',
    status: 'All checked items with valid price shown',
    features: ['checkbox-control', 'enhanced-price-parsing', 'debug-info'],
    endpoints: {
      '/api/items': 'GET - получить все отмеченные товары с валидной ценой',
      '/healthz': 'GET - проверка работоспособности'
    },
    timestamp: new Date().toISOString()
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    available_endpoints: ['/api/items', '/healthz'],
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Tile Catalog API v1.3.0 running on port ${PORT}`);
  console.log(`🎯 New logic: Show ALL checked items with valid price (ignore stock)`);
  console.log(`📋 Health check: http://localhost:${PORT}/healthz`);
  console.log(`🔗 Items API: http://localhost:${PORT}/api/items`);
  
  if (!process.env.SHEET_CSV_URL) {
    console.warn('⚠️ SHEET_CSV_URL not set - API will return error');
  } else {
    console.log(`📄 CSV source: ${process.env.SHEET_CSV_URL.substring(0, 70)}...`);
  }
});