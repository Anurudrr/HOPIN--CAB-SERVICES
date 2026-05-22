const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type BodyRecord = Record<string, unknown>;

export class PayloadValidationError extends Error {}

export interface ContactMessagePayload {
  name: string;
  email: string;
  topic: string;
  message: string;
  requestedRole: string | null;
  requestedCity: string | null;
}

export const driverApplicationReviewStatuses = [
  "approved",
  "rejected",
  "pending",
] as const;

export type DriverApplicationReviewStatus =
  (typeof driverApplicationReviewStatuses)[number];

export interface DriverApplicationReviewPayload {
  applicationId: string;
  status: DriverApplicationReviewStatus;
  reviewNotes: string | null;
}

function asBodyRecord(value: unknown): BodyRecord {
  return value && typeof value === "object" ? (value as BodyRecord) : {};
}

function readTrimmedString(body: BodyRecord, key: string): string {
  const value = body[key];
  return typeof value === "string" ? value.trim() : "";
}

export function isValidEmail(value: string): boolean {
  return emailPattern.test(value);
}

export function parseContactMessageBody(body: unknown): ContactMessagePayload {
  const record = asBodyRecord(body);
  const name = readTrimmedString(record, "name");
  const email = readTrimmedString(record, "email").toLowerCase();
  const topic = readTrimmedString(record, "topic");
  const message = readTrimmedString(record, "message");
  const requestedRole = readTrimmedString(record, "requestedRole") || null;
  const requestedCity = readTrimmedString(record, "requestedCity") || null;

  if (!name || !email || !topic || !message) {
    throw new PayloadValidationError(
      "Name, email, topic, and message are required",
    );
  }

  if (!isValidEmail(email)) {
    throw new PayloadValidationError("A valid email address is required");
  }

  return {
    name,
    email,
    topic,
    message,
    requestedRole,
    requestedCity,
  };
}

export function parseNewsletterSubscriptionBody(
  body: unknown,
): { email: string } {
  const record = asBodyRecord(body);
  const email = readTrimmedString(record, "email").toLowerCase();

  if (!email || !isValidEmail(email)) {
    throw new PayloadValidationError("A valid email address is required");
  }

  return { email };
}

export function parseDriverApplicationReviewBody(
  body: unknown,
): DriverApplicationReviewPayload {
  const record = asBodyRecord(body);
  const applicationId = readTrimmedString(record, "applicationId");
  const status = readTrimmedString(record, "status");
  const reviewNotes = readTrimmedString(record, "reviewNotes") || null;

  if (!applicationId) {
    throw new PayloadValidationError("Application id is required");
  }

  if (
    !driverApplicationReviewStatuses.includes(
      status as DriverApplicationReviewStatus,
    )
  ) {
    throw new PayloadValidationError("Invalid application status");
  }

  return {
    applicationId,
    status: status as DriverApplicationReviewStatus,
    reviewNotes,
  };
}
