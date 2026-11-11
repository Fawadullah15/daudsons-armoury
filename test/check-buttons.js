const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');
const app = fs.readFileSync('public/js/app.js', 'utf8');
const router = fs.readFileSync('public/js/router.js', 'utf8');

const idRegex = /<button[^>]*id=["']([^"']+)["'][^>]*>/g;
let m;
const unhandledIds = [];
while ((m = idRegex.exec(html)) !== null) {
  const id = m[1];
  const inApp = app.includes(id);
  const inRouter = router.includes(id);
  const hasOnclick = m[0].includes('onclick=');
  const hasDataRoute = m[0].includes('data-route=');
  if (!inApp && !inRouter && !hasOnclick && !hasDataRoute) {
    unhandledIds.push({ id, tag: m[0] });
  }
}
console.log('Buttons with ID that are NOT handled in app.js or router.js:', unhandledIds);
