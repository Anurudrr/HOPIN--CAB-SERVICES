export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...(init.headers ?? {}),
    },
  });
}

export function errorResponse(error: unknown, init: ResponseInit = {}) {
  if (error instanceof HttpError) {
    return jsonResponse({ error: error.message }, {
      ...init,
      status: error.status,
    });
  }

  const message = error instanceof Error ? error.message : "Internal server error";
  return jsonResponse({ error: message }, {
    ...init,
    status: 500,
  });
}
