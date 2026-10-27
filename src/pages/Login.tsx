import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: err } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (err) { setError(err); return; }
    navigate(from, { replace: true });
  }

  return (
    <div className="container">
      <div className="auth-card">
        <h1>Welcome back</h1>
        <p className="subtitle">Sign in to book and manage your tickets.</p>
        {error && <div className="form-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" required minLength={6}
              value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <div className="auth-switch">
          New here? <Link to="/signup">Create an account</Link>
        </div>
      </div>
    </div>
  );
}
