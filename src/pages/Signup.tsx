import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../AuthContext';

export default function Signup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: err } = await signUp(email.trim(), password, fullName.trim());
    setSubmitting(false);
    if (err) { setError(err); return; }
    toast.success('Account created! Please sign in.');
    navigate('/login');
  }

  return (
    <div className="container">
      <div className="auth-card">
        <h1>Create your account</h1>
        <p className="subtitle">Book and manage cinema tickets in seconds.</p>
        {error && <div className="form-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full name</label>
            <input className="form-input" required value={fullName}
              onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" required minLength={6}
              value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" />
          </div>
          <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Sign up'}
          </button>
        </form>
        <div className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
