import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useFavorites } from '../context/FavoritesContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function FavoriteButton({ eventId, className = '', withLabel = false }) {
  const { user } = useAuth();
  const { has, toggle } = useFavorites();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  if (user?.role === 'admin') return null;

  const active = has(eventId);

  const onClick = (e) => {
    e.preventDefault();
    if (!user) {
      toast.info('Log in to save events');
      navigate('/login', { state: { from: location } });
      return;
    }
    toggle(eventId);
  };

  return (
    <button
      type="button"
      className={`fav ${active ? 'is-active' : ''} ${className}`}
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? 'Remove from favorites' : 'Add to favorites'}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          fill={active ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      {withLabel && <span>{active ? 'Saved' : 'Save'}</span>}
    </button>
  );
}