import { errorResponse, HttpError, jsonResponse, corsHeaders } from "../_shared/http.ts";
import { requireAdmin } from "../_shared/auth.ts";

const validStatuses = new Set(["approved", "rejected", "pending"]);

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (request.method !== "POST") {
      throw new HttpError(405, "Method not allowed");
    }

    const { userClient } = await requireAdmin(request);
    const body = await request.json().catch(() => null);

    const applicationId =
      body && typeof body.applicationId === "string" ? body.applicationId.trim() : "";
    const status = body && typeof body.status === "string" ? body.status.trim() : "";
    const reviewNotes =
      body && typeof body.reviewNotes === "string" ? body.reviewNotes.trim() : null;

    if (!applicationId) {
      throw new HttpError(400, "Application id is required");
    }

    if (!validStatuses.has(status)) {
      throw new HttpError(400, "Invalid application status");
    }

    const { data: reviewedId, error: reviewError } = await userClient.rpc(
      "review_driver_application",
      {
        p_application_id: applicationId,
        p_status: status,
        p_review_notes: reviewNotes || null,
      },
    );

    if (reviewError) {
      throw new HttpError(400, reviewError.message);
    }

    const { data: application, error: applicationError } = await userClient
      .from("driver_applications")
      .select("*")
      .eq("id", (reviewedId as string) || applicationId)
      .single();

    if (applicationError) {
      throw new HttpError(500, applicationError.message);
    }

    return jsonResponse({ application });
  } catch (error) {
    return errorResponse(error);
  }
});
