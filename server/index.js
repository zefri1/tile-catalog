import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ==== CSV parser with quotes handling ====
function parseCSV(text) {
  const rows = [];
  let i = 0, field = '', row = [], inQuotes = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',' || c === ';') { row.push(field); field = ''; i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field=''; i++; continue; }
    if (c === '\r') { i++; continue; }
    field += c; i++;
  }
  row.push(field); rows.push(row); return rows;
}

function normalizeHeader(h){ return String(h||'').trim().toLowerCase(); }
function cleanPrice(raw){
  if (raw == null) return 0;
  const s = String(raw).trim();
  if (!/[0-9]/.test(s)) return 0; // нет цифр вовсе
  const cleaned = s.replace(/[^0-9.,]/g,'').replace(/,/g,'.');
  const val = parseFloat(cleaned);
  if (isNaN(val) || val <= 0) return 0;
  return Math.round(val);
}

function parseCSVData(csvText){
  const rows = parseCSV(csvText);
  if (!rows || rows.length < 2) return { items: [], debug: 'empty' };
  const headers = rows[0].map(normalizeHeader);

  const idx = (names)=>{
    for (const n of names){ const k = headers.indexOf(n); if (k!==-1) return k; }
    return -1;
  };

  const col = {
    checkbox: idx(['на_сайт','насайт','checkbox','сайт']),
    id: idx(['id']),
    brand: idx(['brand']),
    fullname: idx(['fullname','name']),
    collection: idx(['collection']),
    country: idx(['country']),
    color: idx(['color']),
    size: idx(['size']),
    priceRozn: idx(['price.roznichnaya','price roznichnaya','price_roznichnaya','price']),
    priceDiler: idx(['price.diler2','price diler2','price_diler2']),
    image: idx(['image']),
    stock: idx(['rest.moskow','stock']),
    category: idx(['itemcategory','category'])
  };

  const items=[]; let checked=0, validPrice=0, processed=0;
  const hasCheckbox = col.checkbox!==-1;

  for(let i=1;i<rows.length;i++){
    const r = rows[i]; if(!r||r.length<3) continue;

    // checkbox
    let show=true;
    if (hasCheckbox){ const v=String(r[col.checkbox]||'').trim(); if (v==='FALSE'||v==='false'||v==='0'){ show=false; } if (v==='TRUE'||v==='true'||v==='1'){ checked++; show=true; } }
    if(!show) continue;

    // price: prefer Roznichnaya, fallback Diler2
    let price = cleanPrice(col.priceRozn>=0? r[col.priceRozn]: '');
    if (price===0) price = cleanPrice(col.priceDiler>=0? r[col.priceDiler]: '');
    if (price===0) { continue; }
    validPrice++;

    const brand = r[col.brand]||'Без бренда';
    const full = r[col.fullname]||'';
    let name = full ? String(full) : `${brand} ${r[col.collection]||''}`;
    name = String(name).replace(/\s*\([^)]*\)/g,'').trim();
    if (!name) name = 'Плитка';
    if (name.length>60) name = name.slice(0,57)+'...';

    const size = r[col.size]||''; let nsize = size;
    const m = String(size).match(/(\d+)[x×x](\d+)/); if(m) nsize = `${m[1]}×${m[2]}`;

    const image = r[col.image]||''; const img = (String(image).startsWith('http')? image:'');
    const stockRaw = r[col.stock]||'0'; let inStock=false; try{ inStock = parseFloat(String(stockRaw).replace(',','.'))>0.1; }catch{ inStock=false; }

    items.push({
      id: r[col.id]||`item-${i}`,
      name,
      brand,
      color: r[col.color]||'Не указан',
      price,
      description: String(full).slice(0,200)+(String(full).length>200?'...':''),
      image: img,
      inStock,
      onDemand: !inStock,
      hidden:false,
      phone:'',
      category: r[col.category]||'Плитка',
      collection: r[col.collection]||'',
      country: r[col.country]||'',
      size: nsize
    });
    processed++;
  }

  return { items, debug:{ totalRows: rows.length-1, checkedItems: checked, validPriceItems: validPrice, processedItems: processed, priceFrom: (col.priceRozn!==-1? 'Price.Roznichnaya': (col.priceDiler!==-1? 'Price.Diler2':'none')) } };
}

app.get('/api/items', async (req,res)=>{
  try{
    const csvUrl = process.env.SHEET_CSV_URL;
    if(!csvUrl) return res.status(500).json({success:false,error:'SHEET_CSV_URL not set',items:[]});
    const resp = await fetch(csvUrl,{headers:{'User-Agent':'TileCatalog/1.5'},timeout:20000});
    if(!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const csv = await resp.text();
    const result = parseCSVData(csv);
    res.set('Cache-Control','public, max-age=30');
    res.json({success:true,count:result.items.length,updated_at:new Date().toISOString(),debug:result.debug,items:result.items});
  }catch(e){ res.status(500).json({success:false,error:e.message,items:[]}); }
});

app.get('/healthz',(req,res)=>res.send('OK - v1.5 price parsing fixed with fallback'));
app.listen(PORT,()=>{ console.log('🚀 API v1.5 running on',PORT); });
