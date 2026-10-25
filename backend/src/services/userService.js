import bcrypt from 'bcrypt';
import { pool } from '../db/pool.js';
import { AppError } from '../utils/AppError.js';
import { toPublicUser } from './authService.js';

export async function listUsers({ page, limit, search, role, status }) {
  const where = [];
  const params = [];
  const add = (sql, value) => {
    params.push(value);
    where.push(sql.replaceAll('$?', `$${params.length}`));
  };

  if (search) {
    const like = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
    add('(name ILIKE $? OR email ILIKE $?)', like);
  }
  if (role) add('role = $?', role);
  if (status) add('status = $?', status);

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const countRes = await pool.query(`SELECT COUNT(*)::int AS total FROM users ${whereSql}`, params);
  const total = countRes.rows[0].total;

  const { rows } = await pool.query(
    `SELECT * FROM users ${whereSql}
     ORDER BY created_at DESC, id DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, (page - 1) * limit]
  );

  return {
    items: rows.map(toPublicUser),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function updateUser(targetId, actorId, data) {
  if (targetId === actorId) {
    throw new AppError(409, 'CANNOT_MODIFY_SELF', 'You cannot change your own role or status');
  }

  const { rows } = await pool.query(
    `UPDATE users
     SET role = COALESCE($1, role), status = COALESCE($2, status), updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [data.role ?? null, data.status ?? null, targetId]
  );
  if (!rows[0]) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  return toPublicUser(rows[0]);
}

export async function updateProfile(userId, { name, currentPassword, newPassword }) {
  const found = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  const user = found.rows[0];

  let passwordHash = user.password_hash;
  if (newPassword) {
    const ok = await bcrypt.compare(currentPassword, user.password_hash);
    if (!ok) throw new AppError(400, 'INVALID_PASSWORD', 'Current password is incorrect');
    passwordHash = await bcrypt.hash(newPassword, 10);
  }

  const { rows } = await pool.query(
    `UPDATE users SET name = $1, password_hash = $2, updated_at = NOW()
     WHERE id = $3 RETURNING *`,
    [name, passwordHash, userId]
  );
  return toPublicUser(rows[0]);
}