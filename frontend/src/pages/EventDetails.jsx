import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import FavoriteButton from '../components/FavoriteButton.jsx';
import { ErrorMessage } from '../components/States.jsx';
import {
  categoryEmoji,
  categoryHue,
  formatLongDate,
  formatPrice,
  formatTime,
  imageSrc,
} from '../utils/format.js';

export default function EventDetails() {
  const { id } = useParams();
  return <EventDetailsInner key={id} id={id} />;
}

function EventDetailsInner({ id }) {
  const { user } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const [state, setState] = useState({ status: 'loading', event: null, error: null });
  const [reload, setReload] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    let active = true;
    api(`/api/events/${id}`)
      .then((data) => active && setState({ status: 'ready', event: data.event, error: null }))
      .catch((error) => active && setState({ status: 'error', event: null, error }));
    return () => {
      active = false;
    };
  }, [id, reload]);

  if (state.status === 'loading') {
    return (
      <div className="container page">
        <div className="skeleton skeleton-hero" />
      </div>
    );
  }

  if (state.status === 'error') {
    const notFound = state.error.status === 404;
    return (
      <div className="container page">
        {notFound ? (
          <div className="state">
            <div className="state-emoji">🕳️</div>
            <h3>Event not found</h3>
            <p className="muted">It may have been removed or is not published yet.</p>
            <Link to="/events" className="btn btn-primary">
              Browse events
            </Link>
          </div>
        ) : (
          <ErrorMessage error={state.error} onRetry={() => setReload((n) => n + 1)} />
        )}
      </div>
    );
  }

  const event = state.event;
  const img = imageSrc(event.imageUrl);
  const started = new Date(event.startsAt) <= new Date();
  const soldOut = event.availableTickets === 0;
  const bookable = event.status === 'published' && !started && !soldOut;
  const maxQty = Math.max(1, Math.min(event.availableTickets, 10));
  const qty = Math.min(quantity, maxQty);

  let blockedReason = '';
  if (event.status === 'cancelled') blockedReason = 'This event has been cancelled.';
  else if (event.status === 'completed') blockedReason = 'This event has finished.';
  else if (started) blockedReason = 'This event has already started.';
  else if (soldOut) blockedReason = 'Sold out. Save it to check back later.';

  const book = async () => {
    setBooking(true);
    try {
      await api('/api/bookings', { method: 'POST', body: { eventId: event.id, quantity: qty } });
      toast.success(`Booked ${qty} ticket${qty > 1 ? 's' : ''}. See you there!`);
      setQuantity(1);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBooking(false);
      setReload((n) => n + 1);
    }
  };

  return (
    <div className="container page">
      <Link to="/events" className="back-link">
        ← All events
      </Link>

      <div className="details">
        <div className="details-main">
          <div className="details-cover cover" style={{ '--hue': categoryHue(event.category) }}>
            {img ? (
              <img src={img} alt={event.title} />
            ) : (
              <span className="cover-emoji" aria-hidden="true">
                {categoryEmoji(event.category)}
              </span>
            )}
            <span className="badge badge-glass">{event.category}</span>
          </div>

          <div className="details-head">
            <h1 className="details-title">{event.title}</h1>
            <FavoriteButton eventId={event.id} withLabel className="fav-inline" />
          </div>

          <div className="meta-grid">
            <div className="meta-item">
              <span className="meta-label">When</span>
              <strong>{formatLongDate(event.startsAt)}</strong>
              <span className="muted">
                {formatTime(event.startsAt)} – {formatTime(event.endsAt)}
              </span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Where</span>
              <strong>{event.venue}</strong>
              <span className="muted">{event.city}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Availability</span>
              <strong>{soldOut ? 'Sold out' : `${event.availableTickets} tickets left`}</strong>
              <span className="muted">of {event.totalTickets}</span>
            </div>
          </div>

          <h2 className="section-title">About this event</h2>
          <p className="prose">{event.description}</p>
        </div>

        <aside className="booking-panel">
          <div className="booking-price">{formatPrice(event.price)}</div>
          <p className="muted">per ticket</p>

          {user?.role === 'admin' ? (
            <p className="notice">Admins manage events but can’t book tickets.</p>
          ) : !bookable ? (
            <p className="notice">{blockedReason}</p>
          ) : (
            <>
              <div className="qty" role="group" aria-label="Ticket quantity">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, qty - 1))}
                  disabled={qty <= 1}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span aria-live="polite">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(maxQty, qty + 1))}
                  disabled={qty >= maxQty}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
              <div className="total-row">
                <span>Total</span>
                <strong>{formatPrice(event.price * qty)}</strong>
              </div>
              {user ? (
                <button
                  type="button"
                  className="btn btn-primary btn-lg btn-block"
                  onClick={book}
                  disabled={booking}
                >
                  {booking ? 'Booking…' : 'Book tickets'}
                </button>
              ) : (
                <Link
                  to="/login"
                  state={{ from: location }}
                  className="btn btn-primary btn-lg btn-block"
                >
                  Log in to book
                </Link>
              )}
              <p className="muted small">Max 10 tickets per booking. Free cancellation before the event starts.</p>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}