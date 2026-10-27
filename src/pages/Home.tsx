import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import type { Movie } from '../types';
import MovieCard from '../components/MovieCard';
import Loader from '../components/Loader';

export default function Home() {
  const [movies, setMovies] = useState<Movie[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .order('rating', { ascending: false })
        .limit(8);
      if (error) { setError(error.message); return; }
      setMovies(data as Movie[]);
    })();
  }, []);

  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>Book the magic of <span>cinema</span>, one seat at a time.</h1>
          <p>Browse movies playing near you, pick your favourite showtime, choose your seats, and reserve in seconds.</p>
          <Link to="/movies" className="btn btn-primary btn-lg">
            Browse movies
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
          </Link>
          <div className="hero-stats">
            <div className="hero-stat"><strong>Now showing</strong><span>Updated daily</span></div>
            <div className="hero-stat"><strong>Real-time seats</strong><span>Live availability</span></div>
            <div className="hero-stat"><strong>Secure booking</strong><span>Cancel anytime</span></div>
          </div>
        </div>
      </section>

      <div className="container" style={{ paddingTop: 36, paddingBottom: 40 }}>
        <div className="section-title">
          <span>Top rated</span>
          <Link to="/movies">View all →</Link>
        </div>
        {error && <div className="form-error">{error}</div>}
        {!movies ? (
          <Loader label="Fetching movies…" />
        ) : movies.length === 0 ? (
          <p className="empty-state">No movies available yet.</p>
        ) : (
          <div className="movie-grid">
            {movies.map((m) => <MovieCard key={m.id} movie={m} />)}
          </div>
        )}
      </div>
    </>
  );
}
