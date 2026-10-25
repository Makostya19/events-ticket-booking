import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function AccountLayout() {
  const { user } = useAuth();
  const firstName = user.name.split(' ')[0];

  return (
    <div className="container page">
      <div className="page-head">
        <h1>Hi, {firstName} 👋</h1>
        <p className="muted">Manage your bookings, favorites and profile.</p>
      </div>

      <nav className="subnav" aria-label="Account">
        <NavLink to="/account" end>
          Overview
        </NavLink>
        <NavLink to="/account/bookings">My bookings</NavLink>
        <NavLink to="/account/favorites">Favorites</NavLink>
        <NavLink to="/account/profile">Profile</NavLink>
      </nav>

      <Outlet />
    </div>
  );
}