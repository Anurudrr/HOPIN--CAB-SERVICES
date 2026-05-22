/**
 * API Integration Tests
 *
 * Tests for booking API, ride queries, and cancellation flows against the
 * current Supabase API contract used by the frontend.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { createQueryBuilder, mockAuthUser, mockSupabaseClient, resetMockSupabase } from "../mocks/supabase";
import type { Booking, Ride } from "../types";

import { bookRide, cancelBooking, getAvailableRides } from "./api";

vi.mock("./supabase", () => ({
  supabase: mockSupabaseClient,
}));

describe("API Integration: Rides", () => {
  beforeEach(() => {
    resetMockSupabase();
  });

  it("fetches available rides for a city", async () => {
    const mockRides: Ride[] = [
      {
        id: "ride-1",
        driver_id: "driver-1",
        origin_name: "Airport",
        origin_lat: 19.0876,
        origin_lng: 72.8194,
        destination_name: "Downtown",
        destination_lat: 19.076,
        destination_lng: 72.8777,
        city: "Mumbai",
        departure_time: new Date().toISOString(),
        seats_total: 4,
        seats_available: 2,
        fare_per_seat: 250,
        status: "scheduled",
        created_at: new Date().toISOString(),
        started_at: null,
        completed_at: null,
        cancelled_at: null,
        cancel_reason: null,
        driver: {
          id: "driver-1",
          full_name: "John Driver",
          avatar_url: null,
        },
        vehicle: {
          make: "Maruti",
          model: "Swift",
          color: "White",
          license_plate: "MH01AA1234",
        },
      },
    ];

    mockSupabaseClient.rpc.mockResolvedValueOnce({
      data: mockRides,
      error: null,
    });

    await expect(getAvailableRides("Mumbai")).resolves.toEqual(mockRides);
  });

  it("returns an empty array for an invalid city", async () => {
    await expect(getAvailableRides("")).resolves.toEqual([]);
  });

  it("surfaces API errors with a user-friendly message", async () => {
    mockSupabaseClient.rpc.mockResolvedValue({
      data: null,
      error: new Error("network timeout"),
    });

    await expect(getAvailableRides("Mumbai")).rejects.toThrow(
      "Network error. Please check your connection and try again",
    );
  });
});

describe("API Integration: Bookings", () => {
  beforeEach(() => {
    resetMockSupabase();
  });

  it("creates a booking with all required fields", async () => {
    const mockBookingResponse: Booking = {
      id: "booking-1",
      ride_id: "ride-1",
      rider_id: mockAuthUser.id,
      driver_id: "driver-1",
      city: "Mumbai",
      pickup_address: "Airport Terminal 1",
      pickup_lat: 19.0876,
      pickup_lng: 72.8194,
      dest_address: "Downtown",
      dest_lat: 19.076,
      dest_lng: 72.8777,
      fare_total: 500,
      fare_shared: 250,
      seats: 2,
      status: "confirmed",
      created_at: new Date().toISOString(),
      departure_time: new Date().toISOString(),
      started_at: null,
      completed_at: null,
      cancelled_at: null,
      cancel_reason: null,
      driver_name: "John Driver",
      vehicle_label: "Maruti Swift - MH01AA1234",
    };

    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: mockAuthUser },
    });
    mockSupabaseClient.rpc.mockResolvedValueOnce({
      data: mockBookingResponse.id,
      error: null,
    });
    mockSupabaseClient.from.mockReturnValueOnce(
      createQueryBuilder({
        data: mockBookingResponse,
        error: null,
      }),
    );

    const booking = await bookRide(
      "ride-1",
      2,
      "Airport Terminal 1",
      19.0876,
      72.8194,
      "Downtown",
      19.076,
      72.8777,
    );

    expect(booking).toEqual(mockBookingResponse);
    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith("book_ride", {
      p_ride_id: "ride-1",
      p_rider_id: mockAuthUser.id,
      p_seats: 2,
      p_pickup_address: "Airport Terminal 1",
      p_pickup_lat: 19.0876,
      p_pickup_lng: 72.8194,
      p_dest_address: "Downtown",
      p_dest_lat: 19.076,
      p_dest_lng: 72.8777,
    });
  });

  it("includes driver and vehicle information in booking details", async () => {
    const mockBooking: Booking = {
      id: "booking-1",
      ride_id: "ride-1",
      rider_id: mockAuthUser.id,
      driver_id: "driver-1",
      city: "Mumbai",
      pickup_address: "Point A",
      pickup_lat: 19,
      pickup_lng: 72,
      dest_address: "Point B",
      dest_lat: 19.1,
      dest_lng: 72.1,
      fare_total: 500,
      fare_shared: 250,
      seats: 1,
      status: "confirmed",
      created_at: new Date().toISOString(),
      departure_time: new Date().toISOString(),
      started_at: null,
      completed_at: null,
      cancelled_at: null,
      cancel_reason: null,
      driver_name: "Jane Smith",
      vehicle_label: "Honda City - MH02AB5678",
    };

    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: mockAuthUser },
    });
    mockSupabaseClient.rpc.mockResolvedValueOnce({
      data: mockBooking.id,
      error: null,
    });
    mockSupabaseClient.from.mockReturnValueOnce(
      createQueryBuilder({
        data: mockBooking,
        error: null,
      }),
    );

    const booking = await bookRide("ride-1", 1, "A", 19, 72, "B", 19.1, 72.1);

    expect(booking.driver_name).toBe("Jane Smith");
    expect(booking.vehicle_label).toContain("Honda City");
  });

  it("throws booking errors with a user-friendly message", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: mockAuthUser },
    });
    mockSupabaseClient.rpc.mockResolvedValueOnce({
      data: null,
      error: new Error("Insufficient seats available"),
    });

    await expect(bookRide("ride-1", 10, "A", 19, 72, "B", 19.1, 72.1)).rejects.toThrow(
      "Insufficient seats available",
    );
  });
});

describe("API Integration: Booking Cancellation", () => {
  beforeEach(() => {
    resetMockSupabase();
  });

  it("cancels a booking successfully", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: mockAuthUser },
    });
    mockSupabaseClient.rpc.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    await expect(cancelBooking("booking-1")).resolves.toBeUndefined();
    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith("cancel_booking", {
      p_booking_id: "booking-1",
      p_rider_id: mockAuthUser.id,
    });
  });

  it("throws on cancellation errors", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: mockAuthUser },
    });
    mockSupabaseClient.rpc.mockResolvedValueOnce({
      data: null,
      error: new Error("Booking already completed"),
    });

    await expect(cancelBooking("booking-1")).rejects.toThrow("Booking already completed");
  });
});
