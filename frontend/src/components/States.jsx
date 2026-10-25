export function EventGridSkeleton({ count = 6 }) {
  return (
    <div className="grid" aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card skeleton-card">
          <div className="skeleton skeleton-cover" />
          <div className="card-body">
            <div className="skeleton skeleton-line short" />
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line medium" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ emoji = '🔎', title, text, children }) {
  return (
    <div className="state">
      <div className="state-emoji" aria-hidden="true">
        {emoji}
      </div>
      <h3>{title}</h3>
      {text && <p className="muted">{text}</p>}
      {children}
    </div>
  );
}

export function ErrorMessage({ error, onRetry }) {
  return (
    <div className="state">
      <div className="state-emoji" aria-hidden="true">
        ⚠️
      </div>
      <h3>Something went wrong</h3>
      <p className="muted">{error?.message || 'Please try again.'}</p>
      {onRetry && (
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}