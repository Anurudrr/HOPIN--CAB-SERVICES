import { errorResponse, HttpError, jsonResponse, corsHeaders } from "../_shared/http.ts";
import { createFunctionLogger } from "../_shared/observability.ts";
import { requireAdmin } from "../_shared/auth.ts";
import {
  parseDriverApplicationReviewBody,
  PayloadValidationError,
} from "../../../shared/backend/functionPayloads.ts";

Deno.serve(async (request) => {
  const logger = createFunctionLogger("admin-review-driver-application", request);

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

    const { user, userClient } = await requireAdmin(request);
    const body = await request.json().catch(() => null);
    let payload;
    try {
      payload = parseDriverApplicationReviewBody(body);
    } catch (error) {
      if (error instanceof PayloadValidationError) {
        throw new HttpError(400, error.message);
      }
      throw error;
    }

    logger.info("driver_application.review_requested", {
      actorId: user.id,
      applicationId: payload.applicationId,
      status: payload.status,
    });

    const { data: reviewedId, error: reviewError } = await userClient.rpc(
      "review_driver_application",
      {
        p_application_id: payload.applicationId,
        p_status: payload.status,
        p_review_notes: payload.reviewNotes,
      },
    );

    if (reviewError) {
      throw new HttpError(400, reviewError.message);
    }

    const { data: application, error: applicationError } = await userClient
      .from("driver_applications")
      .select("*")
      .eq("id", (reviewedId as string) || payload.applicationId)
      .single();

    if (applicationError) {
      throw new HttpError(500, applicationError.message);
    }

    logger.info("driver_application.review_completed", {
      actorId: user.id,
      applicationId: application.id,
      status: application.status,
    });

    return jsonResponse(
      { application },
      { headers: { "x-request-id": logger.requestId } },
    );
  } catch (error) {
    logger.error("driver_application.review_failed", error);
    return errorResponse(error, {
      headers: { "x-request-id": logger.requestId },
    });
  }
});
