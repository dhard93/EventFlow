
import { useEffect, useState } from "react";
import "../Messages.css";

const API_URL = "http://localhost:8000";

export default function Messages({
  conversation,
  userId,
  onClose,
  onMessagesRead,
  onMessageSent
}) {
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const conversationId = conversation?.conversation_id;

  function normalizeMessage(row, index) {
    if (Array.isArray(row)) {
      return {
        id: row[4] ?? index,
        sender_id: row[0],
        message: row[1],
        date_created: row[2],
        sender_name: row[3]
      };
    }

    return {
      id: row.id ?? index,
      sender_id: row.sender_id,
      message: row.message,
      date_created: row.date_created,
      sender_name: row.sender_name ?? row.other_user_name
    };
  }

  function formatMessageDate(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  async function loadMessages(signal) {
    const response = await fetch(
      `${API_URL}/messages/${conversationId}`,
      {
        method: "GET",
        credentials: "include",
        signal
      }
    );

    if (!response.ok) {
      throw new Error("Could not load messages.");
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Unexpected messages response.");
    }

    setMessages(data.map(normalizeMessage).reverse());
  }

  useEffect(() => {
    if (!conversationId || !userId) return;

    const controller = new AbortController();

    async function initializeConversation() {
      setLoading(true);
      setError("");

      try {
        // Mark incoming messages as read first.
        const response = await fetch(
          `${API_URL}/messages/unread/${conversationId}/${userId}`,
          {
            method: "PATCH",
            credentials: "include",
            signal: controller.signal
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Unable to mark messages as read (${response.status}): ${errorText}`
          );
        }

        if (controller.signal.aborted) return;

        // Only remove the blue dot after PATCH succeeds.
        onMessagesRead?.(conversationId);

        // Load messages after marking them as read.
        await loadMessages(controller.signal);

      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Error opening conversation:", err);
          setError(err.message || "Unable to open conversation.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    initializeConversation();

    return () => controller.abort();
  }, [conversationId, userId]);

  async function handleSendMessage(e) {
    e.preventDefault();

    const trimmedMessage = messageText.trim();

    if (!trimmedMessage || sending || !conversationId || loading) {
      return;
    }

    setSending(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/messages`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          conv_id: conversationId,
          sender_id: userId,
          message: trimmedMessage
        })
      });

      if (!response.ok) {
        throw new Error("Unable to send message.");
      }

      setMessageText("");

      await loadMessages();

      onMessageSent?.(conversationId);

    } catch (err) {
      console.error("Error sending message:", err);
      setError(err.message || "Unable to send message.");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.currentTarget.form.requestSubmit();
    }
  }

  function isOwnMessage(message) {
    return String(message.sender_id) === String(userId);
  }

  return (
    <div
      className="messages-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      <section
        className="messages-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="messages-title"
      >
        <header className="messages-header">
          <div className="messages-brand">
            <div className="messages-brand-mark">E</div>
            <span>EventFlow</span>
          </div>

          <button
            type="button"
            className="messages-close"
            onClick={onClose}
            aria-label="Close conversation"
          >
            &times;
          </button>
        </header>

        <div className="messages-heading">
          <div>
            <h1 id="messages-title">
              {conversation?.other_user_name || "Conversation"}
            </h1>

            <p>
              Your conversation with{" "}
              {conversation?.other_user_name || "this user"}
            </p>
          </div>
        </div>

        <div className="messages-content">
          {error && (
            <p className="messages-error" role="alert">
              {error}
            </p>
          )}

          {loading ? (
            <p className="messages-info">
              Loading messages...
            </p>
          ) : messages.length === 0 ? (
            <div className="messages-empty">
              <div className="messages-empty-mark">E</div>
              <h2>No messages yet</h2>
              <p>
                Start the conversation by sending a message below.
              </p>
            </div>
          ) : (
            <div className="messages-list">
              {messages.map((message, index) => {
                const ownMessage = isOwnMessage(message);
                const previousMessage = messages[index - 1];

                const isNewSender =
                  !previousMessage ||
                  String(previousMessage.sender_id) !==
                    String(message.sender_id);

                return (
                  <div
                    className={`messages-row ${
                      ownMessage ? "own-message" : "other-message"
                    }`}
                    key={message.id ?? index}
                  >
                    <div className="messages-message-group">
                      {isNewSender && (
                        <span className="messages-sender">
                          {ownMessage
                            ? "You"
                            : message.sender_name || "Unknown user"}
                        </span>
                      )}

                      <div className="messages-bubble">
                        <p>{message.message}</p>
                      </div>

                      <span className="messages-timestamp">
                        {formatMessageDate(message.date_created)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <form
          className="messages-composer"
          onSubmit={handleSendMessage}
        >
          <textarea
            className="messages-input"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a message..."
            rows={2}
            maxLength={5000}
            disabled={sending || loading}
          />

          <button
            type="submit"
            className="messages-send"
            disabled={sending || loading || !messageText.trim()}
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </form>

        <footer className="messages-footer">
          <span className="messages-footer-note">
            Enter to send · Shift + Enter for a new line
          </span>

          <button
            type="button"
            className="messages-done"
            onClick={onClose}
          >
            Close
          </button>
        </footer>
      </section>
    </div>
  );
}
