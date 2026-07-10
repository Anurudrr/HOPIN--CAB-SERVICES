import { describe, expect, it } from "vitest";

import { mockBooking } from "../mocks/supabase";
import type { Service } from "../types";
import { buildBookingTimeline } from "./bookingTimeline";
import { formatCurrency, formatDateTime, formatRelativeMinutes } from "./format";
import {
  buildFallbackRouteEstimate,
  calculateBookingQuote,
  calculateDistanceKm,
} from "./quote";
import { normalizeAppRole } from "./roles";

const mockService: Service = {
  id: "service-123",
  slug: "city-transfer",
  name: "City Transfer",
  category: "Mobility",
  description: "Fast intra-city transfers.",
  base_fare: 100,
  price_per_km: 20,
  price_per_minute: 3,
  icon_name: "Car",
  accent_label: "Fast lanes",
  is_active: true,
  is_featured: true,
  created_at: "2026-05-20T10:00:00.000Z",
  updated_at: "2026-05-20T10:00:00.000Z",
};

describe("platform helper utilities", () => {
  it("guards invalid display values in shared formatters", () => {
    expect(formatCurrency(Number.NaN)).toBe(formatCurrency(0));
    expect(formatDateTime("not-a-real-date")).toBe("TBD");
    expect(formatRelativeMinutes(0)).toBe("Arriving soon");
  });

  it("normalizes legacy roles for dashboard routing", () => {
    expect(normalizeAppRole("driver")).toBe("provider");
    expect(normalizeAppRole("provider")).toBe("provider");
    expect(normalizeAppRole("rider")).toBe("user");
    expect(normalizeAppRole(null)).toBe("user");
  });

  it("builds booking timelines with started_at as the ongoing fallback", () => {
    const timeline = buildBookingTimeline({
      ...mockBooking,
      accepted_at: "2026-05-20T10:05:00.000Z",
      ongoing_at: null,
      started_at: "2026-05-20T10:12:00.000Z",
      completed_at: null,
    });

    expect(timeline.find((item) => item.key === "accepted_at")).toMatchObject({
      completed: true,
      timestamp: "2026-05-20T10:05:00.000Z",
    });
    expect(timeline.find((item) => item.key === "ongoing_at")).toMatchObject({
      completed: true,
      timestamp: "2026-05-20T10:12:00.000Z",
    });
    expect(timeline.find((item) => item.key === "completed_at")).toMatchObject({
      completed: false,
      timestamp: null,
    });
  });

  it("builds fallback route estimates using in-app coordinate ordering", () => {
    const origin = { lat: 12.9716, lng: 77.6412 };
    const destination = { lat: 12.9317, lng: 77.6227 };

    expect(calculateDistanceKm(origin, destination)).toBeGreaterThan(0);

    expect(buildFallbackRouteEstimate(origin, destination)).toMatchObject({
      geometry: [
        [origin.lat, origin.lng],
        [destination.lat, destination.lng],
      ],
    });
  });

  it("calculates quote totals for explicit and fallback pricing", () => {
    const route = {
      distanceKm: 10,
      durationMin: 20,
      geometry: [] as Array<[number, number]>,
    };

    expect(calculateBookingQuote(mockService, route, 2)).toMatchObject({
      subtotal: 720,
      platformFee: 57.6,
      taxAmount: 36,
      total: 813.6,
    });
    expect(calculateBookingQuote(null, route, 0)).toMatchObject({
      subtotal: 340,
      platformFee: 27.2,
      taxAmount: 17,
      total: 384.2,
    });
  });
});
