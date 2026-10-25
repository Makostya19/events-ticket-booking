import { pool } from '../db/pool.js';
import { BOOKING_SELECT, toBooking } from './bookingService.js';

export async function customerDashboard(userId) {
  const [upcoming, recent, stats, favorites] = await Promise.all([
    pool.query(
      `${BOOKING_SELECT}
       WHERE b.user_id = $1 AND b.status = 'confirmed' AND e.starts_at > NOW()
       ORDER BY e.starts_at ASC LIMIT 5`,
      [userId]
    ),
    pool.query(`${BOOKING_SELECT} WHERE b.user_id = $1 ORDER BY b.created_at DESC, b.id DESC LIMIT 5`, [
      userId,
    ]),
    pool.query(
      `SELECT COUNT(*) FILTER (WHERE status = 'confirmed')::int AS confirmed,
              COALESCE(SUM(total_price) FILTER (WHERE status = 'confirmed'), 0) AS spent
       FROM bookings WHERE user_id = $1`,
      [userId]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count
       FROM favorites f JOIN events e ON e.id = f.event_id
       WHERE f.user_id = $1 AND e.status <> 'draft'`,
      [userId]
    ),
  ]);

  return {
    upcomingBookings: upcoming.rows.map(toBooking),
    recentBookings: recent.rows.map(toBooking),
    favoriteCount: favorites.rows[0].count,
    confirmedBookings: stats.rows[0].confirmed,
    totalSpent: Number(stats.rows[0].spent),
  };
}

export async function adminDashboard() {
  const [totals, recent] = await Promise.all([
    pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM users) AS users,
        (SELECT COUNT(*)::int FROM events) AS events,
        (SELECT COUNT(*)::int FROM events WHERE status = 'published') AS published_events,
        (SELECT COUNT(*)::int FROM bookings) AS bookings,
        (SELECT COUNT(*)::int FROM bookings WHERE status = 'confirmed') AS confirmed_bookings,
        (SELECT COALESCE(SUM(quantity), 0)::int FROM bookings WHERE status = 'confirmed') AS tickets_sold,
        (SELECT COALESCE(SUM(total_price), 0) FROM bookings WHERE status = 'confirmed') AS revenue
    `),
    pool.query(`${BOOKING_SELECT} ORDER BY b.created_at DESC, b.id DESC LIMIT 5`),
  ]);

  const t = totals.rows[0];
  return {
    totalUsers: t.users,
    totalEvents: t.events,
    publishedEvents: t.published_events,
    totalBookings: t.bookings,
    confirmedBookings: t.confirmed_bookings,
    ticketsSold: t.tickets_sold,
    revenue: Number(t.revenue),
    recentBookings: recent.rows.map(toBooking),
  };
}