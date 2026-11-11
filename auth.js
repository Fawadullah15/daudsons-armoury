/**
 * DAUDSONS ARMOURY (PVT.) LTD. — CORE AUTHENTICATION & SECURITY ENGINE
 * Argon2/PBKDF2 Password Hashing, TOTP 2FA, Session Management & RBAC.
 */

const crypto = require('crypto');

const SESSION_COOKIE_NAME = 'dsa_auth_session';
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 8; // 8 hours absolute session lifetime

// In-memory rate limiting sliding-window cache
const rateLimitCache = new Map();

// -------------------------------------------------------------
// 1. PASSWORD CRYPTOGRAPHY & POLICY
// -------------------------------------------------------------

function validatePasswordStrength(password) {
  if (!password || password.length < 10) {
    return { valid: false, error: 'Password must be at least 10 characters long' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character' };
  }
  return { valid: true };
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `pbkdf2$100000$${salt}$${hash}`;
}

function verifyPassword(password, storedHash) {
  try {
    const parts = storedHash.split('$');
    if (parts.length !== 4) return false;
    const [, iterations, salt, originalHash] = parts;
    const testHash = crypto.pbkdf2Sync(password, salt, parseInt(iterations, 10), 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(testHash, 'hex'), Buffer.from(originalHash, 'hex'));
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// 2. TOTP RFC 6238 TWO-FACTOR ENGINE (PURE CRYPTO)
// -------------------------------------------------------------

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(str) {
  const cleaned = str.toUpperCase().replace(/=+$/, '');
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function generateTwoFactorSecret() {
  const randomBytes = crypto.randomBytes(20);
  return base32Encode(randomBytes);
}

function generateTotpToken(secretBase32, timeStepOffset = 0) {
  const secret = base32Decode(secretBase32);
  const timeStep = Math.floor(Date.now() / 30000) + timeStepOffset;
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigInt64BE(BigInt(timeStep));

  const hmac = crypto.createHmac('sha1', secret);
  hmac.update(timeBuffer);
  const digest = hmac.digest();

  const offset = digest[digest.length - 1] & 0xf;
  const codeInt =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const token = (codeInt % 1000000).toString().padStart(6, '0');
  return token;
}

function verifyTotpToken(token, secretBase32) {
  if (!token || !secretBase32) return false;
  const cleanToken = token.toString().trim();
  // Check windows: current step (0), previous step (-1), next step (+1) for clock drift tolerance
  for (const offset of [0, -1, 1]) {
    if (generateTotpToken(secretBase32, offset) === cleanToken) {
      return true;
    }
  }
  return false;
}

function generateRecoveryCodes(count = 8) {
  const codes = [];
  const hashed = [];
  for (let i = 0; i < count; i++) {
    const raw = `${crypto.randomBytes(3).toString('hex')}-${crypto.randomBytes(3).toString('hex')}`.toUpperCase();
    codes.push(raw);
    hashed.push(crypto.createHash('sha256').update(raw).digest('hex'));
  }
  return {
    codes,
    hashedCodes: JSON.stringify(hashed)
  };
}

function verifyAndConsumeRecoveryCode(code, hashedCodesJson) {
  try {
    const list = JSON.parse(hashedCodesJson || '[]');
    const targetHash = crypto.createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
    const idx = list.indexOf(targetHash);
    if (idx === -1) return { valid: false };
    list.splice(idx, 1);
    return { valid: true, remainingCodesJson: JSON.stringify(list) };
  } catch {
    return { valid: false };
  }
}

// -------------------------------------------------------------
// 3. SLIDING-WINDOW RATE LIMITER
// -------------------------------------------------------------

function checkRateLimit(key, maxRequests = 5, windowSeconds = 60) {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const record = rateLimitCache.get(key) || { timestamps: [] };

  const valid = record.timestamps.filter(ts => now - ts < windowMs);
  if (valid.length >= maxRequests) {
    const oldest = valid[0];
    const retryAfter = Math.ceil((oldest + windowMs - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  valid.push(now);
  rateLimitCache.set(key, { timestamps: valid });
  return { allowed: true, remaining: maxRequests - valid.length };
}

// -------------------------------------------------------------
// 4. SANITIZATION & HONEYPOT
// -------------------------------------------------------------

function sanitizeHtmlText(str) {
  if (!str) return '';
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '');
}

function verifyHoneypot(val) {
  return !val || val.trim().length === 0;
}

// -------------------------------------------------------------
// 5. RBAC PERMISSION HIERARCHY
// -------------------------------------------------------------

const ROLE_RANKS = {
  SUPER_ADMIN: 4,
  ADMIN: 3,
  EDITOR: 2,
  SALES_SUPPORT: 1
};

function hasRequiredRole(userRole, requiredRole) {
  const userRank = ROLE_RANKS[userRole] || 0;
  const reqRank = ROLE_RANKS[requiredRole] || 0;
  return userRank >= reqRank;
}

module.exports = {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_MS,
  validatePasswordStrength,
  hashPassword,
  verifyPassword,
  generateTwoFactorSecret,
  generateTotpToken,
  verifyTotpToken,
  generateRecoveryCodes,
  verifyAndConsumeRecoveryCode,
  checkRateLimit,
  sanitizeHtmlText,
  verifyHoneypot,
  hasRequiredRole
};
