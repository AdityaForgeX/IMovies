import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import type { Movie, Show, Theatre } from '../types';
import { formatTime, formatDate, formatDateShort } from '../utils';
import Loader, { EmptyState } from '../components/Loader';

interface ShowRow extends Show { theatres: Theatre | null; }

export default function MovieDetail() {
  const { id } = useParams<{ id: string }>();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [shows, setShows] = useState<ShowRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dayOffset, setDayOffset] = useState(0);

  const dates = useMemo(() => {
    const arr: { date: Date; iso: string; pretty: { day: string; weekday: string; month: string } }[] = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    for (let i = 0; i < 5; i++) {
      const d = new Date(base.getTime() + i * 86400000);
      arr.push({ date: d, iso: d.toISOString(), pretty: formatDateShort(d.toISOString()) });
    }
    return arr;
  }, []);

  const selectedDay = dates[dayOffset]?.date ?? new Date();

  useEffect(() => {
    (async () => {
      const { data: mv, error: mErr } = await supabase
        .from('movies')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (mErr || !mv) { setError(mErr?.message ?? 'Movie not found'); return; }
      setMovie(mv as Movie);

      const { data: sh, error: sErr } = await supabase
        .from('shows')
        .select('*, theatres(*)')
        .eq('movie_id', id!)
        .order('showtime', { ascending: true });
      if (sErr) { setError(sErr.message); return; }
      setShows(sh as ShowRow[]);
    })();
  }, [id]);

  const dayShows = useMemo(() => {
    if (!shows) return [];
    const start = new Date(selectedDay);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 86400000);
    return shows.filter((s) => {
      const t = new Date(s.showtime);
      return t >= start && t < end;
    });
  }, [shows, selectedDay]);

  return (
    <div className="container">
      <div className="page-head">
        <Link to="/movies" style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600, marginBottom: 8, display: 'inline-block' }}>← Back to movies</Link>
      </div>
      {error ? (
        <EmptyState title="Movie not found" subtitle={error} actionLabel="Browse movies" actionTo="/movies" />
      ) : !movie || !shows ? (
        <Loader />
      ) : (
        <>
          <div className="movie-detail">
            <div className="movie-detail-poster">
              {movie.poster_url && <img src={movie.poster_url} alt={movie.title} />}
            </div>
            <div className="movie-detail-body">
              <h1>{movie.title}</h1>
              <div className="movie-detail-meta">
                {movie.rating != null && (
                  <span className="rating-large">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                    {Number(movie.rating).toFixed(1)}/10
                  </span>
                )}
                {movie.duration_min && <span>{movie.duration_min} min</span>}
                {movie.genre && <span className="tag">{movie.genre}</span>}
                {movie.language && <span className="tag">{movie.language}</span>}
                {movie.release_date && <span>Released {new Date(movie.release_date).getFullYear()}</span>}
              </div>
              {movie.description && <p className="movie-detail-desc">{movie.description}</p>}

              <h3 style={{ fontSize: 16, marginTop: 8, marginBottom: 12 }}>Select a date</h3>
              <div className="date-pills">
                {dates.map((d, i) => (
                  <button
                    key={d.iso}
                    className={`date-pill ${i === dayOffset ? 'active' : ''}`}
                    onClick={() => setDayOffset(i)}
                  >
                    <strong>{i === 0 ? 'Today' : i === 1 ? 'Tmrw' : d.pretty.day}</strong>
                    <span>{i === 0 ? d.pretty.weekday : i === 1 ? d.pretty.weekday : d.pretty.month}</span>
                  </button>
                ))}
              </div>

              <h3 style={{ fontSize: 16, marginTop: 8, marginBottom: 12 }}>
                Showtimes — {formatDate(selectedDay.toISOString())}
              </h3>

              {dayShows.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No shows scheduled for this day.</p>
              ) : (
                <div className="showtime-list">
                  {dayShows.map((s) => {
                    const soldOut = s.available_seats <= 0;
                    return (
                      <Link
                        key={s.id}
                        to={soldOut ? '#' : `/show/${s.id}/seats`}
                        className={`showtime-row ${soldOut ? 'sold-out' : ''}`}
                        onClick={(e) => soldOut && e.preventDefault()}
                      >
                        <div className="showtime-info">
                          <div className="showtime-theatre">{s.theatres?.name ?? 'Theatre'}</div>
                          <div className="showtime-sub">
                            {s.theatres?.city && <>{s.theatres.city}</>}
                            {s.theatres?.city && s.screen && ' • '}
                            {s.screen}
                          </div>
                          <div className={`showtime-avail ${soldOut ? 'none' : s.available_seats < 20 ? 'low' : ''}`}>
                            {soldOut ? 'Sold out' : `${s.available_seats} seats available`}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="showtime-time">{formatTime(s.showtime)}</div>
                          <div className="showtime-date">₹{Number(s.price).toFixed(0)} / seat</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
