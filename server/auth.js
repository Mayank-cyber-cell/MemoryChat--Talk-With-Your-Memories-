import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import db from './db.js';
import { v4 as uuid } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export function hashPassword(password) {
  return bcryptjs.hashSync(password, 10);
}

export function verifyPassword(password, hash) {
  return bcryptjs.compareSync(password, hash);
}

export function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.userId = decoded.userId;
  next();
}

export function signup(email, password) {
  try {
    const userId = uuid();
    const passwordHash = hashPassword(password);

    const stmt = db.prepare(`
      INSERT INTO users (id, email, password_hash)
      VALUES (?, ?, ?)
    `);
    stmt.run(userId, email, passwordHash);

    const token = generateToken(userId);
    return { success: true, userId, token };
  } catch (e) {
    if (e.message.includes('UNIQUE constraint failed')) {
      return { success: false, error: 'Email already exists' };
    }
    return { success: false, error: e.message };
  }
}

export function login(email, password) {
  const stmt = db.prepare('SELECT id, password_hash FROM users WHERE email = ?');
  const user = stmt.get(email);

  if (!user) {
    return { success: false, error: 'Invalid email or password' };
  }

  if (!verifyPassword(password, user.password_hash)) {
    return { success: false, error: 'Invalid email or password' };
  }

  const token = generateToken(user.id);
  return { success: true, userId: user.id, token };
}
