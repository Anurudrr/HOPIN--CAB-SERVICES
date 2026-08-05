import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
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
  const shouldReduceMotion = useReducedMotion();

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
      {/* Floating trigger with breathing pulse when closed */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close AI support chat" : "Open AI support chat"}
        aria-expanded={isOpen}
        initial={false}
        animate={
          shouldReduceMotion
            ? {}
            : isOpen
              ? { rotate: 90, scale: 1 }
              : { rotate: 0, scale: 1 }
        }
        whileTap={{ scale: 0.92 }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
        className={cn(
          "fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-none border-2 border-black bg-black text-white shadow-soft",
          "hover:bg-white hover:text-black hover:shadow-premium",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        )}
      >
        {/* Breathing halo when closed */}
        {!isOpen && !shouldReduceMotion ? (
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full border-2 border-black"
            style={{
              animation: "live-pulse 2.4s cubic-bezier(0.16,1,0.3,1) infinite",
            }}
          />
        ) : null}
        <span className="relative z-10">
          {isOpen ? <X size={20} /> : <MessageCircle size={20} />}
        </span>
      </motion.button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="fixed inset-x-3 bottom-24 z-50 flex max-h-[calc(100vh-8rem)] w-auto flex-col rounded-none border-2 border-black bg-white shadow-premium sm:inset-x-auto sm:right-6 sm:w-96"
          >
            <div className="flex items-center justify-between border-b-2 border-black bg-black p-4 text-white">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="inline-block h-2 w-2 rounded-full bg-white"
                  style={{
                    animation: shouldReduceMotion
                      ? undefined
                      : "live-pulse 1.8s cubic-bezier(0.16,1,0.3,1) infinite",
                  }}
                />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-[0.22em]">HopIn Support</h3>
                  <p className="mt-0.5 text-xs text-white/70">AI-powered, live now</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
                className="flex h-8 w-8 items-center justify-center border-2 border-white/40 text-white transition-colors hover:bg-white hover:text-black"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex h-80 min-h-0 flex-col overflow-y-auto bg-white p-4">
              <AnimatePresence initial={false}>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                    className={cn(
                      "mb-4 flex",
                      message.role === "user" ? "justify-end" : "justify-start",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-xs px-4 py-2 text-sm",
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
                  </motion.div>
                ))}
              </AnimatePresence>

              {isLoading ? (
                <div className="flex justify-start">
                  <div className="border-2 border-black/20 bg-white px-4 py-2">
                    <div className="flex space-x-2">
                      <span
                        className="h-2 w-2 animate-bounce rounded-full bg-black"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="h-2 w-2 animate-bounce rounded-full bg-black"
                        style={{ animationDelay: "120ms" }}
                      />
                      <span
                        className="h-2 w-2 animate-bounce rounded-full bg-black"
                        style={{ animationDelay: "240ms" }}
                      />
                    </div>
                  </div>
                </div>
              ) : null}

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
                  className="flex-1 border-2 border-black bg-white px-3 py-2 text-sm placeholder-black/40 transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:shadow-premium disabled:opacity-50"
                />
                <button
                  onClick={() => void sendMessage()}
                  disabled={isLoading || !input.trim()}
                  aria-label="Send message"
                  className="flex h-10 w-10 items-center justify-center border-2 border-black bg-black text-white shadow-soft transition-all duration-200 hover:-translate-x-[1px] hover:-translate-y-[1px] hover:bg-white hover:text-black hover:shadow-premium active:translate-x-0 active:translate-y-0 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
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
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}