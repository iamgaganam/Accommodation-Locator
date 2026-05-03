// ─── User Types ─────────────────────────────────────────────────────
export type UserRole = "admin" | "landlord" | "warden" | "student";

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

// ─── Property Types ─────────────────────────────────────────────────
export type PropertyStatus = "pending" | "approved" | "rejected";
export type PropertyType = "Studio" | "Flat" | "House" | "Room";

export interface PropertyImage {
  id: number;
  property_id: number;
  image_url: string;
  is_primary: boolean;
  created_at: string;
}

export interface Property {
  id: number;
  landlord_id: number;
  landlord: User;
  title: string;
  description: string;
  property_type: PropertyType;
  bedrooms: number;
  bathrooms: number;
  max_occupants: number;
  rent_amount: number;
  address: string;
  city: string;
  postcode: string;
  latitude: number;
  longitude: number;
  status: PropertyStatus;
  rejection_reason: string;
  images: PropertyImage[];
  reservations?: Reservation[];
  created_at: string;
  updated_at: string;
}

// ─── Reservation Types ──────────────────────────────────────────────
export type ReservationStatus = "pending" | "accepted" | "denied";

export interface Reservation {
  id: number;
  property_id: number;
  property: Property;
  student_id: number;
  student: User;
  status: ReservationStatus;
  message: string;
  landlord_response: string;
  created_at: string;
  updated_at: string;
}

// ─── Article Types ──────────────────────────────────────────────────
export interface Article {
  id: number;
  author_id: number;
  author: User;
  title: string;
  content: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}

// ─── API Response Types ─────────────────────────────────────────────
export interface PaginatedResponse<T> {
  total: number;
  page: number;
  limit: number;
  [key: string]: T[] | number;
}

export interface AuthResponse {
  token: string;
  user: User;
}
