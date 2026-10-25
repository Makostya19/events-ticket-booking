import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, qs } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import Pagination from '../../components/Pagination.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { EmptyState, ErrorMessage } from '../../components/States.jsx';
import { formatLongDate } from '../../utils/format.js';

const PAGE_SIZE = 10;

export default function AdminUsers() {
  const { user: me } = useAuth();
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
  const role = params.get('role') || '';
  const status = params.get('status') || '';

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
    api(`/api/admin/users${qs({ ...query, limit: PAGE_SIZE })}`)
      .then((data) => active && setState({ key, data, error: null }))
      .catch((error) => active && setState({ key, data: null, error }));
    return () => {
      active = false;
    };
  }, [key, paramsString]);

  useEffect(() => {
    if (searchText.trim() === (params.get('search') || '')) return;
    const timer = setTimeout(() => update({ search: searchText.trim() }), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  const patchUser = async (target, body, doneMessage) => {
    try {
      await api(`/api/admin/users/${target.id}`, { method: 'PATCH', body });
      toast.success(doneMessage);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setReload((n) => n + 1);
    }
  };

  const confirmAction = async () => {
    const { kind, user, role: nextRole } = action;
    setBusy(true);
    if (kind === 'role') {
      await patchUser(user, { role: nextRole }, `${user.name} is now ${nextRole === 'admin' ? 'an admin' : 'a customer'}`);
    } else {
      await patchUser(user, { status: 'blocked' }, `${user.name} was blocked`);
    }
    setBusy(false);
    setAction(null);
  };

  const data = state.data;

  let modal = { title: '', text: '', confirm: '', danger: false, keep: 'Cancel' };
  if (action?.kind === 'role') {
    modal = {
      title: 'Change role?',
      text:
        action.role === 'admin'
          ? `${action.user.name} will get full access to the admin panel.`
          : `${action.user.name} will lose admin access and become a regular customer.`,
      confirm: 'Change role',
      danger: action.role !== 'admin',
      keep: 'Cancel',
    };
  } else if (action?.kind === 'block') {
    modal = {
      title: 'Block this user?',
      text: `${action.user.name} will be signed out and won’t be able to log in or book tickets until you unblock them.`,
      confirm: 'Block user',
      danger: true,
      keep: 'Cancel',
    };
  }

  return (
    <>
      <div className="admin-bar">
        <input
          type="search"
          className="input searchbar"
          placeholder="Search by name or email"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          aria-label="Search users"
        />
        <select
          className="select select-sm"
          value={role}
          onChange={(e) => update({ role: e.target.value })}
          aria-label="Filter by role"
        >
          <option value="">All roles</option>
          <option value="customer">Customers</option>
          <option value="admin">Admins</option>
        </select>
        <select
          className="select select-sm"
          value={status}
          onChange={(e) => update({ status: e.target.value })}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

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
        <EmptyState emoji="👥" title="No users found" text="Try changing the search or filters." />
      )}

      {data && data.items.length > 0 && (
        <>
          <div className={`table-wrap ${loading ? 'is-loading' : ''}`}>
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th className="num">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((u) => {
                  const isSelf = u.id === me.id;
                  return (
                    <tr key={u.id}>
                      <td data-label="User">
                        <div>
                          <span className="cell-main">
                            {u.name}
                            {isSelf && <span className="muted"> (you)</span>}
                          </span>
                          <span className="cell-sub">{u.email}</span>
                        </div>
                      </td>
                      <td data-label="Role">
                        <select
                          className="select select-sm"
                          value={u.role}
                          disabled={isSelf}
                          aria-label={`Role for ${u.name}`}
                          onChange={(e) => setAction({ kind: 'role', user: u, role: e.target.value })}
                        >
                          <option value="customer">Customer</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td data-label="Status">
                        <StatusBadge status={u.status} />
                      </td>
                      <td data-label="Joined">{formatLongDate(u.createdAt)}</td>
                      <td data-label="Actions">
                        <div className="row-actions">
                          <Link to={`/admin/bookings?userId=${u.id}`} className="btn btn-outline btn-sm">
                            Bookings
                          </Link>
                          {u.status === 'active' ? (
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm"
                              disabled={isSelf}
                              onClick={() => setAction({ kind: 'block', user: u })}
                            >
                              Block
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => patchUser(u, { status: 'active' }, `${u.name} was unblocked`)}
                            >
                              Unblock
                            </button>
                          )}
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
        danger={modal.danger}
        busy={busy}
        title={modal.title}
        text={modal.text}
        confirmLabel={modal.confirm}
        cancelLabel={modal.keep}
        onConfirm={confirmAction}
        onCancel={() => setAction(null)}
      />
    </>
  );
}