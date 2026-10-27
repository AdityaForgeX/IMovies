import { Link } from 'react-router-dom';
import type { Movie } from '../types';

export default function MovieCard({ movie }: { movie: Movie }) {
  return (
    <Link to={`/movies/${movie.id}`} className="movie-card">
      <div className="movie-poster">
        {movie.poster_url && <img src={movie.poster_url} alt={movie.title} loading="lazy" />}
        {movie.rating != null && (
          <span className="movie-rating-badge">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
            {Number(movie.rating).toFixed(1)}
          </span>
        )}
      </div>
      <div className="movie-info">
        <div className="movie-title">{movie.title}</div>
        <div className="movie-meta">
          {movie.genre && <span>{movie.genre}</span>}
          {movie.language && <span>{movie.language}</span>}
          {movie.duration_min && <span>{movie.duration_min}m</span>}
        </div>
      </div>
    </Link>
  );
}
