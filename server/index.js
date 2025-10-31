import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

// CORS для всех доменов (можно ограничить)
app.use(cors());

// Middleware
app.use(express.json());

// Утилита парсинга CSV в JSON с поддержкой формата поставщика + чекбоксы
function parseCSV(csvText) {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(/[;,]/).map(h => h.trim().toLowerCase());
  const items = [];
  
  // Маппинг колонок поставщика -> формат каталога + поддержка чекбоксов
  const columnMap = {
    // Чекбокс для управления видимостью на сайте
    'на_сайт': headers.findIndex(h => h.includes('на_сайт') || h.includes('☑️') || h === 'checkbox'),
    'сайт': headers.findIndex(h => h.includes('сайт')),
    'показывать': headers.findIndex(h => h.includes('показывать')),
    
    // Основные поля поставщика -> Каталог
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
    'byorder': headers.findIndex(h => h === 'byorder'),
    'itemcategory': headers.findIndex(h => h === 'itemcategory'),
    'hidden': headers.findIndex(h => h === 'hidden')
  };
  
  // Найдем индекс колонки с чекбоксами
  const checkboxColumnIndex = columnMap['на_сайт'] !== -1 ? columnMap['на_сайт'] : 
                              columnMap['сайт'] !== -1 ? columnMap['сайт'] :
                              columnMap['показывать'] !== -1 ? columnMap['показывать'] : 0; // Первая колонка по умолчанию
  
  console.log('📊 CSV Headers:', headers.slice(0, 10));
  console.log('☑️ Checkbox column index:', checkboxColumnIndex, 'Header:', headers[checkboxColumnIndex]);
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(/[;,]/);
    if (values.length < 3) continue;
    
    const row = {};
    headers.forEach((header, index) => {
      row[header] = (values[index] || '').trim().replace(/^"(.*)"$/, '$1');
    });
    
    try {
      // Проверяем чекбокс - показывать ли товар на сайте
      const showOnSite = values[checkboxColumnIndex];
      const isVisibleOnSite = showOnSite === 'TRUE' || showOnSite === 'true' || showOnSite === '1';
      
      // Если товар не отмечен чекбоксом - пропускаем
      if (!isVisibleOnSite) {
        continue;
      }
      
      // Извлекаем данные с учетом разных форматов
      const id = row['id'] || `item-${i}`;
      const brand = row['brand'] || 'Без бренда';
      const fullName = row['fullname'] || '';
      const collection = row['collection'] || '';
      const country = row['country'] || '';
      const color = row['color'] || 'Не указан';
      
      // Обработка размера (30x30x0,8 -> 30×30)
      let size = row['size'] || '';
      if (size) {
        const sizeMatch = size.match(/(\d+)[x×](\d+)/);
        if (sizeMatch) {
          size = `${sizeMatch[1]}×${sizeMatch[2]}`;
        }
      }
      
      // Парсим цену
      let price = 0;
      const priceRaw = row['price.roznichnaya'] || row['price'] || '0';
      if (priceRaw && priceRaw !== 'FALSE') {
        try {
          price = parseInt(parseFloat(priceRaw.toString().replace(',', '.')));
        } catch (e) {
          price = 0;
        }
      }
      
      // Пропускаем товары без цены
      if (price <= 0) continue;
      
      // Создаем читаемое название
      let name = fullName;
      if (name) {
        // Убираем скобки с техническими данными
        name = name.replace(/\s*\([^)]*\)/g, '');
        // Убираем повторяющийся бренд
        if (brand && name.toLowerCase().startsWith(brand.toLowerCase())) {
          name = name.substring(brand.length).trim();
        }
        // Убираем "керамогранит" и подобные слова в начале
        name = name.replace(/^(керамогранит|плитка керамическая|плитка)\s+/i, '');
        name = name.trim();
      }
      
      if (!name || name.length < 2) {
        name = `${brand} ${collection}`.trim() || 'Плитка';
      }
      
      // Ограничиваем длину
      if (name.length > 50) {
        name = name.substring(0, 47) + '...';
      }
      
      // Нормализуем цвет
      const colorMap = {
        'серый': 'Серый',
        'светло-серый': 'Светло-серый',
        'темно-серый': 'Темно-серый', 
        'чёрный': 'Черный',
        'черный': 'Черный',
        'белый': 'Белый',
        'бежевый': 'Бежевый',
        'коричневый': 'Коричневый'
      };
      const normalizedColor = colorMap[color.toLowerCase()] || color;
      
      // Определяем наличие
      const stockRaw = row['rest.moskow'] || row['stock'] || '0';
      let hasStock = false;
      try {
        const stockQty = parseFloat(stockRaw.toString().replace(',', '.'));
        hasStock = stockQty > 0.1;
      } catch (e) {
        hasStock = false;
      }
      
      const byOrder = (row['byorder'] || '').toLowerCase() === 'true';
      
      // Проверяем URL изображения
      let imageUrl = row['image'] || '';
      if (imageUrl && !imageUrl.startsWith('http')) {
        imageUrl = '';
      }
      
      const item = {
        id: id,
        name: name,
        brand: brand,
        color: normalizedColor,
        price: price,
        description: fullName.substring(0, 150) + (fullName.length > 150 ? '...' : ''),
        image: imageUrl,
        inStock: hasStock,
        onDemand: !hasStock && (byOrder || price > 0),
        hidden: false, // Если товар отмечен чекбоксом, он не скрыт
        phone: '',
        category: row['itemcategory'] || row['category'] || 'Плитка',
        stock: stockRaw,
        collection: collection,
        country: country,
        size: size
      };
      
      // Добавляем только если товар доступен
      if (item.inStock || item.onDemand) {
        items.push(item);
      }
      
    } catch (error) {
      console.error(`Error processing row ${i}:`, error.message);
      continue;
    }
  }
  
  return items;
}

// API эндпоинт: проксирование Google Sheets CSV -> JSON с поддержкой чекбоксов
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
        'User-Agent': 'TileCatalog/1.0'
      },
      timeout: 15000
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const csvText = await response.text();
    console.log(`[${new Date().toISOString()}] CSV length:`, csvText.length);
    console.log('CSV preview:', csvText.substring(0, 200) + '...');
    
    const items = parseCSV(csvText);
    
    console.log(`[${new Date().toISOString()}] Processed ${items.length} items (only checked items shown)`);
    
    if (items.length > 0) {
      console.log('Sample items:', items.slice(0, 2).map(i => `${i.name} - ${i.price}₽`));
    }
    
    // Кэш на 1 минуту
    res.set('Cache-Control', 'public, max-age=60');
    res.set('Content-Type', 'application/json');
    
    res.json({
      success: true,
      count: items.length,
      updated_at: new Date().toISOString(),
      source_url: csvUrl.substring(0, 60) + '...',
      note: 'Only items marked with checkbox are shown',
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
    version: '1.2.0',
    features: ['checkbox-control', 'supplier-format', 'auto-mapping'],
    endpoints: {
      '/api/items': 'GET - получить список товаров из Google Sheets (только отмеченные чекбоксом)',
      '/healthz': 'GET - проверка работоспособности'
    },
    note: 'Items are filtered by checkbox in first column of CSV',
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
  console.log(`🚀 Tile Catalog API v1.2.0 running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/healthz`);
  console.log(`📋 Items API: http://localhost:${PORT}/api/items`);
  console.log(`☑️ Feature: Checkbox control for site visibility`);
  
  if (!process.env.SHEET_CSV_URL) {
    console.warn('⚠️ SHEET_CSV_URL not set - API will return error');
  } else {
    console.log(`📄 CSV source: ${process.env.SHEET_CSV_URL.substring(0, 60)}...`);
  }
});