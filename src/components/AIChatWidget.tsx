import * as React from "react";
import { MessageCircle, Send, X } from "lucide-react";

import { requestSupportChatReply, type SupportChatMessage } from "../lib/api";
import { logDevError } from "../lib/errors";
import { cn } from "../lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

function createMessage(role: Message["role"], content: string): Message {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    timestamp: new Date(),
  };
}

export function AIChatWidget() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>(() => [
    createMessage("assistant", "Hi! I'm HopIn's support assistant. How can I help you today?"),
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

  const sendMessage = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    const userMessage = createMessage("user", trimmedInput);
    const conversation: SupportChatMessage[] = [
      ...messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      {
        role: "user",
        content: trimmedInput,
      },
    ];

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const content = await requestSupportChatReply(conversation);
      setMessages((prev) => [
        ...prev,
        createMessage(
          "assistant",
          content || "I'm having trouble responding right now. Please try again.",
        ),
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        createMessage(
          "assistant",
          "Sorry, I encountered an issue. Please try again or contact support@hopin.com for assistance.",
        ),
      ]);
      logDevError("AIChatWidget.sendMessage", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void sendMessage();
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle AI support chat"
        className={cn(
          "fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-none border-2 border-black bg-black text-white shadow-soft transition-all duration-200",
          "hover:bg-white hover:text-black hover:shadow-premium",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        )}
      >
        {isOpen ? <X size={20} /> : <MessageCircle size={20} />}
      </button>

      {isOpen && (
        <div className="fixed inset-x-3 bottom-24 z-50 flex max-h-[calc(100vh-8rem)] w-auto flex-col rounded-none border-2 border-black bg-white shadow-premium sm:inset-x-auto sm:right-6 sm:w-96">
          <div className="border-b-2 border-black bg-black p-4 text-white">
            <h3 className="text-sm font-black uppercase tracking-[0.22em]">HopIn Support</h3>
            <p className="mt-1 text-xs text-white/70">AI-Powered Assistance</p>
          </div>

          <div className="flex h-80 min-h-0 flex-col overflow-y-auto bg-white p-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "mb-4 flex",
                  message.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-xs rounded-lg px-4 py-2 text-sm",
                    message.role === "user"
                      ? "border-2 border-black bg-black text-white"
                      : "border-2 border-black/20 bg-white text-black",
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

          <div className="border-t-2 border-black bg-white p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about bookings, rides, or account help..."
                disabled={isLoading}
                className="flex-1 border-2 border-black bg-white px-3 py-2 text-sm placeholder-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-50"
              />
              <button
                onClick={() => void sendMessage()}
                disabled={isLoading || !input.trim()}
                aria-label="Send message"
                className="flex h-10 w-10 items-center justify-center border-2 border-black bg-black text-white shadow-soft transition-colors hover:bg-white hover:text-black hover:shadow-premium disabled:pointer-events-none disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="mt-3 text-[11px] leading-5 text-black/55">
              Messages are processed by HopIn&apos;s AI provider with limited account and trip
              metadata. Exact addresses, passwords, OTPs, and full payment details should not be
              shared here.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
