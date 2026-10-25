import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';
import { AppError } from '../utils/AppError.js';

export const toPublicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  status: u.status,
  createdAt: u.created_at,
});

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

export async function getUserById(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function register({ name, email, password }) {
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rowCount > 0) {
    throw new AppError(409, 'EMAIL_TAKEN', 'Email is already registered');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3) RETURNING *`,
    [name, email, passwordHash]
  );

  const user = rows[0];
  return { user: toPublicUser(user), token: signToken(user) };
}

export async function login({ email, password }) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];

  const valid = user && (await bcrypt.compare(password, user.password_hash));
  if (!valid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }
  if (user.status === 'blocked') {
    throw new AppError(403, 'ACCOUNT_BLOCKED', 'Your account has been blocked');
  }

  return { user: toPublicUser(user), token: signToken(user) };
}