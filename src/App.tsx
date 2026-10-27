import { Routes, Route, Navigate, Link } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Movies from './pages/Movies';
import MovieDetail from './pages/MovieDetail';
import SeatSelection from './pages/SeatSelection';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Bookings from './pages/Bookings';
import Admin from './pages/Admin';
import { useAuth } from './AuthContext';
import Loader from './components/Loader';

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader full />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  if (loading) return <Loader full />;
  if (!profile) return <Navigate to="/login" replace />;
  if (profile.role !== 'admin') {
    return (
      <div className="container">
        <div className="empty-state">
          <h3 style={{ marginBottom: 8 }}>Admin access required</h3>
          <p style={{ maxWidth: 480, fontSize: 14, lineHeight: 1.6 }}>
            Your account is a regular user. To try the admin dashboard, you need an admin role.
            After signing up, ask your database operator to run this SQL against your Supabase project:
          </p>
          <pre style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border)',
            padding: 14, borderRadius: 8,
            textAlign: 'left', fontSize: 12, overflowX: 'auto',
            color: 'var(--text-muted)', marginTop: 14,
          }}>
{`UPDATE profiles
SET role = 'admin'
WHERE id = auth.uid();`}
          </pre>
          <Link to="/" className="btn btn-ghost" style={{ marginTop: 18 }}>Back home</Link>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="page">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/movies" element={<Movies />} />
          <Route path="/movies/:id" element={<MovieDetail />} />
          <Route path="/show/:showId/seats" element={<Protected><SeatSelection /></Protected>} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/bookings" element={<Protected><Bookings /></Protected>} />
          <Route path="/admin/*" element={<AdminRoute><Admin /></AdminRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="footer">
        <div className="container">IMovies — Cinema booking demo. Built with React + Supabase.</div>
      </footer>
    </div>
  );
}
