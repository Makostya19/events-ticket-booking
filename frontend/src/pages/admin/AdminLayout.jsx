import { NavLink, Outlet } from 'react-router-dom';

export default function AdminLayout() {
  return (
    <div className="container page">
      <div className="page-head">
        <h1>Admin panel</h1>
        <p className="muted">Manage events, bookings and users.</p>
      </div>

      <nav className="subnav" aria-label="Admin">
        <NavLink to="/admin" end>
          Dashboard
        </NavLink>
        <NavLink to="/admin/events">Events</NavLink>
        <NavLink to="/admin/bookings">Bookings</NavLink>
        <NavLink to="/admin/users">Users</NavLink>
      </nav>

      <Outlet />
    </div>
  );
}