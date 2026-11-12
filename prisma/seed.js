const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is not defined.');
    console.error('Please set DATABASE_URL (e.g. postgresql://user:pass@ep-cool-fog-123.neon.tech/neondb?sslmode=require)');
    process.exit(1);
  }

  console.log('Connecting to PostgreSQL / Neon database...');
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  const seedFile = path.join(__dirname, '..', 'seed-data.json');
  if (!fs.existsSync(seedFile)) {
    console.error('Seed file not found at:', seedFile);
    process.exit(1);
  }

  const seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'));

  try {
    const client = await pool.connect();
    console.log('Connected successfully. Initializing PostgreSQL schema...');

    await client.query(`
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_email TEXT NOT NULL,
        role TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        expires_at TEXT NOT NULL,
        revoked INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id TEXT,
        user_email TEXT,
        role TEXT,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id TEXT,
        details TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS site_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS shop_items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        price INTEGER NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        image TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS enquiries (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL DEFAULT 'CONTACT_RFQ',
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        subject TEXT NOT NULL,
        message TEXT,
        status TEXT NOT NULL DEFAULT 'NEW',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS news (
        id TEXT PRIMARY KEY,
        slug TEXT,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        tag TEXT NOT NULL,
        description TEXT NOT NULL,
        content TEXT,
        cover_image TEXT,
        is_published INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

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

      CREATE TABLE IF NOT EXISTS timeline_events (
        id TEXT PRIMARY KEY,
        year TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        milestone TEXT,
        display_order INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS clients_partners (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'CLIENT',
        category TEXT,
        country TEXT DEFAULT 'Pakistan',
        logo TEXT,
        display_order INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS foundation_projects (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        impact_stats TEXT,
        description TEXT NOT NULL,
        image TEXT,
        display_order INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS downloads (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        size TEXT NOT NULL,
        type TEXT NOT NULL,
        url TEXT NOT NULL,
        live INTEGER NOT NULL DEFAULT 1,
        description TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS faqs (
        id SERIAL PRIMARY KEY,
        category TEXT DEFAULT 'General',
        q TEXT NOT NULL,
        a TEXT NOT NULL,
        display_order INTEGER NOT NULL DEFAULT 0
      );
    `);

    console.log('Schema ready. Seeding catalog into Neon PostgreSQL...');

    // Seed default Super Admin
    await client.query(`
      INSERT INTO users (id, email, password_hash, name, role, status, totp_enabled, must_change_password)
      VALUES ($1, $2, $3, $4, $5, $6, 0, 0)
      ON CONFLICT (email) DO NOTHING
    `, [
      'usr_super_admin_01',
      'admin@daudsons.com',
      '202c388a1e35f528096f9202575f0a7ef20d207328bf3809d0a6493630f9a2b5', // Daudsons@1953#Peshawar
      'Executive Administrator',
      'SUPER_ADMIN',
      'ACTIVE'
    ]);

    // Seed products
    for (const p of seed.products || []) {
      await client.query(`
        INSERT INTO products (id, slug, name, division, category, requires_license, image, wp_asset, short_desc, features, specs, needs_verification, is_published)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 1)
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          division = EXCLUDED.division,
          category = EXCLUDED.category,
          image = EXCLUDED.image,
          short_desc = EXCLUDED.short_desc,
          specs = EXCLUDED.specs,
          features = EXCLUDED.features
      `, [
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
      ]);
    }

    console.log(`Successfully seeded ${seed.products.length} products into Neon PostgreSQL.`);

    // Seed dealers
    for (const d of seed.dealers || []) {
      const lat = d.lat !== undefined ? d.lat : (d.coords ? d.coords[0] : 34.0144);
      const lng = d.lng !== undefined ? d.lng : (d.coords ? d.coords[1] : 71.5785);
      await client.query(`
        INSERT INTO dealers (id, city, province, lat, lng, is_hq, name, address, phone, note)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO NOTHING
      `, [
        d.id,
        d.city,
        d.province,
        lat,
        lng,
        d.isHQ ? 1 : 0,
        d.name,
        d.address,
        d.phone,
        d.note || ''
      ]);
    }
    console.log(`Successfully seeded ${seed.dealers.length} dealers into Neon PostgreSQL.`);

    // Seed FAQs
    for (const f of seed.faqs || []) {
      await client.query(`
        INSERT INTO faqs (category, q, a, display_order)
        VALUES ($1, $2, $3, $4)
      `, ['General', f.q, f.a, 1]);
    }
    console.log(`Successfully seeded ${seed.faqs.length} FAQs into Neon PostgreSQL.`);

    client.release();
    await pool.end();
    console.log('✅ Neon PostgreSQL database initialization & seeding complete!');
  } catch (err) {
    console.error('Failed to seed PostgreSQL:', err);
    process.exit(1);
  }
}

main();
