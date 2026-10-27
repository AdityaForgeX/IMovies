import { Link } from 'react-router-dom';

export default function Loader({ label = 'Loading…', full = false }: { label?: string; full?: boolean }) {
  if (full) {
    return (
      <div className="loader" style={{ minHeight: '60vh' }}>
        <div className="spinner" />
        <div>{label}</div>
      </div>
    );
  }
  return (
    <div className="loader">
      <div className="spinner" />
      <div>{label}</div>
    </div>
  );
}

export function EmptyState({
  title,
  subtitle,
  actionLabel,
  actionTo,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionTo?: string;
}) {
  return (
    <div className="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="20" x="2" y="2" rx="2.18" />
        <line x1="7" x2="7" y1="2" y2="22" />
        <line x1="17" x2="17" y1="2" y2="22" />
        <line x1="2" x2="22" y1="12" y2="12" />
      </svg>
      <h3 style={{ marginBottom: 6 }}>{title}</h3>
      {subtitle && <p style={{ fontSize: 14 }}>{subtitle}</p>}
      {actionLabel && actionTo && (
        <Link to={actionTo} className="btn btn-primary" style={{ marginTop: 18 }}>{actionLabel}</Link>
      )}
    </div>
  );
}
