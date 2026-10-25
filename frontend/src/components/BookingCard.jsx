import { Link } from 'react-router-dom';
import { categoryHue, formatDateTime, formatPrice, imageSrc } from '../utils/format.js';

export default function BookingCard({ booking, onCancel }) {
  const { event } = booking;
  const img = imageSrc(event.imageUrl);
  const upcoming = new Date(event.startsAt) > new Date();
  const canCancel = booking.status === 'confirmed' && upcoming;
  const confirmed = booking.status === 'confirmed';
  const link = `/events/${booking.eventId}`;

  return (
    <article className="booking">
      <Link to={link} className="cover booking-thumb" style={{ '--hue': categoryHue(event.title) }}>
        {img ? (
          <img src={img} alt="" loading="lazy" />
        ) : (
          <span className="cover-emoji" aria-hidden="true">
            🎟️
          </span>
        )}
      </Link>

      <div className="booking-info">
        <Link to={link} className="booking-title">
          {event.title}
        </Link>
        <p className="muted">{formatDateTime(event.startsAt)}</p>
        <p className="muted">
          {event.venue} · {event.city}
        </p>
        <p className="booking-meta">
          {booking.quantity} ticket{booking.quantity > 1 ? 's' : ''} · {formatPrice(booking.totalPrice)}
        </p>
        {event.status === 'cancelled' && !confirmed && (
          <p className="small muted">This event was cancelled by the organizer.</p>
        )}
      </div>

      <div className="booking-side">
        <span className={`badge ${confirmed ? 'badge-success' : 'badge-muted'}`}>
          {confirmed ? 'Confirmed' : 'Cancelled'}
        </span>
        {onCancel && canCancel && (
          <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => onCancel(booking)}>
            Cancel booking
          </button>
        )}
      </div>
    </article>
  );
}