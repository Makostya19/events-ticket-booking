import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, qs } from '../../api/client.js';
import BookingsTable from '../../components/BookingsTable.jsx';
import Pagination from '../../components/Pagination.jsx';
import { EmptyState, ErrorMessage } from '../../components/States.jsx';

const PAGE_SIZE = 10;
const STATUSES = [
  ['', 'All'],
  ['confirmed', 'Confirmed'],
  ['cancelled', 'Cancelled'],
];
const SORTS = [
  ['created_desc', 'Newest bookings'],
  ['created_asc', 'Oldest bookings'],
  ['event_date_asc', 'Event date: soonest'],
  ['event_date_desc', 'Event date: latest'],
];

export default function AdminBookings() {
  const [params, setParams] = useSearchParams();
  const [state, setState] = useState({ key: null, data: null, error: null });
  const [reload, setReload] = useState(0);

  const paramsString = params.toString();
  const key = `${paramsString}|${reload}`;
  const loading = state.key !== key;
  const status = params.get('status') || '';
  const sort = params.get('sort') || 'created_desc';
  const eventId = params.get('eventId') || '';
  const userId = params.get('userId') || '';

  const update = (patch, { keepPage = false } = {}) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      if (!keepPage) next.delete('page');
      return next;
    });
  };

  useEffect(() => {
    let active = true;
    const query = Object.fromEntries(new URLSearchParams(paramsString));
    api(`/api/admin/bookings${qs({ ...query, limit: PAGE_SIZE })}`)
      .then((data) => active && setState({ key, data, error: null }))
      .catch((error) => active && setState({ key, data: null, error }));
    return () => {
      active = false;
    };
  }, [key, paramsString]);

  const data = state.data;

  return (
    <>
      <div className="toolbar">
        <div className="seg" role="group" aria-label="Filter by status">
          {STATUSES.map(([value, label]) => (
            <button
              key={value || 'all'}
              type="button"
              className={status === value ? 'active' : ''}
              aria-pressed={status === value}
              onClick={() => update({ status: value })}
            >
              {label}
            </button>
          ))}
        </div>
        <select
          className="select select-sm"
          value={sort}
          onChange={(e) => update({ sort: e.target.value === 'created_desc' ? '' : e.target.value })}
          aria-label="Sort bookings"
        >
          {SORTS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {(eventId || userId) && (
        <div className="filter-chips">
          {eventId && <span className="chip chip-static">Event #{eventId}</span>}
          {userId && <span className="chip chip-static">User #{userId}</span>}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => update({ eventId: '', userId: '' })}>
            Clear
          </button>
        </div>
      )}

      {loading && !data && (
        <div className="list" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 64 }} />
          ))}
        </div>
      )}

      {!loading && state.error && (
        <ErrorMessage error={state.error} onRetry={() => setReload((n) => n + 1)} />
      )}

      {data && data.total === 0 && (
        <EmptyState emoji="🎟️" title="No bookings found" text="Try changing the filters." />
      )}

      {data && data.items.length > 0 && (
        <>
          <BookingsTable items={data.items} loading={loading} />
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            onChange={(p) => update({ page: String(p) }, { keepPage: true })}
          />
        </>
      )}
    </>
  );
}