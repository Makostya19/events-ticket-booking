import { Link } from 'react-router-dom';
import FavoriteButton from './FavoriteButton.jsx';
import {
  categoryEmoji,
  categoryHue,
  formatDateTime,
  formatPrice,
  imageSrc,
} from '../utils/format.js';

export default function EventCard({ event }) {
  const img = imageSrc(event.imageUrl);
  const soldOut = event.availableTickets === 0;
  const fewLeft = !soldOut && event.availableTickets <= 10;

  return (
    <article className="card">
      <Link to={`/events/${event.id}`} className="card-link">
        <div className="cover" style={{ '--hue': categoryHue(event.category) }}>
          {img ? (
            <img src={img} alt="" loading="lazy" />
          ) : (
            <span className="cover-emoji" aria-hidden="true">
              {categoryEmoji(event.category)}
            </span>
          )}
          <span className="badge badge-glass">{event.category}</span>
        </div>
        <div className="card-body">
          <p className="card-date">{formatDateTime(event.startsAt)}</p>
          <h3 className="card-title">{event.title}</h3>
          <p className="card-meta">
            {event.venue} · {event.city}
          </p>
          <div className="card-footer">
            <span className="price">{formatPrice(event.price)}</span>
            {soldOut && <span className="badge badge-danger">Sold out</span>}
            {fewLeft && <span className="badge badge-warning">{event.availableTickets} left</span>}
          </div>
        </div>
      </Link>
      <FavoriteButton eventId={event.id} className="card-fav" />
    </article>
  );
}