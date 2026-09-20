import * as React from "react";
import { Send, Paperclip, MapPin, X, Loader2 } from "lucide-react";
import { getChatMessages, sendChatMessage, markChatMessagesRead, subscribeToChatMessages } from "../../lib/platformApi";
import { formatDateTime } from "../../lib/format";
import { cn } from "../../lib/utils";
import type { ChatMessage } from "../../types";
import { Button } from "./Button";
import { Avatar } from "./Avatar";

interface ChatProps {
  bookingId: string;
  otherPartyName: string;
  otherPartyAvatar?: string | null;
  onClose: () => void;
}

export const Chat = ({ bookingId, otherPartyName, otherPartyAvatar, onClose }: ChatProps) => {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const typingTimeoutRef = React.useRef<ReturnType<typeof setTimeout>>();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  React.useEffect(() => {
    let active = true;
    getChatMessages(bookingId, 50)
      .then((data) => {
        if (active) {
          setMessages(data.reverse());
        }
      })
      .catch((error) => console.error("Failed to load messages:", error))
      .finally(() => active && setLoading(false));

    return () => { active = false; };
  }, [bookingId]);

  React.useEffect(() => {
    const unsubscribe = subscribeToChatMessages(bookingId, (message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    });
    return unsubscribe;
  }, [bookingId]);

  React.useEffect(() => {
    markChatMessagesRead(bookingId).catch(console.error);
  }, [bookingId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    const message = newMessage.trim();
    setNewMessage("");
    setSending(true);

    try {
      await sendChatMessage({
        booking_id: bookingId,
        message,
        message_type: "text",
      });
    } catch (error) {
      setNewMessage(message);
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="panel flex flex-col h-[400px]">
        <div className="flex items-center justify-between border-b-2 border-black p-4">
          <div className="flex items-center gap-3">
            <Avatar src={otherPartyAvatar} name={otherPartyName} alt={otherPartyName} className="h-10 w-10" />
            <div>
              <p className="font-black text-black">{otherPartyName}</p>
              <p className="text-xs text-black/60">Loading messages...</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}><X size={18} /></Button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-black/40" />
        </div>
      </div>
    );
  }

  return (
    <div className="panel flex flex-col h-[500px] max-h-[80vh]">
      <div className="flex items-center justify-between border-b-2 border-black p-4">
        <div className="flex items-center gap-3">
          <Avatar src={otherPartyAvatar} name={otherPartyName} alt={otherPartyName} className="h-10 w-10" />
          <div>
            <p className="font-black text-black">{otherPartyName}</p>
            <p className="text-xs text-black/60">Tap to chat</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}><X size={18} /></Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={messagesEndRef}>
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-black/40">
            <p className="text-sm">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-2 max-w-[80%]",
                msg.is_own ? "flex-row-reverse ml-auto" : "mr-auto"
              )}
            >
              {!msg.is_own && (
                <Avatar src={msg.sender_avatar} name={msg.sender_name} alt={msg.sender_name} className="h-8 w-8 shrink-0" />
              )}
              <div
                className={cn(
                  "px-4 py-2 rounded-2xl text-sm",
                  msg.is_own
                    ? "bg-black text-white rounded-br-none"
                    : "bg-gray-100 text-black rounded-bl-none"
                )}
              >
                {!msg.is_own && <p className="text-xs font-semibold text-black/60 mb-1">{msg.sender_name}</p>}
                <p className="whitespace-pre-wrap">{msg.message}</p>
                <p className={cn("text-[10px] mt-1 text-right", msg.is_own ? "text-white/60" : "text-black/40")}>
                  {formatDateTime(msg.created_at)}
                </p>
              </div>
              {msg.is_own && (
                <Avatar src={msg.sender_avatar} name={msg.sender_name} alt={msg.sender_name} className="h-8 w-8 shrink-0" />
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="border-t-2 border-black p-4">
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" className="p-2"><Paperclip size={18} /></Button>
          <Button type="button" variant="ghost" size="sm" className="p-2"><MapPin size={18} /></Button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 field-shell"
            disabled={sending}
            maxLength={1000}
          />
          <Button type="submit" disabled={!newMessage.trim() || sending} size="sm">
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={18} />}
          </Button>
        </div>
      </form>
    </div>
  );
};