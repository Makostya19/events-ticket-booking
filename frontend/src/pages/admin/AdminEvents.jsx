import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, qs } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import Pagination from '../../components/Pagination.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { EmptyState, ErrorMessage } from '../../components/States.jsx';
import {
  categoryEmoji,
  categoryHue,
  formatDateTime,
  formatPrice,
  imageSrc,
} from '../../utils/format.js';

const PAGE_SIZE = 8;

const STATUS_OPTIONS = [
  ['', 'All statuses'],
  ['draft', 'Draft'],
  ['published', 'Published'],
  ['cancelled', 'Cancelled'],
  ['completed', 'Completed'],
];

const SORTS = [
  ['newest', 'Newest'],
  ['date_asc', 'Event date'],
  ['price_asc', 'Price: low to high'],
  ['price_desc', 'Price: high to low'],
];

const MODALS = {
  cancel: {
    title: 'Cancel this event?',
    text: (e) =>
      `“${e.title}” will be cancelled. All confirmed bookings will be cancelled and the tickets released. This can’t be undone.`,
    confirm: 'Cancel event',
    keep: 'Keep event',
    danger: true,
    status: 'cancelled',
    done: 'Event cancelled',
  },
  complete: {
    title: 'Mark as completed?',
    text: (e) => `“${e.title}” will be closed for new bookings. This can’t be undone.`,
    confirm: 'Mark completed',
    keep: 'Not yet',
    danger: false,
    status: 'completed',
    done: 'Event marked as completed',
  },
  delete: {
    title: 'Delete this event?',
    text: (e) =>
      `“${e.title}” will be permanently deleted. Events with active bookings can’t be deleted: cancel them instead.`,
    confirm: 'Delete event',
    keep: 'Keep event',
    danger: true,
    done: 'Event deleted',
  },
};

export default function AdminEvents() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [state, setState] = useState({ key: null, data: null, error: null });
  const [reload, setReload] = useState(0);
  const [action, setAction] = useState(null);
  const [busy, setBusy] = useState(false);
  const [searchText, setSearchText] = useState(params.get('search') || '');

  const paramsString = params.toString();
  const key = `${paramsString}|${reload}`;
  const loading = state.key !== key;
  const status = params.get('status') || '';
  const sort = params.get('sort') || 'newest';
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
    api(`/api/admin/events${qs({ ...query, limit: PAGE_SIZE })}`)
      .then((data) => active && setState({ key, data, error: null }))
      .catch((error) => active && setState({ key, data: null, error }));
    return () => {
      active = false;
    };
  }, [key, paramsString]);

  // поиск обновляет адрес с небольшой задержкой, пока человек печатает
  useEffect(() => {
    if (searchText.trim() === (params.get('search') || '')) return;
    const timer = setTimeout(() => update({ search: searchText.trim() }), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  const data = state.data;

  // страница опустела после удаления: возвращаемся на последнюю существующую
  useEffect(() => {
    if (data && data.items.length === 0 && data.total > 0 && page > 1) {
      update({ page: String(data.totalPages) }, { keepPage: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const publish = async (event) => {
    try {
      await api(`/api/admin/events/${event.id}/status`, {
        method: 'PATCH',
        body: { status: 'published' },
      });
      toast.success('Event published');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setReload((n) => n + 1);
    }
  };

  const runAction = async () => {
    const { type, event } = action;
    const cfg = MODALS[type];
    setBusy(true);
    try {
      if (type === 'delete') {
        await api(`/api/admin/events/${event.id}`, { method: 'DELETE' });
      } else {
        await api(`/api/admin/events/${event.id}/status`, {
          method: 'PATCH',
          body: { status: cfg.status },
        });
      }
      toast.success(cfg.done);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
      setAction(null);
      setReload((n) => n + 1);
    }
  };

  const modal = action ? MODALS[action.type] : null;

  return (
    <>
      <div className="admin-bar">
        <input
          type="search"
          className="input searchbar"
          placeholder="Search events"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          aria-label="Search events"
        />
        <select
          className="select select-sm"
          value={status}
          onChange={(e) => update({ status: e.target.value })}
          aria-label="Filter by status"
        >
          {STATUS_OPTIONS.map(([value, label]) => (
            <option key={value || 'all'} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          className="select select-sm"
          value={sort}
          onChange={(e) => update({ sort: e.target.value === 'newest' ? '' : e.target.value })}
          aria-label="Sort events"
        >
          {SORTS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <Link to="/admin/events/new" className="btn btn-primary btn-sm">
          + New event
        </Link>
      </div>

      {loading && !data && (
        <div className="list" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 76 }} />
          ))}
        </div>
      )}

      {!loading && state.error && (
        <ErrorMessage error={state.error} onRetry={() => setReload((n) => n + 1)} />
      )}

      {data && data.total === 0 && (
        <EmptyState emoji="📅" title="No events found" text="Try changing the filters or create a new event.">
          <Link to="/admin/events/new" className="btn btn-primary">
            Create event
          </Link>
        </EmptyState>
      )}

      {data && data.items.length > 0 && (
        <>
          <div className={`table-wrap ${loading ? 'is-loading' : ''}`}>
            <table className="table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th className="num">Tickets</th>
                  <th className="num">Price</th>
                  <th className="num">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((e) => {
                  const img = imageSrc(e.imageUrl);
                  const locked = e.status === 'cancelled' || e.status === 'completed';
                  return (
                    <tr key={e.id}>
                      <td data-label="Event">
                        <div className="event-cell">
                          <div className="cover thumb" style={{ '--hue': categoryHue(e.category) }}>
                            {img ? (
                              <img src={img} alt="" loading="lazy" />
                            ) : (
                              <span className="cover-emoji" aria-hidden="true">
                                {categoryEmoji(e.category)}
                              </span>
                            )}
                          </div>
                          <div>
                            <Link to={`/admin/events/${e.id}/edit`} className="cell-main">
                              {e.title}
                            </Link>
                            <span className="cell-sub">
                              {e.category} · {e.venue}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td data-label="Date">{formatDateTime(e.startsAt)}</td>
                      <td data-label="Status">
                        <StatusBadge status={e.status} />
                      </td>
                      <td data-label="Tickets" className="num">
                        {e.availableTickets} / {e.totalTickets}
                      </td>
                      <td data-label="Price" className="num">
                        {formatPrice(e.price)}
                      </td>
                      <td data-label="Actions">
                        <div className="row-actions">
                          <Link to={`/admin/events/${e.id}/edit`} className="btn btn-outline btn-sm">
                            {locked ? 'View' : 'Edit'}
                          </Link>
                          <Link to={`/admin/bookings?eventId=${e.id}`} className="btn btn-outline btn-sm">
                            Bookings
                          </Link>
                          {e.status === 'draft' && (
                            <button type="button" className="btn btn-outline btn-sm" onClick={() => publish(e)}>
                              Publish
                            </button>
                          )}
                          {e.status === 'published' && (
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => setAction({ type: 'complete', event: e })}
                            >
                              Complete
                            </button>
                          )}
                          {(e.status === 'draft' || e.status === 'published') && (
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => setAction({ type: 'cancel', event: e })}
                            >
                              Cancel
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => setAction({ type: 'delete', event: e })}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            onChange={(p) => update({ page: String(p) }, { keepPage: true })}
          />
        </>
      )}

      <ConfirmModal
        open={Boolean(action)}
        danger={modal?.danger}
        busy={busy}
        title={modal?.title || ''}
        text={action ? modal.text(action.event) : ''}
        confirmLabel={modal?.confirm}
        cancelLabel={modal?.keep}
        onConfirm={runAction}
        onCancel={() => setAction(null)}
      />
    </>
  );
}