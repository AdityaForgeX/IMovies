export type Role = 'user' | 'admin';

export interface Profile {
  id: string;
  full_name: string | null;
  role: Role;
  created_at: string;
}

export interface Theatre {
  id: string;
  name: string;
  location: string | null;
  city: string | null;
  screens: number;
  total_seats: number;
  created_at: string;
}

export interface Movie {
  id: string;
  title: string;
  genre: string | null;
  language: string | null;
  duration_min: number | null;
  description: string | null;
  poster_url: string | null;
  rating: number | null;
  release_date: string | null;
  created_at: string;
}

export interface Show {
  id: string;
  movie_id: string;
  theatre_id: string;
  screen: string;
  showtime: string;
  price: number;
  total_seats: number;
  available_seats: number;
  created_at: string;
}

export interface ShowWithDetails extends Show {
  theatres: Theatre | null;
  movies: Movie | null;
}

export interface Booking {
  id: string;
  user_id: string;
  show_id: string;
  seats: string[];
  total_amount: number;
  status: 'confirmed' | 'cancelled';
  created_at: string;
  cancelled_at: string | null;
}

export interface BookingWithDetails extends Booking {
  shows: ShowWithDetails | null;
}
