const MAP = {
  draft: ['badge-muted', 'Draft'],
  published: ['badge-success', 'Published'],
  cancelled: ['badge-danger', 'Cancelled'],
  completed: ['badge-info', 'Completed'],
  confirmed: ['badge-success', 'Confirmed'],
  active: ['badge-success', 'Active'],
  blocked: ['badge-danger', 'Blocked'],
};

export default function StatusBadge({ status }) {
  const [cls, label] = MAP[status] || ['badge-muted', status];
  return <span className={`badge ${cls}`}>{label}</span>;
}