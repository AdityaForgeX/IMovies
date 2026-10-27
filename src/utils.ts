export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
}

export function formatDateShort(iso: string): { day: string; weekday: string; month: string } {
  const d = new Date(iso);
  return {
    day: String(d.getDate()).padStart(2, '0'),
    weekday: d.toLocaleDateString([], { weekday: 'short' }),
    month: d.toLocaleDateString([], { month: 'short' }),
  };
}

export function formatMoney(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function initials(name: string | null): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
