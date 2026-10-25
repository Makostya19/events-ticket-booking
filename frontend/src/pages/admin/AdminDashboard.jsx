import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import BookingsTable from '../../components/BookingsTable.jsx';
import { EmptyState, ErrorMessage } from '../../components/States.jsx';
import { formatPrice } from '../../utils/format.js';

export default function AdminDashboard() {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    api('/api/admin/dashboard')
      .then((data) => active && setState({ status: 'ready', data, error: null }))
      .catch((error) => active && setState({ status: 'error', data: null, error }));
    return () => {
      active = false;
    };
  }, [reload]);

  if (state.status === 'loading') {
    return (
      <div aria-busy="true">
        <div className="stats">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton" style={{ height: 96 }} />
          ))}
        </div>
        <div className="skeleton" style={{ height: 220 }} />
      </div>
    );
  }

  if (state.status === 'error') {
    return <ErrorMessage error={state.error} onRetry={() => setReload((n) => n + 1)} />;
  }

  const d = state.data;
  const cards = [
    ['Registered users', d.totalUsers, ''],
    ['Total events', d.totalEvents, ''],
    ['Published events', d.publishedEvents, ''],
    ['Total bookings', d.totalBookings, `${d.confirmedBookings} active`],
    ['Tickets sold', d.ticketsSold, ''],
    ['Estimated revenue', formatPrice(d.revenue), 'from active bookings'],
  ];

  return (
    <>
      <div className="stats">
        {cards.map(([label, value, hint]) => (
          <div key={label} className="stat">
            <div className="stat-label">{label}</div>
            <div className="stat-value">{value}</div>
            {hint && <div className="stat-hint">{hint}</div>}
          </div>
        ))}
      </div>

      <section className="block">
        <div className="block-head">
          <h2 className="block-title">Recent bookings</h2>
          <Link to="/admin/bookings" className="link">
            All bookings →
          </Link>
        </div>
        {d.recentBookings.length === 0 ? (
          <EmptyState emoji="🎟️" title="No bookings yet" text="Bookings will show up here." />
        ) : (
          <BookingsTable items={d.recentBookings} />
        )}
      </section>
    </>
  );
}