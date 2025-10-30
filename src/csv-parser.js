/**
 * Hard fix: eliminate `this` usage in parseCSV path. Use pure functions.
 */

// Pure helpers
function s(v){ return v?String(v).trim():'' }
function n(v){ const x=parseFloat(v); return isNaN(x)?0:x }
function b(v){ if(typeof v==='boolean') return v; if(typeof v==='string'){ const l=v.toLowerCase().trim(); return l==='true'||l==='1'||l==='да'||l==='yes' } return Boolean(v) }
function cs(v){ if(!v) return ''; return String(v).replace(/['"<>]/g,'').replace(/\s+/g,' ').trim() }

export default class TileCatalogFixless {
  constructor(cfg){ this.cfg = cfg || {} }
  parse(csv){ const wb=XLSX.read(csv,{type:'string'}); const ws=wb.Sheets[wb.SheetNames[0]]; const rows=XLSX.utils.sheet_to_json(ws,{header:1}); if(rows.length<2) return []; return rows.slice(1).filter(r=>r&&r.length>0).map(r=>({ id:'product-'+Math.random().toString(36).slice(2,11), name:cs(s(r[0]))||'Без названия', brand:cs(s(r[1]))||'Неизвестно', color:cs(s(r[2]))||'Не указан', price:n(r[3])||0, description:cs(s(r[4]))||'', image:s(r[5])||'', phone:s(r[6])||'', inStock:b(r[7]), onDemand:b(r[8]), hidden:b(r[9]) })) }
}
