import { describe, expect, it } from "vitest";

import { buildProfile, normalizeRole, type ProfileRow } from "./profile";

const profileRow: ProfileRow = {
  id: "user-123",
  full_name: "Aarav Rider",
  phone: "9876543210",
  email: "rider@example.com",
  city: "Bangalore",
  role: "rider",
  gender: "M",
  home_address: "Indiranagar",
  work_address: "Koramangala",
  avatar_url: "https://example.com/avatar.png",
  is_phone_verified: true,
  is_email_verified: true,
  onboarding_completed: true,
  created_at: "2026-05-20T10:00:00.000Z",
  updated_at: "2026-05-21T10:00:00.000Z",
};

const user = {
  id: "user-123",
  email: "rider@example.com",
  email_confirmed_at: "2026-05-20T10:00:00.000Z",
  user_metadata: {
    full_name: "Aarav Rider",
  },
} as const;

describe("profile helpers", () => {
  it("builds a profile from a full row", () => {
    expect(buildProfile(profileRow, user as never)).toMatchObject({
      id: "user-123",
      full_name: "Aarav Rider",
      role: "user",
      city: "Bangalore",
      avatar_url: "https://example.com/avatar.png",
      onboarding_completed: true,
    });
  });

  it("builds a profile from a partial row", () => {
    const partialRow = {
      ...profileRow,
      full_name: null,
      avatar_url: null,
      phone: null,
      city: null,
      onboarding_completed: null,
    };

    expect(buildProfile(partialRow, user as never)).toMatchObject({
      id: "user-123",
      full_name: "Aarav Rider",
      city: null,
      avatar_url: null,
      onboarding_completed: false,
    });
  });

  it("builds a profile from a user when the row is missing", () => {
    expect(buildProfile(null, user as never)).toMatchObject({
      id: "user-123",
      full_name: "Aarav Rider",
      email: "rider@example.com",
      is_email_verified: true,
      role: "user",
    });
  });

  it("returns null when both row and user are missing", () => {
    expect(buildProfile(null, null)).toBeNull();
  });

  it("normalizes legacy roles into app roles", () => {
    expect(normalizeRole("rider")).toBe("user");
    expect(normalizeRole("driver")).toBe("provider");
    expect(normalizeRole("admin")).toBe("admin");
    expect(normalizeRole(null)).toBe("user");
    expect(normalizeRole("unknown")).toBe("user");
  });
});
