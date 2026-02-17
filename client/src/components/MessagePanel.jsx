import { useState, useEffect, useRef } from "react";
import palette from "../styles/palette";
import * as api from "../services/api";
import Button from "./Button";

export default function MessagePanel({ escrowId, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 10000);
    return () => clearInterval(interval);
  }, [escrowId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadMessages() {
    try {
      const msgs = await api.getMessages(escrowId);
      setMessages(msgs);
    } catch {
      // silently fail
    }
  }

  async function handleSend() {
    if (!newMsg.trim()) return;
    setSending(true);
    try {
      const msgs = await api.sendMessage(escrowId, newMsg.trim());
      setMessages(msgs);
      setNewMsg("");
    } catch {
      // silently fail
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <div
        style={{
          fontSize: 12,
          color: palette.textDim,
          marginBottom: 12,
          fontWeight: 600,
          letterSpacing: "0.5px",
        }}
      >
        MESSAGES
      </div>

      <div
        style={{
          maxHeight: 300,
          overflowY: "auto",
          padding: "8px 0",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginBottom: 12,
        }}
      >
        {messages.length === 0 ? (
          <p style={{ fontSize: 13, color: palette.textDim, textAlign: "center", padding: 16 }}>
            No messages yet. Start the conversation.
          </p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            return (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  justifyContent: isMe ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "75%",
                    padding: "8px 14px",
                    borderRadius: 12,
                    background: isMe ? palette.accent + "18" : palette.bg,
                    border: `1px solid ${isMe ? palette.accent + "30" : palette.border}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: isMe ? palette.accent : palette.textDim,
                      fontWeight: 600,
                      marginBottom: 4,
                    }}
                  >
                    {msg.senderUsername}
                  </div>
                  <div style={{ fontSize: 13, color: palette.text, lineHeight: 1.5 }}>
                    {msg.body}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: palette.textDim,
                      marginTop: 4,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={newMsg}
          onChange={(e) => setNewMsg(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: 10,
            background: palette.bg,
            color: palette.text,
            border: `1px solid ${palette.border}`,
            fontSize: 13,
            outline: "none",
            fontFamily: "'Outfit', sans-serif",
          }}
          onFocus={(e) => (e.target.style.borderColor = palette.accent)}
          onBlur={(e) => (e.target.style.borderColor = palette.border)}
        />
        <Button
          size="sm"
          onClick={handleSend}
          disabled={sending || !newMsg.trim()}
        >
          Send
        </Button>
      </div>
    </div>
  );
}
