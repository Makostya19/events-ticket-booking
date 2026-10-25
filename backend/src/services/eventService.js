import { pool } from '../db/pool.js';
import { withTransaction } from '../db/transaction.js';
import { AppError } from '../utils/AppError.js';

const SORTS = {
  newest: 'created_at DESC, id DESC',
  date_asc: 'starts_at ASC, id ASC',
  price_asc: 'price ASC, id ASC',
  price_desc: 'price DESC, id DESC',
};

const TRANSITIONS = {
  draft: ['published', 'cancelled'],
  published: ['cancelled', 'completed'],
  cancelled: [],
  completed: [],
};

export const toEvent = (e) => ({
  id: e.id,
  title: e.title,
  description: e.description,
  category: e.category,
  city: e.city,
  venue: e.venue,
  startsAt: e.starts_at,
  endsAt: e.ends_at,
  price: Number(e.price),
  totalTickets: e.total_tickets,
  availableTickets: e.available_tickets,
  status: e.status,
  imageUrl: e.image_url,
  createdBy: e.created_by,
  createdAt: e.created_at,
  updatedAt: e.updated_at,
});

const notFound = () => new AppError(404, 'EVENT_NOT_FOUND', 'Event not found');

export async function listEvents(filters, { admin = false } = {}) {
  const where = [];
  const params = [];
  const add = (sql, value) => {
    params.push(value);
    where.push(sql.replaceAll('$?', `$${params.length}`));
  };

  if (!admin) where.push(`status = 'published'`);
  else if (filters.status) add('status = $?', filters.status);

  if (filters.search) {
    const like = `%${filters.search.replace(/[\\%_]/g, '\\$&')}%`;
    add('(title ILIKE $? OR description ILIKE $? OR city ILIKE $? OR venue ILIKE $?)', like);
  }
  if (filters.category) add('LOWER(category) = LOWER($?)', filters.category);
  if (filters.city) add('LOWER(city) = LOWER($?)', filters.city);
  if (filters.dateFrom) add('starts_at >= $?', filters.dateFrom);
  if (filters.dateTo) add('starts_at < $?', new Date(filters.dateTo.getTime() + 86400000));
  if (filters.priceMin !== undefined) add('price >= $?', filters.priceMin);
  if (filters.priceMax !== undefined) add('price <= $?', filters.priceMax);

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { page, limit, sort } = filters;

  const countRes = await pool.query(`SELECT COUNT(*)::int AS total FROM events ${whereSql}`, params);
  const total = countRes.rows[0].total;

  const itemsRes = await pool.query(
    `SELECT * FROM events ${whereSql}
     ORDER BY ${SORTS[sort]}
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, (page - 1) * limit]
  );

  return {
    items: itemsRes.rows.map(toEvent),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getFilterOptions() {
  const [categories, cities] = await Promise.all([
    pool.query(`SELECT DISTINCT category FROM events WHERE status = 'published' ORDER BY category`),
    pool.query(`SELECT DISTINCT city FROM events WHERE status = 'published' ORDER BY city`),
  ]);
  return {
    categories: categories.rows.map((r) => r.category),
    cities: cities.rows.map((r) => r.city),
  };
}

export async function getEvent(id, { admin = false } = {}) {
  const { rows } = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
  const event = rows[0];
  if (!event || (!admin && event.status === 'draft')) throw notFound();
  return toEvent(event);
}

export async function createEvent(data, userId) {
  const { rows } = await pool.query(
    `INSERT INTO events
       (title, description, category, city, venue, starts_at, ends_at,
        price, total_tickets, available_tickets, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $10)
     RETURNING *`,
    [
      data.title, data.description, data.category, data.city, data.venue,
      data.startsAt, data.endsAt, data.price, data.totalTickets, userId,
    ]
  );
  return toEvent(rows[0]);
}

export async function updateEvent(id, data) {
  return withTransaction(async (client) => {
    const { rows } = await client.query('SELECT * FROM events WHERE id = $1 FOR UPDATE', [id]);
    const event = rows[0];
    if (!event) throw notFound();

    if (event.status === 'cancelled' || event.status === 'completed') {
      throw new AppError(409, 'EVENT_LOCKED', `A ${event.status} event cannot be edited`);
    }

    if (event.status === 'published' && data.startsAt <= new Date()) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', [
        { field: 'startsAt', message: 'Start date must be in the future for a published event' },
      ]);
    }

    const booked = event.total_tickets - event.available_tickets;
    if (data.totalTickets < booked) {
      throw new AppError(
        409,
        'TICKETS_ALREADY_BOOKED',
        `Total tickets cannot be lower than already booked tickets (${booked})`
      );
    }

    const updated = await client.query(
      `UPDATE events SET
         title = $1, description = $2, category = $3, city = $4, venue = $5,
         starts_at = $6, ends_at = $7, price = $8,
         total_tickets = $9, available_tickets = $10, updated_at = NOW()
       WHERE id = $11
       RETURNING *`,
      [
        data.title, data.description, data.category, data.city, data.venue,
        data.startsAt, data.endsAt, data.price,
        data.totalTickets, data.totalTickets - booked, id,
      ]
    );
    return toEvent(updated.rows[0]);
  });
}

export async function changeStatus(id, status) {
  return withTransaction(async (client) => {
    const { rows } = await client.query('SELECT * FROM events WHERE id = $1 FOR UPDATE', [id]);
    const event = rows[0];
    if (!event) throw notFound();

    if (!TRANSITIONS[event.status].includes(status)) {
      throw new AppError(
        409,
        'INVALID_TRANSITION',
        `Cannot change status from ${event.status} to ${status}`
      );
    }

    if (status === 'published' && new Date(event.starts_at) <= new Date()) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', [
        { field: 'startsAt', message: 'Start date must be in the future to publish' },
      ]);
    }

    let result = (
      await client.query(
        'UPDATE events SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [status, id]
      )
    ).rows[0];

    if (status === 'cancelled') {
      await client.query(
        `UPDATE bookings SET status = 'cancelled', updated_at = NOW()
         WHERE event_id = $1 AND status = 'confirmed'`,
        [id]
      );
      result = (
        await client.query(
          'UPDATE events SET available_tickets = total_tickets WHERE id = $1 RETURNING *',
          [id]
        )
      ).rows[0];
    }

    return toEvent(result);
  });
}

export async function deleteEvent(id) {
  return withTransaction(async (client) => {
    const { rows } = await client.query('SELECT id FROM events WHERE id = $1 FOR UPDATE', [id]);
    if (!rows[0]) throw notFound();

    const active = await client.query(
      `SELECT COUNT(*)::int AS count FROM bookings WHERE event_id = $1 AND status = 'confirmed'`,
      [id]
    );
    if (active.rows[0].count > 0) {
      throw new AppError(
        409,
        'EVENT_HAS_BOOKINGS',
        'Event has active bookings. Cancel or unpublish it instead'
      );
    }

    await client.query(`DELETE FROM bookings WHERE event_id = $1 AND status = 'cancelled'`, [id]);
    await client.query('DELETE FROM events WHERE id = $1', [id]);
  });
}

export async function setEventImage(id, imageUrl) {
  const { rows } = await pool.query(
    'UPDATE events SET image_url = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [imageUrl, id]
  );
  if (!rows[0]) throw notFound();
  return toEvent(rows[0]);
}