import * as React from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { cn } from "../lib/utils";
import type { Profile, Booking } from "../types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AIChatWidgetProps {
  profile: Profile | null;
  recentBookings?: Booking[];
}

const HOPIN_SYSTEM_CONTEXT = `You are HopIn's intelligent support assistant. You help riders and drivers with ride sharing inquiries and support.

About HopIn:
- HopIn is a ride-sharing platform connecting riders and drivers
- It operates in multiple cities with different corridors
- Riders can book rides, drivers offer rides, and we match them efficiently
- We prioritize safety, reliability, and affordability

You have access to the user's information including:
- Current bookings and ride history
- City and location preferences
- Profile information

Guidelines:
1. Be helpful, friendly, and professional
2. Provide specific information about rides when available
3. Help with booking questions, ride status, and general platform support
4. For complex issues, suggest contacting support@hopin.com
5. Keep responses concise and clear
6. Never ask for sensitive information like passwords`;

export function AIChatWidget({ profile, recentBookings = [] }: AIChatWidgetProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hi! I'm HopIn's support assistant. How can I help you today?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const buildContextString = () => {
    const parts: string[] = [];

    if (profile) {
      parts.push(`User Profile:
- Name: ${profile.full_name || "Unknown"}
- Role: ${profile.role === "driver" ? "Driver" : "Rider"}
- City: ${profile.city || "Not specified"}
- Email: ${profile.email || "Not verified"}
- Phone verified: ${profile.is_phone_verified ? "Yes" : "No"}`);
    }

    if (recentBookings.length > 0) {
      const upcomingBookings = recentBookings.filter((b) =>
        ["searching", "matched", "confirmed", "scheduled", "in_progress"].includes(b.status)
      );

      if (upcomingBookings.length > 0) {
        parts.push(`Active Bookings:
${upcomingBookings
  .slice(0, 3)
  .map(
    (b) =>
      `- From ${b.origin_name} to ${b.destination_name} (Status: ${b.status}, Fare: $${b.fare_per_seat})`
  )
  .join("\n")}`);
      }

      const recentCompleted = recentBookings.filter((b) => b.status === "completed");
      if (recentCompleted.length > 0) {
        parts.push(`Recent bookings: ${recentCompleted.length} completed rides`);
      }
    }

    return parts.length > 0
      ? `User Context:\n${parts.join("\n\n")}\n\n`
      : "";
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const contextString = buildContextString();
      
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          userMessage: input,
          context: contextString,
          systemPrompt: HOPIN_SYSTEM_CONTEXT,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content || "I'm having trouble responding right now. Please try again.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content:
          "Sorry, I encountered an issue. Please try again or contact support@hopin.com for assistance.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle AI support chat"
        className={cn(
          "fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-none border-2 border-black bg-black text-white shadow-soft transition-all duration-200",
          "hover:bg-white hover:text-black hover:shadow-premium",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        )}
      >
        {isOpen ? <X size={20} /> : <MessageCircle size={20} />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 flex w-96 flex-col rounded-none border-2 border-black bg-white shadow-premium">
          {/* Header */}
          <div className="border-b-2 border-black bg-black p-4 text-white">
            <h3 className="text-sm font-black uppercase tracking-[0.22em]">HopIn Support</h3>
            <p className="mt-1 text-xs text-white/70">AI-Powered Assistance</p>
          </div>

          {/* Messages Container */}
          <div className="flex h-80 flex-col overflow-y-auto bg-white p-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "mb-4 flex",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-xs rounded-lg px-4 py-2 text-sm",
                    message.role === "user"
                      ? "border-2 border-black bg-black text-white"
                      : "border-2 border-black/20 bg-white text-black"
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <p className="mt-1 text-xs opacity-60">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="border-2 border-black/20 bg-white px-4 py-2">
                  <div className="flex space-x-2">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-black" />
                    <div className="animation-delay-100 h-2 w-2 animate-bounce rounded-full bg-black" />
                    <div className="animation-delay-200 h-2 w-2 animate-bounce rounded-full bg-black" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t-2 border-black bg-white p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask anything..."
                disabled={isLoading}
                className="flex-1 border-2 border-black bg-white px-3 py-2 text-sm placeholder-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                aria-label="Send message"
                className="flex h-10 w-10 items-center justify-center border-2 border-black bg-black text-white shadow-soft transition-colors hover:bg-white hover:text-black hover:shadow-premium disabled:pointer-events-none disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
