import { HttpError } from "./http.ts";
import type { createFunctionLogger } from "./observability.ts";
import type { createServiceClient } from "./supabase.ts";

type FunctionServiceClient = ReturnType<typeof createServiceClient>;
type FunctionLogger = ReturnType<typeof createFunctionLogger>;

interface RateLimitRow {
  allowed: boolean;
  request_count: number;
  remaining: number;
  resets_at: string;
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const forwardedIp = forwardedFor.split(",")[0]?.trim();
    if (forwardedIp) {
      return forwardedIp;
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  const cloudflareIp = request.headers.get("cf-connecting-ip")?.trim();
  return cloudflareIp || null;
}

export function getHourlyBucketStart(now = new Date()) {
  const bucket = new Date(now);
  bucket.setMinutes(0, 0, 0);
  return bucket.toISOString();
}

export async function enforcePublicFunctionRateLimit(params: {
  request: Request;
  serviceClient: FunctionServiceClient;
  logger: FunctionLogger;
  scope: string;
  maxRequests: number;
  errorMessage: string;
}) {
  const ipAddress = getClientIp(params.request);

  if (!ipAddress) {
    params.logger.warn("rate_limit.ip_missing", {
      scope: params.scope,
    });
    return;
  }

  const { data, error } = await params.serviceClient.rpc("consume_function_rate_limit", {
    p_scope: params.scope,
    p_ip_address: ipAddress,
    p_bucket_start: getHourlyBucketStart(),
    p_max_requests: params.maxRequests,
  });

  if (error) {
    params.logger.warn("rate_limit.rpc_failed", {
      scope: params.scope,
      ipAddress,
      errorMessage: error.message,
    });
    return;
  }

  const result = ((data as RateLimitRow[] | null) ?? [])[0];
  if (!result) {
    params.logger.warn("rate_limit.empty_result", {
      scope: params.scope,
      ipAddress,
    });
    return;
  }

  if (!result.allowed) {
    params.logger.warn("rate_limit.blocked", {
      scope: params.scope,
      ipAddress,
      requestCount: result.request_count,
      remaining: result.remaining,
      resetsAt: result.resets_at,
    });
    throw new HttpError(429, params.errorMessage);
  }
}
