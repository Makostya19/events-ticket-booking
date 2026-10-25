import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge.jsx';
import { formatDateTime, formatPrice } from '../utils/format.js';

export default function BookingsTable({ items, loading = false }) {
  return (
    <div className={`table-wrap ${loading ? 'is-loading' : ''}`}>
      <table className="table">
        <thead>
          <tr>
            <th>Booking</th>
            <th>Customer</th>
            <th>Event</th>
            <th className="num">Tickets</th>
            <th className="num">Total</th>
            <th>Status</th>
            <th>Booked</th>
          </tr>
        </thead>
        <tbody>
          {items.map((b) => (
            <tr key={b.id}>
              <td data-label="Booking">#{b.id}</td>
              <td data-label="Customer">
                <div>
                  <span className="cell-main">{b.user.name}</span>
                  <span className="cell-sub">{b.user.email}</span>
                </div>
              </td>
              <td data-label="Event">
                <div>
                  <Link to={`/admin/events/${b.eventId}/edit`} className="cell-main">
                    {b.event.title}
                  </Link>
                  <span className="cell-sub">{formatDateTime(b.event.startsAt)}</span>
                </div>
              </td>
              <td data-label="Tickets" className="num">
                {b.quantity}
              </td>
              <td data-label="Total" className="num">
                {formatPrice(b.totalPrice)}
              </td>
              <td data-label="Status">
                <StatusBadge status={b.status} />
              </td>
              <td data-label="Booked">{formatDateTime(b.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}