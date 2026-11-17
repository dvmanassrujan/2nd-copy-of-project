/**
 * KSIT CSE (ICB) Portal - Authentication & Security Module
 * Industry-standard PBKDF2 Salted Hashing & Cryptographic Session Tokens
 */

const crypto = require('crypto');

const SESSION_SECRET = process.env.SESSION_SECRET || 'ksit_cse_icb_super_secret_jwt_hmac_key_2026';

/**
 * Hash password with PBKDF2 and random salt
 */
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  if (!password) return '';
  const hash = crypto.pbkdf2Sync(String(password), salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify password against stored hash (supports auto-upgrade from legacy plaintext)
 */
function verifyPassword(password, storedHash) {
  if (!password || !storedHash) return false;
  
  // If stored as salt:hash
  if (storedHash.includes(':')) {
    const [salt, originalHash] = storedHash.split(':');
    const hash = crypto.pbkdf2Sync(String(password), salt, 100000, 64, 'sha512').toString('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
    } catch (e) {
      return false;
    }
  }

  // Fallback for initial unhashed seed passwords
  return password === storedHash;
}

/**
 * Normalize Date of Birth into YYYY-MM-DD
 * Supports: YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY
 */
function normalizeDob(dob) {
  if (!dob) return null;
  const str = String(dob).trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const parts = str.split(/[-/.]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY/MM/DD
      const [year, month, day] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    } else if (parts[2].length === 4) {
      // DD/MM/YYYY
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  // Native Date parsing fallback
  const d = new Date(dob);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }

  return null;
}

/**
 * Hash DOB securely so it is not stored as plain text
 */
function hashDob(dob) {
  const norm = normalizeDob(dob);
  if (!norm) return null;
  return hashPassword(norm);
}

/**
 * Verify DOB against student record
 */
function verifyDob(inputDob, studentRecordOrHash) {
  if (!inputDob || !studentRecordOrHash) return false;
  const normalizedInput = normalizeDob(inputDob);
  if (!normalizedInput) return false;

  if (typeof studentRecordOrHash === 'string') {
    if (studentRecordOrHash.includes(':')) {
      return verifyPassword(normalizedInput, studentRecordOrHash);
    }
    return normalizedInput === normalizeDob(studentRecordOrHash);
  }

  // If dob_hash exists
  if (studentRecordOrHash.dob_hash) {
    return verifyPassword(normalizedInput, studentRecordOrHash.dob_hash);
  }

  // If plaintext dob exists in record
  if (studentRecordOrHash.dob) {
    const recordNorm = normalizeDob(studentRecordOrHash.dob);
    return normalizedInput === recordNorm;
  }

  return false;
}

/**
 * Normalize Indian 10-digit mobile number
 */
function normalizePhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

/**
 * Create HMAC-SHA256 Signed Session Token
 */
function createSessionToken(payload, rememberMe = false) {
  const expDuration = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 30 days vs 24 hours
  const exp = Date.now() + expDuration;

  const data = {
    ...payload,
    exp
  };

  const payloadBase64 = Buffer.from(JSON.stringify(data)).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payloadBase64).digest('base64url');

  return `${payloadBase64}.${signature}`;
}

/**
 * Verify HMAC-SHA256 Signed Session Token
 */
function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadBase64, signature] = parts;
  const expectedSignature = crypto.createHmac('sha256', SESSION_SECRET).update(payloadBase64).digest('base64url');

  try {
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
    if (!payload.exp || Date.now() > payload.exp) {
      return null; // Expired
    }

    return payload;
  } catch (e) {
    return null;
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  normalizeDob,
  hashDob,
  verifyDob,
  normalizePhone,
  createSessionToken,
  verifySessionToken
};
