import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import type { Movie } from '../types';
import MovieCard from '../components/MovieCard';
import Loader, { EmptyState } from '../components/Loader';

export default function Movies() {
  const [movies, setMovies] = useState<Movie[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('all');
  const [language, setLanguage] = useState('all');

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .order('rating', { ascending: false });
      if (error) { setError(error.message); return; }
      setMovies(data as Movie[]);
    })();
  }, []);

  const genres = useMemo(() => {
    const set = new Set<string>();
    (movies ?? []).forEach((m) => m.genre && set.add(m.genre));
    return ['all', ...Array.from(set).sort()];
  }, [movies]);

  const languages = useMemo(() => {
    const set = new Set<string>();
    (movies ?? []).forEach((m) => m.language && set.add(m.language));
    return ['all', ...Array.from(set).sort()];
  }, [movies]);

  const filtered = useMemo(() => {
    if (!movies) return [];
    const q = query.trim().toLowerCase();
    return movies.filter((m) => {
      if (q && !m.title.toLowerCase().includes(q) && !(m.description ?? '').toLowerCase().includes(q)) return false;
      if (genre !== 'all' && m.genre !== genre) return false;
      if (language !== 'all' && m.language !== language) return false;
      return true;
    });
  }, [movies, query, genre, language]);

  return (
    <div className="container">
      <div className="page-head">
        <h1>All movies</h1>
        <p>Find what's playing across theatres near you.</p>
      </div>

      <div className="search-bar">
        <input
          className="search-input"
          placeholder="Search by title…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="filter-select" value={genre} onChange={(e) => setGenre(e.target.value)}>
          {genres.map((g) => <option key={g} value={g}>{g === 'all' ? 'All genres' : g}</option>)}
        </select>
        <select className="filter-select" value={language} onChange={(e) => setLanguage(e.target.value)}>
          {languages.map((l) => <option key={l} value={l}>{l === 'all' ? 'All languages' : l}</option>)}
        </select>
      </div>

      {error ? (
        <div className="form-error">{error}</div>
      ) : !movies ? (
        <Loader />
      ) : filtered.length === 0 ? (
        <EmptyState title="No matches found" subtitle="Try a different search or filter." />
      ) : (
        <div className="movie-grid">
          {filtered.map((m) => <MovieCard key={m.id} movie={m} />)}
        </div>
      )}
    </div>
  );
}
