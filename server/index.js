import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Правильный CSV парсер с обработкой кавычек (как в frontend)
function parseCSV(text) {
  const rows = [];
  let i = 0, field = '', row = [], inQuotes = false;
  
  while (i < text.length) {
    const c = text[i];
    
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { 
          field += '"'; 
          i += 2; 
          continue; 
        }
        inQuotes = false; 
        i++; 
        continue;
      }
      field += c; 
      i++; 
      continue;
    }
    
    if (c === '"') { 
      inQuotes = true; 
      i++; 
      continue; 
    }
    
    if (c === ',' || c === ';') { 
      row.push(field.trim()); 
      field = ''; 
      i++; 
      continue; 
    }
    
    if (c === '\n') { 
      row.push(field.trim()); 
      if (row.length > 0) rows.push(row); 
      row = []; 
      field = ''; 
      i++; 
      continue; 
    }
    
    if (c === '\r') { 
      i++; 
      continue; 
    }
    
    field += c; 
    i++;
  }
  
  // Добавляем последнее поле и строку
  if (field || row.length > 0) {
    row.push(field.trim());
    if (row.length > 0) rows.push(row);
  }
  
  return rows;
}

// Парсинг данных в JSON формат с поддержкой чекбоксов
function parseCSVData(csvText) {
  const rows = parseCSV(csvText);
  if (!rows || rows.length < 2) {
    return { items: [], debug: 'Empty CSV after parsing' };
  }
  
  const headers = rows[0].map(h => String(h || '').toLowerCase().trim());
  console.log('📊 Full CSV Headers:', headers);
  
  // Поиск колонок по именам
  const getColumnIndex = (names) => {
    for (const name of names) {
      const index = headers.findIndex(h => h === name || h.includes(name));
      if (index !== -1) return index;
    }
    return -1;
  };
  
  const columnIndexes = {
    checkbox: getColumnIndex(['на_сайт', 'насайт', 'checkbox', 'сайт']),
    id: getColumnIndex(['id']),
    brand: getColumnIndex(['brand']),
    fullname: getColumnIndex(['fullname', 'name']),
    collection: getColumnIndex(['collection']),
    country: getColumnIndex(['country']),
    color: getColumnIndex(['color']),
    size: getColumnIndex(['size']),
    price: getColumnIndex(['price.roznichnaya', 'price roznichnaya', 'price_roznichnaya', 'price']),
    image: getColumnIndex(['image']),
    stock: getColumnIndex(['rest.moskow', 'rest moskow', 'stock']),
    byOrder: getColumnIndex(['byorder', 'by_order']),
    category: getColumnIndex(['itemcategory', 'item_category', 'category'])
  };
  
  console.log('🗂️ Column mapping:', columnIndexes);
  
  const items = [];
  let checkedCount = 0;
  let validPriceCount = 0;
  let processedCount = 0;
  
  const hasCheckboxColumn = columnIndexes.checkbox !== -1;
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 3) continue;
    
    try {
      // Проверяем чекбокс
      let showOnSite = true;
      
      if (hasCheckboxColumn) {
        const checkboxValue = (row[columnIndexes.checkbox] || '').trim();
        
        if (checkboxValue === 'TRUE' || checkboxValue === 'true' || checkboxValue === '1') {
          checkedCount++;
          showOnSite = true;
        } else if (checkboxValue === 'FALSE' || checkboxValue === 'false' || checkboxValue === '0') {
          showOnSite = false;
        } else {
          // Пустой чекбокс - показываем для совместимости
          showOnSite = true;
        }
      }
      
      if (!showOnSite) continue;
      
      // Извлекаем данные
      const id = row[columnIndexes.id] || `item-${i}`;
      const brand = row[columnIndexes.brand] || 'Без бренда';
      const fullName = row[columnIndexes.fullname] || '';
      const collection = row[columnIndexes.collection] || '';
      const country = row[columnIndexes.country] || '';
      const color = row[columnIndexes.color] || 'Не указан';
      const size = row[columnIndexes.size] || '';
      const imageUrl = row[columnIndexes.image] || '';
      
      // КРИТИЧНО: Парсим цену из ПРАВИЛЬНОЙ колонки
      let price = 0;
      if (columnIndexes.price >= 0) {
        const priceRaw = row[columnIndexes.price] || '';
        if (priceRaw && priceRaw !== 'FALSE') {
          try {
            // Убираем всё кроме цифр, точек и запятых
            const cleanPrice = priceRaw.toString()
              .replace(/[^\\d.,]/g, '')
              .replace(',', '.');
            
            const parsed = parseFloat(cleanPrice);
            if (!isNaN(parsed) && parsed > 0) {
              price = Math.round(parsed);
              validPriceCount++;
            }
          } catch (e) {
            console.log(`⚠️ Price parsing error for row ${i}: "${priceRaw}"`);
          }
        }
      }
      
      if (price <= 0) {
        console.log(`❌ Row ${i}: No valid price. Raw: "${row[columnIndexes.price]}"`);
        continue;
      }
      
      // Обработка размера
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
          .replace(/\\s*\\([^)]*\\)/g, '')
          .replace(new RegExp(`^${brand}\\\\s+`, 'i'), '')
          .replace(/^(керамогранит|плитка керамическая|плитка)\\s+/i, '')
          .trim();
      }
      
      if (!name || name.length < 2) {
        name = `${brand} ${collection}`.trim() || 'Плитка';
      }
      
      if (name.length > 60) {
        name = name.substring(0, 57) + '...';
      }
      
      // Определяем наличие
      let hasStock = false;
      if (columnIndexes.stock >= 0) {
        const stockRaw = row[columnIndexes.stock] || '0';
        try {
          const stockQty = parseFloat(stockRaw.toString().replace(',', '.'));
          hasStock = stockQty > 0.1;
        } catch (e) {
          hasStock = false;
        }
      }
      
      const item = {
        id: id,
        name: name,
        brand: brand,
        color: color,
        price: price,
        description: fullName.substring(0, 200) + (fullName.length > 200 ? '...' : ''),
        image: imageUrl && imageUrl.startsWith('http') ? imageUrl : '',
        inStock: hasStock,
        onDemand: !hasStock,
        hidden: false,
        phone: '',
        category: row[columnIndexes.category] || 'Плитка',
        collection: collection,
        country: country,
        size: normalizedSize
      };
      
      items.push(item);
      processedCount++;
      
    } catch (error) {
      console.error(`Error processing row ${i}:`, error.message);
      continue;
    }
  }
  
  const debugInfo = {
    totalRows: rows.length - 1,
    hasCheckboxColumn: hasCheckboxColumn,
    checkboxColumnName: hasCheckboxColumn ? headers[columnIndexes.checkbox] : 'None',
    checkedItems: checkedCount,
    validPriceItems: validPriceCount,
    processedItems: processedCount,
    priceColumnIndex: columnIndexes.price,
    priceColumnName: columnIndexes.price >= 0 ? headers[columnIndexes.price] : 'Not found'
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
    
    console.log(`[${new Date().toISOString()}] 🚀 Fetching CSV from:`, csvUrl);
    
    const response = await fetch(csvUrl, {
      headers: {
        'User-Agent': 'TileCatalog/1.4'
      },
      timeout: 20000
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const csvText = await response.text();
    console.log(`[${new Date().toISOString()}] 📄 CSV length:`, csvText.length, 'chars');
    
    const parseResult = parseCSVData(csvText);
    const items = parseResult.items;
    
    console.log(`[${new Date().toISOString()}] 📊 Parse Result:`, parseResult.debug);
    console.log(`[${new Date().toISOString()}] 🎯 FINAL: ${items.length} items ready for catalog`);
    
    if (items.length > 0) {
      console.log('✅ Success! Sample items:', 
        items.slice(0, 3).map(i => `"${i.name}" - ${i.price}₽ (${i.brand})`));
    } else {
      console.log('❌ No valid items found. Check price column format or checkbox values.');
    }
    
    res.set('Cache-Control', 'public, max-age=30');
    res.set('Content-Type', 'application/json');
    
    res.json({
      success: true,
      count: items.length,
      updated_at: new Date().toISOString(),
      debug: parseResult.debug,
      note: items.length > 0 ? 
        `Показано ${items.length} товаров из ${parseResult.debug.checkedItems} отмеченных чекбоксом` :
        'Нет товаров с валидной ценой - проверьте колонку Price.Roznichnaya',
      items: items
    });
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ ERROR:`, error.message);
    
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
  res.status(200).send('OK - Tile Catalog API v1.4 with proper CSV parser');
});

app.get('/', (req, res) => {
  res.json({
    service: 'Tile Catalog API',
    version: '1.4.0',
    status: 'Fixed CSV parsing with quotes handling',
    features: ['proper-csv-parser', 'checkbox-control', 'column-name-lookup', 'debug-info'],
    fix: 'Resolved infinite loading by implementing correct CSV parser with quotes support',
    endpoints: {
      '/api/items': 'GET - получить все отмеченные товары с корректной ценой',
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
  console.log(`🚀 Tile Catalog API v1.4.0 running on port ${PORT}`);
  console.log(`🛠️ FIXED: Proper CSV parser with quotes handling`);
  console.log(`🎯 Should now load ALL checked items with valid prices`);
  console.log(`📋 Health check: http://localhost:${PORT}/healthz`);
  console.log(`📊 Items API: http://localhost:${PORT}/api/items`);
  
  if (!process.env.SHEET_CSV_URL) {
    console.warn('⚠️ SHEET_CSV_URL not set - API will return error');
  } else {
    console.log(`📄 CSV source: ${process.env.SHEET_CSV_URL.substring(0, 70)}...`);
  }
});