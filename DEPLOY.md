# 🚀 Деплой каталога плитки на Render

## 📋 Обзор

Каталог плитки состоит из двух сервисов:
- **Static Site** - фронтенд (Vite/HTML/CSS/JS)
- **Web Service** - API (Node.js/Express) для проксирования Google Sheets

## 🏗️ Архитектура

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Static Site   │───▶│   API Service    │───▶│  Google Sheets  │
│   (Frontend)    │    │   (Backend)      │    │     (Data)      │
│                 │    │                  │    │                 │
│ • HTML/CSS/JS   │    │ • Express server │    │ • CSV export    │
│ • Vite build    │    │ • CSV→JSON proxy │    │ • Public access │
│ • Static files  │    │ • CORS headers   │    │ • Real-time     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🎯 Пошаговый деплой

### Шаг 1: Подготовка Google Sheets

1. **Убедись что таблица публичная:**
   - Открой: https://docs.google.com/spreadsheets/d/1EcJMDIyBb8D3WDR5odDc9bD_Pf-Kxl90KKpg__AAoOA/edit
   - Кнопка "Поделиться" → "Изменить" → "Все, у кого есть ссылка"

2. **CSV экспорт уже настроен:**
   ```
   https://docs.google.com/spreadsheets/d/e/2PACX-1vRfhgka5nFoR1TXYDGQ5CziYYqGSDXjhw_yJeO-MqFTb-k_RWlkjvaWxy9vBzLuKmo4KdCnz2SAdvMh/pub?gid=0&single=true&output=csv
   ```

3. **Формат данных в таблице:**
   ```
   name | brand | color | price | description | image | inStock | onDemand | hidden
   ```

### Шаг 2: Деплой API Service (Backend)

1. **В Render Dashboard:**
   - New → Web Service
   - Connect Repository: `zefri1/tile-catalog`
   - Branch: `main`

2. **Настройки Web Service:**
   ```
   Name: tile-catalog-api
   Language: Node
   Region: Frankfurt (EU Central)
   Branch: main
   Root Directory: server
   Build Command: npm ci
   Start Command: node index.js
   Plan: Free
   ```

3. **Environment Variables для API:**
   ```
   SHEET_CSV_URL = https://docs.google.com/spreadsheets/d/e/2PACX-1vRfhgka5nFoR1TXYDGQ5CziYYqGSDXjhw_yJeO-MqFTb-k_RWlkjvaWxy9vBzLuKmo4KdCnz2SAdvMh/pub?gid=0&single=true&output=csv
   
   NODE_ENV = production
   ```

4. **После деплоя:**
   - Скопируй URL API (например: `https://tile-catalog-api.onrender.com`)
   - Проверь: `https://tile-catalog-api.onrender.com/api/items`

### Шаг 3: Деплой Static Site (Frontend)

1. **В Render Dashboard:**
   - New → Static Site  
   - Same Repository: `zefri1/tile-catalog`
   - Branch: `main`

2. **Настройки Static Site:**
   ```
   Name: tile-catalog-web
   Build Command: npm ci && npm run build
   Publish Directory: dist
   Pull Request Previews: Yes
   ```

3. **Environment Variables для Static:**
   ```
   VITE_API_URL = https://tile-catalog-api.onrender.com
   VITE_SHEET_CSV_URL = https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?gid=0&single=true&output=csv
   VITE_CACHE_BUSTER = v=1
   ```

### Шаг 4: Проверка работы

1. **API Service:**
   ```bash
   curl https://tile-catalog-api.onrender.com/healthz
   # Ответ: OK
   
   curl https://tile-catalog-api.onrender.com/api/items
   # Ответ: JSON с товарами
   ```

2. **Static Site:**
   - Открой в браузере
   - Проверь что товары загрузились
   - Протестируй фильтры на мобиле

## 🔄 Обновление данных без редеплоя

### Метод 1: Изменение таблицы + кэш-бастер
1. Отредактируй данные в Google Sheets
2. В Render → Static Site → Environment Variables
3. Измени `VITE_CACHE_BUSTER` с `v=1` на `v=2`
4. Save → сайт подтянет новые данные

### Метод 2: Рестарт API сервиса
1. Render → Web Service → Manual Deploy
2. Deploy Latest Commit
3. API очистит кэш и загрузит свежие данные

## ⚙️ Конфигурация

### Переменные окружения

#### Static Site:
```bash
VITE_API_URL=https://tile-catalog-api.onrender.com
VITE_SHEET_CSV_URL=https://docs.google.com/.../output=csv  
VITE_CACHE_BUSTER=v=1
```

#### API Service:
```bash
SHEET_CSV_URL=https://docs.google.com/.../output=csv
NODE_ENV=production
```

### Структура проекта
```
tile-catalog/
├── index.html              # Главная страница
├── src/                    # Исходники фронтенда
│   ├── styles.css         # Основные стили
│   ├── patches.css        # Мобильные исправления
│   ├── main.js           # UI логика (фильтры, тема)
│   └── catalog.js        # Логика каталога (API + CSV)
├── server/                # API сервис
│   ├── package.json      # Зависимости Node.js
│   └── index.js         # Express сервер
├── render.yaml           # Конфигурация Render
├── package.json         # Зависимости фронтенда
├── vite.config.js       # Настройки сборки
└── DEPLOY.md            # Эта инструкция
```

## 🛠️ Устранение неполадок

### API Service не запускается
- Проверь логи в Render → Web Service → Logs
- Убедись что `SHEET_CSV_URL` задан
- Проверь что `server/package.json` корректный

### Static Site не собирается  
- Проверь что `npm run build` работает локально
- Убедись что все зависимости в `package.json`
- Проверь логи сборки в Render

### Данные не загружаются
- Открой Developer Tools → Network
- Проверь запросы к `/api/items` и CSV URL
- Убедись что Google Sheets публичная
- Попробуй обновить `VITE_CACHE_BUSTER`

### Мобильная версия работает некорректно
- Проверь что `src/patches.css` загружается
- Убедись что JavaScript не падает с ошибками
- Протестируй на разных разрешениях экрана

## 🔗 Полезные ссылки

- **Render Docs:** https://render.com/docs
- **Static Sites:** https://render.com/docs/static-sites
- **Web Services:** https://render.com/docs/web-services
- **Environment Variables:** https://render.com/docs/environment-variables

## 📞 Поддержка

Если что-то не работает:
1. Проверь логи в Render Dashboard
2. Убедись что все Environment Variables заданы
3. Протестируй API endpoint отдельно
4. Проверь что Google Sheets доступен публично

---
*Создано для автоматизации каталога плитки © 2025*