import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from './AuthContext.jsx';
import { useToast } from './ToastContext.jsx';

const FavoritesContext = createContext(null);
const EMPTY = new Set();

export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const [state, setState] = useState({ userId: null, ids: EMPTY });

  const isCustomer = user?.role === 'customer';
  const userId = user?.id ?? null;
  const loaded = state.userId === userId;
  const ids = isCustomer && loaded ? state.ids : EMPTY;
  const ready = !isCustomer || loaded;

  useEffect(() => {
    if (!isCustomer) return;
    let active = true;
    api('/api/favorites/ids')
      .then((data) => active && setState({ userId, ids: new Set(data.eventIds) }))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isCustomer, userId]);

  const has = useCallback((eventId) => ids.has(eventId), [ids]);

  const toggle = useCallback(
    async (eventId) => {
      const wasFavorite = ids.has(eventId);
      const next = new Set(ids);
      if (wasFavorite) next.delete(eventId);
      else next.add(eventId);
      setState({ userId, ids: next });

      try {
        await api(`/api/favorites/${eventId}`, { method: wasFavorite ? 'DELETE' : 'POST' });
      } catch (err) {
        setState({ userId, ids });
        toast.error(err.message);
      }
    },
    [ids, userId, toast]
  );

  const value = useMemo(() => ({ has, toggle, ready }), [has, toggle, ready]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  return useContext(FavoritesContext);
}