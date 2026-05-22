import { corsHeaders, errorResponse, HttpError, jsonResponse } from "../_shared/http.ts";
import { createFunctionLogger } from "../_shared/observability.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { requireCronSecret } from "../_shared/auth.ts";

Deno.serve(async (request) => {
  const logger = createFunctionLogger("expire-rides", request);

  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        ...corsHeaders,
        "x-request-id": logger.requestId,
      },
    });
  }

  let logId: string | null = null;
  const startedAt = new Date().toISOString();

  try {
    if (request.method !== "POST") {
      throw new HttpError(405, "Method not allowed");
    }

    requireCronSecret(request);
    logger.info("expire_rides.request_received");

    const serviceClient = createServiceClient();

    const { data: logRow } = await serviceClient
      .from("backend_job_runs")
      .insert({
        job_name: "expire-rides",
        status: "started",
        details: {
          requested_at: startedAt,
          request_id: logger.requestId,
        },
        started_at: startedAt,
      })
      .select("id")
      .single();

    logId = logRow?.id ?? null;

    const { data: expiredCount, error } = await serviceClient.rpc("auto_expire_rides");
    if (error) {
      throw new HttpError(500, error.message);
    }

    if (logId) {
      await serviceClient
        .from("backend_job_runs")
        .update({
          status: "success",
          completed_at: new Date().toISOString(),
          details: {
            requested_at: startedAt,
            request_id: logger.requestId,
            expired_count: expiredCount ?? 0,
          },
        })
        .eq("id", logId);
    }

    logger.info("expire_rides.completed", {
      expiredCount: expiredCount ?? 0,
      backendJobRunId: logId,
    });

    return jsonResponse(
      {
        ok: true,
        expiredCount: expiredCount ?? 0,
      },
      { headers: { "x-request-id": logger.requestId } },
    );
  } catch (error) {
    if (logId) {
      const serviceClient = createServiceClient();
      await serviceClient
        .from("backend_job_runs")
        .update({
          status: "error",
          completed_at: new Date().toISOString(),
          details: {
            request_id: logger.requestId,
            requested_at: startedAt,
            error: error instanceof Error ? error.message : "Unknown error",
          },
        })
        .eq("id", logId);
    }

    logger.error("expire_rides.failed", error, {
      backendJobRunId: logId,
    });

    return errorResponse(error, {
      headers: { "x-request-id": logger.requestId },
    });
  }
});
