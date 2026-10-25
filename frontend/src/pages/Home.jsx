import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, qs } from '../api/client.js';
import EventCard from '../components/EventCard.jsx';
import { ErrorMessage, EventGridSkeleton } from '../components/States.jsx';

export default function Home() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [state, setState] = useState({ status: 'loading', events: [], categories: [], error: null });
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([
      api(`/api/events${qs({ sort: 'date_asc', limit: 6 })}`),
      api('/api/events/filters'),
    ])
      .then(([events, filters]) => {
        if (active) {
          setState({ status: 'ready', events: events.items, categories: filters.categories, error: null });
        }
      })
      .catch((error) => active && setState({ status: 'error', events: [], categories: [], error }));
    return () => {
      active = false;
    };
  }, [reload]);

  const submit = (e) => {
    e.preventDefault();
    navigate(`/events${qs({ search: search.trim() })}`);
  };

  return (
    <>
      <section className="hero">
        <div className="container">
          <span className="eyebrow">Concerts · Conferences · Workshops · Sports</span>
          <h1>
            Find your next <span className="gradient-text">unforgettable</span> night out
          </h1>
          <p className="hero-sub">
            Discover events in Seoul and book tickets in seconds. Save your favorites and keep all
            your bookings in one place.
          </p>
          <form className="hero-search" onSubmit={submit}>
            <input
              type="search"
              className="input"
              placeholder="Search events, venues or cities"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search events"
            />
            <button type="submit" className="btn btn-primary btn-lg">
              Search
            </button>
          </form>
          {state.categories.length > 0 && (
            <div className="chips">
              {state.categories.map((c) => (
                <Link key={c} to={`/events${qs({ category: c })}`} className="chip">
                  {c}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2 className="section-title">Upcoming events</h2>
            <Link to="/events" className="link">
              View all →
            </Link>
          </div>
          {state.status === 'loading' && <EventGridSkeleton />}
          {state.status === 'error' && (
            <ErrorMessage error={state.error} onRetry={() => setReload((n) => n + 1)} />
          )}
          {state.status === 'ready' && (
            <div className="grid">
              {state.events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}