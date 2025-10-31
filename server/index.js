import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

// CORS для всех доменов (можно ограничить)
app.use(cors());

// Middleware
app.use(express.json());

// Утилита парсинга CSV в JSON
function parseCSV(csvText) {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  const items = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length < headers.length) continue;
    
    const item = {};
    headers.forEach((header, index) => {
      item[header] = (values[index] || '').trim();
    });
    
    // Фильтр: пропускаем товары без названия или с hidden=true
    if (item.name && item.hidden !== 'true') {
      items.push(item);
    }
  }
  
  return items;
}

// API эндпоинт: проксирование Google Sheets CSV -> JSON
app.get('/api/items', async (req, res) => {
  try {
    const csvUrl = process.env.SHEET_CSV_URL;
    if (!csvUrl) {
      return res.status(500).json({ 
        error: 'SHEET_CSV_URL environment variable not set' 
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
    const items = parseCSV(csvText);
    
    console.log(`[${new Date().toISOString()}] Processed ${items.length} items`);
    
    // Кэш на 1 минуту
    res.set('Cache-Control', 'public, max-age=60');
    res.set('Content-Type', 'application/json');
    
    res.json({
      success: true,
      count: items.length,
      updated_at: new Date().toISOString(),
      items: items
    });
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error:`, error.message);
    
    res.status(500).json({
      success: false,
      error: error.message,
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
    version: '1.0.0',
    endpoints: {
      '/api/items': 'GET - получить список товаров из Google Sheets',
      '/healthz': 'GET - проверка работоспособности'
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
  console.log(`🚀 Tile Catalog API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/healthz`);
  console.log(`📋 Items API: http://localhost:${PORT}/api/items`);
  
  if (!process.env.SHEET_CSV_URL) {
    console.warn('⚠️  SHEET_CSV_URL not set - API will return error');
  }
});