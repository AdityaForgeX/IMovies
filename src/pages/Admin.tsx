import { useCallback, useEffect, useState } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { toast } from 'react-toastify';
import { supabase } from '../supabaseClient';
import type { Movie, Theatre, Show } from '../types';
import { formatTime, formatDate, formatMoney } from '../utils';
import Loader, { EmptyState } from '../components/Loader';

export default function Admin() {
  return (
    <div className="container">
      <div className="page-head">
        <h1>Admin dashboard</h1>
        <p>Manage movies, theatres, and showtimes.</p>
      </div>
      <div className="admin-layout">
        <div className="admin-tabs">
          <NavLink to="/admin/movies" className={({ isActive }) => `admin-tab ${isActive ? 'active' : ''}`}>Movies</NavLink>
          <NavLink to="/admin/theatres" className={({ isActive }) => `admin-tab ${isActive ? 'active' : ''}`}>Theatres</NavLink>
          <NavLink to="/admin/shows" className={({ isActive }) => `admin-tab ${isActive ? 'active' : ''}`}>Shows</NavLink>
        </div>
        <div>
          <Routes>
            <Route path="/" element={<MoviesManager />} />
            <Route path="/movies" element={<MoviesManager />} />
            <Route path="/theatres" element={<TheatresManager />} />
            <Route path="/shows" element={<ShowsManager />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

/* ---------- Movies ---------- */
interface MovieForm {
  title: string; genre: string; language: string; duration_min: string;
  description: string; poster_url: string; rating: string; release_date: string;
}
const emptyMovieForm: MovieForm = {
  title: '', genre: '', language: '', duration_min: '', description: '',
  poster_url: '', rating: '', release_date: '',
};

function MoviesManager() {
  const [movies, setMovies] = useState<Movie[] | null>(null);
  const [editing, setEditing] = useState<Movie | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<MovieForm>(emptyMovieForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('movies').select('*').order('created_at', { ascending: false });
    if (error) { toast.error(error.message); return; }
    setMovies(data as Movie[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(emptyMovieForm);
    setShowModal(true);
  }
  function openEdit(m: Movie) {
    setEditing(m);
    setForm({
      title: m.title, genre: m.genre ?? '', language: m.language ?? '',
      duration_min: m.duration_min?.toString() ?? '', description: m.description ?? '',
      poster_url: m.poster_url ?? '', rating: m.rating?.toString() ?? '',
      release_date: m.release_date ?? '',
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      title: form.title,
      genre: form.genre || null,
      language: form.language || null,
      duration_min: form.duration_min ? Number(form.duration_min) : null,
      description: form.description || null,
      poster_url: form.poster_url || null,
      rating: form.rating ? Number(form.rating) : 0,
      release_date: form.release_date || null,
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from('movies').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('movies').insert(payload));
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? 'Movie updated' : 'Movie added');
    setShowModal(false);
    load();
  }

  async function handleDelete(m: Movie) {
    if (!confirm(`Delete "${m.title}"? This also deletes its shows.`)) return;
    const { error } = await supabase.from('movies').delete().eq('id', m.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Movie deleted');
    load();
  }

  if (!movies) return <Loader />;
  return (
    <div className="admin-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h2 style={{ fontSize: 18 }}>Movies ({movies.length})</h2>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Add movie</button>
      </div>
      {movies.length === 0 ? (
        <EmptyState title="No movies yet" subtitle="Add your first movie." />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr><th>Title</th><th>Genre</th><th>Language</th><th>Rating</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {movies.map((m) => (
                <tr key={m.id}>
                  <td>{m.title}</td>
                  <td>{m.genre ?? '—'}</td>
                  <td>{m.language ?? '—'}</td>
                  <td>{m.rating != null ? Number(m.rating).toFixed(1) : '—'}</td>
                  <td className="row-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(m)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(m)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? 'Edit movie' : 'Add movie'}</h2>
            <p className="modal-sub">Fill in the movie details below.</p>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input className="form-input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Genre</label>
                  <input className="form-input" value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Language</label>
                  <input className="form-input" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Duration (min)</label>
                  <input className="form-input" type="number" value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Rating (0-10)</label>
                  <input className="form-input" type="number" step="0.1" min="0" max="10" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Release date</label>
                  <input className="form-input" type="date" value={form.release_date} onChange={(e) => setForm({ ...form, release_date: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Poster URL</label>
                <input className="form-input" value={form.poster_url} onChange={(e) => setForm({ ...form, poster_url: e.target.value })} placeholder="https://…" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Theatres ---------- */
interface TheatreForm { name: string; location: string; city: string; screens: string; total_seats: string; }
const emptyTheatreForm: TheatreForm = { name: '', location: '', city: '', screens: '1', total_seats: '120' };

function TheatresManager() {
  const [theatres, setTheatres] = useState<Theatre[] | null>(null);
  const [editing, setEditing] = useState<Theatre | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<TheatreForm>(emptyTheatreForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('theatres').select('*').order('created_at', { ascending: false });
    if (error) { toast.error(error.message); return; }
    setTheatres(data as Theatre[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  function openCreate() { setEditing(null); setForm(emptyTheatreForm); setShowModal(true); }
  function openEdit(t: Theatre) {
    setEditing(t);
    setForm({
      name: t.name, location: t.location ?? '', city: t.city ?? '',
      screens: String(t.screens), total_seats: String(t.total_seats),
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name,
      location: form.location || null,
      city: form.city || null,
      screens: Number(form.screens) || 1,
      total_seats: Number(form.total_seats) || 120,
    };
    let error;
    if (editing) ({ error } = await supabase.from('theatres').update(payload).eq('id', editing.id));
    else ({ error } = await supabase.from('theatres').insert(payload));
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? 'Theatre updated' : 'Theatre added');
    setShowModal(false);
    load();
  }

  async function handleDelete(t: Theatre) {
    if (!confirm(`Delete "${t.name}"? Its shows will also be deleted.`)) return;
    const { error } = await supabase.from('theatres').delete().eq('id', t.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Theatre deleted');
    load();
  }

  if (!theatres) return <Loader />;
  return (
    <div className="admin-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h2 style={{ fontSize: 18 }}>Theatres ({theatres.length})</h2>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Add theatre</button>
      </div>
      {theatres.length === 0 ? (
        <EmptyState title="No theatres yet" />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr><th>Name</th><th>City</th><th>Location</th><th>Screens</th><th>Seats</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {theatres.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>{t.city ?? '—'}</td>
                  <td>{t.location ?? '—'}</td>
                  <td>{t.screens}</td>
                  <td>{t.total_seats}</td>
                  <td className="row-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? 'Edit theatre' : 'Add theatre'}</h2>
            <p className="modal-sub">Cinema venue details.</p>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input className="form-input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input className="form-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Screens</label>
                  <input className="form-input" type="number" min="1" value={form.screens} onChange={(e) => setForm({ ...form, screens: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Seats per screen</label>
                  <input className="form-input" type="number" min="1" value={form.total_seats} onChange={(e) => setForm({ ...form, total_seats: e.target.value })} />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Shows ---------- */
interface ShowRow extends Show { movies: Movie | null; theatres: Theatre | null; }
interface ShowForm {
  movie_id: string; theatre_id: string; screen: string;
  showtime: string; price: string; total_seats: string;
}
const emptyShowForm: ShowForm = { movie_id: '', theatre_id: '', screen: 'Screen 1', showtime: '', price: '250', total_seats: '120' };

function ShowsManager() {
  const [shows, setShows] = useState<ShowRow[] | null>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [theatres, setTheatres] = useState<Theatre[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setShowEditing] = useState<Show | null>(null);
  const [form, setForm] = useState<ShowForm>(emptyShowForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [shRes, mvRes, thRes] = await Promise.all([
      supabase.from('shows').select('*, movies(*), theatres(*)').order('showtime', { ascending: false }),
      supabase.from('movies').select('*'),
      supabase.from('theatres').select('*'),
    ]);
    if (shRes.error) { toast.error(shRes.error.message); return; }
    setShows(shRes.data as ShowRow[]);
    setMovies(mvRes.data as Movie[]);
    setTheatres(thRes.data as Theatre[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setShowEditing(null);
    const tomorrow = new Date(Date.now() + 86400000);
    tomorrow.setHours(18, 0, 0, 0);
    const isoLocal = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setForm({ ...emptyShowForm, movie_id: movies[0]?.id ?? '', theatre_id: theatres[0]?.id ?? '', showtime: isoLocal });
    setShowModal(true);
  }
  function openEdit(s: Show) {
    setShowEditing(s);
    const d = new Date(s.showtime);
    const isoLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setForm({
      movie_id: s.movie_id, theatre_id: s.theatre_id, screen: s.screen,
      showtime: isoLocal, price: String(s.price), total_seats: String(s.total_seats),
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.movie_id || !form.theatre_id || !form.showtime) {
      toast.error('Movie, theatre, and showtime are required');
      return;
    }
    setSaving(true);
    const payload = {
      movie_id: form.movie_id,
      theatre_id: form.theatre_id,
      screen: form.screen || 'Screen 1',
      showtime: new Date(form.showtime).toISOString(),
      price: Number(form.price) || 250,
      total_seats: Number(form.total_seats) || 120,
      available_seats: Number(form.total_seats) || 120,
    };
    let error;
    if (editing) {
      const { available_seats, ...rest } = payload;
      ({ error } = await supabase.from('shows').update({ ...rest }).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('shows').insert(payload));
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? 'Show updated' : 'Show added');
    setShowModal(false);
    load();
  }

  async function handleDelete(s: Show) {
    if (!confirm('Delete this show? Existing bookings for it will also be removed.')) return;
    const { error } = await supabase.from('shows').delete().eq('id', s.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Show deleted');
    load();
  }

  if (!shows) return <Loader />;
  return (
    <div className="admin-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h2 style={{ fontSize: 18 }}>Shows ({shows.length})</h2>
        <button className="btn btn-primary btn-sm" onClick={openCreate} disabled={movies.length === 0 || theatres.length === 0}>+ Add show</button>
      </div>
      {movies.length === 0 || theatres.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 12 }}>Add at least one movie and one theatre first.</p>
      ) : null}
      {shows.length === 0 ? (
        <EmptyState title="No shows scheduled" />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr><th>Movie</th><th>Theatre</th><th>Screen</th><th>Showtime</th><th>Price</th><th>Avail.</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {shows.map((s) => (
                <tr key={s.id}>
                  <td>{s.movies?.title ?? '—'}</td>
                  <td>{s.theatres?.name ?? '—'}</td>
                  <td>{s.screen}</td>
                  <td>{formatDate(s.showtime)} {formatTime(s.showtime)}</td>
                  <td>{formatMoney(Number(s.price))}</td>
                  <td>{s.available_seats}/{s.total_seats}</td>
                  <td className="row-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? 'Edit show' : 'Add show'}</h2>
            <p className="modal-sub">Schedule a movie at a theatre.</p>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Movie</label>
                <select className="form-input" value={form.movie_id} onChange={(e) => setForm({ ...form, movie_id: e.target.value })} required>
                  <option value="">Select movie</option>
                  {movies.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Theatre</label>
                <select className="form-input" value={form.theatre_id} onChange={(e) => setForm({ ...form, theatre_id: e.target.value })} required>
                  <option value="">Select theatre</option>
                  {theatres.map((t) => <option key={t.id} value={t.id}>{t.name}{t.city ? ` — ${t.city}` : ''}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Screen</label>
                  <input className="form-input" value={form.screen} onChange={(e) => setForm({ ...form, screen: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Showtime</label>
                  <input className="form-input" type="datetime-local" value={form.showtime} onChange={(e) => setForm({ ...form, showtime: e.target.value })} required />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Price (₹)</label>
                  <input className="form-input" type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Total seats</label>
                  <input className="form-input" type="number" min="1" value={form.total_seats} onChange={(e) => setForm({ ...form, total_seats: e.target.value })} disabled={!!editing} />
                </div>
              </div>
              {editing && <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>Total seats can't be changed after creation.</p>}
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
