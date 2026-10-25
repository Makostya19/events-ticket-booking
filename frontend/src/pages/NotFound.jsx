import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container page">
      <div className="state">
        <div className="state-emoji">🧭</div>
        <h3>Page not found</h3>
        <p className="muted">The page you’re looking for doesn’t exist.</p>
        <Link to="/" className="btn btn-primary">
          Go home
        </Link>
      </div>
    </div>
  );
}