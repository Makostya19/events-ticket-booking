import bcrypt from 'bcrypt';
import { pool } from './pool.js';

const ADMIN = { name: 'Admin', email: 'admin@example.com', password: 'Admin12345' };

const HOUR = 3600000;
const DAY = 24 * HOUR;
const at = (days, hour) => {
  const d = new Date(Date.now() + days * DAY);
  d.setHours(hour, 0, 0, 0);
  return d;
};

const events = [
  ['Seoul Jazz Night', 'An evening of live jazz with local quartets, cocktails and a relaxed standing area.', 'Concert', 'Hongdae Live Club', 5, 19, 3, 35000, 120, 'published'],
  ['Indie Rock Showcase', 'Five up-and-coming indie bands on one stage, with merch tables and an after party.', 'Concert', 'Olympic Hall', 12, 18, 4, 55000, 400, 'published'],
  ['Frontend Summit Seoul', 'A full day of talks on React, performance and design systems from regional engineers.', 'Conference', 'COEX Convention Center', 20, 9, 8, 90000, 250, 'published'],
  ['Startup Pitch Day', 'Twelve early-stage startups pitch to investors, followed by open networking.', 'Conference', 'Gangnam Studio', 28, 13, 5, 40000, 150, 'published'],
  ['Ceramics Workshop', 'Learn wheel throwing and glazing basics, take home two pieces of your own.', 'Workshop', 'Seongsu Craft Studio', 8, 14, 3, 60000, 16, 'published'],
  ['Photography Walk', 'A guided evening photo walk through old Seoul alleys with tips on night shooting.', 'Workshop', 'Ikseon-dong Meeting Point', 15, 17, 3, 25000, 20, 'published'],
  ['City Half Marathon', 'A 21 km road race along the river with timing chips, water stations and medals.', 'Sports', 'Han River Park Yeouido', 35, 7, 4, 45000, 800, 'published'],
  ['Community Football Cup', 'A friendly five-a-side tournament open to amateur teams of all levels.', 'Sports', 'Seoul World Cup Park', 18, 10, 7, 20000, 96, 'published'],
  ['Night Market Festival', 'Street food, handmade goods and live buskers in a three-hour evening market.', 'Local', 'Dongdaemun Design Plaza', 10, 17, 5, 0, 500, 'published'],
  ['Autumn Garden Tour', 'A guided walk through palace gardens with a historian, including tea tasting.', 'Local', 'Changdeokgung Palace', 22, 10, 3, 15000, 40, 'draft'],
];

try {
  const hash = await bcrypt.hash(ADMIN.password, 10);
  const admin = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO UPDATE SET role = 'admin', status = 'active', updated_at = NOW()
     RETURNING id`,
    [ADMIN.name, ADMIN.email, hash]
  );
  const adminId = admin.rows[0].id;

  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM events');
  if (rows[0].count > 0) {
    console.log('Events already exist, skipping events seed');
  } else {
    for (const [title, description, category, venue, days, hour, hours, price, total, status] of events) {
      const startsAt = at(days, hour);
      const endsAt = new Date(startsAt.getTime() + hours * HOUR);
      await pool.query(
        `INSERT INTO events
           (title, description, category, city, venue, starts_at, ends_at,
            price, total_tickets, available_tickets, status, created_by)
         VALUES ($1, $2, $3, 'Seoul', $4, $5, $6, $7, $8, $8, $9, $10)`,
        [title, description, category, venue, startsAt, endsAt, price, total, status, adminId]
      );
    }
    console.log(`Inserted ${events.length} events`);
  }

  console.log(`Admin: ${ADMIN.email} / ${ADMIN.password} (password is set only when the account is first created)`);
} catch (err) {
  console.error('Seed failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}