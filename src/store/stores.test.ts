import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  mockBooking,
  createQueryBuilder,
  mockAuthUser,
  mockProfileRow,
  mockRide,
  mockSupabaseClient,
  resetMockSupabase,
} from "../mocks/supabase";

const { bookRideMock, cancelBookingMock, toastMock } = vi.hoisted(() => ({
  bookRideMock: vi.fn(),
  cancelBookingMock: vi.fn(),
  toastMock: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../lib/supabase", () => ({
  supabase: mockSupabaseClient,
}));

vi.mock("../lib/api", () => ({
  bookRide: bookRideMock,
  cancelBooking: cancelBookingMock,
}));

vi.mock("../lib/toast", () => ({
  toast: toastMock,
}));

import { useAuthStore } from "./useAuthStore";
import { useBookingStore } from "./useBookingStore";

describe("useAuthStore", () => {
  beforeEach(() => {
    resetMockSupabase();
    bookRideMock.mockReset().mockResolvedValue(mockBooking);
    cancelBookingMock.mockReset().mockResolvedValue(undefined);
    toastMock.success.mockReset();
    toastMock.error.mockReset();
    useAuthStore.setState({
      user: null,
      session: null,
      profile: null,
      loading: true,
    });
  });

  it("starts in a loading state", () => {
    const state = useAuthStore.getState();

    expect(state.user).toBeNull();
    expect(state.profile).toBeNull();
    expect(state.loading).toBe(true);
  });

  it("calls sign up with the expected payload", async () => {
    await useAuthStore.getState().signUp("rider@example.com", "password123", "Aarav Rider");

    expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
      email: "rider@example.com",
      password: "password123",
      options: {
        data: { full_name: "Aarav Rider" },
        emailRedirectTo: "http://localhost:3000/verify-email",
      },
    });
  });

  it("calls sign in with the expected payload", async () => {
    await useAuthStore.getState().signIn("rider@example.com", "password123");

    expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "rider@example.com",
      password: "password123",
    });
  });

  it("verifies email tokens using the modern email verification type first", async () => {
    await useAuthStore.getState().verifyEmailOtp("rider@example.com", "123456");

    expect(mockSupabaseClient.auth.verifyOtp).toHaveBeenCalledWith({
      email: "rider@example.com",
      token: "123456",
      type: "email",
    });
  });

  it("completes redirected email verification by exchanging the auth code", async () => {
    await useAuthStore.getState().completeEmailVerification({
      code: "auth-code-123",
    });

    expect(mockSupabaseClient.auth.exchangeCodeForSession).toHaveBeenCalledWith("auth-code-123");
  });

  it("loads a profile for the current user", async () => {
    useAuthStore.setState({
      user: mockAuthUser as never,
      session: null,
      profile: null,
      loading: false,
    });
    mockSupabaseClient.from
      .mockReturnValueOnce(
        createQueryBuilder({
          data: mockProfileRow,
          error: null,
        }),
      )
      .mockReturnValueOnce(
        createQueryBuilder({
          data: { status: "approved" },
          error: null,
        }),
      );

    await useAuthStore.getState().fetchProfile();

    expect(useAuthStore.getState().profile?.id).toBe(mockProfileRow.id);
    expect(useAuthStore.getState().profile?.role).toBe("provider");
  });

  it("clears auth state when signing out", async () => {
    useAuthStore.setState({
      user: mockAuthUser as never,
      session: {} as never,
      profile: {
        id: mockProfileRow.id,
        full_name: mockProfileRow.full_name,
        avatar_url: null,
        phone: mockProfileRow.phone,
        email: mockProfileRow.email,
        role: "user",
        city: mockProfileRow.city,
        gender: mockProfileRow.gender,
        home_address: mockProfileRow.home_address,
        work_address: mockProfileRow.work_address,
        is_phone_verified: false,
        is_email_verified: true,
        onboarding_completed: true,
        created_at: mockProfileRow.created_at,
        updated_at: mockProfileRow.updated_at,
      },
      loading: false,
    });

    await useAuthStore.getState().signOut();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().profile).toBeNull();
  });
});

describe("useBookingStore", () => {
  beforeEach(() => {
    resetMockSupabase();
    useBookingStore.getState().reset();
  });

  it("selects a ride and computes the initial fare estimate", () => {
    useBookingStore.getState().selectRide(mockRide);

    const state = useBookingStore.getState();
    expect(state.selectedRide?.id).toBe(mockRide.id);
    expect(state.currentRequest.fareEstimate).toBe(mockRide.fare_per_seat);
  });

  it("recomputes fare estimates when switching to a ride with fewer seats", () => {
    const nextRide = {
      ...mockRide,
      id: "ride-456",
      seats_available: 1,
      fare_per_seat: 320,
    };

    useBookingStore.getState().selectRide(mockRide);
    useBookingStore.getState().setSeats(3);
    useBookingStore.getState().selectRide(nextRide);

    expect(useBookingStore.getState().currentRequest.seats).toBe(1);
    expect(useBookingStore.getState().currentRequest.fareEstimate).toBe(320);
  });

  it("clamps requested seats to the ride inventory", () => {
    useBookingStore.getState().selectRide(mockRide);
    useBookingStore.getState().setSeats(99);

    expect(useBookingStore.getState().currentRequest.seats).toBe(mockRide.seats_available);
  });

  it("stores derived quote details and restores the base fare when cleared", () => {
    useBookingStore.getState().selectRide(mockRide);
    useBookingStore.getState().setSeats(2);
    useBookingStore.getState().setQuoteDetails({
      subtotal: 720,
      platformFee: 57.6,
      taxAmount: 36,
      total: 813.6,
      distanceKm: 10,
      durationMin: 20,
    });

    expect(useBookingStore.getState().currentRequest).toMatchObject({
      fareEstimate: 813.6,
      subtotalAmount: 720,
      platformFee: 57.6,
      taxAmount: 36,
      distanceKm: 10,
      etaMinutes: 20,
    });

    useBookingStore.getState().setQuoteDetails(null);

    expect(useBookingStore.getState().currentRequest).toMatchObject({
      seats: 2,
      fareEstimate: mockRide.fare_per_seat * 2,
    });
    expect(useBookingStore.getState().currentRequest.subtotalAmount).toBeUndefined();
    expect(useBookingStore.getState().currentRequest.platformFee).toBeUndefined();
    expect(useBookingStore.getState().currentRequest.taxAmount).toBeUndefined();
    expect(useBookingStore.getState().currentRequest.distanceKm).toBeUndefined();
    expect(useBookingStore.getState().currentRequest.etaMinutes).toBeUndefined();
  });

  it("returns an error when starting a search without a selected ride", async () => {
    const result = await useBookingStore.getState().startSearch();

    expect(result).toBeNull();
    expect(useBookingStore.getState().bookingError).toBe("Choose a live ride before booking.");
    expect(toastMock.error).toHaveBeenCalledWith("Choose a live ride before booking.");
  });

  it("returns an error when route endpoints are missing", async () => {
    useBookingStore.setState({
      selectedRide: mockRide,
      currentRequest: {
        rideId: mockRide.id,
        seats: 1,
      },
    });

    const result = await useBookingStore.getState().startSearch();

    expect(result).toBeNull();
    expect(useBookingStore.getState().bookingError).toBe(
      "Ride endpoints are missing. Re-select the route and try again.",
    );
    expect(toastMock.error).toHaveBeenCalledWith(
      "Ride endpoints are missing. Re-select the route and try again.",
    );
  });

  it("cancels the active booking through the booking API", async () => {
    useBookingStore.setState({
      activeRide: mockBooking,
      selectedRide: mockRide,
      currentRequest: {
        rideId: mockRide.id,
        seats: 2,
      },
    });

    await useBookingStore.getState().cancelSearch();

    expect(cancelBookingMock).toHaveBeenCalledWith(mockBooking.id);
    expect(useBookingStore.getState().activeRide).toBeNull();
    expect(toastMock.success).toHaveBeenCalledWith("Ride cancelled.");
  });

  it("clears and resets booking state", () => {
    useBookingStore.setState({ bookingError: "Could not book ride." });
    useBookingStore.getState().clearBookingError();
    expect(useBookingStore.getState().bookingError).toBeNull();

    useBookingStore.getState().selectRide(mockRide);
    useBookingStore.getState().reset();

    const state = useBookingStore.getState();
    expect(state.selectedRide).toBeNull();
    expect(state.activeRide).toBeNull();
    expect(state.currentRequest).toEqual({ seats: 1 });
  });
});
