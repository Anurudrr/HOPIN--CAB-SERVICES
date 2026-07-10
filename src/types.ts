import type { AppRole } from "./lib/roles";

export type UserRole = AppRole;
export type DriverApplicationStatus = "pending" | "approved" | "rejected";
export type RideStatus = "scheduled" | "active" | "completed" | "cancelled";
export type BookingStatus =
  | "pending"
  | "accepted"
  | "arriving"
  | "ongoing"
  | "completed"
  | "cancelled"
  | "searching"
  | "matched"
  | "confirmed"
  | "in_progress"
  | "scheduled"
  | "active";

export type ProviderAvailabilityStatus = "available" | "busy" | "offline";
export type NotificationKind =
  | "booking_created"
  | "booking_status"
  | "system"
  | "review"
  | "payment"
  | "security";
export type TransactionStatus = "pending" | "paid" | "refunded" | "failed";
export type PaymentMethod = "cash" | "upi" | "card" | "wallet";

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  email: string | null;
  role: UserRole;
  city: string | null;
  gender: string | null;
  home_address: string | null;
  work_address: string | null;
  is_phone_verified: boolean;
  is_email_verified: boolean;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  driver_id: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
  color: string;
  capacity: number;
  created_at: string;
}

export interface Service {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  base_fare: number;
  price_per_km: number;
  price_per_minute: number;
  icon_name: string | null;
  accent_label: string | null;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface Provider {
  id: string;
  profile_id: string;
  headline: string | null;
  bio: string | null;
  availability_status: ProviderAvailabilityStatus;
  is_available: boolean;
  rating: number;
  total_reviews: number;
  completed_bookings: number;
  service_radius_km: number;
  response_time_min: number;
  current_lat: number | null;
  current_lng: number | null;
  current_address: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
  profile?: Pick<Profile, "id" | "full_name" | "avatar_url" | "city"> | null;
}

export interface DriverApplication {
  id: string;
  user_id: string;
  status: DriverApplicationStatus;
  license_number: string;
  license_expiry: string;
  document_url: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface Ride {
  id: string;
  driver_id: string | null;
  service_id?: string | null;
  origin_name: string;
  origin_lat: number;
  origin_lng: number;
  destination_name: string;
  destination_lat: number;
  destination_lng: number;
  city: string;
  departure_time: string;
  seats_total: number;
  seats_available: number;
  fare_per_seat: number;
  status: RideStatus;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  driver: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  service?: Service | null;
  provider?: Provider | null;
  vehicle: Pick<Vehicle, "make" | "model" | "color" | "license_plate"> | null;
}

export interface Booking {
  id: string;
  ride_id: string;
  service_id?: string | null;
  provider_id?: string | null;
  rider_id: string;
  driver_id: string | null;
  booking_code?: string | null;
  qr_token?: string | null;
  city: string;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dest_address: string;
  dest_lat: number;
  dest_lng: number;
  fare_total: number;
  subtotal_amount?: number | null;
  platform_fee?: number | null;
  tax_amount?: number | null;
  fare_shared: number;
  seats: number;
  distance_km?: number | null;
  eta_minutes?: number | null;
  special_instructions?: string | null;
  provider_notes?: string | null;
  rebooked_from_booking_id?: string | null;
  invoice_number?: string | null;
  status: BookingStatus;
  created_at: string;
  departure_time: string | null;
  accepted_at?: string | null;
  arriving_at?: string | null;
  ongoing_at?: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  driver_name: string | null;
  vehicle_label: string | null;
  service?: Service | null;
  provider?: Provider | null;
  rider?: Pick<Profile, "id" | "full_name" | "avatar_url" | "phone"> | null;
}

export interface DriverDashboardData {
  application: DriverApplication | null;
  vehicles: Vehicle[];
  rides: Ride[];
  bookings?: Booking[];
  provider?: Provider | null;
}

export interface RiderDashboardData {
  recentBookings: Booking[];
  savedLocations?: SavedLocation[];
  notifications?: NotificationItem[];
}

export interface DriverApplicationInput {
  licenseNumber: string;
  licenseExpiry: string;
  documentUrl: string;
  make: string;
  model: string;
  year: number;
  plate: string;
  color: string;
  capacity: number;
}

export interface ContactMessageInput {
  name: string;
  email: string;
  topic: string;
  message: string;
  requestedRole?: string | null;
  requestedCity?: string | null;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  requested_role: string | null;
  requested_city: string | null;
  created_at: string;
}

export interface NewsletterSubscription {
  email: string;
  created_at: string;
}

export interface SupportChatEvent {
  id: string;
  user_id: string | null;
  request_id: string;
  status: "accepted" | "rate_limited" | "success" | "error";
  message_count: number;
  input_char_count: number;
  output_char_count: number | null;
  model: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  completed_at: string | null;
  user?: Pick<Profile, "id" | "full_name" | "email"> | null;
}

export interface BackendJobRun {
  id: string;
  job_name: string;
  status: "started" | "success" | "error";
  details: Record<string, unknown>;
  started_at: string;
  completed_at: string | null;
}

export interface Review {
  id: string;
  booking_id: string;
  reviewer_id: string;
  provider_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  receiver_id: string;
  actor_id: string | null;
  title: string;
  body: string;
  kind: NotificationKind;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export interface Transaction {
  id: string;
  booking_id: string;
  user_id: string;
  provider_id: string | null;
  amount: number;
  platform_fee: number;
  tax_amount: number;
  payment_method: PaymentMethod;
  status: TransactionStatus;
  receipt_url: string | null;
  created_at: string;
}

export interface SavedLocation {
  id: string;
  user_id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  is_default: boolean;
  created_at: string;
}

export interface BookingTimelineItem {
  key: string;
  label: string;
  description: string;
  timestamp: string | null;
  completed: boolean;
}

export interface BookingFormInput {
  serviceId: string;
  rideId: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  destAddress: string;
  destLat: number;
  destLng: number;
  seats: number;
  specialInstructions?: string;
}

export interface BookingReceipt {
  booking: Booking;
  service: Service | null;
  provider: Provider | null;
  transaction: Transaction | null;
}

export interface AdminDashboardData {
  metrics: {
    totalUsers: number;
    totalProviders: number;
    totalBookings: number;
    totalRevenue: number;
    activeBookings: number;
    averageRating: number;
  };
  recentBookings: Booking[];
  services: Service[];
  providers: Provider[];
  users: Profile[];
  reviews: Review[];
  transactions: Transaction[];
  notifications: NotificationItem[];
}

export interface RideInput {
  service_id?: string | null;
  origin_name: string;
  origin_lat: number;
  origin_lng: number;
  destination_name: string;
  destination_lat: number;
  destination_lng: number;
  city: string;
  departure_time: string;
  seats_total: number;
  fare_per_seat: number;
}
