import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import type { Booking, Movie, Show, Theatre } from '../types';
import { formatTime, formatDate, formatMoney } from '../utils';
import Loader, { EmptyState } from '../components/Loader';

interface BookingRow extends Booking {
  shows: (Show & { movies: Movie | null; theatres: Theatre | null }) | null;
}

export default function Bookings() {
  const { user } = useAuth();
  const location = useLocation();
  const highlight = (location.state as { highlight?: string })?.highlight;
  const [bookings, setBookings] = useState<BookingRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('bookings')
      .select('*, shows(*, movies(*), theatres(*))')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    if (err) { setError(err.message); return; }
    setBookings(data as BookingRow[]);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function handleCancel(id: string) {
    if (!confirm('Cancel this booking? Seats will be released.')) return;
    setCancelling(id);
    const { error: err } = await supabase.rpc('cancel_booking', { p_booking_id: id });
    setCancelling(null);
    if (err) { toast.error(err.message || 'Could not cancel'); return; }
    toast.success('Booking cancelled');
    load();
  }

  if (error) return <div className="container"><div className="form-error">{error}</div></div>;
  if (!bookings) return <Loader full />;

  return (
    <div className="container">
      <div className="page-head">
        <h1>My bookings</h1>
        <p>Manage your upcoming and past tickets.</p>
      </div>

      {bookings.length === 0 ? (
        <EmptyState
          title="No bookings yet"
          subtitle="Browse movies and reserve your seats."
          actionLabel="Browse movies"
          actionTo="/movies"
        />
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {bookings.map((b) => {
            const s = b.shows;
            const movie = s?.movies;
            const past = s ? new Date(s.showtime) < new Date() : false;
            const canCancel = b.status === 'confirmed' && !past;
            return (
              <div
                key={b.id}
                className="booking-card"
                style={highlight === b.id ? { borderColor: 'var(--primary)', boxShadow: '0 0 0 2px rgba(255,61,104,0.3)' } : undefined}
              >
                <div className="booking-poster">
                  {movie?.poster_url && <img src={movie.poster_url} alt={movie.title} />}
                </div>
                <div className="booking-info">
                  <h3>{movie?.title ?? 'Movie'}</h3>
                  <p>{s?.theatres?.name} • {s?.screen}</p>
                  <p>{s ? formatDate(s.showtime) : ''} • {s ? formatTime(s.showtime) : ''}</p>
                  <div className="booking-seats">
                    {(b.seats as string[]).map((seat) => <span className="chip" key={seat}>{seat}</span>)}
                  </div>
                </div>
                <div className="booking-side">
                  <div className="booking-amount">{formatMoney(Number(b.total_amount))}</div>
                  <span className={`status-badge status-${b.status}`}>{b.status}</span>
                  {canCancel && (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleCancel(b.id)}
                      disabled={cancelling === b.id}
                    >
                      {cancelling === b.id ? 'Cancelling…' : 'Cancel'}
                    </button>
                  )}
                  {!canCancel && b.status === 'confirmed' && past && (
                    <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Show ended</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
