import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Header() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light');

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch {
      /* storage unavailable */
    }
    setTheme(next);
  };

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-mark">E</span>
          Evently
        </Link>

        <button
          type="button"
          className="icon-btn burger"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? '✕' : '☰'}
        </button>

        <nav className={`nav ${open ? 'nav-open' : ''}`} onClick={() => setOpen(false)}>
          <div className="nav-links">
            <NavLink to="/events">Events</NavLink>
            {user?.role === 'customer' && (
              <>
                <NavLink to="/account/bookings">My bookings</NavLink>
                <NavLink to="/account/favorites">Favorites</NavLink>
              </>
            )}
            {user?.role === 'admin' && <NavLink to="/admin">Admin panel</NavLink>}
          </div>
          <div className="nav-actions">
            <button
              type="button"
              className="icon-btn"
              onClick={(e) => {
                e.stopPropagation();
                toggleTheme();
              }}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            {user ? (
              <>
                <Link to={user.role === 'admin' ? '/admin' : '/account'} className="user-chip">
                  {user.name}
                </Link>
                <button type="button" className="btn btn-outline btn-sm" onClick={logout}>
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm">
                  Log in
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}