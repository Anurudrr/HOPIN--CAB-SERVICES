/**
 * API Integration Tests
 * 
 * Tests for booking API, ride queries, and error handling
 * These tests verify the data flow between frontend and Supabase
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getAvailableRides,
  bookRide,
  cancelBooking,
  getBookingDetails,
} from '../lib/api';
import { mockSupabaseClient, resetMockSupabase, createQueryBuilder } from '../mocks/supabase';
import type { Ride, Booking } from '../types';

vi.mock('../lib/supabase', () => ({
  supabase: mockSupabaseClient,
}));

describe('API Integration: Rides', () => {
  beforeEach(() => {
    resetMockSupabase();
  });

  it('fetches available rides for a city', async () => {
    const mockRides: Ride[] = [
      {
        id: 'ride-1',
        driver_id: 'driver-1',
        origin_name: 'Airport',
        origin_lat: 19.0876,
        origin_lng: 72.8194,
        destination_name: 'Downtown',
        destination_lat: 19.0760,
        destination_lng: 72.8777,
        city: 'Mumbai',
        departure_time: new Date().toISOString(),
        seats_total: 4,
        seats_available: 2,
        fare_per_seat: 250,
        status: 'scheduled',
        created_at: new Date().toISOString(),
        started_at: null,
        completed_at: null,
        cancelled_at: null,
        cancel_reason: null,
        driver: {
          id: 'driver-1',
          full_name: 'John Driver',
          avatar_url: null,
        },
        vehicle: {
          make: 'Maruti',
          model: 'Swift',
          color: 'White',
          license_plate: 'MH01AA1234',
        },
      },
    ];

    mockSupabaseClient.from.mockReturnValueOnce(
      createQueryBuilder({
        data: mockRides,
        error: null,
      })
    );

    const rides = await getAvailableRides('Mumbai');

    expect(rides).toHaveLength(1);
    expect(rides[0].id).toBe('ride-1');
    expect(rides[0].seats_available).toBe(2);
    expect(rides[0].driver?.full_name).toBe('John Driver');
  });

  it('returns empty array for invalid city', async () => {
    const rides = await getAvailableRides('');
    expect(rides).toEqual([]);
  });

  it('handles API errors gracefully', async () => {
    mockSupabaseClient.from.mockReturnValueOnce(
      createQueryBuilder({
        data: null,
        error: new Error('Network error'),
      })
    );

    const rides = await getAvailableRides('Mumbai');
    expect(rides).toEqual([]);
  });
});

describe('API Integration: Bookings', () => {
  beforeEach(() => {
    resetMockSupabase();
  });

  it('creates a booking with all required fields', async () => {
    const mockBookingResponse: Booking = {
      id: 'booking-1',
      ride_id: 'ride-1',
      rider_id: 'rider-1',
      driver_id: 'driver-1',
      city: 'Mumbai',
      pickup_address: 'Airport Terminal 1',
      pickup_lat: 19.0876,
      pickup_lng: 72.8194,
      dest_address: 'Downtown',
      dest_lat: 19.0760,
      dest_lng: 72.8777,
      fare_total: 500,
      fare_shared: 250,
      seats: 2,
      status: 'confirmed',
      created_at: new Date().toISOString(),
      departure_time: new Date().toISOString(),
      started_at: null,
      completed_at: null,
      cancelled_at: null,
      cancel_reason: null,
      driver_name: 'John Driver',
      vehicle_label: 'Maruti Swift - MH01AA1234',
    };

    mockSupabaseClient.rpc.mockResolvedValueOnce({
      data: mockBookingResponse,
      error: null,
    });

    const booking = await bookRide(
      'ride-1',
      'rider-1',
      2,
      'Airport Terminal 1',
      19.0876,
      72.8194,
      'Downtown',
      19.0760,
      72.8777
    );

    expect(booking?.id).toBe('booking-1');
    expect(booking?.seats).toBe(2);
    expect(booking?.driver_name).toBe('John Driver');
    expect(booking?.fare_total).toBe(500);
  });

  it('includes driver and vehicle information in booking', async () => {
    const mockBooking: Booking = {
      id: 'booking-1',
      ride_id: 'ride-1',
      rider_id: 'rider-1',
      driver_id: 'driver-1',
      city: 'Mumbai',
      pickup_address: 'Point A',
      pickup_lat: 19.0,
      pickup_lng: 72.0,
      dest_address: 'Point B',
      dest_lat: 19.1,
      dest_lng: 72.1,
      fare_total: 500,
      fare_shared: 250,
      seats: 1,
      status: 'confirmed',
      created_at: new Date().toISOString(),
      departure_time: new Date().toISOString(),
      started_at: null,
      completed_at: null,
      cancelled_at: null,
      cancel_reason: null,
      driver_name: 'Jane Smith',
      vehicle_label: 'Honda City - MH02AB5678',
    };

    mockSupabaseClient.rpc.mockResolvedValueOnce({
      data: mockBooking,
      error: null,
    });

    const booking = await bookRide('ride-1', 'rider-1', 1, 'A', 19, 72, 'B', 19.1, 72.1);

    expect(booking?.driver_name).toBe('Jane Smith');
    expect(booking?.vehicle_label).toContain('Honda City');
  });

  it('handles booking errors with user-friendly messages', async () => {
    mockSupabaseClient.rpc.mockResolvedValueOnce({
      data: null,
      error: new Error('Insufficient seats available'),
    });

    const booking = await bookRide('ride-1', 'rider-1', 10, 'A', 19, 72, 'B', 19.1, 72.1);

    expect(booking).toBeNull();
  });
});

describe('API Integration: Booking Cancellation', () => {
  beforeEach(() => {
    resetMockSupabase();
  });

  it('cancels a booking successfully', async () => {
    mockSupabaseClient.rpc.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const result = await cancelBooking('booking-1', 'Rider changed mind');

    expect(result).toBe(true);
    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('cancel_booking', {
      booking_id: 'booking-1',
      cancel_reason: 'Rider changed mind',
    });
  });

  it('returns false on cancellation error', async () => {
    mockSupabaseClient.rpc.mockResolvedValueOnce({
      data: null,
      error: new Error('Booking already completed'),
    });

    const result = await cancelBooking('booking-1', 'Late cancellation');

    expect(result).toBe(false);
  });
});

describe('API Integration: Booking Details', () => {
  beforeEach(() => {
    resetMockSupabase();
  });

  it('fetches booking details with driver and ride information', async () => {
    const mockBooking: Booking = {
      id: 'booking-1',
      ride_id: 'ride-1',
      rider_id: 'rider-1',
      driver_id: 'driver-1',
      city: 'Mumbai',
      pickup_address: 'Home',
      pickup_lat: 19.0,
      pickup_lng: 72.0,
      dest_address: 'Office',
      dest_lat: 19.1,
      dest_lng: 72.1,
      fare_total: 300,
      fare_shared: 150,
      seats: 2,
      status: 'in_progress',
      created_at: new Date().toISOString(),
      departure_time: new Date().toISOString(),
      started_at: new Date().toISOString(),
      completed_at: null,
      cancelled_at: null,
      cancel_reason: null,
      driver_name: 'Ahmed Khan',
      vehicle_label: 'Toyota Innova - MH03CD9101',
    };

    mockSupabaseClient.from.mockReturnValueOnce(
      createQueryBuilder({
        data: [mockBooking],
        error: null,
      })
    );

    const booking = await getBookingDetails('booking-1');

    expect(booking?.id).toBe('booking-1');
    expect(booking?.status).toBe('in_progress');
    expect(booking?.driver_name).toBe('Ahmed Khan');
    expect(booking?.seats).toBe(2);
  });

  it('returns null for non-existent booking', async () => {
    mockSupabaseClient.from.mockReturnValueOnce(
      createQueryBuilder({
        data: [],
        error: null,
      })
    );

    const booking = await getBookingDetails('non-existent');

    expect(booking).toBeNull();
  });
});
