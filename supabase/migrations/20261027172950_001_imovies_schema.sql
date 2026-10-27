/*
# IMovies Cinema Booking — Schema & Security

## Overview
Full schema for IMovies cinema booking: users browse movies/shows, select seats,
book tickets; admins manage movies, theatres, shows.

## 1. New Tables
- profiles (id→auth.users, full_name, role 'user'|'admin', created_at)
- theatres (name, location, city, screens, total_seats)
- movies (title, genre, language, duration_min, description, poster_url, rating, release_date)
- shows (movie_id, theatre_id, screen, showtime, price, total_seats, available_seats)
- bookings (user_id DEFAULT auth.uid(), show_id, seats text[], total_amount, status, cancelled_at)

## 2. Indexes
shows(movie_id), shows(theatre_id), shows(showtime), bookings(user_id/show_id/status).

## 3. RLS / Grants
- profiles: each user reads/updates own row; role is column-restricted (no user writes).
- movies/theatres/shows: public SELECT (anon+authenticated); admin-only writes via is_admin().
- bookings: owner-scoped CRUD.

## 4. Functions
- is_admin(): SECURITY DEFINER; admins detected from profiles.role.
- book_seats(): atomic booking with seat-conflict validation + availability decrement.
- cancel_booking(): owner-restricted cancellation + availability restoration.
- handle_new_user(): trigger to auto-create a profile row on signup.
*/

-- ---------- profiles ----------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  role text NOT NULL DEFAULT 'user',
  created_at timestamptz DEFAULT now()
);

-- ---------- theatres ----------
CREATE TABLE IF NOT EXISTS public.theatres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text,
  city text,
  screens int NOT NULL DEFAULT 1,
  total_seats int NOT NULL DEFAULT 120,
  created_at timestamptz DEFAULT now()
);

-- ---------- movies ----------
CREATE TABLE IF NOT EXISTS public.movies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  genre text,
  language text,
  duration_min int,
  description text,
  poster_url text,
  rating numeric(3,1) DEFAULT 0,
  release_date date,
  created_at timestamptz DEFAULT now()
);

-- ---------- shows ----------
CREATE TABLE IF NOT EXISTS public.shows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id uuid NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  theatre_id uuid NOT NULL REFERENCES public.theatres(id) ON DELETE CASCADE,
  screen text NOT NULL DEFAULT 'Screen 1',
  showtime timestamptz NOT NULL,
  price numeric(8,2) NOT NULL DEFAULT 250,
  total_seats int NOT NULL DEFAULT 120,
  available_seats int NOT NULL DEFAULT 120,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shows_movie ON public.shows(movie_id);
CREATE INDEX IF NOT EXISTS idx_shows_theatre ON public.shows(theatre_id);
CREATE INDEX IF NOT EXISTS idx_shows_showtime ON public.shows(showtime);

-- ---------- bookings ----------
CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  show_id uuid NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  seats text[] NOT NULL,
  total_amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'confirmed',
  created_at timestamptz DEFAULT now(),
  cancelled_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_bookings_user ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_show ON public.bookings(show_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);

-- ---------- helper: is_admin ----------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ---------- booking RPC ----------
CREATE OR REPLACE FUNCTION public.book_seats(p_show_id uuid, p_seats text[])
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings;
  v_show public.shows;
  v_price numeric(10,2);
  v_already_booked text[];
BEGIN
  IF array_length(p_seats, 1) IS NULL OR array_length(p_seats, 1) = 0 THEN
    RAISE EXCEPTION 'No seats selected';
  END IF;

  SELECT * INTO v_show FROM public.shows WHERE id = p_show_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Show not found'; END IF;

  SELECT COALESCE(array_agg(DISTINCT s), ARRAY[]::text[]) INTO v_already_booked
  FROM public.bookings b, unnest(b.seats) s
  WHERE b.show_id = p_show_id AND b.status = 'confirmed';

  IF v_already_booked && p_seats THEN
    RAISE EXCEPTION 'Some seats already booked';
  END IF;

  IF v_show.available_seats < array_length(p_seats, 1) THEN
    RAISE EXCEPTION 'Not enough seats available';
  END IF;

  v_price := v_show.price * array_length(p_seats, 1);

  INSERT INTO public.bookings (user_id, show_id, seats, total_amount, status)
  VALUES (auth.uid(), p_show_id, p_seats, v_price, 'confirmed')
  RETURNING * INTO v_booking;

  UPDATE public.shows
    SET available_seats = available_seats - array_length(p_seats, 1)
    WHERE id = p_show_id;

  RETURN v_booking;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.book_seats(uuid, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.book_seats(uuid, text[]) TO authenticated;

-- ---------- cancel booking RPC ----------
CREATE OR REPLACE FUNCTION public.cancel_booking(p_booking_id uuid)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings;
  v_seat_count int;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF v_booking.user_id <> auth.uid() THEN RAISE EXCEPTION 'Not your booking'; END IF;
  IF v_booking.status = 'cancelled' THEN RAISE EXCEPTION 'Already cancelled'; END IF;

  v_seat_count := array_length(v_booking.seats, 1);

  UPDATE public.bookings
    SET status = 'cancelled', cancelled_at = now()
    WHERE id = p_booking_id
    RETURNING * INTO v_booking;

  UPDATE public.shows
    SET available_seats = available_seats + v_seat_count
    WHERE id = v_booking.show_id;

  RETURN v_booking;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.cancel_booking(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_booking(uuid) TO authenticated;

-- ---------- auto profile on signup ----------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------- RLS: profiles ----------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (full_name) ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ---------- RLS: theatres ----------
ALTER TABLE public.theatres ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.theatres TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.theatres TO authenticated;

DROP POLICY IF EXISTS "theatres_select_public" ON public.theatres;
CREATE POLICY "theatres_select_public" ON public.theatres FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "theatres_insert_admin" ON public.theatres;
CREATE POLICY "theatres_insert_admin" ON public.theatres FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "theatres_update_admin" ON public.theatres;
CREATE POLICY "theatres_update_admin" ON public.theatres FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "theatres_delete_admin" ON public.theatres;
CREATE POLICY "theatres_delete_admin" ON public.theatres FOR DELETE
  TO authenticated USING (public.is_admin());

-- ---------- RLS: movies ----------
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.movies TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.movies TO authenticated;

DROP POLICY IF EXISTS "movies_select_public" ON public.movies;
CREATE POLICY "movies_select_public" ON public.movies FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "movies_insert_admin" ON public.movies;
CREATE POLICY "movies_insert_admin" ON public.movies FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "movies_update_admin" ON public.movies;
CREATE POLICY "movies_update_admin" ON public.movies FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "movies_delete_admin" ON public.movies;
CREATE POLICY "movies_delete_admin" ON public.movies FOR DELETE
  TO authenticated USING (public.is_admin());

-- ---------- RLS: shows ----------
ALTER TABLE public.shows ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.shows TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shows TO authenticated;

DROP POLICY IF EXISTS "shows_select_public" ON public.shows;
CREATE POLICY "shows_select_public" ON public.shows FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shows_insert_admin" ON public.shows;
CREATE POLICY "shows_insert_admin" ON public.shows FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "shows_update_admin" ON public.shows;
CREATE POLICY "shows_update_admin" ON public.shows FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "shows_delete_admin" ON public.shows;
CREATE POLICY "shows_delete_admin" ON public.shows FOR DELETE
  TO authenticated USING (public.is_admin());

-- ---------- RLS: bookings ----------
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;

DROP POLICY IF EXISTS "bookings_select_own" ON public.bookings;
CREATE POLICY "bookings_select_own" ON public.bookings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "bookings_insert_own" ON public.bookings;
CREATE POLICY "bookings_insert_own" ON public.bookings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "bookings_update_own" ON public.bookings;
CREATE POLICY "bookings_update_own" ON public.bookings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "bookings_delete_own" ON public.bookings;
CREATE POLICY "bookings_delete_own" ON public.bookings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
