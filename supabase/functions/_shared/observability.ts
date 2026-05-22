type LogData = Record<string, unknown>;

function writeLog(level: "info" | "warn" | "error", data: LogData) {
  const payload = JSON.stringify(data);

  if (level === "info") {
    console.info(payload);
    return;
  }

  if (level === "warn") {
    console.warn(payload);
    return;
  }

  console.error(payload);
}

function serializeError(error: unknown): LogData {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null,
    };
  }

  return {
    message: String(error),
  };
}

export function createFunctionLogger(functionName: string, request: Request) {
  const requestId = request.headers.get("x-request-id")?.trim() ||
    crypto.randomUUID();
  const url = new URL(request.url);
  const baseData = {
    function: functionName,
    requestId,
    method: request.method,
    path: url.pathname,
    userAgent: request.headers.get("user-agent"),
    forwardedFor: request.headers.get("x-forwarded-for"),
  };

  return {
    requestId,
    info(event: string, data: LogData = {}) {
      writeLog("info", {
        level: "info",
        event,
        ...baseData,
        ...data,
      });
    },
    warn(event: string, data: LogData = {}) {
      writeLog("warn", {
        level: "warn",
        event,
        ...baseData,
        ...data,
      });
    },
    error(event: string, error: unknown, data: LogData = {}) {
      writeLog("error", {
        level: "error",
        event,
        ...baseData,
        ...data,
        error: serializeError(error),
      });
    },
  };
}
