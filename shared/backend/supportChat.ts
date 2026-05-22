import { PayloadValidationError } from "./functionPayloads";

type BodyRecord = Record<string, unknown>;

export const SUPPORT_CHAT_MAX_HISTORY_MESSAGES = 12;
export const SUPPORT_CHAT_MAX_MESSAGE_LENGTH = 1200;
export const SUPPORT_CHAT_RATE_LIMIT_MAX_REQUESTS = 8;
export const SUPPORT_CHAT_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

export type SupportChatRole = "user" | "assistant";
export type HopInRole = "rider" | "driver" | "admin";

export interface ConversationMessage {
  role: SupportChatRole;
  content: string;
}

export interface ProfileContextRow {
  full_name: string | null;
  city: string | null;
  role: HopInRole | null;
  is_phone_verified: boolean | null;
  is_email_verified: boolean | null;
}

export interface RiderBookingContextRow {
  status: string;
  seats: number;
  fare_total: number;
  departure_time: string | null;
  cancel_reason: string | null;
}

export interface DriverRideContextRow {
  status: string;
  departure_time: string;
  seats_available: number;
  fare_per_seat: number;
  cancel_reason: string | null;
}

export interface GroqChatCompletionPayload {
  choices?: Array<{
    message?: {
      content?: string | Array<{
        text?: string;
        type?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
}

const activeBookingStatuses = new Set([
  "searching",
  "matched",
  "confirmed",
  "scheduled",
  "in_progress",
]);
const activeRideStatuses = new Set(["scheduled", "active"]);

function asBodyRecord(value: unknown): BodyRecord {
  return value && typeof value === "object" ? (value as BodyRecord) : {};
}

function isConversationMessage(value: unknown): value is ConversationMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const message = value as Record<string, unknown>;
  return (
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string"
  );
}

function formatTimestamp(value: string | null | undefined): string {
  if (!value) {
    return "time unavailable";
  }

  return new Date(value).toISOString();
}

function formatRiderBookingSummary(
  booking: RiderBookingContextRow,
  index: number,
): string {
  return `- Booking ${index + 1} | status: ${booking.status} | seats: ${booking.seats} | fare: INR ${booking.fare_total} | departure: ${formatTimestamp(booking.departure_time)}${booking.cancel_reason ? ` | cancel reason: ${booking.cancel_reason}` : ""}`;
}

function formatDriverRideSummary(
  ride: DriverRideContextRow,
  index: number,
): string {
  return `- Ride ${index + 1} | status: ${ride.status} | open seats: ${ride.seats_available} | fare per seat: INR ${ride.fare_per_seat} | departure: ${formatTimestamp(ride.departure_time)}${ride.cancel_reason ? ` | cancel reason: ${ride.cancel_reason}` : ""}`;
}

export function parseSupportChatMessages(body: unknown): ConversationMessage[] {
  const record = asBodyRecord(body);
  const rawMessages = Array.isArray(record.messages) ? record.messages : [];

  const messages = rawMessages
    .filter(isConversationMessage)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, SUPPORT_CHAT_MAX_MESSAGE_LENGTH),
    }))
    .filter((message) => message.content.length > 0)
    .slice(-SUPPORT_CHAT_MAX_HISTORY_MESSAGES);

  if (!messages.length) {
    throw new PayloadValidationError("At least one chat message is required");
  }

  return messages;
}

export function summarizeSupportChatMessages(messages: ConversationMessage[]) {
  return {
    messageCount: messages.length,
    inputCharCount: messages.reduce(
      (total, message) => total + message.content.length,
      0,
    ),
  };
}

export function resolveSupportChatRole(
  profileRole: HopInRole | null | undefined,
  applicationStatus: string | null | undefined,
): HopInRole {
  if (profileRole === "admin") {
    return "admin";
  }

  if (applicationStatus === "approved") {
    return "driver";
  }

  return "rider";
}

export function buildSupportChatContext(params: {
  profile: ProfileContextRow | null;
  role: HopInRole;
  applicationStatus: string | null;
  riderBookings: RiderBookingContextRow[];
  driverRides: DriverRideContextRow[];
}): string {
  const { profile, role, applicationStatus, riderBookings, driverRides } =
    params;
  const sections: string[] = [
    `Current server time: ${new Date().toISOString()}`,
    `Account:
- Name: ${profile?.full_name || "Unknown"}
- Role: ${role}
- City: ${profile?.city || "Not set"}
- Email verified: ${profile?.is_email_verified ? "Yes" : "No"}
- Phone verified: ${profile?.is_phone_verified ? "Yes" : "No"}
- Driver application status: ${applicationStatus || "none"}`,
  ];

  if (role === "rider") {
    if (riderBookings.length) {
      sections.push(`Recent rider bookings:
${riderBookings
  .map((booking, index) => formatRiderBookingSummary(booking, index))
  .join("\n")}`);
    } else {
      sections.push("Recent rider bookings: none found.");
    }
  }

  if (role === "driver" || role === "admin") {
    if (driverRides.length) {
      sections.push(`Recent driver rides:
${driverRides
  .map((ride, index) => formatDriverRideSummary(ride, index))
  .join("\n")}`);
    } else if (role === "driver") {
      sections.push("Recent driver rides: none found.");
    }
  }

  const activeBookings = riderBookings.filter((booking) =>
    activeBookingStatuses.has(booking.status)
  );
  if (activeBookings.length) {
    sections.push(`Active rider bookings:
${activeBookings
  .map((booking, index) => `- Booking ${index + 1} | status: ${booking.status}`)
  .join("\n")}`);
  }

  const activeRides = driverRides.filter((ride) =>
    activeRideStatuses.has(ride.status)
  );
  if (activeRides.length) {
    sections.push(`Active driver rides:
${activeRides
  .map((ride, index) => `- Ride ${index + 1} | status: ${ride.status}`)
  .join("\n")}`);
  }

  return sections.join("\n\n");
}

export function extractSupportChatResponseText(
  payload: GroqChatCompletionPayload | null,
): string {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return content.trim();
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((part) => (typeof part?.text === "string" ? part.text.trim() : ""))
    .filter(Boolean)
    .join("\n")
    .trim();
}

export function getSupportChatWindowStart(
  now: Date = new Date(),
  windowMs = SUPPORT_CHAT_RATE_LIMIT_WINDOW_MS,
): string {
  return new Date(now.getTime() - windowMs).toISOString();
}

export function isSupportChatRateLimited(
  requestCount: number,
  maxRequests = SUPPORT_CHAT_RATE_LIMIT_MAX_REQUESTS,
): boolean {
  return requestCount >= maxRequests;
}

export function getSupportChatRateLimitMessage(
  windowMs = SUPPORT_CHAT_RATE_LIMIT_WINDOW_MS,
): string {
  const minutes = Math.max(1, Math.round(windowMs / 60000));
  return `AI support is temporarily busy. Please wait about ${minutes} minutes and try again.`;
}
