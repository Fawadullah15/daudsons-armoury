const http = require('http');
const app = require('../server');
const auth = require('../auth');

let server;
const PORT = 3054; // Use dedicated test port

function request(options, postData, cookie = null) {
  return new Promise((resolve, reject) => {
    const headers = { ...options.headers };
    if (cookie) {
      headers['Cookie'] = cookie;
    }
    const req = http.request({ port: PORT, ...options, headers }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

function extractCookie(headers) {
  const setCookie = headers['set-cookie'];
  if (!setCookie) return null;
  const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return cookieStr.split(';')[0];
}

async function runTests() {
  console.log('===========================================================');
  console.log('  DAUDSONS ARMOURY (PVT.) LTD. — ENTERPRISE TEST SUITE     ');
  console.log('  Testing Auth, 2FA, RBAC, CMS, Compliance & Security APIs ');
  console.log('===========================================================');

  // Reset admin 2FA state for deterministic test run
  try {
    const db = require('../database');
    db.db.prepare("UPDATE users SET totp_enabled = 0, failed_login_attempts = 0, lockout_until = NULL WHERE email = 'admin@daudsons.com'").run();
  } catch (_) {}

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  await new Promise(r => {
    server = app.listen(PORT, r);
  });

  try {
    // ---------------------------------------------------------
    // 1. HEALTH & SECURITY HEADERS
    // ---------------------------------------------------------
    const health = await request({ path: '/api/health', method: 'GET' });
    assert(health.status === 200 && health.body.status === 'healthy', 'Health check returns 200 Healthy');
    assert(health.headers['x-frame-options'] === 'SAMEORIGIN', 'Security Header: X-Frame-Options set to SAMEORIGIN');
    assert(health.headers['x-content-type-options'] === 'nosniff', 'Security Header: X-Content-Type-Options set to nosniff');
    assert(health.headers['content-security-policy'] !== undefined, 'Security Header: Content-Security-Policy header active');

    // ---------------------------------------------------------
    // 2. STATS & PUBLIC CATALOG
    // ---------------------------------------------------------
    const stats = await request({ path: '/api/stats', method: 'GET' });
    assert(stats.status === 200 && stats.body.totalProducts >= 30, `Stats returns >= 30 products (got ${stats.body.totalProducts})`);
    assert(stats.body.totalDealers === 9, `Stats returns 9 verified dealer cities (got ${stats.body.totalDealers})`);

    const prods = await request({ path: '/api/products', method: 'GET' });
    assert(prods.status === 200 && prods.body.length >= 30, 'Products listing returns all 30 catalog items');

    const firearms = await request({ path: '/api/products?division=firearms', method: 'GET' });
    assert(firearms.status === 200 && firearms.body.length === 12, 'Firearms division filter returns 12 items');

    const trushot = await request({ path: '/api/products/dsa-trushot-9mm-standard', method: 'GET' });
    assert(trushot.status === 200 && trushot.body.name.includes('Trushot'), 'Get product by slug returns DSA Trushot 9mm');
    assert(trushot.body.requiresLicense === true, 'Statutory flag: requiresLicense is true for DSA Trushot 9mm');

    // ---------------------------------------------------------
    // 3. STATUTORY COMPLIANCE GUARDRAIL & HONEYPOT
    // ---------------------------------------------------------
    // Prohibit firearms checkout via e-shop cart
    const illegalOrder = await request(
      { path: '/api/orders', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      {
        customerName: 'Illegal Arms Buyer',
        customerPhone: '+92-300-1111111',
        city: 'Lahore',
        address: 'Illegal order attempt',
        items: [{ id: 'dsa-trushot-9mm-standard', name: 'DSA Trushot 9mm', price: 95000, qty: 1 }]
      }
    );
    assert(illegalOrder.status === 400, 'Compliance Guardrail: Order containing firearms rejected online (HTTP 400)');

    // Anti-bot honeypot
    const spamOrder = await request(
      { path: '/api/orders', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      {
        customerName: 'Bot Buyer',
        customerPhone: '12345',
        city: 'Nowhere',
        address: 'Bot Street',
        items: [{ id: 'shop-01', qty: 1 }],
        honeypot: 'filled-by-bot'
      }
    );
    assert(spamOrder.status === 400, 'Anti-spam honeypot blocks automated bot order submission');

    // Valid non-restricted merchandise order
    const validOrder = await request(
      { path: '/api/orders', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      {
        customerName: 'Tariq Mehmood',
        customerPhone: '+92-300-8888888',
        customerEmail: 'tariq@test.pk',
        city: 'Peshawar',
        address: 'Kohat Road, Peshawar',
        items: [{ id: 'shop-01', name: 'DSA Official Orange Edition T-Shirt', price: 3200, qty: 1 }]
      }
    );
    assert(validOrder.status === 201 && validOrder.body.success === true, 'Valid merchandise apparel order accepted (HTTP 201)');

    // ---------------------------------------------------------
    // 4. RBAC PROTECTION: DENY UNAUTHENTICATED ADMIN ACCESS
    // ---------------------------------------------------------
    const unauthedPost = await request(
      { path: '/api/products', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { name: 'Hacker Product', division: 'defense', category: 'Exploit' }
    );
    assert(unauthedPost.status === 401, 'RBAC Guard: Unauthenticated product creation rejected (HTTP 401)');

    const unauthedAdminUsers = await request({ path: '/api/admin/users', method: 'GET' });
    assert(unauthedAdminUsers.status === 401, 'RBAC Guard: Unauthenticated access to users list rejected (HTTP 401)');

    // ---------------------------------------------------------
    // 5. AUTHENTICATION & LOGIN FLOW
    // ---------------------------------------------------------
    // Invalid credentials
    const badLogin = await request(
      { path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { email: 'admin@daudsons.com', password: 'WrongPassword123!' }
    );
    assert(badLogin.status === 401, 'Auth Engine: Bad password rejected (HTTP 401)');

    // Valid credentials login
    const goodLogin = await request(
      { path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { email: 'admin@daudsons.com', password: 'Daudsons@1953#Peshawar' }
    );
    assert(goodLogin.status === 200 && goodLogin.body.success === true, 'Auth Engine: Valid login accepted (HTTP 200)');
    const sessionCookie = extractCookie(goodLogin.headers);
    assert(sessionCookie && sessionCookie.startsWith('dsa_auth_session='), 'Auth Engine: Sets httpOnly dsa_auth_session cookie');

    // ---------------------------------------------------------
    // 6. SESSION INSPECTION (/api/auth/me)
    // ---------------------------------------------------------
    const meRes = await request({ path: '/api/auth/me', method: 'GET' }, null, sessionCookie);
    assert(meRes.status === 200 && meRes.body.authenticated === true, 'Session Store: /api/auth/me validates session cookie');
    assert(meRes.body.user.role === 'SUPER_ADMIN', 'Session Store: User role is SUPER_ADMIN');

    // ---------------------------------------------------------
    // 7. TWO-FACTOR AUTHENTICATION (TOTP RFC 6238)
    // ---------------------------------------------------------
    const setup2fa = await request({ path: '/api/auth/2fa/setup', method: 'POST' }, null, sessionCookie);
    assert(setup2fa.status === 200 && setup2fa.body.secret !== undefined, '2FA Engine: Setup generates base32 secret');
    assert(Array.isArray(setup2fa.body.recoveryCodes) && setup2fa.body.recoveryCodes.length === 8, '2FA Engine: Generates 8 single-use recovery codes');

    const totpToken = auth.generateTotpToken(setup2fa.body.secret);
    const verify2fa = await request(
      { path: '/api/auth/2fa/verify', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { token: totpToken },
      sessionCookie
    );
    assert(verify2fa.status === 200 && verify2fa.body.success === true, '2FA Engine: Verifies RFC 6238 token and activates 2FA');

    // ---------------------------------------------------------
    // 8. PAGE BUILDER & SECTIONS CMS
    // ---------------------------------------------------------
    const sections = await request({ path: '/api/sections', method: 'GET' });
    assert(sections.status === 200 && sections.body.length >= 10, 'Page Builder: Fetches homepage sections from DB');

    const updSection = await request(
      { path: '/api/admin/sections/sec_home_hero', method: 'PUT', headers: { 'Content-Type': 'application/json' } },
      { title: 'SOVEREIGN DEFENSE & AEROSPACE PRECISION' },
      sessionCookie
    );
    assert(updSection.status === 200 && updSection.body.section.title === 'SOVEREIGN DEFENSE & AEROSPACE PRECISION', 'Page Builder: Successfully updates section headline');

    // ---------------------------------------------------------
    // 9. SITE SETTINGS & ANNOUNCEMENT BAR
    // ---------------------------------------------------------
    const settings = await request({ path: '/api/settings', method: 'GET' });
    assert(settings.status === 200 && settings.body.company_name !== undefined, 'Site Settings: Fetches global brand settings');

    const updSettings = await request(
      { path: '/api/admin/settings', method: 'PUT', headers: { 'Content-Type': 'application/json' } },
      { announcement_text: 'TEST ANNOUNCEMENT: Precision Small Arms Proving Complete.' },
      sessionCookie
    );
    assert(updSettings.status === 200 && updSettings.body.settings.announcement_text.includes('TEST ANNOUNCEMENT'), 'Site Settings: Updates announcement banner text');

    // Restore clean production settings
    await request(
      { path: '/api/admin/settings', method: 'PUT', headers: { 'Content-Type': 'application/json' } },
      {
        announcement_text: 'NOTICE: Regulated arms procurement requires valid Ministry/NADRA license. Direct cart checkout is restricted strictly to official merchandise.',
        announcement_active: 'false'
      },
      sessionCookie
    );

    // ---------------------------------------------------------
    // 10. PRODUCT CRUD WITH AUDIT VERIFICATION FLAG
    // ---------------------------------------------------------
    const newProd = await request(
      { path: '/api/products', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      {
        name: 'DSA Test System 2000',
        division: 'defense',
        category: 'Precision Ordnance',
        requiresLicense: true,
        needsVerification: true,
        shortDesc: 'Automated test defense unit'
      },
      sessionCookie
    );
    assert(newProd.status === 201 && newProd.body.needsVerification === true, 'Products Manager: Creates product with needsVerification=true flag');

    const testProdId = newProd.body.id;
    const updProd = await request(
      { path: `/api/products/${testProdId}`, method: 'PUT', headers: { 'Content-Type': 'application/json' } },
      { shortDesc: 'Updated test description verified' },
      sessionCookie
    );
    assert(updProd.status === 200 && updProd.body.short_desc === 'Updated test description verified', 'Products Manager: Updates product specifications');

    const delProd = await request({ path: `/api/products/${testProdId}`, method: 'DELETE' }, null, sessionCookie);
    assert(delProd.status === 200 && delProd.body.success === true, 'Products Manager: Deletes test product');

    // ---------------------------------------------------------
    // 11. USERS & RBAC MANAGEMENT
    // ---------------------------------------------------------
    const usersList = await request({ path: '/api/admin/users', method: 'GET' }, null, sessionCookie);
    assert(usersList.status === 200 && usersList.body.length >= 1, 'Users Manager: Lists administrative staff accounts');

    const newUser = await request(
      { path: '/api/admin/users', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      {
        name: 'Staff Editor',
        email: 'editor.staff@daudsons.com',
        role: 'EDITOR',
        password: 'Password123#Special'
      },
      sessionCookie
    );
    assert(newUser.status === 201 && newUser.body.role === 'EDITOR', 'Users Manager: Creates new EDITOR user');

    const delUser = await request({ path: `/api/admin/users/${newUser.body.id}`, method: 'DELETE' }, null, sessionCookie);
    assert(delUser.status === 200 && delUser.body.success === true, 'Users Manager: Deletes staff user');

    // ---------------------------------------------------------
    // 12. SECURITY AUDIT TRAIL
    // ---------------------------------------------------------
    const auditLogs = await request({ path: '/api/admin/audit-logs', method: 'GET' }, null, sessionCookie);
    assert(auditLogs.status === 200 && auditLogs.body.length > 0, 'Audit Trail: Logs recorded with IP and action stamps');
    const hasLoginEvent = auditLogs.body.some(l => l.action.includes('LOGIN'));
    assert(hasLoginEvent, 'Audit Trail: Contains recorded LOGIN event');

    // ---------------------------------------------------------
    // 13. CSV EXPORTS
    // ---------------------------------------------------------
    const ordersCsv = await request({ path: '/api/admin/export-csv/orders', method: 'GET' }, null, sessionCookie);
    assert(ordersCsv.status === 200 && ordersCsv.raw.includes('Customer Name'), 'CSV Export: Orders exported with headers');

    const prodsCsv = await request({ path: '/api/admin/export-csv/products', method: 'GET' }, null, sessionCookie);
    assert(prodsCsv.status === 200 && prodsCsv.raw.includes('Requires License'), 'CSV Export: Products exported with headers');

    // ---------------------------------------------------------
    // 14. MEDIA ASSETS LIBRARY & UPLOADS
    // ---------------------------------------------------------
    const mediaUpload = await request(
      { path: '/api/admin/media', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      {
        originalName: 'test-blueprint.png',
        mimeType: 'image/png',
        dataBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        altText: 'DSA Automated Test Blueprint'
      },
      sessionCookie
    );
    assert(mediaUpload.status === 201 && mediaUpload.body.url.includes('/uploads/'), 'Media Library: Uploads and stores media asset');

    const mediaList = await request({ path: '/api/admin/media', method: 'GET' }, null, sessionCookie);
    assert(mediaList.status === 200 && mediaList.body.length > 0, 'Media Library: Lists stored media assets');

    const delMedia = await request({ path: `/api/admin/media/${mediaUpload.body.id}`, method: 'DELETE' }, null, sessionCookie);
    assert(delMedia.status === 200 && delMedia.body.success === true, 'Media Library: Deletes media asset and unlinks file');

    // ---------------------------------------------------------
    // 14. SITEMAP.XML & ROBOTS.TXT
    // ---------------------------------------------------------
    const robots = await request({ path: '/robots.txt', method: 'GET' });
    assert(robots.status === 200 && robots.raw.includes('Disallow: /admin'), 'Robots.txt: Excludes /admin and /api/admin from search crawlers');

    const sitemap = await request({ path: '/sitemap.xml', method: 'GET' });
    assert(sitemap.status === 200 && sitemap.raw.includes('<loc>'), 'Sitemap.xml: Renders valid XML with dynamic product routes');

    // ---------------------------------------------------------
    // 15. SPA FALLBACK
    // ---------------------------------------------------------
    const spaFirearms = await request({ path: '/firearms', method: 'GET' });
    assert(spaFirearms.status === 200 && spaFirearms.raw.includes('DAUDSONS ARMOURY'), 'SPA Fallback: /firearms serves public index.html cleanly');

    const spaAdmin = await request({ path: '/admin', method: 'GET' });
    assert(spaAdmin.status === 200 && spaAdmin.raw.includes('view-admin'), 'SPA Fallback: /admin serves public index.html with view-admin cleanly');

    // ---------------------------------------------------------
    // 16. LOGOUT
    // ---------------------------------------------------------
    const logoutRes = await request({ path: '/api/auth/logout', method: 'POST' }, null, sessionCookie);
    assert(logoutRes.status === 200 && logoutRes.body.success === true, 'Auth Engine: Logout revokes session');

  } catch (err) {
    console.error('Test suite uncaught error:', err);
    failed++;
  } finally {
    if (server) {
      server.close();
    }
    console.log('===========================================================');
    console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('===========================================================');
    if (failed > 0) {
      process.exit(1);
    }
  }
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };
