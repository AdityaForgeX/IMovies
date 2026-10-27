import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { supabase } from '../supabaseClient';
import type { Movie, Show, Theatre, Booking } from '../types';
import { formatTime, formatDate, formatMoney } from '../utils';
import Loader, { EmptyState } from '../components/Loader';

interface ShowDetails extends Show {
  movies: Movie | null;
  theatres: Theatre | null;
}

const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const SEATS_PER_ROW = 12;
const PREMIUM_ROWS = ['G', 'H', 'I', 'J'];

function seatLabel(row: string, n: number): string {
  return `${row}${n}`;
}

export default function SeatSelection() {
  const { showId } = useParams<{ showId: string }>();
  const navigate = useNavigate();
  const [show, setShow] = useState<ShowDetails | null>(null);
  const [bookedSeats, setBookedSeats] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadShow = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('shows')
      .select('*, movies(*), theatres(*)')
      .eq('id', showId!)
      .maybeSingle();
    if (err || !data) { setError(err?.message ?? 'Show not found'); setLoading(false); return; }
    setShow(data as ShowDetails);
  }, [showId]);

  const loadBooked = useCallback(async () => {
    const { data } = await supabase
      .from('bookings')
      .select('seats')
      .eq('show_id', showId!)
      .eq('status', 'confirmed');
    const set = new Set<string>();
    (data ?? []).forEach((b) => (b.seats as string[]).forEach((s) => set.add(s)));
    setBookedSeats(set);
  }, [showId]);

  useEffect(() => {
    (async () => {
      await loadShow();
      await loadBooked();
      setLoading(false);
    })();
  }, [loadShow, loadBooked]);

  useEffect(() => {
    const channel = supabase
      .channel(`show-${showId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `show_id=eq.${showId}` },
        () => { loadBooked(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [showId, loadBooked]);

  const layout = useMemo(() => {
    return ROWS.map((row) => {
      const seats: { label: string; premium: boolean }[] = [];
      for (let n = 1; n <= SEATS_PER_ROW; n++) {
        seats.push({ label: seatLabel(row, n), premium: PREMIUM_ROWS.includes(row) });
      }
      return { row, seats };
    });
  }, []);

  function toggleSeat(label: string) {
    if (bookedSeats.has(label)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else {
        if (next.size >= 10) {
          toast.warning('You can select up to 10 seats');
          return prev;
        }
        next.add(label);
      }
      return next;
    });
  }

  async function handleBook() {
    if (selected.size === 0) return;
    setSubmitting(true);
    const seats = Array.from(selected).sort();
    const { data, error: err } = await supabase.rpc('book_seats', {
      p_show_id: showId!,
      p_seats: seats,
    });
    setSubmitting(false);
    if (err) {
      toast.error(err.message || 'Booking failed. Some seats may already be taken.');
      loadBooked();
      return;
    }
    const booking = data as Booking;
    toast.success('Booking confirmed!');
    setSelected(new Set());
    navigate('/bookings', { state: { highlight: booking.id } });
  }

  if (loading) return <Loader full />;
  if (error || !show) return <EmptyState title="Show not found" subtitle={error ?? ''} actionLabel="Browse movies" actionTo="/movies" />;

  const totalPrice = selected.size * Number(show.price);
  const movie = show.movies;

  return (
    <div className="container">
      <div className="page-head">
        <Link to={`/movies/${show.movie_id}`} style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600, marginBottom: 8, display: 'inline-block' }}>← Back to {movie?.title ?? 'movie'}</Link>
        <h1 style={{ fontSize: 22 }}>Select your seats</h1>
        <p>{movie?.title} • {show.theatres?.name} • {show.screen} • {formatDate(show.showtime)} at {formatTime(show.showtime)}</p>
      </div>

      <div className="seat-screen" />

      <div className="seat-legend">
        <div className="seat-legend-item"><span className="legend-box" /> Available</div>
        <div className="seat-legend-item"><span className="legend-box premium" /> Premium</div>
        <div className="seat-legend-item"><span className="legend-box selected" /> Selected</div>
        <div className="seat-legend-item"><span className="legend-box booked" /> Booked</div>
      </div>

      <div className="seat-map">
        {layout.map(({ row, seats }) => (
          <div className="seat-row" key={row}>
            <span className="row-label">{row}</span>
            {seats.map((s, idx) => {
              const isBooked = bookedSeats.has(s.label);
              const isSelected = selected.has(s.label);
              const className = ['seat', s.premium ? 'premium' : '', isBooked ? 'booked' : '', isSelected ? 'selected' : '']
                .filter(Boolean).join(' ');
              return (
                <button
                  key={s.label}
                  className={className}
                  disabled={isBooked}
                  onClick={() => toggleSeat(s.label)}
                  title={s.label}
                >
                  {isBooked ? '' : s.label.replace(row, '')}
                  {idx === 5 && <span className="aisle" />}
                </button>
              );
            })}
            <span className="row-label">{row}</span>
          </div>
        ))}
      </div>

      <div className="seat-summary">
        <div className="seat-summary-info">
          <div>{selected.size === 0 ? 'No seats selected' : <><strong>{selected.size}</strong> seat{selected.size === 1 ? '' : 's'} selected</>}</div>
          {selected.size > 0 && (
            <div className="selected-seats-list">
              {Array.from(selected).sort().map((s) => (
                <span className="selected-seat-chip" key={s}>{s}</span>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Total</div>
            <div className="seat-summary-price">{formatMoney(totalPrice)}</div>
          </div>
          <button className="btn btn-primary btn-lg" disabled={selected.size === 0 || submitting} onClick={handleBook}>
            {submitting ? 'Booking…' : 'Book seats'}
          </button>
        </div>
      </div>
    </div>
  );
}
