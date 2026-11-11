const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const auth = require('./auth');

const DB_PATH = path.join(__dirname, 'daudsons.db');
const SEED_FILE = path.join(__dirname, 'seed-data.json');

const db = new DatabaseSync(DB_PATH);

// Enable WAL mode & foreign keys for optimal performance and concurrency
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// -------------------------------------------------------------
// SCHEMA INITIALIZATION (ENTERPRISE EXPANDED)
// -------------------------------------------------------------
function initSchema() {
  db.exec(`
    -- 1. USERS & ACCESS CONTROL (Argon2/PBKDF2, TOTP 2FA, RBAC)
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'EDITOR',
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      totp_secret TEXT,
      totp_enabled INTEGER NOT NULL DEFAULT 0,
      recovery_codes TEXT,
      failed_login_attempts INTEGER NOT NULL DEFAULT 0,
      lockout_until TEXT,
      must_change_password INTEGER NOT NULL DEFAULT 0,
      last_login_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 2. SESSIONS (Server-side rotation, idle/absolute expiry)
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_email TEXT NOT NULL,
      role TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      expires_at TEXT NOT NULL,
      revoked INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 3. AUDIT LOG (Immutable trail of all security & admin events)
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      user_email TEXT,
      role TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 4. PAGE SECTIONS (Page & Section Builder for dynamic public content)
    CREATE TABLE IF NOT EXISTS sections (
      id TEXT PRIMARY KEY,
      page TEXT NOT NULL DEFAULT 'home',
      section_key TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT,
      badge TEXT,
      content TEXT,
      cta_text TEXT,
      cta_link TEXT,
      image_url TEXT,
      display_order INTEGER NOT NULL DEFAULT 0,
      is_visible INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 5. SITE SETTINGS (Key/Value store for brand, contacts, maintenance)
    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 6. PRODUCTS (Arms & Defense Catalog)
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      division TEXT NOT NULL,
      category TEXT NOT NULL,
      requires_license INTEGER NOT NULL DEFAULT 0,
      image TEXT,
      wp_asset TEXT,
      short_desc TEXT,
      features TEXT,
      specs TEXT,
      finishes TEXT,
      downloads TEXT,
      needs_verification INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 7. SHOP ITEMS (Non-regulated apparel & accessories only in PKR)
    CREATE TABLE IF NOT EXISTS shop_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price INTEGER NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      image TEXT,
      desc TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 8. ORDERS (Direct consumer merchandise sales with order workflow)
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      customer_email TEXT,
      customer_phone TEXT NOT NULL,
      city TEXT NOT NULL,
      address TEXT NOT NULL,
      items TEXT NOT NULL,
      subtotal INTEGER NOT NULL,
      shipping_fee INTEGER NOT NULL DEFAULT 450,
      total_pkr INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'NEW',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 9. SUBMISSIONS & RFQs (Contact, Dealer, Arms RFQ, Tenders)
    CREATE TABLE IF NOT EXISTS enquiries (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL DEFAULT 'CONTACT_RFQ',
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT,
      status TEXT NOT NULL DEFAULT 'NEW',
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 10. DEALERS NETWORK (With geo-coordinates & HQ status)
    CREATE TABLE IF NOT EXISTS dealers (
      id TEXT PRIMARY KEY,
      city TEXT NOT NULL,
      province TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      is_hq INTEGER NOT NULL DEFAULT 0,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      phone TEXT NOT NULL,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 11. NEWS & PRESS RELEASES
    CREATE TABLE IF NOT EXISTS news (
      id TEXT PRIMARY KEY,
      slug TEXT,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      tag TEXT NOT NULL,
      desc TEXT NOT NULL,
      content TEXT,
      cover_image TEXT,
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 12. CERTIFICATES & COMPLIANCE
    CREATE TABLE IF NOT EXISTS certificates (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      title TEXT NOT NULL,
      issuer TEXT NOT NULL,
      scope TEXT NOT NULL,
      valid_until TEXT,
      display_order INTEGER NOT NULL DEFAULT 0,
      badge_color TEXT DEFAULT 'brass'
    );

    -- 13. TIMELINE EVENTS
    CREATE TABLE IF NOT EXISTS timeline_events (
      id TEXT PRIMARY KEY,
      year TEXT NOT NULL,
      title TEXT NOT NULL,
      desc TEXT NOT NULL,
      milestone TEXT,
      display_order INTEGER NOT NULL DEFAULT 0
    );

    -- 14. CLIENTS & STRATEGIC PARTNERS
    CREATE TABLE IF NOT EXISTS clients_partners (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'CLIENT',
      category TEXT,
      country TEXT DEFAULT 'Pakistan',
      logo TEXT,
      display_order INTEGER NOT NULL DEFAULT 0
    );

    -- 15. FOUNDATION INITIATIVES
    CREATE TABLE IF NOT EXISTS foundation_projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      impact_stats TEXT,
      desc TEXT NOT NULL,
      image TEXT,
      display_order INTEGER NOT NULL DEFAULT 0
    );

    -- 16. DOWNLOADS LIBRARY
    CREATE TABLE IF NOT EXISTS downloads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      size TEXT NOT NULL,
      type TEXT NOT NULL,
      url TEXT NOT NULL,
      live INTEGER NOT NULL DEFAULT 1,
      desc TEXT NOT NULL
    );

    -- 17. FAQS (Civilian, Defense, Legal)
    CREATE TABLE IF NOT EXISTS faqs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT DEFAULT 'General',
      q TEXT NOT NULL,
      a TEXT NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 0
    );

    -- 18. MEDIA ASSETS
    CREATE TABLE IF NOT EXISTS media_assets (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      url TEXT NOT NULL,
      alt_text TEXT,
      uploaded_at TEXT DEFAULT (datetime('now'))
    );

    -- 19. REDIRECTS (301/302 URL manager)
    CREATE TABLE IF NOT EXISTS redirects (
      id TEXT PRIMARY KEY,
      from_path TEXT UNIQUE NOT NULL,
      to_path TEXT NOT NULL,
      status_code INTEGER NOT NULL DEFAULT 301
    );

    -- 20. API LOGS
    CREATE TABLE IF NOT EXISTS api_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT DEFAULT (datetime('now')),
      method TEXT NOT NULL,
      path TEXT NOT NULL,
      status_code INTEGER NOT NULL,
      message TEXT
    );
  `);

  // Apply schema migrations for backwards-compatible SQLite tables
  const ensureCol = (tbl, col, def) => {
    try {
      db.exec(`ALTER TABLE ${tbl} ADD COLUMN ${col} ${def};`);
    } catch (_) {
      // Column already exists, safe to ignore
    }
  };

  ensureCol('products', 'finishes', 'TEXT');
  ensureCol('products', 'downloads', 'TEXT');
  ensureCol('products', 'needs_verification', 'INTEGER NOT NULL DEFAULT 0');
  ensureCol('products', 'is_published', 'INTEGER NOT NULL DEFAULT 1');

  ensureCol('news', 'slug', 'TEXT');
  ensureCol('news', 'content', 'TEXT');
  ensureCol('news', 'cover_image', 'TEXT');
  ensureCol('news', 'is_published', 'INTEGER NOT NULL DEFAULT 1');

  ensureCol('faqs', 'category', "TEXT DEFAULT 'General'");
  ensureCol('faqs', 'display_order', 'INTEGER NOT NULL DEFAULT 0');

  // Backfill news slug and is_published if null
  try {
    db.exec(`UPDATE news SET slug = id WHERE slug IS NULL; UPDATE news SET is_published = 1 WHERE is_published IS NULL;`);
  } catch (_) {}
}

// -------------------------------------------------------------
// SEEDING ENGINE (WITH DEFAULT ADMIN & EXPANDED CMS ENTITIES)
// -------------------------------------------------------------
function seedDatabase(force = false) {
  if (force) {
    console.log('Force reset requested. Clearing tables...');
    db.exec(`
      DELETE FROM products;
      DELETE FROM shop_items;
      DELETE FROM dealers;
      DELETE FROM news;
      DELETE FROM downloads;
      DELETE FROM faqs;
      DELETE FROM sections;
      DELETE FROM site_settings;
      DELETE FROM certificates;
      DELETE FROM timeline_events;
      DELETE FROM clients_partners;
      DELETE FROM foundation_projects;
    `);
  }

  // 1. Seed Default Super Admin User
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@daudsons.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Daudsons@1953#Peshawar';
  const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
  if (!existingAdmin) {
    const passwordHash = auth.hashPassword(adminPassword);
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, status, totp_enabled, must_change_password)
      VALUES (?, ?, ?, ?, ?, ?, 0, 0)
    `).run('usr_super_admin_01', adminEmail, passwordHash, 'Executive Administrator', 'SUPER_ADMIN', 'ACTIVE');
    console.log(`[SEED] Initialized default Super Admin: ${adminEmail}`);
  }

  // 2. Seed Default Site Settings
  const defaultSettings = [
    ['company_name', 'DAUDSONS ARMOURY (PVT.) LTD.'],
    ['tagline', 'Made in Pakistan, Since 1953'],
    ['founding_year', '1953'],
    ['hq_address', 'Kohat Road, Peshawar, Khyber Pakhtunkhwa 25000, Pakistan'],
    ['phone_primary', '+92-91-2325353'],
    ['phone_secondary', '+92-91-2325354'],
    ['email_sales', 'sales@daudsons.com'],
    ['email_defense', 'defense@daudsons.com'],
    ['email_info', 'info@daudsons.com'],
    ['announcement_active', 'true'],
    ['announcement_text', 'NOTICE: Regulated arms procurement requires valid Ministry/NADRA license. Direct cart checkout is restricted strictly to apparel and accessories.'],
    ['maintenance_mode', 'false'],
    ['seo_meta_title', 'DAUDSONS ARMOURY (PVT.) LTD. — Defense, Small Arms & Aerospace Precision'],
    ['seo_meta_description', "Pakistan's premier defense manufacturer and exporter since 1953. Certified AS9100 Rev D, ISO 9001:2015, and ISO 14001:2015."]
  ];
  const insertSetting = db.prepare('INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)');
  for (const [k, v] of defaultSettings) {
    insertSetting.run(k, v);
  }

  // 3. Seed Page Builder Sections
  const defaultSections = [
    {
      id: 'sec_home_hero',
      page: 'home',
      section_key: 'hero',
      title: 'PRECISION ENGINEERING. SOVEREIGN DEFENSE.',
      subtitle: "Pakistan's premier defense manufacturer and aerospace precision supplier since 1953. Crafting battlefield-grade small arms, heavy ordnance components, and flight-critical aerospace assemblies.",
      badge: 'ESTABLISHED 1953 • PESHAWAR, PAKISTAN',
      cta_text: 'EXPLORE CATALOG',
      cta_link: '/products',
      display_order: 1
    },
    {
      id: 'sec_home_divisions',
      page: 'home',
      section_key: 'divisions',
      title: 'FOUR SOVEREIGN DIVISIONS',
      subtitle: 'From precision hand-fitted service pistols to flight-certified titanium machining for frontline aviation.',
      badge: 'COMPREHENSIVE CAPABILITIES',
      cta_text: 'VIEW DIVISIONS',
      cta_link: '/products',
      display_order: 2
    },
    {
      id: 'sec_home_certifications',
      page: 'home',
      section_key: 'certifications',
      title: 'STANDARDS OF STERLING INTEGRITY',
      subtitle: 'AS9100 Rev D Aerospace Quality, ISO 9001:2015 Quality Management, and ISO 14001:2015 Environmental Systems.',
      badge: 'COMPANY-WIDE ACCREDITATIONS',
      cta_text: 'AUDIT COMPLIANCE',
      cta_link: '/licensing-compliance',
      display_order: 3
    },
    {
      id: 'sec_home_trushot',
      page: 'home',
      section_key: 'trushot',
      title: 'DSA-TRUSHOT 9x19mm SERVICE PISTOL',
      subtitle: 'Battle-proven striker-fired precision engineered in Peshawar. Built with aircraft-grade alloys and cold hammer-forged rifling.',
      badge: 'FLAGSHIP SMALL ARMS PLATFORM',
      cta_text: 'INQUIRE SPECIFICATIONS',
      cta_link: '/product/dsa-trushot-9mm-standard',
      display_order: 4
    },
    {
      id: 'sec_home_mantis',
      page: 'home',
      section_key: 'mantis',
      title: 'MANTIS X10 ELITE LIVE TELEMETRY',
      subtitle: 'Real-time barrel stability diagnostic sensor tracking barrel deflection, trigger mechanics, and dynamic shot recovery in milliseconds.',
      badge: 'TRAINING & PERFORMANCE',
      cta_text: 'EXPLORE MANTIS',
      cta_link: '/product/mantis-x10-elite',
      display_order: 5
    },
    {
      id: 'sec_home_catalog',
      page: 'home',
      section_key: 'catalog_preview',
      title: 'EQUIPMENT DIRECTORY',
      subtitle: 'Explore 30 specialized defense platforms, service sidearms, grenade launchers, and precision aerospace hardware.',
      badge: 'PORTFOLIO',
      cta_text: 'VIEW ALL PRODUCTS',
      cta_link: '/products',
      display_order: 6
    },
    {
      id: 'sec_home_clients',
      page: 'home',
      section_key: 'clients_partners',
      title: 'TRUSTED BY NATIONAL DEFENSE & GLOBAL ENTITIES',
      subtitle: 'Supplying the Armed Forces of Pakistan, elite federal law enforcement, and sovereign allied defense partners.',
      badge: 'STRATEGIC PARTNERSHIPS',
      cta_text: 'OUR PARTNERS',
      cta_link: '/about-us',
      display_order: 7
    },
    {
      id: 'sec_home_merchandise',
      page: 'home',
      section_key: 'merchandise',
      title: 'OFFICIAL DAUDSONS HERITAGE COLLECTION',
      subtitle: 'Authorized apparel, field bags, and collector memorabilia. Nationwide courier dispatch across Pakistan.',
      badge: 'CONSUMER MERCHANDISE (PKR ₨)',
      cta_text: 'VISIT STORE',
      cta_link: '/shop',
      display_order: 8
    },
    {
      id: 'sec_home_dealers',
      page: 'home',
      section_key: 'dealers_map',
      title: 'AUTHORIZED DEALER NETWORK',
      subtitle: 'Locate authorized civilian arms and ammunition dealers across Peshawar, Islamabad, Lahore, Karachi, and major trading hubs.',
      badge: 'NATIONWIDE PRESENCE',
      cta_text: 'FIND A DEALER',
      cta_link: '/dealers',
      display_order: 9
    },
    {
      id: 'sec_home_foundation',
      page: 'home',
      section_key: 'foundation',
      title: 'THE DAUDSONS FOUNDATION',
      subtitle: 'Empowering future generations through vocational CNC precision craft schooling, clean water infrastructure, and flood relief.',
      badge: 'HERITAGE & COMMUNITY',
      cta_text: 'LEARN MORE',
      cta_link: '/daudsons-foundation',
      display_order: 10
    },
    {
      id: 'sec_home_faq',
      page: 'home',
      section_key: 'faq',
      title: 'FREQUENTLY ASKED QUESTIONS',
      subtitle: 'Clear legal information on statutory arms purchase in Pakistan, export protocols, and factory proof testing.',
      badge: 'STATUTORY & GENERAL INQUIRIES',
      cta_text: 'READ COMPLIANCE GUIDE',
      cta_link: '/licensing-compliance',
      display_order: 11
    }
  ];

  const insertSection = db.prepare(`
    INSERT OR IGNORE INTO sections (id, page, section_key, title, subtitle, badge, cta_text, cta_link, display_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const s of defaultSections) {
    insertSection.run(s.id, s.page, s.section_key, s.title, s.subtitle, s.badge, s.cta_text, s.cta_link, s.display_order);
  }

  // 4. Seed Certificates
  const defaultCertificates = [
    {
      id: 'cert_as9100',
      code: 'AS9100 Rev D',
      title: 'Aerospace Quality Management System',
      issuer: 'International Aerospace Quality Group (IAQG)',
      scope: 'Design, precision manufacturing, and assembly of flight-critical aerospace structures and mechanisms',
      valid_until: '2027-06-30',
      display_order: 1,
      badge_color: 'brass'
    },
    {
      id: 'cert_iso9001',
      code: 'ISO 9001:2015',
      title: 'Quality Management Systems',
      issuer: 'TÜV Rheinland / Moody International',
      scope: 'Company-wide design, machining, surface treatment, proof-firing, and assembly of defense equipment',
      valid_until: '2026-11-30',
      display_order: 2,
      badge_color: 'brass'
    },
    {
      id: 'cert_iso14001',
      code: 'ISO 14001:2015',
      title: 'Environmental Management System',
      issuer: 'Bureau Veritas',
      scope: 'Responsible waste management, zero-discharge coolant recycling, and energy efficiency in heavy ordnance production',
      valid_until: '2026-12-31',
      display_order: 3,
      badge_color: 'brass'
    },
    {
      id: 'cert_modp',
      code: 'MoDP Reg. A-1953',
      title: 'Ministry of Defence Production Authorization',
      issuer: 'Government of Pakistan',
      scope: 'Authorized defense prime contractor and arms exporter for sovereign military hardware',
      valid_until: 'Permanent / Periodic Renewal',
      display_order: 4,
      badge_color: 'signal'
    }
  ];
  const insertCert = db.prepare(`
    INSERT OR IGNORE INTO certificates (id, code, title, issuer, scope, valid_until, display_order, badge_color)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const c of defaultCertificates) {
    insertCert.run(c.id, c.code, c.title, c.issuer, c.scope, c.valid_until, c.display_order, c.badge_color);
  }

  // 5. Seed Timeline Events
  const defaultTimeline = [
    { id: 'time_1953', year: '1953', title: 'Founding of Daudsons Armoury', desc: 'Established in Peshawar by master armorers to manufacture bespoke firearms with uncompromising hand-fitted accuracy.', milestone: 'Origins', display_order: 1 },
    { id: 'time_1971', year: '1971', title: 'Defense Ordnance Supplier Designation', desc: 'Awarded first formal supplier contracts to support national defense requirements with small arms and mortar munitions.', milestone: 'Defense Designation', display_order: 2 },
    { id: 'time_1985', year: '1985', title: 'Industrial CNC Commissioning', desc: 'Built the dedicated 120,000+ sq ft manufacturing complex on Kohat Road, pioneering early computerized machine tools.', milestone: 'Facility Expansion', display_order: 3 },
    { id: 'time_1999', year: '1999', title: 'ISO 9001 Certification', desc: 'Became one of the first private defense engineering institutions in Pakistan to earn comprehensive ISO quality accreditation.', milestone: 'Quality Milestone', display_order: 4 },
    { id: 'time_2012', year: '2012', title: 'DSA Trushot 9x19mm Inception', desc: 'Unveiled the Trushot semi-automatic pistol platform, engineered specifically for law enforcement and sports shooting.', milestone: 'Flagship Platform', display_order: 5 },
    { id: 'time_2018', year: '2018', title: 'AS9100 Rev D Aerospace Accreditation', desc: 'Attained world-standard aerospace accreditation, beginning delivery of landing gear, actuation, and turbine components.', milestone: 'Aerospace Entry', display_order: 6 },
    { id: 'time_2024', year: '2024', title: 'Advanced Multi-Axis Facility & Ballistic Proving Ground', desc: 'Upgraded with 5-axis DMG MORI machining centers, robotic coordinate measurement (CMM), and enclosed 100m proof tunnel.', milestone: 'Modern Era', display_order: 7 }
  ];
  const insertTimeline = db.prepare(`
    INSERT OR IGNORE INTO timeline_events (id, year, title, desc, milestone, display_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const t of defaultTimeline) {
    insertTimeline.run(t.id, t.year, t.title, t.desc, t.milestone, t.display_order);
  }

  // 6. Seed Clients & Strategic Partners
  const defaultClientsPartners = [
    { id: 'cp_01', name: 'Pakistan Armed Forces', type: 'CLIENT', category: 'Military & Defense', country: 'Pakistan', display_order: 1 },
    { id: 'cp_02', name: 'Pakistan Air Force (Aviation Command)', type: 'CLIENT', category: 'Aerospace Machining', country: 'Pakistan', display_order: 2 },
    { id: 'cp_03', name: 'Frontier Corps & Law Enforcement', type: 'CLIENT', category: 'Small Arms & Riot Defense', country: 'Pakistan', display_order: 3 },
    { id: 'cp_04', name: 'Pakistan Ordnance Factories (POF)', type: 'PARTNER', category: 'Munitions & Barrel Blanks', country: 'Pakistan', display_order: 4 },
    { id: 'cp_05', name: 'Heavy Industries Taxila (HIT)', type: 'PARTNER', category: 'Armored Vehicle Assemblies', country: 'Pakistan', display_order: 5 },
    { id: 'cp_06', name: 'National Radio Telecommunication Corp (NRTC)', type: 'PARTNER', category: 'Tactical Electronics & Sight Mounts', country: 'Pakistan', display_order: 6 },
    { id: 'cp_07', name: 'Allied Export Procurement Directorate', type: 'CLIENT', category: 'Foreign Military Sales', country: 'International', display_order: 7 }
  ];
  const insertCP = db.prepare(`
    INSERT OR IGNORE INTO clients_partners (id, name, type, category, country, display_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const cp of defaultClientsPartners) {
    insertCP.run(cp.id, cp.name, cp.type, cp.category, cp.country, cp.display_order);
  }

  // 7. Seed Foundation Projects
  const defaultFoundation = [
    {
      id: 'fnd_01',
      title: 'Daudsons Precision Apprentice Institute',
      category: 'Vocational Engineering',
      impact_stats: '450+ Certified Machinists Graduated',
      desc: 'Free 2-year accredited apprenticeships in CNC milling, metrology, and metallurgy for underprivileged youth in Khyber Pakhtunkhwa.',
      display_order: 1
    },
    {
      id: 'fnd_02',
      title: 'Clean Water Reverse Osmosis Stations',
      category: 'Community Infrastructure',
      impact_stats: '15,000+ Citizens Served Daily',
      desc: 'Four solar-powered deep-aquifer filtration plants established along Kohat Road and Industrial Estate villages.',
      display_order: 2
    },
    {
      id: 'fnd_03',
      title: 'Historical Gunsmithing Heritage Archive',
      category: 'Cultural Preservation',
      impact_stats: '200+ Artifacts Documented',
      desc: 'Preserving the historic metallurgical traditions and Damascus steel forging heritage of the Peshawar Valley.',
      display_order: 3
    }
  ];
  const insertFnd = db.prepare(`
    INSERT OR IGNORE INTO foundation_projects (id, title, category, impact_stats, desc, display_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const f of defaultFoundation) {
    insertFnd.run(f.id, f.title, f.category, f.impact_stats, f.desc, f.display_order);
  }

  // Check product catalog count
  const countRow = db.prepare('SELECT count(*) as count FROM products').get();
  if (countRow.count > 0 && !force) {
    return;
  }

  if (!fs.existsSync(SEED_FILE)) {
    console.error('Seed file not found at:', SEED_FILE);
    return;
  }

  const seed = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
  console.log('Seeding Daudsons Armoury catalog from seed-data.json...');

  // Products
  const insertProd = db.prepare(`
    INSERT OR REPLACE INTO products (id, slug, name, division, category, requires_license, image, wp_asset, short_desc, features, specs, needs_verification, is_published)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);
  for (const p of seed.products || []) {
    insertProd.run(
      p.id,
      p.slug,
      p.name,
      p.division,
      p.category,
      p.requiresLicense ? 1 : 0,
      p.image,
      p.wpAsset || '',
      p.shortDesc,
      JSON.stringify(p.features || []),
      JSON.stringify(p.specs || {}),
      p.needsVerification ? 1 : 0
    );
  }

  // Shop Items
  const insertShop = db.prepare(`
    INSERT OR REPLACE INTO shop_items (id, name, category, price, stock, image, desc)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const s of seed.shopItems || []) {
    insertShop.run(s.id, s.name, s.category, s.price, s.stock, s.image, s.desc);
  }

  // Dealers
  const insertDealer = db.prepare(`
    INSERT OR REPLACE INTO dealers (id, city, province, lat, lng, is_hq, name, address, phone, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const d of seed.dealers || []) {
    insertDealer.run(
      d.id,
      d.city,
      d.province,
      d.coords[0],
      d.coords[1],
      d.isHQ ? 1 : 0,
      d.name,
      d.address,
      d.phone,
      d.note || ''
    );
  }

  // News
  const insertNews = db.prepare(`
    INSERT OR REPLACE INTO news (id, slug, title, date, tag, desc, content, is_published)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `);
  for (const n of seed.news || []) {
    insertNews.run(
      n.id,
      n.id,
      n.title,
      n.date,
      n.tag,
      n.desc,
      n.desc
    );
  }

  // Downloads
  const insertDown = db.prepare(`
    INSERT OR REPLACE INTO downloads (title, size, type, url, live, desc)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const dw of seed.downloads || []) {
    insertDown.run(dw.title, dw.size, dw.type, dw.url, dw.live ? 1 : 0, dw.desc);
  }

  // FAQs
  const insertFaq = db.prepare(`
    INSERT OR REPLACE INTO faqs (category, q, a, display_order)
    VALUES (?, ?, ?, ?)
  `);
  let faqOrder = 1;
  for (const f of seed.faqs || []) {
    insertFaq.run('General', f.q, f.a, faqOrder++);
  }

  console.log('Seeding completed successfully.');
}

// -------------------------------------------------------------
// USER & SESSION OPERATIONS
// -------------------------------------------------------------
function getUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
}

function getUserById(id) {
  return db.prepare('SELECT id, email, name, role, status, totp_enabled, must_change_password, last_login_at, created_at FROM users WHERE id = ?').get(id);
}

function getAllUsers() {
  return db.prepare('SELECT id, email, name, role, status, totp_enabled, last_login_at, created_at FROM users ORDER BY created_at DESC').all();
}

function createUser({ email, password, name, role }) {
  const id = `usr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
  const passwordHash = auth.hashPassword(password);
  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, status, totp_enabled)
    VALUES (?, ?, ?, ?, ?, 'ACTIVE', 0)
  `).run(id, email.toLowerCase().trim(), passwordHash, name, role || 'EDITOR');
  return getUserById(id);
}

function updateUser(id, updates) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return null;

  let query = 'UPDATE users SET ';
  const params = [];
  const fields = [];

  if (updates.name) { fields.push('name = ?'); params.push(updates.name); }
  if (updates.role) { fields.push('role = ?'); params.push(updates.role); }
  if (updates.status) { fields.push('status = ?'); params.push(updates.status); }
  if (updates.password) {
    fields.push('password_hash = ?');
    params.push(auth.hashPassword(updates.password));
  }
  if (updates.totpSecret !== undefined) {
    fields.push('totp_secret = ?');
    params.push(updates.totpSecret);
  }
  if (updates.totpEnabled !== undefined) {
    fields.push('totp_enabled = ?');
    params.push(updates.totpEnabled ? 1 : 0);
  }
  if (updates.recoveryCodes !== undefined) {
    fields.push('recovery_codes = ?');
    params.push(updates.recoveryCodes);
  }
  if (updates.lastLogin) {
    fields.push("last_login_at = datetime('now')");
  }

  if (fields.length === 0) return getUserById(id);

  query += fields.join(', ') + ' WHERE id = ?';
  params.push(id);
  db.prepare(query).run(...params);
  return getUserById(id);
}

function deleteUser(id) {
  const res = db.prepare('DELETE FROM users WHERE id = ?').run(id);
  return res.changes > 0;
}

// Session store
function createSession({ userId, userEmail, role, ipAddress, userAgent }) {
  const sessionId = require('crypto').randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + auth.SESSION_MAX_AGE_MS).toISOString();
  db.prepare(`
    INSERT INTO sessions (id, user_id, user_email, role, ip_address, user_agent, expires_at, revoked)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0)
  `).run(sessionId, userId, userEmail, role, ipAddress || '127.0.0.1', userAgent || '', expiresAt);
  return { sessionId, expiresAt };
}

function getSession(sessionId) {
  if (!sessionId) return null;
  const session = db.prepare(`
    SELECT s.*, u.status as user_status, u.totp_enabled, u.name as user_name
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ? AND s.revoked = 0
  `).get(sessionId);

  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) {
    revokeSession(sessionId);
    return null;
  }
  if (session.user_status !== 'ACTIVE') {
    revokeSession(sessionId);
    return null;
  }
  return session;
}

function revokeSession(sessionId) {
  db.prepare('UPDATE sessions SET revoked = 1 WHERE id = ?').run(sessionId);
}

function revokeAllUserSessions(userId) {
  db.prepare('UPDATE sessions SET revoked = 1 WHERE user_id = ?').run(userId);
}

// -------------------------------------------------------------
// AUDIT LOGGING
// -------------------------------------------------------------
function addAuditLog({ userId, userEmail, role, action, entityType, entityId, details, ipAddress, userAgent }) {
  db.prepare(`
    INSERT INTO audit_logs (user_id, user_email, role, action, entity_type, entity_id, details, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId || 'SYSTEM',
    userEmail || 'system@daudsons.com',
    role || 'SYSTEM',
    action,
    entityType || null,
    entityId || null,
    typeof details === 'object' ? JSON.stringify(details) : (details || null),
    ipAddress || '127.0.0.1',
    userAgent || ''
  );
}

function getAuditLogs(limit = 100) {
  return db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?').all(limit);
}

// -------------------------------------------------------------
// PAGE SECTIONS / PAGE BUILDER
// -------------------------------------------------------------
function getSections(page = 'home') {
  return db.prepare('SELECT * FROM sections WHERE page = ? ORDER BY display_order ASC').all(page);
}

function getAllSections() {
  return db.prepare('SELECT * FROM sections ORDER BY page ASC, display_order ASC').all();
}

function updateSection(id, updates) {
  const sec = db.prepare('SELECT * FROM sections WHERE id = ?').get(id);
  if (!sec) return null;

  let query = 'UPDATE sections SET ';
  const params = [];
  const fields = [];

  if (updates.title !== undefined) { fields.push('title = ?'); params.push(updates.title); }
  if (updates.subtitle !== undefined) { fields.push('subtitle = ?'); params.push(updates.subtitle); }
  if (updates.badge !== undefined) { fields.push('badge = ?'); params.push(updates.badge); }
  if (updates.content !== undefined) { fields.push('content = ?'); params.push(updates.content); }
  if (updates.cta_text !== undefined) { fields.push('cta_text = ?'); params.push(updates.cta_text); }
  if (updates.cta_link !== undefined) { fields.push('cta_link = ?'); params.push(updates.cta_link); }
  if (updates.image_url !== undefined) { fields.push('image_url = ?'); params.push(updates.image_url); }
  if (updates.display_order !== undefined) { fields.push('display_order = ?'); params.push(parseInt(updates.display_order, 10)); }
  if (updates.is_visible !== undefined) { fields.push('is_visible = ?'); params.push(updates.is_visible ? 1 : 0); }

  fields.push("updated_at = datetime('now')");
  query += fields.join(', ') + ' WHERE id = ?';
  params.push(id);

  db.prepare(query).run(...params);
  return db.prepare('SELECT * FROM sections WHERE id = ?').get(id);
}

// -------------------------------------------------------------
// SITE SETTINGS
// -------------------------------------------------------------
function getSiteSettings() {
  const rows = db.prepare('SELECT key, value FROM site_settings').all();
  const settings = {};
  for (const r of rows) {
    settings[r.key] = r.value;
  }
  return settings;
}

function updateSiteSetting(key, value) {
  db.prepare(`
    INSERT INTO site_settings (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `).run(key, value);
  return { key, value };
}

function updateMultipleSettings(settingsObj) {
  for (const [k, v] of Object.entries(settingsObj)) {
    updateSiteSetting(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
  }
  return getSiteSettings();
}

// -------------------------------------------------------------
// CORPORATE CREDENTIALS: CERTIFICATES, TIMELINE, CLIENTS/PARTNERS, FOUNDATION
// -------------------------------------------------------------
function getCertificates() {
  return db.prepare('SELECT * FROM certificates ORDER BY display_order ASC').all();
}

function updateCertificate(id, data) {
  db.prepare(`
    UPDATE certificates
    SET code = ?, title = ?, issuer = ?, scope = ?, valid_until = ?, display_order = ?
    WHERE id = ?
  `).run(data.code, data.title, data.issuer, data.scope, data.valid_until, data.display_order || 0, id);
  return db.prepare('SELECT * FROM certificates WHERE id = ?').get(id);
}

function getTimelineEvents() {
  return db.prepare('SELECT * FROM timeline_events ORDER BY display_order ASC').all();
}

function getClientsPartners(type) {
  if (type) {
    return db.prepare('SELECT * FROM clients_partners WHERE type = ? ORDER BY display_order ASC').all(type.toUpperCase());
  }
  return db.prepare('SELECT * FROM clients_partners ORDER BY display_order ASC').all();
}

function getFoundationProjects() {
  return db.prepare('SELECT * FROM foundation_projects ORDER BY display_order ASC').all();
}

// -------------------------------------------------------------
// MEDIA ASSETS LIBRARY
// -------------------------------------------------------------
function getMediaAssets() {
  return db.prepare('SELECT * FROM media_assets ORDER BY uploaded_at DESC').all();
}

function createMediaAsset({ id, filename, originalName, mimeType, sizeBytes, url, altText }) {
  const assetId = id || `media_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
  db.prepare(`
    INSERT INTO media_assets (id, filename, original_name, mime_type, size_bytes, url, alt_text)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(assetId, filename, originalName, mimeType, sizeBytes, url, altText || originalName);
  return db.prepare('SELECT * FROM media_assets WHERE id = ?').get(assetId);
}

function deleteMediaAsset(id) {
  const asset = db.prepare('SELECT * FROM media_assets WHERE id = ?').get(id);
  if (!asset) return null;
  db.prepare('DELETE FROM media_assets WHERE id = ?').run(id);
  return asset;
}

// -------------------------------------------------------------
// PRODUCTS
// -------------------------------------------------------------
function getProducts(filter = {}) {
  let query = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (filter.division && filter.division !== 'all') {
    query += ' AND division = ?';
    params.push(filter.division);
  }
  if (filter.category) {
    query += ' AND category = ?';
    params.push(filter.category);
  }
  if (filter.search) {
    query += ' AND (name LIKE ? OR short_desc LIKE ?)';
    params.push(`%${filter.search}%`, `%${filter.search}%`);
  }
  if (filter.needsVerification !== undefined) {
    query += ' AND needs_verification = ?';
    params.push(filter.needsVerification ? 1 : 0);
  }

  query += ' ORDER BY created_at DESC';
  const rows = db.prepare(query).all(...params);

  return rows.map(r => ({
    ...r,
    short_desc: r.short_desc || '',
    shortDesc: r.short_desc || '',
    requiresLicense: Boolean(r.requires_license),
    needsVerification: Boolean(r.needs_verification),
    isPublished: Boolean(r.is_published),
    features: r.features ? JSON.parse(r.features) : [],
    specs: r.specs ? JSON.parse(r.specs) : {},
    finishes: r.finishes ? JSON.parse(r.finishes) : [],
    downloads: r.downloads ? JSON.parse(r.downloads) : []
  }));
}

function getProductBySlug(slug) {
  const r = db.prepare('SELECT * FROM products WHERE slug = ?').get(slug);
  if (!r) return null;
  return {
    ...r,
    short_desc: r.short_desc || '',
    shortDesc: r.short_desc || '',
    requiresLicense: Boolean(r.requires_license),
    needsVerification: Boolean(r.needs_verification),
    isPublished: Boolean(r.is_published),
    features: r.features ? JSON.parse(r.features) : [],
    specs: r.specs ? JSON.parse(r.specs) : {},
    finishes: r.finishes ? JSON.parse(r.finishes) : [],
    downloads: r.downloads ? JSON.parse(r.downloads) : []
  };
}

function createProduct(p) {
  const id = p.id || `dsa-prod-${Date.now().toString(36)}`;
  const slug = p.slug || p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  db.prepare(`
    INSERT INTO products (id, slug, name, division, category, requires_license, image, wp_asset, short_desc, features, specs, finishes, downloads, needs_verification, is_published)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    slug,
    p.name,
    p.division,
    p.category,
    p.requiresLicense ? 1 : 0,
    p.image || '/assets/products/placeholder.webp',
    p.wpAsset || '',
    p.shortDesc || '',
    JSON.stringify(p.features || []),
    JSON.stringify(p.specs || {}),
    JSON.stringify(p.finishes || []),
    JSON.stringify(p.downloads || []),
    p.needsVerification ? 1 : 0,
    p.isPublished !== undefined ? (p.isPublished ? 1 : 0) : 1
  );
  return getProductBySlug(slug);
}

function updateProduct(id, p) {
  const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!prod) return null;

  let query = 'UPDATE products SET ';
  const params = [];
  const fields = [];

  if (p.name !== undefined) { fields.push('name = ?'); params.push(p.name); }
  if (p.division !== undefined) { fields.push('division = ?'); params.push(p.division); }
  if (p.category !== undefined) { fields.push('category = ?'); params.push(p.category); }
  if (p.requiresLicense !== undefined) { fields.push('requires_license = ?'); params.push(p.requiresLicense ? 1 : 0); }
  if (p.image !== undefined) { fields.push('image = ?'); params.push(p.image); }
  if (p.wpAsset !== undefined) { fields.push('wp_asset = ?'); params.push(p.wpAsset); }
  if (p.shortDesc !== undefined) { fields.push('short_desc = ?'); params.push(p.shortDesc); }
  if (p.features !== undefined) { fields.push('features = ?'); params.push(JSON.stringify(p.features)); }
  if (p.specs !== undefined) { fields.push('specs = ?'); params.push(JSON.stringify(p.specs)); }
  if (p.finishes !== undefined) { fields.push('finishes = ?'); params.push(JSON.stringify(p.finishes)); }
  if (p.downloads !== undefined) { fields.push('downloads = ?'); params.push(JSON.stringify(p.downloads)); }
  if (p.needsVerification !== undefined) { fields.push('needs_verification = ?'); params.push(p.needsVerification ? 1 : 0); }
  if (p.isPublished !== undefined) { fields.push('is_published = ?'); params.push(p.isPublished ? 1 : 0); }

  if (fields.length === 0) return getProductBySlug(prod.slug);

  query += fields.join(', ') + ' WHERE id = ?';
  params.push(id);

  db.prepare(query).run(...params);
  const updated = db.prepare('SELECT slug FROM products WHERE id = ?').get(id);
  return getProductBySlug(updated.slug);
}

function deleteProduct(id) {
  const res = db.prepare('DELETE FROM products WHERE id = ?').run(id);
  return res.changes > 0;
}

// -------------------------------------------------------------
// SHOP ITEMS
// -------------------------------------------------------------
function getShopItems(category) {
  if (category) {
    return db.prepare('SELECT * FROM shop_items WHERE category = ?').all(category);
  }
  return db.prepare('SELECT * FROM shop_items ORDER BY price ASC').all();
}

function getShopItemById(id) {
  return db.prepare('SELECT * FROM shop_items WHERE id = ?').get(id);
}

function updateShopItem(id, data) {
  const item = db.prepare('SELECT * FROM shop_items WHERE id = ?').get(id);
  if (!item) return null;

  let query = 'UPDATE shop_items SET ';
  const params = [];
  const fields = [];

  if (data.name !== undefined) { fields.push('name = ?'); params.push(data.name); }
  if (data.price !== undefined) { fields.push('price = ?'); params.push(data.price); }
  if (data.stock !== undefined) { fields.push('stock = ?'); params.push(data.stock); }
  if (data.desc !== undefined) { fields.push('desc = ?'); params.push(data.desc); }

  if (fields.length === 0) return item;

  query += fields.join(', ') + ' WHERE id = ?';
  params.push(id);
  db.prepare(query).run(...params);
  return db.prepare('SELECT * FROM shop_items WHERE id = ?').get(id);
}

// -------------------------------------------------------------
// ORDERS
// -------------------------------------------------------------
function getOrders() {
  const rows = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  return rows.map(r => ({
    ...r,
    items: JSON.parse(r.items)
  }));
}

function createOrder(orderData) {
  const orderId = `DSA-ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
  const subtotal = orderData.items.reduce((acc, it) => acc + (it.price * it.qty), 0);
  const shippingFee = 450;
  const total = subtotal + shippingFee;

  db.prepare(`
    INSERT INTO orders (id, customer_name, customer_email, customer_phone, city, address, items, subtotal, shipping_fee, total_pkr, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NEW', ?)
  `).run(
    orderId,
    orderData.customerName,
    orderData.customerEmail || '',
    orderData.customerPhone,
    orderData.city,
    orderData.address,
    JSON.stringify(orderData.items),
    subtotal,
    shippingFee,
    total,
    orderData.notes || 'Awaiting dispatch verification'
  );

  // Decrement stock for shop items
  const decStock = db.prepare('UPDATE shop_items SET stock = MAX(0, stock - ?) WHERE id = ?');
  for (const it of orderData.items) {
    decStock.run(it.qty, it.id);
  }

  return {
    id: orderId,
    total,
    itemsCount: orderData.items.length,
    status: 'NEW'
  };
}

function updateOrderStatus(id, status) {
  const res = db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
  return res.changes > 0;
}

// -------------------------------------------------------------
// ENQUIRIES / RFQS
// -------------------------------------------------------------
function getEnquiries(type) {
  if (type) {
    return db.prepare('SELECT * FROM enquiries WHERE type = ? ORDER BY created_at DESC').all(type);
  }
  return db.prepare('SELECT * FROM enquiries ORDER BY created_at DESC').all();
}

function createEnquiry(data) {
  const id = `DSA-ENQ-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
  db.prepare(`
    INSERT INTO enquiries (id, type, name, email, phone, subject, message, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'NEW')
  `).run(
    id,
    data.type || 'CONTACT_RFQ',
    data.name,
    data.email,
    data.phone,
    data.subject,
    data.message
  );
  return { id, ...data, status: 'NEW' };
}

function updateEnquiryStatus(id, status) {
  const res = db.prepare('UPDATE enquiries SET status = ? WHERE id = ?').run(status, id);
  return res.changes > 0;
}

// -------------------------------------------------------------
// DEALERS
// -------------------------------------------------------------
function getDealers(search) {
  let query = 'SELECT * FROM dealers';
  const params = [];
  if (search) {
    query += ' WHERE city LIKE ? OR name LIKE ? OR province LIKE ?';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  query += ' ORDER BY is_hq DESC, city ASC';
  const rows = db.prepare(query).all(...params);
  return rows.map(r => ({
    ...r,
    isHQ: Boolean(r.is_hq),
    coords: [r.lat, r.lng]
  }));
}

function createDealer(d) {
  const id = d.id || `dealer-${Date.now().toString(36)}`;
  db.prepare(`
    INSERT INTO dealers (id, city, province, lat, lng, is_hq, name, address, phone, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    d.city,
    d.province || 'Pakistan',
    d.lat || 33.0,
    d.lng || 71.0,
    d.isHQ ? 1 : 0,
    d.name,
    d.address,
    d.phone,
    d.note || ''
  );
  return { id, ...d };
}

function deleteDealer(id) {
  const res = db.prepare('DELETE FROM dealers WHERE id = ?').run(id);
  return res.changes > 0;
}

// -------------------------------------------------------------
// NEWS
// -------------------------------------------------------------
function getNews() {
  return db.prepare('SELECT * FROM news WHERE is_published = 1 ORDER BY date DESC').all();
}

function getAllNews() {
  return db.prepare('SELECT * FROM news ORDER BY date DESC').all();
}

function createNews(n) {
  const id = n.id || `news-${Date.now().toString(36)}`;
  db.prepare(`
    INSERT INTO news (id, slug, title, date, tag, desc, content, is_published)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `).run(
    id,
    id,
    n.title,
    n.date || new Date().toISOString().split('T')[0],
    n.tag || 'Press Release',
    n.desc,
    n.content || n.desc
  );
  return { id, ...n };
}

function deleteNews(id) {
  const res = db.prepare('DELETE FROM news WHERE id = ?').run(id);
  return res.changes > 0;
}

// -------------------------------------------------------------
// DOWNLOADS & FAQS
// -------------------------------------------------------------
function getDownloads() {
  return db.prepare('SELECT * FROM downloads WHERE live = 1').all();
}

function getFaqs(category) {
  if (category) {
    return db.prepare('SELECT * FROM faqs WHERE category = ? ORDER BY display_order ASC').all(category);
  }
  return db.prepare('SELECT * FROM faqs ORDER BY display_order ASC').all();
}

// -------------------------------------------------------------
// STATS OVERVIEW
// -------------------------------------------------------------
function getStats() {
  const prodCount = db.prepare('SELECT count(*) as count FROM products').get().count;
  const verifiedCount = db.prepare('SELECT count(*) as count FROM products WHERE needs_verification = 0').get().count;
  const unverifiedCount = db.prepare('SELECT count(*) as count FROM products WHERE needs_verification = 1').get().count;
  const shopCount = db.prepare('SELECT count(*) as count FROM shop_items').get().count;
  const orderStats = db.prepare('SELECT count(*) as count, COALESCE(SUM(total_pkr), 0) as revenue FROM orders').get();
  const enqCount = db.prepare('SELECT count(*) as count FROM enquiries').get().count;
  const newEnqCount = db.prepare("SELECT count(*) as count FROM enquiries WHERE status = 'NEW'").get().count;
  const dealerCount = db.prepare('SELECT count(*) as count FROM dealers').get().count;
  const userCount = db.prepare('SELECT count(*) as count FROM users').get().count;

  return {
    totalProducts: prodCount,
    verifiedProducts: verifiedCount,
    unverifiedProducts: unverifiedCount,
    totalShopItems: shopCount,
    totalOrders: orderStats.count,
    totalRevenuePKR: orderStats.revenue,
    totalEnquiries: enqCount,
    pendingEnquiries: newEnqCount,
    totalDealers: dealerCount,
    totalUsers: userCount
  };
}

// -------------------------------------------------------------
// LOGGING
// -------------------------------------------------------------
function logApi(method, path, statusCode, message) {
  try {
    db.prepare('INSERT INTO api_logs (method, path, status_code, message) VALUES (?, ?, ?, ?)').run(
      method,
      path,
      statusCode,
      message || ''
    );
  } catch (err) {
    console.error('Failed to log API event:', err.message);
  }
}

function getApiLogs(limit = 50) {
  return db.prepare('SELECT * FROM api_logs ORDER BY id DESC LIMIT ?').all(limit);
}

// -------------------------------------------------------------
// FULL EXPORT
// -------------------------------------------------------------
function exportDatabase() {
  return {
    meta: {
      exportedAt: new Date().toISOString(),
      source: 'Daudsons Armoury (Pvt.) Ltd. Enterprise Platform',
      version: '2.5.0'
    },
    siteSettings: getSiteSettings(),
    sections: getAllSections(),
    certificates: getCertificates(),
    timelineEvents: getTimelineEvents(),
    clientsPartners: getClientsPartners(),
    foundationProjects: getFoundationProjects(),
    products: getProducts(),
    shopItems: getShopItems(),
    orders: getOrders(),
    enquiries: getEnquiries(),
    dealers: getDealers(),
    news: getAllNews(),
    downloads: getDownloads(),
    faqs: getFaqs(),
    logs: getApiLogs(100)
  };
}

// Auto-initialize on require
initSchema();
seedDatabase(false);

module.exports = {
  db,
  seedDatabase,
  logApi,
  getApiLogs,
  addAuditLog,
  getAuditLogs,
  // Auth & Users
  getUserByEmail,
  getUserById,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  createSession,
  getSession,
  revokeSession,
  revokeAllUserSessions,
  // CMS & Content Builder
  getSections,
  getAllSections,
  updateSection,
  getSiteSettings,
  updateSiteSetting,
  updateMultipleSettings,
  getCertificates,
  updateCertificate,
  getTimelineEvents,
  getClientsPartners,
  getFoundationProjects,
  getMediaAssets,
  createMediaAsset,
  deleteMediaAsset,
  // Public Catalog & Commerce
  getProducts,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  getShopItems,
  getShopItemById,
  updateShopItem,
  getOrders,
  createOrder,
  updateOrderStatus,
  getEnquiries,
  createEnquiry,
  updateEnquiryStatus,
  getDealers,
  createDealer,
  deleteDealer,
  getNews,
  getAllNews,
  createNews,
  deleteNews,
  getDownloads,
  getFaqs,
  getStats,
  exportDatabase
};
