import { describe, expect, it } from "vitest";

import { supportedCities } from "./cities";
import {
  driverApplicationSchema,
  MAX_DRIVER_CAPACITY,
  MAX_DRIVER_VEHICLE_YEAR,
  rideSchema,
} from "./validation";

describe("validation schemas", () => {
  it("uses the shared supported city list for rides", () => {
    expect(
      rideSchema.safeParse({
        origin_name: "Powai",
        origin_lat: 19.12,
        origin_lng: 72.91,
        destination_name: "BKC",
        destination_lat: 19.06,
        destination_lng: 72.86,
        city: supportedCities[0],
        departure_time: "2026-05-23T08:00:00.000Z",
        seats_total: 4,
        fare_per_seat: 120,
      }).success,
    ).toBe(true);

    expect(
      rideSchema.safeParse({
        origin_name: "OMR",
        origin_lat: 13.05,
        origin_lng: 80.27,
        destination_name: "Guindy",
        destination_lat: 13.01,
        destination_lng: 80.22,
        city: "Chennai",
        departure_time: "2026-05-23T08:00:00.000Z",
        seats_total: 4,
        fare_per_seat: 120,
      }).success,
    ).toBe(false);
  });

  it("enforces the shared driver onboarding bounds", () => {
    expect(
      driverApplicationSchema.safeParse({
        licenseNumber: "DL01234567",
        licenseExpiry: "2027-05-20",
        documentUrl: "",
        make: "Hyundai",
        model: "Creta",
        year: MAX_DRIVER_VEHICLE_YEAR + 1,
        plate: "KA01AB1234",
        color: "White",
        capacity: MAX_DRIVER_CAPACITY + 1,
      }).success,
    ).toBe(false);
  });
});
