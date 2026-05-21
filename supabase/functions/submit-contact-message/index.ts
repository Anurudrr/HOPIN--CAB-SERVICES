import { corsHeaders, errorResponse, HttpError, jsonResponse } from "../_shared/http.ts";
import { createServiceClient } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (request.method !== "POST") {
      throw new HttpError(405, "Method not allowed");
    }

    const body = await request.json().catch(() => null);
    const name = body && typeof body.name === "string" ? body.name.trim() : "";
    const email = body && typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const topic = body && typeof body.topic === "string" ? body.topic.trim() : "";
    const message = body && typeof body.message === "string" ? body.message.trim() : "";
    const requestedRole =
      body && typeof body.requestedRole === "string" ? body.requestedRole.trim() : "";
    const requestedCity =
      body && typeof body.requestedCity === "string" ? body.requestedCity.trim() : "";

    if (!name || !email || !topic || !message) {
      throw new HttpError(400, "Name, email, topic, and message are required");
    }

    const serviceClient = createServiceClient();
    const { data, error } = await serviceClient
      .from("contact_messages")
      .insert({
        name,
        email,
        topic,
        message,
        requested_role: requestedRole || null,
        requested_city: requestedCity || null,
      })
      .select("id")
      .single();

    if (error) {
      throw new HttpError(500, error.message);
    }

    return jsonResponse({ id: data.id });
  } catch (error) {
    return errorResponse(error);
  }
});
