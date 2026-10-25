const API = process.env.API_URL || 'http://localhost:5000';
const ADMIN = {
  email: process.env.ADMIN_EMAIL || 'admin@example.com',
  password: process.env.ADMIN_PASSWORD || 'Admin12345',
};
const CUSTOMER = {
  email: process.env.CUSTOMER_EMAIL || 'test@example.com',
  password: process.env.CUSTOMER_PASSWORD || 'password123',
};

const TICKETS = 5;
const ATTEMPTS = 12;

async function call(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function login(creds) {
  const r = await call('/api/auth/login', { method: 'POST', body: creds });
  if (r.status !== 200) throw new Error(`Login failed for ${creds.email}: ${r.data?.message}`);
  return r.data.token;
}

let adminToken;
let eventId;
let failed = false;

try {
  adminToken = await login(ADMIN);
  const customerToken = await login(CUSTOMER);

  const start = new Date(Date.now() + 7 * 86400000);
  const end = new Date(start.getTime() + 3 * 3600000);
  const created = await call('/api/admin/events', {
    method: 'POST',
    token: adminToken,
    body: {
      title: 'Race test event',
      description: 'Temporary event used to test concurrent ticket booking.',
      category: 'Test',
      city: 'Seoul',
      venue: 'Test venue',
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      price: 1000,
      totalTickets: TICKETS,
    },
  });
  if (created.status !== 201) throw new Error(`Could not create event: ${created.data?.message}`);
  eventId = created.data.event.id;

  const published = await call(`/api/admin/events/${eventId}/status`, {
    method: 'PATCH',
    token: adminToken,
    body: { status: 'published' },
  });
  if (published.status !== 200) throw new Error(`Could not publish event: ${published.data?.message}`);

  console.log(`Event #${eventId} has ${TICKETS} tickets. Sending ${ATTEMPTS} bookings at the same time...`);

  const results = await Promise.all(
    Array.from({ length: ATTEMPTS }, () =>
      call('/api/bookings', {
        method: 'POST',
        token: customerToken,
        body: { eventId, quantity: 1 },
      })
    )
  );

  const succeeded = results.filter((r) => r.status === 201).length;
  const rejected = results.filter((r) => r.status === 409).length;
  const other = results.length - succeeded - rejected;

  const after = await call(`/api/admin/events/${eventId}`, { token: adminToken });
  const available = after.data.event.availableTickets;

  console.log(`Succeeded: ${succeeded}, rejected (409): ${rejected}, other: ${other}`);
  console.log(`Tickets available after: ${available}`);

  const checks = [
    [succeeded === TICKETS, `exactly ${TICKETS} bookings succeeded`],
    [rejected === ATTEMPTS - TICKETS, `${ATTEMPTS - TICKETS} bookings were rejected`],
    [available === 0, 'no tickets left, none oversold'],
  ];
  for (const [pass, label] of checks) {
    console.log(`${pass ? 'PASS' : 'FAIL'}: ${label}`);
    if (!pass) failed = true;
  }
} catch (err) {
  console.error('Test error:', err.message);
  failed = true;
} finally {
  if (eventId && adminToken) {
    await call(`/api/admin/events/${eventId}/status`, {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'cancelled' },
    });
    const del = await call(`/api/admin/events/${eventId}`, { method: 'DELETE', token: adminToken });
    console.log(del.status === 200 ? 'Cleanup: test event removed' : `Cleanup failed: ${del.data?.message}`);
  }
  process.exitCode = failed ? 1 : 0;
}