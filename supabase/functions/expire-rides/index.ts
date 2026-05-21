import { corsHeaders, errorResponse, HttpError, jsonResponse } from "../_shared/http.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { requireCronSecret } from "../_shared/auth.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let logId: string | null = null;

  try {
    if (request.method !== "POST") {
      throw new HttpError(405, "Method not allowed");
    }

    requireCronSecret(request);

    const serviceClient = createServiceClient();
    const startedAt = new Date().toISOString();

    const { data: logRow } = await serviceClient
      .from("backend_job_runs")
      .insert({
        job_name: "expire-rides",
        status: "started",
        details: { requested_at: startedAt },
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
            expired_count: expiredCount ?? 0,
          },
        })
        .eq("id", logId);
    }

    return jsonResponse({
      ok: true,
      expiredCount: expiredCount ?? 0,
    });
  } catch (error) {
    if (logId) {
      const serviceClient = createServiceClient();
      await serviceClient
        .from("backend_job_runs")
        .update({
          status: "error",
          completed_at: new Date().toISOString(),
          details: {
            error: error instanceof Error ? error.message : "Unknown error",
          },
        })
        .eq("id", logId);
    }

    return errorResponse(error);
  }
});
