import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import BookingCard from '../components/BookingCard.jsx';
import { EmptyState, ErrorMessage } from '../components/States.jsx';
import { formatPrice } from '../utils/format.js';

export default function AccountHome() {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    api('/api/dashboard/my')
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
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: 96 }} />
          ))}
        </div>
        <div className="skeleton" style={{ height: 120 }} />
      </div>
    );
  }

  if (state.status === 'error') {
    return <ErrorMessage error={state.error} onRetry={() => setReload((n) => n + 1)} />;
  }

  const d = state.data;

  return (
    <>
      <div className="stats">
        <div className="stat">
          <div className="stat-label">Active bookings</div>
          <div className="stat-value">{d.confirmedBookings}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Favorite events</div>
          <div className="stat-value">{d.favoriteCount}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Total spent</div>
          <div className="stat-value">{formatPrice(d.totalSpent)}</div>
        </div>
      </div>

      <section className="block">
        <div className="block-head">
          <h2 className="block-title">Upcoming events</h2>
          <Link to="/account/bookings" className="link">
            All bookings →
          </Link>
        </div>
        {d.upcomingBookings.length === 0 ? (
          <EmptyState emoji="🎟️" title="No upcoming events" text="Book tickets and they will show up here.">
            <Link to="/events" className="btn btn-primary">
              Browse events
            </Link>
          </EmptyState>
        ) : (
          <div className="list">
            {d.upcomingBookings.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </div>
        )}
      </section>

      {d.recentBookings.length > 0 && (
        <section className="block">
          <div className="block-head">
            <h2 className="block-title">Recent bookings</h2>
          </div>
          <div className="list">
            {d.recentBookings.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}