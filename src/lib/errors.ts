export function logDevError(context: string, error: unknown) {
  if (import.meta.env.DEV) {
    console.error(`[${context}]`, error);
  }
}

function hasStringProperty(value: object, key: string): value is Record<string, string> {
  return key in value && typeof (value as Record<string, unknown>)[key] === "string";
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong."): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    if (hasStringProperty(error, "message")) {
      return error.message;
    }
    if (hasStringProperty(error, "msg")) {
      return error.msg;
    }
  }

  return fallback;
}

export function mapAuthErrorMessage(error: unknown): string {
  const message = getErrorMessage(error, "Authentication failed.");

  const errorMap: Record<string, string> = {
    "Invalid login credentials": "Email or password is incorrect",
    "User already registered": "An account with this email already exists",
    "Email not confirmed": "Please check your email and confirm your account",
    "Invalid email": "Please enter a valid email address",
    "Password too short": "Password must be at least 8 characters",
    "Email change token expired": "Email confirmation link has expired",
    "Token has expired or is invalid": "Email confirmation code is invalid or expired",
    "Otp has expired or is invalid": "Email confirmation code is invalid or expired",
  };

  return errorMap[message] || message;
}

export function mapApiErrorMessage(error: unknown, context: string = ""): string {
  const message = getErrorMessage(error);
  const contextLabel = context ? ` in ${context}` : "";

  if (message.includes("not found")) {
    return `Ride or booking${contextLabel} not found`;
  }

  if (message.includes("permission denied")) {
    return `You don't have permission${contextLabel}`;
  }

  if (message.includes("violates foreign key")) {
    return `Invalid reference${contextLabel}`;
  }

  if (message.includes("duplicate")) {
    return `This already exists${contextLabel}`;
  }

  if (message.includes("network")) {
    return "Network error. Please check your connection and try again";
  }

  return message;
}

/**
 * Retry logic for failed API calls with exponential backoff
 */
export async function withRetry<T>(
  fn: () => PromiseLike<T> | T,
  maxAttempts: number = 3,
  delayMs: number = 1000,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxAttempts) {
        const exponentialDelay = delayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, exponentialDelay));
      }
    }
  }

  throw lastError || new Error("Max retry attempts reached");
}

/**
 * Timeout wrapper for async operations
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 30000
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Operation timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}
