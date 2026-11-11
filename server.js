const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');
const auth = require('./auth');

const app = express();
const PORT = process.env.PORT || 3053;

// -------------------------------------------------------------
// 1. SECURITY HEADERS & APPLICATION HARDENING
// -------------------------------------------------------------
app.use((req, res, next) => {
  // Disallow framing to prevent clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // Strict MIME-type sniffing protection
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Legacy XSS protection filter
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Strict Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Permissions policy
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' data: blob: https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://cdn.tailwindcss.com; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com; " +
    "img-src 'self' data: blob: https:; " +
    "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com data:; " +
    "connect-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://cdn.tailwindcss.com https://www.daudsons.com https://daudsons.com;"
  );
  next();
});

// -------------------------------------------------------------
// 2. PARSING & MIDDLEWARE
// -------------------------------------------------------------
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Lightweight cookie extraction
function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  header.split(';').forEach(c => {
    const [name, ...val] = c.trim().split('=');
    if (name) cookies[name] = decodeURIComponent(val.join('='));
  });
  return cookies;
}

// Request logging & Audit telemetry
app.use((req, res, next) => {
  const start = Date.now();
  req.cookies = parseCookies(req.headers.cookie);

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api') && req.method !== 'GET') {
      db.logApi(req.method, req.path, res.statusCode, `${duration}ms`);
    }
  });
  next();
});

// Authentication inspection middleware
app.use((req, res, next) => {
  const sessionId = req.cookies[auth.SESSION_COOKIE_NAME];
  if (sessionId) {
    const session = db.getSession(sessionId);
    if (session) {
      req.user = {
        id: session.user_id,
        email: session.user_email,
        role: session.role,
        name: session.user_name,
        totpEnabled: Boolean(session.totp_enabled),
        sessionId: session.id
      };
    }
  }
  next();
});

// RBAC Guard middleware
function requireAuth(minimumRole = 'SALES_SUPPORT') {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }
    if (!auth.hasRequiredRole(req.user.role, minimumRole)) {
      db.addAuditLog({
        userId: req.user.id,
        userEmail: req.user.email,
        role: req.user.role,
        action: 'ACCESS_DENIED_RBAC',
        details: { path: req.path, requiredRole: minimumRole },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      return res.status(403).json({
        error: 'Forbidden. You do not hold sufficient permissions to access this management resource.'
      });
    }
    next();
  };
}

// Maintenance Mode check for public endpoints
app.use((req, res, next) => {
  // Allow admin routes, auth, static assets, and health checks
  if (
    req.path.startsWith('/admin') ||
    req.path.startsWith('/api/auth') ||
    req.path.startsWith('/api/admin') ||
    req.path.startsWith('/api/health') ||
    req.path.startsWith('/css') ||
    req.path.startsWith('/js') ||
    req.path.startsWith('/assets') ||
    req.path === '/favicon.ico'
  ) {
    return next();
  }

  const settings = db.getSiteSettings();
  if (settings.maintenance_mode === 'true' && !req.user) {
    if (req.path.startsWith('/api')) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'Daudsons Armoury is currently undergoing scheduled compliance maintenance. Please check back shortly.'
      });
    }
    return res.status(503).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Scheduled Maintenance | Daudsons Armoury</title>
        <style>
          body { background: #0A0B0D; color: #F2F0EB; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
          .card { background: #14161A; border: 1px solid #C8A24A; padding: 40px; border-radius: 8px; max-width: 500px; }
          h1 { color: #C8A24A; font-size: 24px; margin-bottom: 12px; letter-spacing: 2px; }
          p { color: #8A9099; line-height: 1.6; }
          a { color: #C8A24A; text-decoration: none; font-size: 14px; margin-top: 20px; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>DAUDSONS ARMOURY</h1>
          <p>The sovereign portal is temporarily paused for scheduled calibration and security updates. Systems will resume shortly.</p>
          <a href="/admin">Staff Admin Login &rarr;</a>
        </div>
      </body>
      </html>
    `);
  }
  next();
});

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

// -------------------------------------------------------------
// 3. SYSTEM, SITEMAP & ROBOTS.TXT
// -------------------------------------------------------------

// Robots.txt
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *
Disallow: /admin
Disallow: /api/admin
Disallow: /api/auth
Allow: /
Allow: /products
Allow: /firearms
Allow: /defense
Allow: /engineering
Allow: /aerospace
Allow: /shop
Allow: /dealers
Allow: /about-us
Allow: /contact-us
Allow: /news-and-events
Allow: /daudsons-foundation
Allow: /downloads
Allow: /licensing-compliance

Sitemap: http://${req.headers.host || 'localhost:3053'}/sitemap.xml
`);
});

// Dynamic Sitemap.xml
app.get('/sitemap.xml', (req, res) => {
  const host = req.headers.host || 'localhost:3053';
  const products = db.getProducts();
  const news = db.getNews();

  const staticUrls = [
    '/',
    '/products',
    '/firearms',
    '/defense',
    '/engineering',
    '/aerospace',
    '/shop',
    '/dealers',
    '/about-us',
    '/contact-us',
    '/news-and-events',
    '/daudsons-foundation',
    '/downloads',
    '/privacy-policy',
    '/terms',
    '/licensing-compliance'
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  for (const u of staticUrls) {
    xml += `  <url>\n    <loc>http://${host}${u}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${u === '/' ? '1.0' : '0.8'}</priority>\n  </url>\n`;
  }

  for (const p of products) {
    xml += `  <url>\n    <loc>http://${host}/product/${p.slug}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
  }

  for (const n of news) {
    xml += `  <url>\n    <loc>http://${host}/news/${n.slug || n.id}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
  }

  xml += `</urlset>`;
  res.type('application/xml');
  res.send(xml);
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'Daudsons Armoury Enterprise Core',
    version: '2.5.0',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Stats Overview
app.get('/api/stats', (req, res) => {
  try {
    const stats = db.getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute stats', details: err.message });
  }
});

// -------------------------------------------------------------
// 4. AUTHENTICATION API (Argon2/PBKDF2, TOTP 2FA, Sessions)
// -------------------------------------------------------------

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
  const rateLimit = auth.checkRateLimit(`login:${ip}`, 5, 300); // 5 attempts per 5 mins
  if (!rateLimit.allowed) {
    db.addAuditLog({
      action: 'LOGIN_RATE_LIMITED',
      details: { ip, retryAfter: rateLimit.retryAfter },
      ipAddress: ip,
      userAgent: req.headers['user-agent']
    });
    return res.status(429).json({
      error: `Too many login attempts. Progressive security delay active. Please retry in ${rateLimit.retryAfter} seconds.`
    });
  }

  const { email, password, totpCode } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.getUserByEmail(email);
  if (!user || user.status !== 'ACTIVE') {
    db.addAuditLog({
      action: 'LOGIN_FAILED_UNKNOWN_USER',
      details: { email },
      ipAddress: ip,
      userAgent: req.headers['user-agent']
    });
    return res.status(401).json({ error: 'Invalid authentication credentials' });
  }

  // Check account lockout
  if (user.lockout_until && new Date(user.lockout_until).getTime() > Date.now()) {
    return res.status(403).json({
      error: 'Account temporarily locked due to excessive failed attempts. Contact Super Admin.'
    });
  }

  // Verify password hash
  const valid = auth.verifyPassword(password, user.password_hash);
  if (!valid) {
    const failedAttempts = (user.failed_login_attempts || 0) + 1;
    let lockout = null;
    if (failedAttempts >= 5) {
      lockout = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins
    }
    db.db.prepare('UPDATE users SET failed_login_attempts = ?, lockout_until = ? WHERE id = ?').run(
      failedAttempts,
      lockout,
      user.id
    );

    db.addAuditLog({
      userId: user.id,
      userEmail: user.email,
      role: user.role,
      action: 'LOGIN_FAILED_PASSWORD',
      details: { failedAttempts },
      ipAddress: ip,
      userAgent: req.headers['user-agent']
    });
    return res.status(401).json({ error: 'Invalid authentication credentials' });
  }

  // TOTP Two-Factor check if enabled
  if (user.totp_enabled) {
    if (!totpCode) {
      return res.status(200).json({
        requires2FA: true,
        message: 'Two-factor authentication code required'
      });
    }

    const totpValid = auth.verifyTotpToken(totpCode, user.totp_secret);
    let recoveryValid = false;
    if (!totpValid && user.recovery_codes) {
      const rec = auth.verifyAndConsumeRecoveryCode(totpCode, user.recovery_codes);
      if (rec.valid) {
        recoveryValid = true;
        db.updateUser(user.id, { recoveryCodes: rec.remainingCodesJson });
        db.addAuditLog({
          userId: user.id,
          userEmail: user.email,
          role: user.role,
          action: '2FA_RECOVERY_CODE_CONSUMED',
          ipAddress: ip,
          userAgent: req.headers['user-agent']
        });
      }
    }

    if (!totpValid && !recoveryValid) {
      db.addAuditLog({
        userId: user.id,
        userEmail: user.email,
        role: user.role,
        action: 'LOGIN_FAILED_2FA',
        ipAddress: ip,
        userAgent: req.headers['user-agent']
      });
      return res.status(401).json({ error: 'Invalid two-factor authentication code' });
    }
  }

  // Reset failed attempts & update last login
  db.db.prepare('UPDATE users SET failed_login_attempts = 0, lockout_until = NULL WHERE id = ?').run(user.id);
  db.updateUser(user.id, { lastLogin: true });

  // Create session
  const { sessionId } = db.createSession({
    userId: user.id,
    userEmail: user.email,
    role: user.role,
    ipAddress: ip,
    userAgent: req.headers['user-agent']
  });

  // Set httpOnly SameSite=Strict cookie
  res.setHeader(
    'Set-Cookie',
    `${auth.SESSION_COOKIE_NAME}=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${auth.SESSION_MAX_AGE_MS / 1000}`
  );

  db.addAuditLog({
    userId: user.id,
    userEmail: user.email,
    role: user.role,
    action: 'LOGIN_SUCCESS',
    ipAddress: ip,
    userAgent: req.headers['user-agent']
  });

  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      totpEnabled: Boolean(user.totp_enabled)
    }
  });
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req, res) => {
  const sessionId = req.cookies[auth.SESSION_COOKIE_NAME];
  if (sessionId) {
    db.revokeSession(sessionId);
  }
  if (req.user) {
    db.addAuditLog({
      userId: req.user.id,
      userEmail: req.user.email,
      role: req.user.role,
      action: 'LOGOUT',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
  }
  res.setHeader('Set-Cookie', `${auth.SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
  res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/auth/me
app.get('/api/auth/me', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ authenticated: false });
  }
  res.json({
    authenticated: true,
    user: req.user
  });
});

// POST /api/auth/2fa/setup (Requires login)
app.post('/api/auth/2fa/setup', requireAuth('SALES_SUPPORT'), (req, res) => {
  try {
    const secret = auth.generateTwoFactorSecret();
    const { codes, hashedCodes } = auth.generateRecoveryCodes(8);
    const otpAuthUrl = `otpauth://totp/DaudsonsArmoury:${req.user.email}?secret=${secret}&issuer=Daudsons%20Armoury`;

    // Temporarily save secret and recovery codes awaiting verification
    db.updateUser(req.user.id, {
      totpSecret: secret,
      recoveryCodes: hashedCodes
    });

    res.json({
      success: true,
      secret,
      otpAuthUrl,
      recoveryCodes: codes,
      instructions: 'Save your 8 single-use recovery codes in a secure vault before confirming 2FA.'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to initialize 2FA setup', details: err.message });
  }
});

// POST /api/auth/2fa/verify (Confirm token to activate 2FA)
app.post('/api/auth/2fa/verify', requireAuth('SALES_SUPPORT'), (req, res) => {
  try {
    const { token } = req.body;
    const user = db.getUserById(req.user.id);
    const fullUser = db.getUserByEmail(user.email);

    if (!fullUser.totp_secret) {
      return res.status(400).json({ error: 'No 2FA setup in progress. Please start 2FA setup first.' });
    }

    const valid = auth.verifyTotpToken(token, fullUser.totp_secret);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid 6-digit verification code. Please check your authenticator clock.' });
    }

    db.updateUser(req.user.id, { totpEnabled: true });
    db.addAuditLog({
      userId: req.user.id,
      userEmail: req.user.email,
      role: req.user.role,
      action: '2FA_ACTIVATED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ success: true, message: 'Two-Factor Authentication successfully activated.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify 2FA token', details: err.message });
  }
});

// POST /api/auth/change-password
app.post('/api/auth/change-password', requireAuth('SALES_SUPPORT'), (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = db.getUserByEmail(req.user.email);

    if (!auth.verifyPassword(currentPassword, user.password_hash)) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const policy = auth.validatePasswordStrength(newPassword);
    if (!policy.valid) {
      return res.status(400).json({ error: policy.error });
    }

    db.updateUser(user.id, { password: newPassword });
    // Revoke other sessions
    db.revokeAllUserSessions(user.id);

    // Re-create current session
    const { sessionId } = db.createSession({
      userId: user.id,
      userEmail: user.email,
      role: user.role,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    res.setHeader(
      'Set-Cookie',
      `${auth.SESSION_COOKIE_NAME}=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${auth.SESSION_MAX_AGE_MS / 1000}`
    );

    db.addAuditLog({
      userId: user.id,
      userEmail: user.email,
      role: user.role,
      action: 'PASSWORD_CHANGED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to change password', details: err.message });
  }
});

// -------------------------------------------------------------
// 5. PUBLIC CONTENT & CATALOG APIS
// -------------------------------------------------------------

// Sections / Page Builder
app.get('/api/sections', (req, res) => {
  try {
    const page = req.query.page || 'home';
    res.json(db.getSections(page));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch page sections', details: err.message });
  }
});

// Public Site Settings (Contact info, logos, announcement)
app.get('/api/settings', (req, res) => {
  try {
    const settings = db.getSiteSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch site settings', details: err.message });
  }
});

// Products Catalog
app.get('/api/products', (req, res) => {
  try {
    const { division, search, category, sort } = req.query;
    const products = db.getProducts({ division, search, category, sort });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products', details: err.message });
  }
});

app.get('/api/products/:slug', (req, res) => {
  try {
    const product = db.getProductBySlug(req.params.slug);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product', details: err.message });
  }
});

// Shop / Merchandise (PKR ₨)
app.get('/api/shop', (req, res) => {
  try {
    const items = db.getShopItems(req.query.category);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch shop merchandise', details: err.message });
  }
});

app.get('/api/shop/:id', (req, res) => {
  try {
    const item = db.getShopItemById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Shop item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch item', details: err.message });
  }
});

// Orders (Cart Checkout - STRICT STATUTORY COMPLIANCE)
app.post('/api/orders', (req, res) => {
  try {
    const ip = req.ip || '127.0.0.1';
    const rateLimit = auth.checkRateLimit(`orders:${ip}`, 10, 60);
    if (!rateLimit.allowed) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please wait a minute.' });
    }

    const { customerName, customerPhone, customerEmail, city, address, items, honeypot } = req.body;

    if (!auth.verifyHoneypot(honeypot)) {
      return res.status(400).json({ error: 'Bot submission detected' });
    }

    if (!customerName || !customerPhone || !city || !address) {
      return res.status(400).json({ error: 'Please provide complete name, phone, city, and shipping address' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least 1 item' });
    }

    // STRICT STATUTORY GUARDRAIL: Prohibit checkout of firearms/defense weapons online
    for (const item of items) {
      const dbShopItem = db.getShopItemById(item.id);
      if (!dbShopItem) {
        return res.status(400).json({
          error: `Item '${item.name || item.id}' is not an authorized non-restricted merchandise product.`
        });
      }
      if (item.qty > dbShopItem.stock) {
        return res.status(400).json({
          error: `Requested quantity for '${dbShopItem.name}' exceeds available warehouse stock (${dbShopItem.stock}).`
        });
      }
    }

    const sanitizedData = {
      customerName: auth.sanitizeHtmlText(customerName),
      customerEmail: auth.sanitizeHtmlText(customerEmail),
      customerPhone: auth.sanitizeHtmlText(customerPhone),
      city: auth.sanitizeHtmlText(city),
      address: auth.sanitizeHtmlText(address),
      items
    };

    const order = db.createOrder(sanitizedData);

    // Trigger transactional notification
    console.log(`[TRANSACTIONAL EMAIL] Order confirmation queued for ${order.id} -> ${sanitizedData.customerEmail || 'sales@daudsons.com'}`);

    res.status(201).json({
      success: true,
      message: 'Order created successfully and queued for dispatch',
      order
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create order', details: err.message });
  }
});

// Submissions (Contact, Dealer App, Arms RFQ, Tenders)
app.post('/api/enquiries', (req, res) => {
  try {
    const ip = req.ip || '127.0.0.1';
    const rateLimit = auth.checkRateLimit(`enquiries:${ip}`, 10, 60);
    if (!rateLimit.allowed) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please wait a minute.' });
    }

    const { name, email, phone, subject, message, type, honeypot } = req.body;

    if (!auth.verifyHoneypot(honeypot)) {
      return res.status(400).json({ error: 'Bot submission detected' });
    }

    if (!name || !phone || !subject) {
      return res.status(400).json({ error: 'Name, phone, and subject/license are required' });
    }

    const enquiry = db.createEnquiry({
      type: type || 'CONTACT_RFQ',
      name: auth.sanitizeHtmlText(name),
      email: auth.sanitizeHtmlText(email || ''),
      phone: auth.sanitizeHtmlText(phone),
      subject: auth.sanitizeHtmlText(subject),
      message: auth.sanitizeHtmlText(message || '')
    });

    res.status(201).json({
      success: true,
      message: 'Enquiry submitted successfully and logged in database',
      enquiry
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit enquiry', details: err.message });
  }
});

// Dealers Directory
app.get('/api/dealers', (req, res) => {
  try {
    res.json(db.getDealers(req.query.search));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dealers', details: err.message });
  }
});

// News, Downloads, FAQs, Certificates, Timeline, Partners, Foundation
app.get('/api/news', (req, res) => {
  try {
    res.json(db.getNews());
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch news', details: err.message });
  }
});

app.get('/api/downloads', (req, res) => {
  try {
    res.json(db.getDownloads());
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch downloads', details: err.message });
  }
});

app.get('/api/faqs', (req, res) => {
  try {
    res.json(db.getFaqs(req.query.category));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch FAQs', details: err.message });
  }
});

app.get('/api/certificates', (req, res) => {
  try {
    res.json(db.getCertificates());
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch certificates', details: err.message });
  }
});

app.get('/api/timeline', (req, res) => {
  try {
    res.json(db.getTimelineEvents());
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch timeline', details: err.message });
  }
});

app.get('/api/clients-partners', (req, res) => {
  try {
    res.json(db.getClientsPartners(req.query.type));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch clients & partners', details: err.message });
  }
});

app.get('/api/foundation', (req, res) => {
  try {
    res.json(db.getFoundationProjects());
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch foundation projects', details: err.message });
  }
});

// -------------------------------------------------------------
// 6. SECURE ADMIN PANEL API (RBAC PROTECTED)
// -------------------------------------------------------------

// Page & Section Builder
app.get('/api/admin/sections', requireAuth('EDITOR'), (req, res) => {
  try {
    res.json(db.getAllSections());
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sections', details: err.message });
  }
});

app.put('/api/admin/sections/:id', requireAuth('EDITOR'), (req, res) => {
  try {
    const updated = db.updateSection(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Section not found' });

    db.addAuditLog({
      userId: req.user.id,
      userEmail: req.user.email,
      role: req.user.role,
      action: 'UPDATE_SECTION',
      entityType: 'section',
      entityId: req.params.id,
      details: req.body,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ success: true, section: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update section', details: err.message });
  }
});

// Products Manager
app.post('/api/products', requireAuth('EDITOR'), (req, res) => {
  try {
    const { name, division, category } = req.body;
    if (!name || !division || !category) {
      return res.status(400).json({ error: 'Product name, division, and category are required' });
    }
    const product = db.createProduct(req.body);

    db.addAuditLog({
      userId: req.user.id,
      userEmail: req.user.email,
      role: req.user.role,
      action: 'CREATE_PRODUCT',
      entityType: 'product',
      entityId: product.id,
      details: { name: product.name, division: product.division },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create product', details: err.message });
  }
});

app.put('/api/products/:id', requireAuth('EDITOR'), (req, res) => {
  try {
    const updated = db.updateProduct(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Product not found' });

    db.addAuditLog({
      userId: req.user.id,
      userEmail: req.user.email,
      role: req.user.role,
      action: 'UPDATE_PRODUCT',
      entityType: 'product',
      entityId: req.params.id,
      details: req.body,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update product', details: err.message });
  }
});

app.delete('/api/products/:id', requireAuth('ADMIN'), (req, res) => {
  try {
    const success = db.deleteProduct(req.params.id);
    if (!success) return res.status(404).json({ error: 'Product not found' });

    db.addAuditLog({
      userId: req.user.id,
      userEmail: req.user.email,
      role: req.user.role,
      action: 'DELETE_PRODUCT',
      entityType: 'product',
      entityId: req.params.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ success: true, message: `Product ${req.params.id} deleted` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product', details: err.message });
  }
});

// Shop Items & Orders Management
app.put('/api/shop/:id', requireAuth('EDITOR'), (req, res) => {
  try {
    const updated = db.updateShopItem(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Shop item not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update shop item', details: err.message });
  }
});

app.get('/api/orders', requireAuth('SALES_SUPPORT'), (req, res) => {
  try {
    res.json(db.getOrders());
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders', details: err.message });
  }
});

app.patch('/api/orders/:id/status', requireAuth('SALES_SUPPORT'), (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });
    const success = db.updateOrderStatus(req.params.id, status);
    if (!success) return res.status(404).json({ error: 'Order not found' });

    db.addAuditLog({
      userId: req.user.id,
      userEmail: req.user.email,
      role: req.user.role,
      action: 'UPDATE_ORDER_STATUS',
      entityType: 'order',
      entityId: req.params.id,
      details: { status },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ success: true, message: `Order ${req.params.id} updated to ${status}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order status', details: err.message });
  }
});

// Enquiries Management
app.get('/api/enquiries', requireAuth('SALES_SUPPORT'), (req, res) => {
  try {
    res.json(db.getEnquiries(req.query.type));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch enquiries', details: err.message });
  }
});

app.patch('/api/enquiries/:id/status', requireAuth('SALES_SUPPORT'), (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });
    const success = db.updateEnquiryStatus(req.params.id, status);
    if (!success) return res.status(404).json({ error: 'Enquiry not found' });

    db.addAuditLog({
      userId: req.user.id,
      userEmail: req.user.email,
      role: req.user.role,
      action: 'UPDATE_ENQUIRY_STATUS',
      entityType: 'enquiry',
      entityId: req.params.id,
      details: { status },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ success: true, message: `Enquiry ${req.params.id} updated to ${status}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update enquiry status', details: err.message });
  }
});

// Dealers CRUD
app.post('/api/dealers', requireAuth('EDITOR'), (req, res) => {
  try {
    const { city, name, address, phone } = req.body;
    if (!city || !name || !address || !phone) {
      return res.status(400).json({ error: 'City, dealer name, address, and phone are required' });
    }
    const dealer = db.createDealer(req.body);
    res.status(201).json(dealer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add dealer', details: err.message });
  }
});

app.delete('/api/dealers/:id', requireAuth('ADMIN'), (req, res) => {
  try {
    const success = db.deleteDealer(req.params.id);
    if (!success) return res.status(404).json({ error: 'Dealer not found' });
    res.json({ success: true, message: `Dealer ${req.params.id} removed` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete dealer', details: err.message });
  }
});

// News CRUD
app.post('/api/news', requireAuth('EDITOR'), (req, res) => {
  try {
    const { title, desc } = req.body;
    if (!title || !desc) {
      return res.status(400).json({ error: 'Title and description are required' });
    }
    const article = db.createNews(req.body);
    res.status(201).json(article);
  } catch (err) {
    res.status(500).json({ error: 'Failed to publish news', details: err.message });
  }
});

app.delete('/api/news/:id', requireAuth('ADMIN'), (req, res) => {
  try {
    const success = db.deleteNews(req.params.id);
    if (!success) return res.status(404).json({ error: 'News item not found' });
    res.json({ success: true, message: `News item ${req.params.id} deleted` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete news', details: err.message });
  }
});

// Certificates Update
app.put('/api/certificates/:id', requireAuth('ADMIN'), (req, res) => {
  try {
    const cert = db.updateCertificate(req.params.id, req.body);
    res.json(cert);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update certificate', details: err.message });
  }
});

// Site Settings Management
app.put('/api/admin/settings', requireAuth('ADMIN'), (req, res) => {
  try {
    const updated = db.updateMultipleSettings(req.body);

    db.addAuditLog({
      userId: req.user.id,
      userEmail: req.user.email,
      role: req.user.role,
      action: 'UPDATE_SITE_SETTINGS',
      details: req.body,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ success: true, settings: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings', details: err.message });
  }
});

// Users & Roles Management
app.get('/api/admin/users', requireAuth('ADMIN'), (req, res) => {
  try {
    res.json(db.getAllUsers());
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users', details: err.message });
  }
});

app.post('/api/admin/users', requireAuth('SUPER_ADMIN'), (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }
    const policy = auth.validatePasswordStrength(password);
    if (!policy.valid) {
      return res.status(400).json({ error: policy.error });
    }
    const existing = db.getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'A user with this email address already exists' });
    }
    const newUser = db.createUser({ email, password, name, role });

    db.addAuditLog({
      userId: req.user.id,
      userEmail: req.user.email,
      role: req.user.role,
      action: 'CREATE_USER',
      entityType: 'user',
      entityId: newUser.id,
      details: { email: newUser.email, role: newUser.role },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user', details: err.message });
  }
});

app.put('/api/admin/users/:id', requireAuth('SUPER_ADMIN'), (req, res) => {
  try {
    const updated = db.updateUser(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'User not found' });

    db.addAuditLog({
      userId: req.user.id,
      userEmail: req.user.email,
      role: req.user.role,
      action: 'UPDATE_USER',
      entityType: 'user',
      entityId: req.params.id,
      details: { role: req.body.role, status: req.body.status },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user', details: err.message });
  }
});

app.delete('/api/admin/users/:id', requireAuth('SUPER_ADMIN'), (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own active administrator account' });
    }
    const success = db.deleteUser(req.params.id);
    if (!success) return res.status(404).json({ error: 'User not found' });

    db.addAuditLog({
      userId: req.user.id,
      userEmail: req.user.email,
      role: req.user.role,
      action: 'DELETE_USER',
      entityType: 'user',
      entityId: req.params.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ success: true, message: 'User removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user', details: err.message });
  }
});

// Audit Logs
app.get('/api/admin/audit-logs', requireAuth('ADMIN'), (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 100;
    res.json(db.getAuditLogs(limit));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit logs', details: err.message });
  }
});

// CSV Export (Orders, Submissions, Products)
app.get('/api/admin/export-csv/:type', requireAuth('SALES_SUPPORT'), (req, res) => {
  try {
    const type = req.params.type;
    let csv = '';
    let filename = `daudsons-${type}-${new Date().toISOString().split('T')[0]}.csv`;

    if (type === 'orders') {
      const orders = db.getOrders();
      csv = 'ID,Customer Name,Phone,Email,City,Address,Total PKR,Status,Created At\n';
      for (const o of orders) {
        csv += `"${o.id}","${o.customer_name}","${o.customer_phone}","${o.customer_email || ''}","${o.city}","${(o.address || '').replace(/"/g, '""')}",${o.total_pkr},"${o.status}","${o.created_at}"\n`;
      }
    } else if (type === 'submissions' || type === 'enquiries') {
      const enqs = db.getEnquiries();
      csv = 'ID,Type,Name,Email,Phone,Subject,Status,Created At\n';
      for (const e of enqs) {
        csv += `"${e.id}","${e.type}","${e.name}","${e.email}","${e.phone}","${(e.subject || '').replace(/"/g, '""')}","${e.status}","${e.created_at}"\n`;
      }
    } else if (type === 'products') {
      const prods = db.getProducts();
      csv = 'ID,Slug,Name,Division,Category,Requires License,Needs Verification,Published\n';
      for (const p of prods) {
        csv += `"${p.id}","${p.slug}","${p.name}","${p.division}","${p.category}",${p.requiresLicense},${p.needsVerification},${p.isPublished}\n`;
      }
    } else {
      return res.status(400).json({ error: 'Invalid export type. Supported: orders, enquiries, products' });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'Failed to export CSV', details: err.message });
  }
});

// JSON Full Database Export
app.get('/api/admin/export-db', requireAuth('ADMIN'), (req, res) => {
  try {
    const data = db.exportDatabase();
    res.setHeader('Content-Disposition', 'attachment; filename="daudsons-database-export.json"');
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(data, null, 2));
  } catch (err) {
    res.status(500).json({ error: 'Failed to export database', details: err.message });
  }
});

// -------------------------------------------------------------
// MEDIA ASSETS & UPLOADS
// -------------------------------------------------------------
const fs = require('fs');

app.get('/api/admin/media', requireAuth('EDITOR'), (req, res) => {
  try {
    res.json(db.getMediaAssets());
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch media assets', details: err.message });
  }
});

app.post('/api/admin/media', requireAuth('EDITOR'), (req, res) => {
  try {
    const { originalName, mimeType, dataBase64, altText } = req.body;
    if (!originalName || !dataBase64) {
      return res.status(400).json({ error: 'File name and base64 data are required' });
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'application/pdf', 'image/svg+xml'];
    if (mimeType && !allowedMimes.includes(mimeType.toLowerCase())) {
      return res.status(400).json({ error: 'File type not permitted. Allowed: WebP, PNG, JPEG, AVIF, PDF' });
    }

    const cleanBase64 = dataBase64.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size exceeds maximum 5MB limit' });
    }

    const ext = path.extname(originalName) || '.webp';
    const safeName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    const uploadDir = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, safeName);
    fs.writeFileSync(filePath, buffer);

    const assetUrl = `/uploads/${safeName}`;
    const asset = db.createMediaAsset({
      filename: safeName,
      originalName,
      mimeType: mimeType || 'application/octet-stream',
      sizeBytes: buffer.length,
      url: assetUrl,
      altText: altText || originalName
    });

    db.addAuditLog({
      userId: req.user.id,
      userEmail: req.user.email,
      role: req.user.role,
      action: 'UPLOAD_MEDIA',
      entityType: 'media',
      entityId: asset.id,
      details: { filename: safeName, sizeBytes: buffer.length },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(201).json(asset);
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload media', details: err.message });
  }
});

app.delete('/api/admin/media/:id', requireAuth('ADMIN'), (req, res) => {
  try {
    const deleted = db.deleteMediaAsset(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Media asset not found' });

    const filePath = path.join(__dirname, 'public', 'uploads', deleted.filename);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (_) {}
    }

    db.addAuditLog({
      userId: req.user.id,
      userEmail: req.user.email,
      role: req.user.role,
      action: 'DELETE_MEDIA',
      entityType: 'media',
      entityId: req.params.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ success: true, message: `Media asset ${req.params.id} deleted` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete media asset', details: err.message });
  }
});

// Reset Database to Seed
app.post('/api/admin/reset-db', requireAuth('SUPER_ADMIN'), (req, res) => {
  try {
    db.seedDatabase(true);
    db.addAuditLog({
      userId: req.user.id,
      userEmail: req.user.email,
      role: req.user.role,
      action: 'DATABASE_RESET_DEFAULT',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    res.json({ success: true, message: 'Database reset to default Daudsons seed data' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset database', details: err.message });
  }
});

// API Logs
app.get('/api/admin/logs', requireAuth('ADMIN'), (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    res.json(db.getApiLogs(limit));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs', details: err.message });
  }
});

// -------------------------------------------------------------
// 7. SPA ROUTE FALLBACK (Express 5 compatible)
// -------------------------------------------------------------
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile('index.html', { root: path.join(__dirname, 'public') });
});

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`===========================================================`);
    console.log(`  DAUDSONS ARMOURY (PVT.) LTD. — ENTERPRISE FULLSTACK CORE `);
    console.log(`  Server live on: http://localhost:${PORT}                 `);
    console.log(`  Database: SQLite (daudsons.db with WAL persistence)      `);
    console.log(`  Division Portals: Firearms, Defense, Aerospace, Machining`);
    console.log(`===========================================================`);
  });
}

module.exports = app;
