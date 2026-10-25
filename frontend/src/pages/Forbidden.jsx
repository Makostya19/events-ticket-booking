import { Link } from 'react-router-dom';

export default function Forbidden() {
  return (
    <div className="container page">
      <div className="state">
        <div className="state-emoji">🔒</div>
        <h3>Access denied</h3>
        <p className="muted">You don’t have permission to view this page.</p>
        <Link to="/" className="btn btn-primary">
          Go home
        </Link>
      </div>
    </div>
  );
}