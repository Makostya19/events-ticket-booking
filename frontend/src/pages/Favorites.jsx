import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, qs } from '../api/client.js';
import { useFavorites } from '../context/FavoritesContext.jsx';
import EventCard from '../components/EventCard.jsx';
import Pagination from '../components/Pagination.jsx';
import { EmptyState, ErrorMessage, EventGridSkeleton } from '../components/States.jsx';

const PAGE_SIZE = 6;

export default function Favorites() {
  const { ready, has } = useFavorites();
  const [params, setParams] = useSearchParams();
  const [state, setState] = useState({ key: null, data: null, error: null });
  const [reload, setReload] = useState(0);

  const page = Math.max(1, Number(params.get('page')) || 1);
  const key = `${page}|${reload}`;
  const loading = state.key !== key;

  useEffect(() => {
    let active = true;
    api(`/api/favorites${qs({ page, limit: PAGE_SIZE })}`)
      .then((data) => active && setState({ key, data, error: null }))
      .catch((error) => active && setState({ key, data: null, error }));
    return () => {
      active = false;
    };
  }, [key, page]);

  const data = state.data;

  // убранные из избранного карточки скрываем сразу, не дожидаясь перезагрузки
  const items = data ? (ready ? data.items.filter((e) => has(e.id)) : data.items) : [];
  const removed = data ? data.items.length - items.length : 0;
  const allRemoved = Boolean(data) && data.items.length > 0 && items.length === 0;
  const outOfRange = Boolean(data) && data.items.length === 0 && data.total > 0;

  useEffect(() => {
    if (outOfRange) {
      setParams({ page: String(data.totalPages) });
    } else if (allRemoved) {
      if (page > 1) setParams({ page: String(page - 1) });
      else setReload((n) => n + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRemoved, outOfRange]);

  const total = data ? Math.max(0, data.total - removed) : 0;

  return (
    <>
      <div className="toolbar">
        <span className="toolbar-count">
          {data ? `${total} saved event${total === 1 ? '' : 's'}` : 'Loading…'}
        </span>
      </div>

      {loading && !data && <EventGridSkeleton count={PAGE_SIZE} />}

      {!loading && state.error && (
        <ErrorMessage error={state.error} onRetry={() => setReload((n) => n + 1)} />
      )}

      {data && data.total === 0 && (
        <EmptyState emoji="💜" title="No favorites yet" text="Tap the heart on any event to save it here.">
          <Link to="/events" className="btn btn-primary">
            Browse events
          </Link>
        </EmptyState>
      )}

      {data && items.length > 0 && (
        <>
          <div className={`grid ${loading ? 'is-loading' : ''}`}>
            {items.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            onChange={(p) => setParams({ page: String(p) })}
          />
        </>
      )}
    </>
  );
}