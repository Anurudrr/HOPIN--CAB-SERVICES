import { corsHeaders, errorResponse, HttpError, jsonResponse } from "../_shared/http.ts";
import { createFunctionLogger } from "../_shared/observability.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import {
  parseNewsletterSubscriptionBody,
  PayloadValidationError,
} from "../../../shared/backend/functionPayloads.ts";

Deno.serve(async (request) => {
  const logger = createFunctionLogger("subscribe-to-journal", request);

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
      payload = parseNewsletterSubscriptionBody(body);
    } catch (error) {
      if (error instanceof PayloadValidationError) {
        throw new HttpError(400, error.message);
      }
      throw error;
    }

    logger.info("newsletter.received", {
      emailDomain: payload.email.split("@")[1] || null,
    });

    const serviceClient = createServiceClient();
    const { data, error } = await serviceClient
      .from("newsletter_subscriptions")
      .insert({ email: payload.email })
      .select("email")
      .single();

    if (error) {
      if ("code" in error && error.code === "23505") {
        logger.info("newsletter.duplicate", {
          emailDomain: payload.email.split("@")[1] || null,
        });
        return jsonResponse(
          { email: payload.email },
          { headers: { "x-request-id": logger.requestId } },
        );
      }

      throw new HttpError(500, error.message);
    }

    logger.info("newsletter.saved", {
      emailDomain: data.email.split("@")[1] || null,
    });

    return jsonResponse(
      { email: data.email },
      { headers: { "x-request-id": logger.requestId } },
    );
  } catch (error) {
    logger.error("newsletter.failed", error);
    return errorResponse(error, {
      headers: { "x-request-id": logger.requestId },
    });
  }
});
