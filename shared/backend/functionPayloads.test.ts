import { describe, expect, it } from "vitest";

import {
  PayloadValidationError,
  parseContactMessageBody,
  parseDriverApplicationReviewBody,
  parseNewsletterSubscriptionBody,
} from "./functionPayloads";

describe("function payload parsing", () => {
  it("normalizes contact message input", () => {
    expect(
      parseContactMessageBody({
        name: "  Aarav  ",
        email: "  Rider@Example.com ",
        topic: "  Support ",
        message: "  Need booking help ",
        requestedRole: " driver ",
        requestedCity: " Bangalore ",
      }),
    ).toEqual({
      name: "Aarav",
      email: "rider@example.com",
      topic: "Support",
      message: "Need booking help",
      requestedRole: "driver",
      requestedCity: "Bangalore",
    });
  });

  it("rejects incomplete contact message input", () => {
    expect(() =>
      parseContactMessageBody({
        name: "Aarav",
        email: "",
        topic: "Support",
        message: "Need help",
      }),
    ).toThrowError(PayloadValidationError);
  });

  it("rejects invalid contact message emails", () => {
    expect(() =>
      parseContactMessageBody({
        name: "Aarav",
        email: "not-an-email",
        topic: "Support",
        message: "Need help with booking access",
      }),
    ).toThrowError("A valid email address is required");
  });

  it("normalizes newsletter emails", () => {
    expect(
      parseNewsletterSubscriptionBody({ email: " Rider@Example.com " }),
    ).toEqual({
      email: "rider@example.com",
    });
  });

  it("rejects invalid newsletter emails", () => {
    expect(() =>
      parseNewsletterSubscriptionBody({ email: "not-an-email" }),
    ).toThrowError("A valid email address is required");
  });

  it("normalizes admin review payloads", () => {
    expect(
      parseDriverApplicationReviewBody({
        applicationId: " application-123 ",
        status: "approved",
        reviewNotes: " Documents verified ",
      }),
    ).toEqual({
      applicationId: "application-123",
      status: "approved",
      reviewNotes: "Documents verified",
    });
  });

  it("rejects invalid admin review statuses", () => {
    expect(() =>
      parseDriverApplicationReviewBody({
        applicationId: "application-123",
        status: "accepted",
      }),
    ).toThrowError("Invalid application status");
  });
});
