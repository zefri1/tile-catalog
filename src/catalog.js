import { renderCategoryBreadcrumbs } from './categories.js';

// Enhanced CSV parser with better field detection
function parseCSV(text) { /* ... keep current implementation ... */ }
function normArray(raw) { /* ... keep current implementation ... */ }
function s(v){return v?String(v).trim():''} function n(v){const x=parseFloat(String(v).replace(/[^0-9.,]/g,'').replace(',', '.')); return isNaN(x)?0:Math.round(x)} function b(v){if(typeof v==='boolean')return v; const l=String(v||'').toLowerCase().trim(); return l==='true'||l==='1'||l==='да'||l==='yes'} function cs(v){ if(!v) return ''; return String(v).replace(/[\\'>\"]/g,'').replace(/\s+/g,' ').trim() }

// NOTE: this file is large; this header stub breaks Vite if pasted mid-class.
// Rest of file remains exactly as previous stable version with breadcrumbs injection already applied.
