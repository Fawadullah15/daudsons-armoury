# SECURITY POLICY & THREAT MODEL SPECIFICATION
## DAUDSONS ARMOURY (PVT.) LTD. — ENTERPRISE DEFENSE PLATFORM
**Established 1953 • Peshawar, Pakistan • AS9100 Rev D & ISO 9001:2015 Accredited**

---

### 1. Security Architecture & Threat Model

As a prime defense contractor and aerospace manufacturer, Daudsons Armoury treats the master web application and administrative console as high-value infrastructure. The platform implements defense-in-depth principles across all architectural tiers:

```
[ Public Network / Client Request ]
                │
                ▼
   [ Hardened Security Headers & CSP ]
                │
                ▼
   [ Sliding-Window Rate Limiter & Honeypot ]
                │
                ▼
   [ Server-Side Session & RBAC Enforcement ]
                │
                ▼
   [ Cryptographic Hashing (PBKDF2) & TOTP 2FA (RFC 6238) ]
                │
                ▼
   [ Parameterized SQLite Statements (No SQL Injection) ]
                │
                ▼
   [ Immutable Security Audit Trail Logging ]
```

---

### 2. Cryptography & Password Policy

- **Password Hashing:** Passwords are never stored in plaintext. They are salted with 16 bytes of cryptographically secure pseudo-random entropy (`crypto.randomBytes(16)`) and hashed using **PBKDF2 with HMAC-SHA512 across 100,000 iterations**.
- **Timing Attack Mitigation:** Password hash comparison is executed using `crypto.timingSafeEqual()` to eliminate side-channel latency profiling.
- **Password Complexity Policy:**
  - Minimum length: 10 characters
  - Minimum 1 uppercase letter (`[A-Z]`)
  - Minimum 1 lowercase letter (`[a-z]`)
  - Minimum 1 numeric digit (`[0-9]`)
  - Minimum 1 special character (`[^A-Za-z0-9]`)
- **Account Lockout & Progressive Delay:**
  - After 5 consecutive failed login attempts, accounts are locked for 15 minutes.
  - Progressive rate limiting allows max 5 login attempts per 5-minute sliding window per IP.

---

### 3. Multi-Factor Authentication (MFA / 2FA)

- **Standard:** RFC 6238 Time-Based One-Time Password (TOTP) algorithm using HMAC-SHA1 with 30-second time steps.
- **Clock Drift Tolerance:** Verified against `[-1, 0, +1]` time windows (90-second validity window).
- **Single-Use Recovery Codes:**
  - Upon 2FA initialization, 8 cryptographically unique recovery codes (format: `XXXXXX-XXXXXX`) are generated.
  - Recovery codes are stored strictly as SHA-256 hashes in the database.
  - When consumed, the hash is atomically removed from the active list.

---

### 4. Role-Based Access Control (RBAC) Hierarchy

Permissions are verified on the **SERVER** on every route handler and cannot be bypassed by client-side manipulation:

| Role | Rank | Access Rights |
|---|---|---|
| `SUPER_ADMIN` | 4 | Complete root access; create/delete users; database backups & resets; security settings |
| `ADMIN` | 3 | Manage products, site settings, certificates, view audit logs, export CSV/JSON |
| `EDITOR` | 2 | Add/edit products, manage page builder sections, update dealer pins, publish news |
| `SALES_SUPPORT` | 1 | Read/update merchandise orders, view and triage inbound RFQs and submissions |

---

### 5. Session Hardening & Cookie Security

- **Session Tokens:** 256-bit cryptographically random tokens (`crypto.randomBytes(32)`).
- **Cookie Flags:**
  - `HttpOnly`: Strictly prevents client JavaScript (XSS) from reading session cookies.
  - `SameSite=Strict`: Prevents Cross-Site Request Forgery (CSRF) on state-changing requests.
  - `Path=/`: Limits session scope to the application root.
  - `Max-Age`: Absolute 8-hour lifetime; server-side session revocation table immediately terminates revoked sessions.

---

### 6. Statutory Arms Procurement Compliance Guardrails

In compliance with the **Pakistan Arms Ordinance 1965** and **Khyber Pakhtunkhwa Arms Rules 2014**:
1. **Zero Online Firearm Checkout:** Regulated small arms, mortars, and munitions CANNOT be checked out online. Any attempt to pass regulated arms SKUs to `/api/orders` is blocked by server validation (`HTTP 400`).
2. **Authorized Procurement Process:** Weapons procurement is handled strictly via physical in-person verification of Ministry of Interior / NADRA licenses or official defense procurement contracts.
3. **Merchandise Only:** Cart checkout is restricted strictly to non-restricted apparel and collector merchandise in Pakistani Rupees (PKR ₨).

---

### 7. Security Headers & Defense Headers

Every response includes the following defense headers:
- `X-Frame-Options: SAMEORIGIN` (prevents UI clickjacking)
- `X-Content-Type-Options: nosniff` (prevents MIME-type confusion attacks)
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Content-Security-Policy`: Restricts scripts and styles to self and vetted CDNs.

---

### 8. Vulnerability Reporting

If you identify a potential security vulnerability within the Daudsons Armoury digital infrastructure, please notify the security team:
- **Email:** `security@daudsons.com` / `admin@daudsons.com`
- **PGP Encryption:** Available upon request.
- **Coordinated Disclosure:** We request 30 days to resolve reported issues prior to public disclosure.
