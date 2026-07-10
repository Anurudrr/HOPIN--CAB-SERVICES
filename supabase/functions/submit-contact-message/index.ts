import { corsHeaders, errorResponse, HttpError, jsonResponse } from "../_shared/http.ts";
import { createFunctionLogger } from "../_shared/observability.ts";
import { enforcePublicFunctionRateLimit } from "../_shared/rateLimit.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import {
  parseContactMessageBody,
  PayloadValidationError,
} from "../../../shared/backend/functionPayloads.ts";

Deno.serve(async (request) => {
  const logger = createFunctionLogger("submit-contact-message", request);

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

    const body = await request.json().catch(() => null);
    let payload;
    try {
      payload = parseContactMessageBody(body);
    } catch (error) {
      if (error instanceof PayloadValidationError) {
        throw new HttpError(400, error.message);
      }
      throw error;
    }

    logger.info("contact_message.received", {
      topic: payload.topic,
      emailDomain: payload.email.split("@")[1] || null,
      hasRequestedRole: Boolean(payload.requestedRole),
      hasRequestedCity: Boolean(payload.requestedCity),
    });

    const serviceClient = createServiceClient();
    await enforcePublicFunctionRateLimit({
      request,
      serviceClient,
      logger,
      scope: "submit-contact-message",
      maxRequests: 5,
      errorMessage: "Too many contact requests from this IP. Please try again later.",
    });

    const { data, error } = await serviceClient
      .from("contact_messages")
      .insert({
        name: payload.name,
        email: payload.email,
        topic: payload.topic,
        message: payload.message,
        requested_role: payload.requestedRole,
        requested_city: payload.requestedCity,
      })
      .select("id")
      .single();

    if (error) {
      throw new HttpError(500, error.message);
    }

    logger.info("contact_message.saved", {
      contactMessageId: data.id,
    });

    return jsonResponse(
      { id: data.id },
      { headers: { "x-request-id": logger.requestId } },
    );
  } catch (error) {
    logger.error("contact_message.failed", error);
    return errorResponse(error, {
      headers: { "x-request-id": logger.requestId },
    });
  }
});
