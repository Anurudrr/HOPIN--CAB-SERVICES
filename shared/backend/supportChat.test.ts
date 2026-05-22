import { describe, expect, it } from "vitest";

import {
  buildSupportChatContext,
  extractSupportChatResponseText,
  getSupportChatRateLimitMessage,
  getSupportChatWindowStart,
  isSupportChatRateLimited,
  parseSupportChatMessages,
  resolveSupportChatRole,
  summarizeSupportChatMessages,
  SUPPORT_CHAT_MAX_HISTORY_MESSAGES,
} from "./supportChat";

describe("support chat helpers", () => {
  it("parses, trims, and limits support chat messages", () => {
    const messages = parseSupportChatMessages({
      messages: [
        { role: "assistant", content: "  Hi  " },
        ...Array.from({ length: SUPPORT_CHAT_MAX_HISTORY_MESSAGES + 2 }, (_, index) => ({
          role: "user",
          content: ` message ${index} `,
        })),
      ],
    });

    expect(messages).toHaveLength(SUPPORT_CHAT_MAX_HISTORY_MESSAGES);
    expect(messages[0]?.content).toBe("message 2");
    expect(messages.at(-1)?.content).toBe(
      `message ${SUPPORT_CHAT_MAX_HISTORY_MESSAGES + 1}`,
    );
  });

  it("rejects empty support chat payloads", () => {
    expect(() =>
      parseSupportChatMessages({
        messages: [{ role: "user", content: "   " }],
      }),
    ).toThrowError("At least one chat message is required");
  });

  it("summarizes message metrics", () => {
    expect(
      summarizeSupportChatMessages([
        { role: "assistant", content: "Hello" },
        { role: "user", content: "Need help" },
      ]),
    ).toEqual({
      messageCount: 2,
      inputCharCount: 14,
    });
  });

  it("resolves support roles from profile and application status", () => {
    expect(resolveSupportChatRole("admin", "approved")).toBe("admin");
    expect(resolveSupportChatRole("rider", "approved")).toBe("driver");
    expect(resolveSupportChatRole(null, null)).toBe("rider");
  });

  it("builds support context with active ride and booking sections", () => {
    const context = buildSupportChatContext({
      profile: {
        full_name: "Aarav",
        city: "Bangalore",
        role: "rider",
        is_phone_verified: true,
        is_email_verified: false,
      },
      role: "rider",
      applicationStatus: null,
      riderBookings: [
        {
          status: "confirmed",
          seats: 2,
          fare_total: 320,
          departure_time: "2026-05-22T09:00:00.000Z",
          cancel_reason: null,
        },
      ],
      driverRides: [],
    });

    expect(context).toContain("Aarav");
    expect(context).toContain("Recent rider bookings:");
    expect(context).toContain("Active rider bookings:");
    expect(context).toContain("Booking 1");
    expect(context).not.toContain("Koramangala");
  });

  it("extracts support chat text from string and array payloads", () => {
    expect(
      extractSupportChatResponseText({
        choices: [{ message: { content: "  Hello there  " } }],
      }),
    ).toBe("Hello there");

    expect(
      extractSupportChatResponseText({
        choices: [
          {
            message: {
              content: [
                { type: "text", text: " First " },
                { type: "text", text: "Second " },
              ],
            },
          },
        ],
      }),
    ).toBe("First\nSecond");
  });

  it("computes support chat rate-limit helpers", () => {
    expect(getSupportChatWindowStart(new Date("2026-05-22T10:10:00.000Z"))).toBe(
      "2026-05-22T10:00:00.000Z",
    );
    expect(isSupportChatRateLimited(8)).toBe(true);
    expect(isSupportChatRateLimited(7)).toBe(false);
    expect(getSupportChatRateLimitMessage()).toContain("10 minutes");
  });
});
