function normArray(raw) {
  return String(raw||"")
    .split(/[;,|]/)
    .map(x=>String(x).replace(/[-–—]/g,'').trim())
    .filter(x=>x && x.toLowerCase()!=='нет' && x!=='0');
}
