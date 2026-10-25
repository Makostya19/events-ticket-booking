import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, qs } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import BookingCard from '../components/BookingCard.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import Pagination from '../components/Pagination.jsx';
import { EmptyState, ErrorMessage } from '../components/States.jsx';
import { formatDateTime } from '../utils/format.js';

const PAGE_SIZE = 6;
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

export default function MyBookings() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [state, setState] = useState({ key: null, data: null, error: null });
  const [reload, setReload] = useState(0);
  const [target, setTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const paramsString = params.toString();
  const key = `${paramsString}|${reload}`;
  const loading = state.key !== key;
  const status = params.get('status') || '';
  const sort = params.get('sort') || 'created_desc';
  const page = Math.max(1, Number(params.get('page')) || 1);

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
    api(`/api/bookings/my${qs({ ...query, limit: PAGE_SIZE })}`)
      .then((data) => active && setState({ key, data, error: null }))
      .catch((error) => active && setState({ key, data: null, error }));
    return () => {
      active = false;
    };
  }, [key, paramsString]);

  const data = state.data;

  // страница опустела после отмены: возвращаемся на последнюю существующую
  useEffect(() => {
    if (data && data.items.length === 0 && data.total > 0 && page > 1) {
      update({ page: String(data.totalPages) }, { keepPage: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const confirmCancel = async () => {
    setCancelling(true);
    try {
      await api(`/api/bookings/${target.id}/cancel`, { method: 'PATCH' });
      toast.success('Booking cancelled');
      setTarget(null);
    } catch (err) {
      toast.error(err.message);
      setTarget(null);
    } finally {
      setCancelling(false);
      setReload((n) => n + 1);
    }
  };

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

      {loading && !data && (
        <div className="list" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: 118 }} />
          ))}
        </div>
      )}

      {!loading && state.error && (
        <ErrorMessage error={state.error} onRetry={() => setReload((n) => n + 1)} />
      )}

      {data && data.total === 0 && (
        <EmptyState
          emoji="🎟️"
          title={status ? 'No bookings with this status' : 'No bookings yet'}
          text={status ? 'Try another filter.' : 'Find an event you like and book your first tickets.'}
        >
          {!status && (
            <Link to="/events" className="btn btn-primary">
              Browse events
            </Link>
          )}
        </EmptyState>
      )}

      {data && data.items.length > 0 && (
        <>
          <div className={`list ${loading ? 'is-loading' : ''}`}>
            {data.items.map((b) => (
              <BookingCard key={b.id} booking={b} onCancel={setTarget} />
            ))}
          </div>
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            onChange={(p) => update({ page: String(p) }, { keepPage: true })}
          />
        </>
      )}

      <ConfirmModal
        open={Boolean(target)}
        danger
        busy={cancelling}
        title="Cancel this booking?"
        text={
          target
            ? `${target.quantity} ticket${target.quantity > 1 ? 's' : ''} for “${target.event.title}” on ${formatDateTime(target.event.startsAt)} will be released.`
            : ''
        }
        confirmLabel="Cancel booking"
        onConfirm={confirmCancel}
        onCancel={() => setTarget(null)}
      />
    </>
  );
}