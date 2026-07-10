import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getErrorMessage,
  mapApiErrorMessage,
  mapAuthErrorMessage,
  withRetry,
  withTimeout,
} from "./errors";

afterEach(() => {
  vi.useRealTimers();
});

describe("errors helpers", () => {
  it("returns the fallback for nullish values", () => {
    expect(getErrorMessage(null, "Fallback message")).toBe("Fallback message");
    expect(getErrorMessage(undefined)).toBe("Something went wrong.");
  });

  it("extracts a readable message from non-Error objects", () => {
    expect(getErrorMessage({ message: "Object message" })).toBe("Object message");
    expect(getErrorMessage({ msg: "Alternate key" })).toBe("Alternate key");
  });

  it("maps auth messages into user-facing copy", () => {
    expect(mapAuthErrorMessage(new Error("Invalid login credentials"))).toBe(
      "Email or password is incorrect",
    );
    expect(mapAuthErrorMessage("Token has expired or is invalid")).toBe(
      "Email confirmation code is invalid or expired",
    );
  });

  it("maps API messages for network and not-found cases", () => {
    expect(mapApiErrorMessage("network request failed")).toBe(
      "Network error. Please check your connection and try again",
    );
    expect(mapApiErrorMessage(new Error("booking not found"), "cancelling booking")).toBe(
      "Ride or booking in cancelling booking not found",
    );
  });

  it("retries until the operation succeeds", async () => {
    vi.useFakeTimers();
    const fn = vi
      .fn<[], Promise<string>>()
      .mockRejectedValueOnce(new Error("Temporary failure"))
      .mockResolvedValueOnce("ok");

    const promise = withRetry(fn, 3, 20);

    await vi.runAllTimersAsync();

    await expect(promise).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws the last error after retries are exhausted", async () => {
    vi.useFakeTimers();
    const fn = vi.fn<[], Promise<never>>().mockRejectedValue(new Error("Still failing"));

    const promise = withRetry(fn, 3, 10);
    const expectation = expect(promise).rejects.toThrow("Still failing");

    await vi.runAllTimersAsync();

    await expectation;
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("resolves before the timeout when the promise completes", async () => {
    await expect(withTimeout(Promise.resolve("done"), 10)).resolves.toBe("done");
  });

  it("times out long-running work", async () => {
    vi.useFakeTimers();
    const promise = withTimeout(new Promise<never>(() => undefined), 50);
    const expectation = expect(promise).rejects.toThrow("Operation timed out after 50ms");

    await vi.advanceTimersByTimeAsync(50);

    await expectation;
  });
});
