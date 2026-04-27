import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'expressinease-dev-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';

// ─── Password Utilities ─────────────────────────────────────
export function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

// ─── JWT Utilities ──────────────────────────────────────────
export function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// ─── Referral Code Generator ────────────────────────────────
export function generateReferralCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// ─── Auth Middleware ─────────────────────────────────────────
// Requires valid JWT — rejects if missing or invalid
export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ─── Optional Auth Middleware ────────────────────────────────
// Attaches user if token present, but doesn't reject if missing
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      req.user = verifyToken(token);
    } catch (err) {
      // Invalid token — ignore, treat as unauthenticated
    }
  }
  next();
}

// ─── Admin-Only Middleware ───────────────────────────────────
// Must be used AFTER authMiddleware
export function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
