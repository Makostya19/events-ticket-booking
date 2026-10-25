import { pool } from '../db/pool.js';
import { AppError } from '../utils/AppError.js';
import { toEvent } from './eventService.js';

export async function addFavorite(userId, eventId) {
  const event = await pool.query('SELECT status FROM events WHERE id = $1', [eventId]);
  if (!event.rows[0] || event.rows[0].status === 'draft') {
    throw new AppError(404, 'EVENT_NOT_FOUND', 'Event not found');
  }

  const { rows } = await pool.query(
    `INSERT INTO favorites (user_id, event_id) VALUES ($1, $2)
     ON CONFLICT (user_id, event_id) DO NOTHING
     RETURNING id, event_id, created_at`,
    [userId, eventId]
  );
  if (!rows[0]) {
    throw new AppError(409, 'ALREADY_FAVORITED', 'Event is already in favorites');
  }
  return { id: rows[0].id, eventId: rows[0].event_id, createdAt: rows[0].created_at };
}

export async function removeFavorite(userId, eventId) {
  const { rowCount } = await pool.query(
    'DELETE FROM favorites WHERE user_id = $1 AND event_id = $2',
    [userId, eventId]
  );
  if (rowCount === 0) throw new AppError(404, 'FAVORITE_NOT_FOUND', 'Event is not in favorites');
}

export async function listFavorites(userId, { page, limit }) {
  const base = `FROM favorites f
                JOIN events e ON e.id = f.event_id
                WHERE f.user_id = $1 AND e.status <> 'draft'`;

  const countRes = await pool.query(`SELECT COUNT(*)::int AS total ${base}`, [userId]);
  const total = countRes.rows[0].total;

  const { rows } = await pool.query(
    `SELECT e.*, f.created_at AS favorited_at ${base}
     ORDER BY f.created_at DESC, f.id DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, (page - 1) * limit]
  );

  return {
    items: rows.map((r) => ({ ...toEvent(r), favoritedAt: r.favorited_at })),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function listFavoriteIds(userId) {
  const { rows } = await pool.query('SELECT event_id FROM favorites WHERE user_id = $1', [userId]);
  return rows.map((r) => r.event_id);
}