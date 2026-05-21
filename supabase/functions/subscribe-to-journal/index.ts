import { corsHeaders, errorResponse, HttpError, jsonResponse } from "../_shared/http.ts";
import { createServiceClient } from "../_shared/supabase.ts";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (request.method !== "POST") {
      throw new HttpError(405, "Method not allowed");
    }

    const body = await request.json().catch(() => null);
    const email = body && typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email || !emailPattern.test(email)) {
      throw new HttpError(400, "A valid email address is required");
    }

    const serviceClient = createServiceClient();
    const { data, error } = await serviceClient
      .from("newsletter_subscriptions")
      .insert({ email })
      .select("email")
      .single();

    if (error) {
      if ("code" in error && error.code === "23505") {
        return jsonResponse({ email });
      }

      throw new HttpError(500, error.message);
    }

    return jsonResponse({ email: data.email });
  } catch (error) {
    return errorResponse(error);
  }
});
