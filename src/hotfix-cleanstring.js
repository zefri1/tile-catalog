/**
 * Quick fix: bind cleanString as static to avoid context issues during parse
 */

class TileCatalog {
  constructor(){ /* body will be replaced below at runtime (keeping file diff minimal) */ }
}

// Real implementation
TileCatalog.prototype.cleanString = function(s){ if(!s) return ''; return String(s).replace(/['"<>]/g,'').replace(/\s+/g,' ').trim(); };
TileCatalog.prototype.getString = function(v){ return v?String(v).trim():''; };
TileCatalog.prototype.getNumber = function(v){ const n=parseFloat(v); return isNaN(n)?0:n; };
TileCatalog.prototype.getBoolean = function(v){ if(typeof v==='boolean') return v; if(typeof v==='string'){ const l=v.toLowerCase().trim(); return l==='true'||l==='1'||l==='да'||l==='yes'; } return Boolean(v); };

// Re-export to preserve window.TileCatalog assignment in other bundle parts
export default TileCatalog;
