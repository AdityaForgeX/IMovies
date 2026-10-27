import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { initials } from '../utils';

export default function Navbar() {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const isActive = (path: string) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  const navItems = [
    { to: '/', label: 'Home' },
    { to: '/movies', label: 'Movies' },
  ];
  if (user) navItems.push({ to: '/bookings', label: 'My Bookings' });
  if (profile?.role === 'admin') navItems.push({ to: '/admin', label: 'Admin' });

  function handleSignOut() {
    signOut();
    navigate('/');
  }

  return (
    <header className="navbar">
      <div className="container">
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="20" x="2" y="2" rx="2.18" />
              <line x1="7" x2="7" y1="2" y2="22" />
              <line x1="17" x2="17" y1="2" y2="22" />
              <line x1="2" x2="22" y1="12" y2="12" />
              <line x1="2" x2="7" y1="7" y2="7" />
              <line x1="2" x2="7" y1="17" y2="17" />
              <line x1="17" x2="22" y1="17" y2="17" />
              <line x1="17" x2="22" y1="7" y2="7" />
            </svg>
          </span>
          <span className="brand-name">I<b>Movies</b></span>
        </Link>

        <button className="menu-btn" onClick={() => setOpen((v) => !v)} aria-label="Menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></> : <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>}
          </svg>
        </button>

        <nav className={`nav-links ${open ? 'open' : ''}`}>
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`nav-link ${isActive(item.to) ? 'active' : ''}`}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          {user ? (
            <div className="nav-user" style={{ marginLeft: 8 }}>
              <span className="avatar" title={profile?.full_name ?? ''}>{initials(profile?.full_name ?? null)}</span>
              <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>Sign out</button>
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm" onClick={() => setOpen(false)}>Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
