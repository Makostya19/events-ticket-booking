import { pool } from '../db/pool.js';
import { withTransaction } from '../db/transaction.js';
import { AppError } from '../utils/AppError.js';

const SORTS = {
  created_desc: 'b.created_at DESC, b.id DESC',
  created_asc: 'b.created_at ASC, b.id ASC',
  event_date_asc: 'e.starts_at ASC, b.id ASC',
  event_date_desc: 'e.starts_at DESC, b.id DESC',
};

export const BOOKING_SELECT = `
  SELECT b.*,
         e.title AS event_title, e.starts_at AS event_starts_at, e.city AS event_city,
         e.venue AS event_venue, e.image_url AS event_image_url, e.status AS event_status,
         u.name AS user_name, u.email AS user_email
  FROM bookings b
  JOIN events e ON e.id = b.event_id
  JOIN users u ON u.id = b.user_id`;

export const toBooking = (b) => ({
  id: b.id,
  userId: b.user_id,
  eventId: b.event_id,
  quantity: b.quantity,
  totalPrice: Number(b.total_price),
  status: b.status,
  createdAt: b.created_at,
  updatedAt: b.updated_at,
  event: {
    title: b.event_title,
    startsAt: b.event_starts_at,
    city: b.event_city,
    venue: b.event_venue,
    imageUrl: b.event_image_url,
    status: b.event_status,
  },
  user: { name: b.user_name, email: b.user_email },
});

async function fetchBooking(id) {
  const { rows } = await pool.query(`${BOOKING_SELECT} WHERE b.id = $1`, [id]);
  return rows[0] ? toBooking(rows[0]) : null;
}

export async function createBooking(userId, { eventId, quantity }) {
  const bookingId = await withTransaction(async (client) => {
    const { rows } = await client.query('SELECT * FROM events WHERE id = $1 FOR UPDATE', [eventId]);
    const event = rows[0];

    if (!event || event.status === 'draft') {
      throw new AppError(404, 'EVENT_NOT_FOUND', 'Event not found');
    }
    if (event.status !== 'published') {
      throw new AppError(409, 'EVENT_NOT_BOOKABLE', `Cannot book a ${event.status} event`);
    }
    if (new Date(event.starts_at) <= new Date()) {
      throw new AppError(409, 'EVENT_STARTED', 'This event has already started');
    }
    if (quantity > event.available_tickets) {
      throw new AppError(
        409,
        'NOT_ENOUGH_TICKETS',
        event.available_tickets === 0
          ? 'This event is sold out'
          : `Only ${event.available_tickets} ticket(s) left`
      );
    }

    await client.query(
      'UPDATE events SET available_tickets = available_tickets - $1, updated_at = NOW() WHERE id = $2',
      [quantity, eventId]
    );

    const inserted = await client.query(
      `INSERT INTO bookings (user_id, event_id, quantity, total_price)
       SELECT $1::int, id, $2::int, price * $2::int FROM events WHERE id = $3
       RETURNING id`,
      [userId, quantity, eventId]
    );
    return inserted.rows[0].id;
  });

  return fetchBooking(bookingId);
}

export async function cancelBooking(bookingId, userId) {
  await withTransaction(async (client) => {
    const found = await client.query(
      'SELECT event_id FROM bookings WHERE id = $1 AND user_id = $2',
      [bookingId, userId]
    );
    if (!found.rows[0]) throw new AppError(404, 'BOOKING_NOT_FOUND', 'Booking not found');

    // порядок блокировок: сначала событие, потом бронь (так же, как при создании)
    const eventRes = await client.query('SELECT * FROM events WHERE id = $1 FOR UPDATE', [
      found.rows[0].event_id,
    ]);
    const bookingRes = await client.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [
      bookingId,
    ]);
    const event = eventRes.rows[0];
    const booking = bookingRes.rows[0];

    if (booking.status !== 'confirmed') {
      throw new AppError(409, 'ALREADY_CANCELLED', 'This booking is already cancelled');
    }
    if (new Date(event.starts_at) <= new Date()) {
      throw new AppError(
        409,
        'EVENT_STARTED',
        'Cannot cancel a booking after the event has started'
      );
    }

    await client.query(
      `UPDATE bookings SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
      [bookingId]
    );
    await client.query(
      'UPDATE events SET available_tickets = available_tickets + $1, updated_at = NOW() WHERE id = $2',
      [booking.quantity, event.id]
    );
  });

  return fetchBooking(bookingId);
}

async function listBookings(filters) {
  const where = [];
  const params = [];
  const add = (sql, value) => {
    params.push(value);
    where.push(sql.replace('$?', `$${params.length}`));
  };

  if (filters.userId) add('b.user_id = $?', filters.userId);
  if (filters.eventId) add('b.event_id = $?', filters.eventId);
  if (filters.status) add('b.status = $?', filters.status);

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { page, limit, sort } = filters;

  const countRes = await pool.query(
    `SELECT COUNT(*)::int AS total FROM bookings b ${whereSql}`,
    params
  );
  const total = countRes.rows[0].total;

  const itemsRes = await pool.query(
    `${BOOKING_SELECT} ${whereSql}
     ORDER BY ${SORTS[sort]}
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, (page - 1) * limit]
  );

  return {
    items: itemsRes.rows.map(toBooking),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export const listMyBookings = (userId, filters) => listBookings({ ...filters, userId });
export const listAllBookings = (filters) => listBookings(filters);