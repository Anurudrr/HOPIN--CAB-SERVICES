import { HttpError } from "./http.ts";
import { createServiceClient, createUserClient } from "./supabase.ts";

export async function requireAdmin(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    throw new HttpError(401, "Missing Authorization header");
  }

  const userClient = createUserClient(authHeader);
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();

  if (authError || !user) {
    throw new HttpError(401, "Invalid or expired session");
  }

  const serviceClient = createServiceClient();
  const { data: profile, error: profileError } = await serviceClient
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new HttpError(500, "Could not load the caller profile");
  }

  if (!profile || profile.role !== "admin") {
    throw new HttpError(403, "Admin access required");
  }

  return { user, userClient, serviceClient };
}

export function requireCronSecret(request: Request) {
  const expectedSecret = Deno.env.get("BACKEND_CRON_SECRET");
  if (!expectedSecret) {
    throw new HttpError(500, "BACKEND_CRON_SECRET is not configured");
  }

  if (request.headers.get("x-cron-secret") !== expectedSecret) {
    throw new HttpError(401, "Unauthorized");
  }
}
