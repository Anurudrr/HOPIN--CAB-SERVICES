import { corsHeaders, errorResponse, HttpError, jsonResponse } from "../_shared/http.ts";
import { createFunctionLogger } from "../_shared/observability.ts";
import { createServiceClient } from "../_shared/supabase.ts";

const RESEND_API_URL = "https://api.resend.com/emails";
const DEFAULT_FROM_EMAIL = "HopIn <onboarding@resend.dev>";
const notifiableBookingStatuses = new Set(["pending", "confirmed", "ongoing", "in_progress"]);

interface BookingWebhookRecord {
  id: string;
  rider_id: string | null;
  status: string | null;
  pickup_address: string | null;
  dest_address: string | null;
  departure_time: string | null;
  fare_total: number | string | null;
  driver_name: string | null;
}

interface BookingWebhookPayload {
  type?: string;
  table?: string;
  schema?: string;
  record?: BookingWebhookRecord | null;
  old_record?: BookingWebhookRecord | null;
}

function requireWebhookSecret(request: Request) {
  const expectedSecret = Deno.env.get("BOOKING_WEBHOOK_SECRET");
  if (!expectedSecret) {
    return;
  }

  if (request.headers.get("x-webhook-secret") !== expectedSecret) {
    throw new HttpError(401, "Unauthorized");
  }
}

function parseWebhookPayload(body: unknown): BookingWebhookPayload {
  if (!body || typeof body !== "object") {
    throw new HttpError(400, "Invalid webhook payload");
  }

  return body as BookingWebhookPayload;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatFare(value: number | string | null) {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : 0;

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(numericValue) ? numericValue : 0);
}

function formatDepartureTime(value: string | null) {
  if (!value) {
    return "TBD";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "TBD";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function buildBookingEmail(record: BookingWebhookRecord, riderName: string | null) {
  const route = `${record.pickup_address || "Pickup"} to ${record.dest_address || "Destination"}`;
  const departureTime = formatDepartureTime(record.departure_time);
  const fare = formatFare(record.fare_total);
  const driverName = record.driver_name || "HopIn driver";
  const greeting = riderName ? `Hi ${riderName},` : "Hi there,";

  return {
    subject: `HopIn booking confirmed: ${route}`,
    text: [
      greeting,
      "",
      "Your HopIn booking is in the queue.",
      `Route: ${route}`,
      `Departure: ${departureTime}`,
      `Driver: ${driverName}`,
      `Fare total: ${fare}`,
      "",
      "Open your HopIn dashboard for live ride updates.",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; color: #111111; line-height: 1.6;">
        <p>${escapeHtml(greeting)}</p>
        <p>Your HopIn booking is in the queue.</p>
        <p><strong>Route:</strong> ${escapeHtml(route)}</p>
        <p><strong>Departure:</strong> ${escapeHtml(departureTime)}</p>
        <p><strong>Driver:</strong> ${escapeHtml(driverName)}</p>
        <p><strong>Fare total:</strong> ${escapeHtml(fare)}</p>
        <p>Open your HopIn dashboard for live ride updates.</p>
      </div>
    `.trim(),
  };
}

async function sendBookingEmail(params: {
  to: string;
  record: BookingWebhookRecord;
  riderName: string | null;
}) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    throw new HttpError(500, "RESEND_API_KEY is not configured");
  }

  const from = Deno.env.get("RESEND_FROM_EMAIL") || DEFAULT_FROM_EMAIL;
  const email = buildBookingEmail(params.record, params.riderName);
  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": params.record.id,
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: email.subject,
      html: email.html,
      text: email.text,
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : "Resend request failed";
    throw new HttpError(502, message);
  }

  return payload;
}

Deno.serve(async (request) => {
  const logger = createFunctionLogger("notify-booking-confirmed", request);

  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        ...corsHeaders,
        "x-request-id": logger.requestId,
      },
    });
  }

  try {
    if (request.method !== "POST") {
      throw new HttpError(405, "Method not allowed");
    }

    requireWebhookSecret(request);
    const body = await request.json().catch(() => null);
    const payload = parseWebhookPayload(body);

    if (payload.type !== "INSERT" || payload.schema !== "public" || payload.table !== "bookings") {
      return jsonResponse(
        { ok: true, skipped: true, reason: "Unsupported webhook event" },
        { headers: { "x-request-id": logger.requestId } },
      );
    }

    const record = payload.record;
    if (!record?.id || !record.rider_id) {
      throw new HttpError(400, "Booking webhook record is incomplete");
    }

    if (!notifiableBookingStatuses.has(record.status || "")) {
      return jsonResponse(
        { ok: true, skipped: true, reason: "Booking status is not notifiable" },
        { headers: { "x-request-id": logger.requestId } },
      );
    }

    const serviceClient = createServiceClient();
    const { data: riderProfile, error: riderError } = await serviceClient
      .from("profiles")
      .select("email, full_name")
      .eq("id", record.rider_id)
      .maybeSingle();

    if (riderError) {
      throw new HttpError(500, riderError.message);
    }

    const riderEmail = riderProfile?.email?.trim() || null;
    if (!riderEmail) {
      logger.warn("booking_notification.skipped_missing_rider_email", {
        bookingId: record.id,
        riderId: record.rider_id,
      });

      return jsonResponse(
        { ok: true, skipped: true, reason: "Rider email missing" },
        { headers: { "x-request-id": logger.requestId } },
      );
    }

    const resendResponse = await sendBookingEmail({
      to: riderEmail,
      record,
      riderName: riderProfile?.full_name ?? null,
    });

    logger.info("booking_notification.sent", {
      bookingId: record.id,
      riderId: record.rider_id,
      status: record.status,
    });

    return jsonResponse(
      {
        ok: true,
        bookingId: record.id,
        provider: "resend",
        response: resendResponse,
      },
      { headers: { "x-request-id": logger.requestId } },
    );
  } catch (error) {
    logger.error("booking_notification.failed", error);
    return errorResponse(error, {
      headers: { "x-request-id": logger.requestId },
    });
  }
});
