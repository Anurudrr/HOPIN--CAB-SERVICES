import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createQueryBuilder,
  mockAuthUser,
  mockBooking,
  mockRide,
  mockSupabaseClient,
  resetMockSupabase,
} from "../mocks/supabase";

vi.mock("./supabase", () => ({
  supabase: mockSupabaseClient,
}));

import {
  bookRide,
  cancelBooking,
  cancelDriverRide,
  completeDriverRide,
  getAdminBookingQueue,
  getAdminRideQueue,
  getDriverApplicationQueue,
  getAvailableRides,
  getNewsletterSubscribers,
  getSupportInbox,
  reviewDriverApplication,
  startDriverRide,
  subscribeToJournal,
  submitContactMessage,
} from "./api";

describe("api", () => {
  beforeEach(() => {
    resetMockSupabase();
  });

  it("returns an empty list when no city is provided", async () => {
    await expect(getAvailableRides("")).resolves.toEqual([]);
    expect(mockSupabaseClient.from).not.toHaveBeenCalled();
  });

  it("loads available rides for a city", async () => {
    mockSupabaseClient.from.mockReturnValueOnce(
      createQueryBuilder({
        data: [mockRide],
        error: null,
      }),
    );

    await expect(getAvailableRides("Bangalore")).resolves.toEqual([mockRide]);
  });

  it("creates a booking from the booking RPC and follow-up query", async () => {
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

    await expect(
      bookRide(
        mockRide.id,
        2,
        mockRide.origin_name,
        mockRide.origin_lat,
        mockRide.origin_lng,
        mockRide.destination_name,
        mockRide.destination_lat,
        mockRide.destination_lng,
      ),
    ).resolves.toEqual(mockBooking);
  });

  it("starts a ride and returns the refreshed ride row", async () => {
    mockSupabaseClient.rpc.mockResolvedValueOnce({
      data: mockRide.id,
      error: null,
    });
    mockSupabaseClient.from.mockReturnValueOnce(
      createQueryBuilder({
        data: {
          ...mockRide,
          status: "active",
          started_at: "2026-05-22T08:30:00.000Z",
        },
        error: null,
      }),
    );

    await expect(startDriverRide(mockRide.id)).resolves.toMatchObject({
      id: mockRide.id,
      status: "active",
    });
  });

  it("completes a ride and returns the refreshed ride row", async () => {
    mockSupabaseClient.rpc.mockResolvedValueOnce({
      data: mockRide.id,
      error: null,
    });
    mockSupabaseClient.from.mockReturnValueOnce(
      createQueryBuilder({
        data: {
          ...mockRide,
          status: "completed",
          completed_at: "2026-05-22T09:15:00.000Z",
        },
        error: null,
      }),
    );

    await expect(completeDriverRide(mockRide.id)).resolves.toMatchObject({
      id: mockRide.id,
      status: "completed",
    });
  });

  it("cancels a ride and passes the optional reason to the RPC", async () => {
    const cancelledRide = {
      ...mockRide,
      status: "cancelled" as const,
      cancelled_at: "2026-05-22T08:00:00.000Z",
      cancel_reason: "Driver unavailable",
    };

    mockSupabaseClient.rpc.mockResolvedValueOnce({
      data: mockRide.id,
      error: null,
    });
    mockSupabaseClient.from.mockReturnValueOnce(
      createQueryBuilder({
        data: cancelledRide,
        error: null,
      }),
    );

    await expect(cancelDriverRide(mockRide.id, "Driver unavailable")).resolves.toEqual(cancelledRide);
    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith("cancel_ride_by_driver", {
      p_ride_id: mockRide.id,
      p_reason: "Driver unavailable",
    });
  });

  it("rejects booking cancellation when the user is not authenticated", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
    });

    await expect(cancelBooking(mockBooking.id)).rejects.toThrow("Not authenticated.");
  });

  it("submits a trimmed contact message payload", async () => {
    mockSupabaseClient.functions.invoke.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    await expect(
      submitContactMessage({
        name: "  Aarav  ",
        email: "  rider@example.com  ",
        topic: "  Support  ",
        message: "  Need help with a booking  ",
        requestedRole: "driver",
        requestedCity: "Bangalore",
      }),
    ).resolves.toBeUndefined();

    expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith("submit-contact-message", {
      body: {
        name: "Aarav",
        email: "rider@example.com",
        topic: "Support",
        message: "Need help with a booking",
        requestedRole: "driver",
        requestedCity: "Bangalore",
      },
    });
  });

  it("loads the admin driver application queue", async () => {
    const application = {
      id: "application-123",
      user_id: "user-123",
      status: "pending",
      license_number: "DL01234567",
      license_expiry: "2027-05-20",
      document_url: "user-123/license.pdf",
      reviewed_by: null,
      review_notes: null,
      reviewed_at: null,
      created_at: "2026-05-20T10:00:00.000Z",
    };

    mockSupabaseClient.from.mockReturnValueOnce(
      createQueryBuilder({
        data: [application],
        error: null,
      }),
    );

    await expect(getDriverApplicationQueue()).resolves.toEqual([application]);
  });

  it("loads the admin ride queue", async () => {
    mockSupabaseClient.from.mockReturnValueOnce(
      createQueryBuilder({
        data: [mockRide],
        error: null,
      }),
    );

    await expect(getAdminRideQueue()).resolves.toEqual([mockRide]);
  });

  it("loads the admin booking queue", async () => {
    mockSupabaseClient.from.mockReturnValueOnce(
      createQueryBuilder({
        data: [mockBooking],
        error: null,
      }),
    );

    await expect(getAdminBookingQueue()).resolves.toEqual([mockBooking]);
  });

  it("loads the support inbox", async () => {
    const message = {
      id: "message-123",
      name: "Aarav",
      email: "rider@example.com",
      topic: "Support",
      message: "Need help with a booking",
      requested_role: "driver",
      requested_city: "Bangalore",
      created_at: "2026-05-20T10:00:00.000Z",
    };

    mockSupabaseClient.from.mockReturnValueOnce(
      createQueryBuilder({
        data: [message],
        error: null,
      }),
    );

    await expect(getSupportInbox()).resolves.toEqual([message]);
  });

  it("loads newsletter subscribers", async () => {
    const subscriber = {
      email: "rider@example.com",
      created_at: "2026-05-20T10:00:00.000Z",
    };

    mockSupabaseClient.from.mockReturnValueOnce(
      createQueryBuilder({
        data: [subscriber],
        error: null,
      }),
    );

    await expect(getNewsletterSubscribers()).resolves.toEqual([subscriber]);
  });

  it("reviews a driver application and returns the refreshed row", async () => {
    const reviewedApplication = {
      id: "application-123",
      user_id: "user-123",
      status: "approved",
      license_number: "DL01234567",
      license_expiry: "2027-05-20",
      document_url: "user-123/license.pdf",
      reviewed_by: "admin-123",
      review_notes: "Documents verified",
      reviewed_at: "2026-05-20T11:00:00.000Z",
      created_at: "2026-05-20T10:00:00.000Z",
    };

    mockSupabaseClient.functions.invoke.mockResolvedValueOnce({
      data: {
        application: reviewedApplication,
      },
      error: null,
    });

    await expect(
      reviewDriverApplication(reviewedApplication.id, "approved", "Documents verified"),
    ).resolves.toEqual(reviewedApplication);
    expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith(
      "admin-review-driver-application",
      {
        body: {
          applicationId: reviewedApplication.id,
          status: "approved",
          reviewNotes: "Documents verified",
        },
      },
    );
  });

  it("subscribes through the backend function layer", async () => {
    mockSupabaseClient.functions.invoke.mockResolvedValueOnce({
      data: { email: "rider@example.com" },
      error: null,
    });

    await expect(subscribeToJournal(" Rider@Example.com ")).resolves.toEqual({
      email: "rider@example.com",
    });
    expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith("subscribe-to-journal", {
      body: {
        email: "rider@example.com",
      },
    });
  });
});
