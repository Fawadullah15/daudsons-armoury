const fs = require('fs');
const s = fs.readFileSync('public/index.html', 'utf8');
const routes = [
  'home', 'products', 'product-detail', 'shop', 'cart', 'about-us',
  'dealers', 'news-and-events', 'daudsons-foundation', 'downloads',
  'contact-us', 'legal', 'admin', '404-demo'
];
console.log('=== ROUTE VIEWS AUDIT ===');
let missing = 0;
routes.forEach(r => {
  const id = `id="view-${r}"`;
  const found = s.includes(id);
  console.log(`view-${r}:`, found ? 'EXISTS ✓' : 'MISSING ✗');
  if (!found) missing++;
});
if (missing === 0) {
  console.log('ALL ROUTE VIEWS PRESENT IN HTML!');
} else {
  console.log(`WARNING: ${missing} views missing!`);
}
