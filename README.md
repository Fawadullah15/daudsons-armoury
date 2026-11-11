# DAUDSONS ARMOURY (PVT.) LTD. — ENTERPRISE FULLSTACK PLATFORM
### Made in Pakistan Since 1953 • Peshawar, Khyber Pakhtunkhwa
**ISO 9001:2015 • ISO 14001:2015 • AS9100 Rev D Aerospace Accredited**

---

## 1. Executive Summary

This platform is the production-grade full-stack web application and administrative management console for **DAUDSONS ARMOURY (PVT.) LTD.**, Pakistan's premier defense, small arms, aerospace precision, and heavy ordnance manufacturer headquartered in Peshawar on Kohat Road since 1953.

The application converts the prototype HTML into a robust, secure, dynamic full-stack architecture powered by **Node.js, Express, native SQLite with Write-Ahead Logging (`node:sqlite`), Argon2/PBKDF2 cryptography, RFC 6238 TOTP Two-Factor Authentication, Role-Based Access Control (RBAC), and an interactive Admin CMS**.

---

## 2. Technology Stack

- **Runtime & Backend:** Node.js v24 + Express 5 (lightweight footprint < 10MB, ultra-low memory usage, zero external C++ build toolchain overhead)
- **Database Engine:** Native `node:sqlite` with Write-Ahead Logging (WAL) and foreign keys enabled for atomic transactions and durability
- **Security & Cryptography:** PBKDF2 (100,000 iterations + HMAC-SHA512 + 16-byte random salt), constant-time string comparison (`timingSafeEqual`), RFC 6238 TOTP two-factor authentication, single-use SHA-256 hashed recovery codes, sliding-window rate limiting, and HTTP security headers (CSP, HSTS, X-Frame-Options)
- **Frontend Architecture:** Semantic HTML5 SPA with HTML5 History API (`pushState` / `popstate`), CSS custom properties with official Daudsons tokens (`--bg #0A0B0D`, `--surface #14161A`, `--brass #C8A24A`, `--signal #E4572E`), Three.js interactive 3D CAD viewer, D3.js nationwide dealer map, and MantisX telemetry simulator
- **Testing & QA:** Comprehensive automated test suite (`npm test`) covering 45 integration assertions (Auth, 2FA, RBAC, Section Builder, Site Settings, Products CRUD, Orders, Enquiries, Media Library, SEO, and Security Headers)
- **Containerization:** Production Dockerfile and docker-compose orchestration

---

## 3. Directory Layout

```
daudsons-armoury-fullstack/
├── server.js               # Production Express.js server & REST API router
├── database.js             # SQLite persistence layer (node:sqlite with WAL)
├── auth.js                 # PBKDF2 hashing, RFC 6238 TOTP 2FA, session store & RBAC
├── seed-data.json          # Master catalog seed (30 systems across 4 divisions)
├── daudsons.db             # Persistent SQLite relational database
├── Dockerfile              # Production Alpine container definition
├── docker-compose.yml      # Service orchestration with persistent volumes
├── .env.example            # Documented environment variables template
├── SECURITY.md             # Threat models, cryptography & compliance policy
├── prisma/
│   └── schema.prisma       # 26 relational Prisma models (PostgreSQL & SQLite)
├── nextjs-blueprint/       # Next.js 14 App Router + TypeScript + Tailwind package
├── test/
│   └── api-test.js         # Automated end-to-end test suite (45 assertions)
├── public/
│   ├── index.html          # Responsive SPA layout with 14 views + 12 Admin panels
│   ├── css/
│   │   └── styles.css      # Custom industrial design system & Tailwind tokens
│   └── js/
│       ├── api.js          # Asynchronous frontend REST API client
│       ├── router.js       # HTML5 History API router (pushState / popstate)
│       ├── three-cad.js    # Three.js 3D CAD viewer for DSA Trushot 9mm
│       ├── pakistan-map.js # D3/SVG geographic map with 9 pulsing city pins
│       ├── mantis.js       # Mantis X10 dry-fire telemetry simulator
│       └── app.js          # Master controller, cart store, forms & Admin CMS
└── package.json            # Scripts: start, dev, test
```

---

## 4. Public Routes & Deep Links

All public routes are dynamic, SEO-optimized, and backed by the relational database:

| Route | Purpose | Dynamic Content Backing |
|---|---|---|
| `/` | Home Portal | Dynamic sections, 3D CAD viewer, Mantis telemetry, interactive map |
| `/products` | Master Catalog | 30 products across all 4 divisions with live search & filters |
| `/firearms` | Firearms Division | 9mm pistols, 30 Bore, 12-GA shotguns, CR-53 .223 rifles |
| `/defense` | Defense Division | Aerial bombs, mortar bombs, artillery hardware & tank assemblies |
| `/aerospace` | Aerospace Division | AS9100 Rev D certified CNC structural airframe hardware |
| `/engineering` | Precision Engineering | Multi-axis CNC milling, cylindrical grinding, induction hardening |
| `/product/:slug` | Product Specification | Dynamic specs, ballistic table, cold hammer rifling, finishes |
| `/shop` | Heritage E-Shop | Non-restricted official apparel & tactical accessories in PKR ₨ |
| `/cart` | Merchandise Cart | LocalStorage synced bag with real-time subtotal in PKR |
| `/checkout` | Merchandise Checkout | Delivery address capture, order placement & dispatch queue |
| `/about-us` | Corporate Heritage | 200-year Peshawar armory lineage, factory tour & leadership |
| `/dealers` | Authorized Dealers | 9 verified cities with interactive D3 coordinates map |
| `/news-and-events` | Press & CSR | Food drives, IDEAS defense expo coverage & community welfare |
| `/daudsons-foundation` | Philanthropic Trust | Vocational apprenticeships & solar-powered clean water plants |
| `/downloads` | Technical Library | Downloadable brochures, defense datasheets & proof certificates |
| `/licensing-compliance` | Statutory Guidance | Pakistan Arms Ordinance 1965 rules & MoDP defense guidelines |
| `/privacy-policy` | Privacy Policy | Data protection policy & GDPR compliance notice |
| `/terms` | Terms of Service | Commercial terms, factory warranty & statutory restrictions |
| `/admin` | Enterprise Master CMS | Restricted administration portal with 12 control modules |
| `/robots.txt` | Crawler Directives | Excludes `/admin` and `/api/admin`, exposes dynamic sitemap |
| `/sitemap.xml` | XML Sitemap | Dynamic XML listing static routes and dynamic product slugs |

---

## 5. Admin Panel Modules (`/admin`)

The master administration console controls 100% of the public website content:

1. **Staff Security Gateway:** Login form with email/password authentication, RFC 6238 TOTP two-factor prompt, rate limiting, and brute-force lockout.
2. **Operator Profile Banner:** Live display of authenticated operator email, role badge (`SUPER_ADMIN`, `ADMIN`, `EDITOR`, `SALES_SUPPORT`), 2FA status, and session termination.
3. **Executive Dashboard & KPIs:** Live counts of catalog products, unverified audit flags, e-shop SKUs, total merchandise orders, total PKR revenue, inbound RFQs, active dealer nodes, and user accounts.
4. **Products Manager (CRUD):** Add, edit, or delete catalog items with image URLs, technical descriptions, division tagging, statutory licensing rule, and **"Needs Content Verification" audit flag**.
5. **Page & Section Builder:** Edit headlines, subtitles, badge tags, and toggle visibility for all homepage sections in real time without editing source files.
6. **E-Shop & Order Dispatch Workflow:** Update warehouse inventory, adjust prices in PKR ₨, and advance customer orders across stages: `NEW` → `CONFIRMED` → `SHIPPED` → `DELIVERED` → `CANCELLED`.
7. **Inbound Submissions & RFQs:** Review procurement requests, dealership applications, and civilian license inquiries with status toggles (`NEW` → `RESOLVED`).
8. **Dealer Network Map DB:** Plot new dealer pins with latitude/longitude coordinates directly updating the interactive D3 Pakistan map.
9. **News & CSR Drives:** Publish company announcements, defense expo highlights, and philanthropic initiatives.
10. **Corporate Credentials & Timeline:** Manage accredited certificates (ISO 9001, ISO 14001, AS9100 Rev D) and historical timeline events since 1953.
11. **Site Settings & Maintenance Mode:** Update company title, phone lines, sales email, announcement ticker text, and activate emergency maintenance mode (HTTP 503).
12. **Users & RBAC Management:** Super Admin tools to create new staff accounts, assign roles, and revoke accounts.
13. **Two-Factor Authentication (TOTP):** Generate base32 secret keys, OTPAuth URLs, 8 single-use recovery codes, and change account passwords.
14. **Security Audit Trail:** Immutable log of all administrative actions, logins, 2FA events, and database mutations with IP and user-agent stamps.
15. **Data Backup & Export:** One-click full JSON database snapshots and CSV exports for Orders, Submissions, and Products.

---

## 6. Default Administrative Credentials

Initial Super Admin credentials are automatically seeded upon first run:

- **Email:** `admin@daudsons.com`
- **Password:** `Daudsons@1953#Peshawar`
- **Role:** `SUPER_ADMIN`
- **Two-Factor Authentication:** Optional upon first login; can be activated via Tab 10 (2FA Setup).
- *(Note: Credentials can be customized via `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables).*

---

## 7. Statutory Compliance Guardrails

In strict adherence to the **Pakistan Arms Ordinance 1965** and **Khyber Pakhtunkhwa Arms Rules 2014**:
- **Arms Checkout Prohibited:** Firearms and defense ordnance cannot be checked out via online shopping cart mechanisms. Any attempt to submit an order containing firearm IDs via `/api/orders` is rejected by the server (`HTTP 400`).
- **Physical Verification:** Small arms may only be procured in-person at the Daudsons Factory in Peshawar or through the Authorized Dealer Network upon physical presentation of a valid Arms License & Demand Note.
- **E-Shop Scope:** Cart checkout is restricted strictly to non-regulated apparel and tactical accessories in Pakistani Rupees (PKR ₨).

---

## 8. Quick Start Guide

### Local Development
```bash
# Navigate to directory
cd daudsons-armoury-fullstack

# Install dependencies
npm install

# Run automated tests (42 assertions)
npm test

# Start the server
npm start
# Server will run on http://localhost:3053
```

### Docker Deployment
```bash
# Build and run with Docker Compose
docker compose up -d --build

# View logs
docker compose logs -f
```

---

## 9. Verification & Audit Results

The platform has been audited and tested:
- **Test Suite Status:** 45/45 tests passing (`npm test`)
- **Port:** Live on port `3053`
- **Database:** `daudsons.db` with WAL mode persistence
- **Security:** CSRF SameSite=Strict cookies, CSP, rate limiting, and RBAC enforced on server
