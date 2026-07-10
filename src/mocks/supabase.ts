import { vi } from "vitest";

import type { Booking, Profile, Ride } from "../types";
import type { ProfileRow } from "../lib/profile";

export const mockAuthUser = {
  id: "user-123",
  email: "rider@example.com",
  email_confirmed_at: "2026-05-20T10:00:00.000Z",
  user_metadata: {
    full_name: "Aarav Rider",
  },
};

export const mockProfileRow: ProfileRow = {
  id: "user-123",
  full_name: "Aarav Rider",
  phone: "9876543210",
  email: "rider@example.com",
  city: "Bangalore",
  role: "rider",
  gender: "M",
  home_address: "Indiranagar, Bangalore",
  work_address: "Koramangala, Bangalore",
  avatar_url: null,
  is_phone_verified: false,
  is_email_verified: true,
  onboarding_completed: true,
  created_at: "2026-05-20T10:00:00.000Z",
  updated_at: "2026-05-20T10:00:00.000Z",
};

export const mockProfile: Profile = {
  ...mockProfileRow,
  role: "user",
  avatar_url: null,
  is_phone_verified: false,
  is_email_verified: true,
  onboarding_completed: true,
};

export const mockRide: Ride = {
  id: "ride-123",
  driver_id: "driver-123",
  service_id: "service-123",
  origin_name: "Indiranagar 100ft Rd, Bangalore",
  origin_lat: 12.9716,
  origin_lng: 77.6412,
  destination_name: "Koramangala 4th Block, Bangalore",
  destination_lat: 12.9317,
  destination_lng: 77.6227,
  city: "Bangalore",
  departure_time: "2026-05-22T08:30:00.000Z",
  seats_total: 4,
  seats_available: 3,
  fare_per_seat: 180,
  status: "scheduled",
  created_at: "2026-05-20T10:00:00.000Z",
  started_at: null,
  completed_at: null,
  cancelled_at: null,
  cancel_reason: null,
  driver: {
    id: "driver-123",
    full_name: "Rahul Driver",
    avatar_url: null,
  },
  vehicle: {
    make: "Hyundai",
    model: "Creta",
    color: "White",
    license_plate: "KA01AB1234",
  },
};

export const mockBooking: Booking = {
  id: "booking-123",
  ride_id: "ride-123",
  service_id: "service-123",
  rider_id: "user-123",
  driver_id: "driver-123",
  city: "Bangalore",
  pickup_address: mockRide.origin_name,
  pickup_lat: mockRide.origin_lat,
  pickup_lng: mockRide.origin_lng,
  dest_address: mockRide.destination_name,
  dest_lat: mockRide.destination_lat,
  dest_lng: mockRide.destination_lng,
  fare_total: 360,
  fare_shared: 180,
  seats: 2,
  status: "pending",
  created_at: "2026-05-20T10:00:00.000Z",
  departure_time: mockRide.departure_time,
  started_at: null,
  completed_at: null,
  cancelled_at: null,
  cancel_reason: null,
  driver_name: "Rahul Driver",
  vehicle_label: "White Hyundai Creta",
};

type MockQueryBuilder<T> = Pick<Promise<T>, "then" | "catch" | "finally"> & {
  select: (...args: unknown[]) => MockQueryBuilder<T>;
  eq: (...args: unknown[]) => MockQueryBuilder<T>;
  in: (...args: unknown[]) => MockQueryBuilder<T>;
  gt: (...args: unknown[]) => MockQueryBuilder<T>;
  gte: (...args: unknown[]) => MockQueryBuilder<T>;
  order: (...args: unknown[]) => MockQueryBuilder<T>;
  limit: (...args: unknown[]) => MockQueryBuilder<T>;
  maybeSingle: (...args: unknown[]) => MockQueryBuilder<T>;
  single: (...args: unknown[]) => MockQueryBuilder<T>;
  insert: (...args: unknown[]) => MockQueryBuilder<T>;
  update: (...args: unknown[]) => MockQueryBuilder<T>;
  upsert: (...args: unknown[]) => MockQueryBuilder<T>;
  [Symbol.toStringTag]: string;
};

export function createQueryBuilder<T>(result: T) {
  const promise = Promise.resolve(result);
  const builder = {} as MockQueryBuilder<T>;

  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.in = vi.fn(() => builder);
  builder.gt = vi.fn(() => builder);
  builder.gte = vi.fn(() => builder);
  builder.order = vi.fn(() => builder);
  builder.limit = vi.fn(() => builder);
  builder.maybeSingle = vi.fn(() => builder);
  builder.single = vi.fn(() => builder);
  builder.insert = vi.fn(() => builder);
  builder.update = vi.fn(() => builder);
  builder.upsert = vi.fn(() => builder);
  builder.then = promise.then.bind(promise);
  builder.catch = promise.catch.bind(promise);
  builder.finally = promise.finally.bind(promise);
  builder[Symbol.toStringTag] = "Promise";

  return builder;
}

function createRealtimeChannel() {
  const channel = {} as {
    on: (...args: unknown[]) => typeof channel;
    subscribe: (...args: unknown[]) => typeof channel;
  };

  channel.on = vi.fn(() => channel);
  channel.subscribe = vi.fn(() => channel);

  return channel;
}

export const mockSupabaseClient = {
  auth: {
    getSession: vi.fn(),
    getUser: vi.fn(),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    resend: vi.fn(),
    setSession: vi.fn(),
    exchangeCodeForSession: vi.fn(),
    verifyOtp: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    })),
  },
  from: vi.fn(),
  functions: {
    invoke: vi.fn(),
  },
  rpc: vi.fn(),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn(() => ({
        data: { publicUrl: "https://example.com/avatar.png" },
      })),
    })),
  },
  channel: vi.fn(() => createRealtimeChannel()),
  removeChannel: vi.fn(),
};

export function resetMockSupabase() {
  vi.clearAllMocks();

  mockSupabaseClient.auth.getSession.mockResolvedValue({
    data: { session: null },
  });
  mockSupabaseClient.auth.getUser.mockResolvedValue({
    data: { user: mockAuthUser },
  });
  mockSupabaseClient.auth.signUp.mockResolvedValue({ error: null });
  mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({ error: null });
  mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });
  mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({ error: null });
  mockSupabaseClient.auth.updateUser.mockResolvedValue({ error: null });
  mockSupabaseClient.auth.resend.mockResolvedValue({ error: null });
  mockSupabaseClient.auth.setSession.mockResolvedValue({ data: { session: null }, error: null });
  mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
    data: { session: null, user: mockAuthUser },
    error: null,
  });
  mockSupabaseClient.auth.verifyOtp.mockResolvedValue({ error: null });
  mockSupabaseClient.functions.invoke.mockResolvedValue({ data: null, error: null });
  mockSupabaseClient.rpc.mockResolvedValue({ data: null, error: null });
  mockSupabaseClient.from.mockImplementation(() => createQueryBuilder({ data: null, error: null }));
  mockSupabaseClient.storage.from.mockImplementation(() => ({
    upload: vi.fn().mockResolvedValue({ error: null }),
    getPublicUrl: vi.fn(() => ({
      data: { publicUrl: "https://example.com/avatar.png" },
    })),
  }));
  mockSupabaseClient.channel.mockImplementation(() => createRealtimeChannel());
  mockSupabaseClient.removeChannel.mockResolvedValue(undefined);
}
