
import { useState } from "react";
import "../Dashboard.css";

const API_URL = "http://localhost:8000";

export default function Conversations({
  conversations = [],
  loading = false,
  error = null,
  organizationId,
  userId,
  onConversationClick,
  onConversationSent
}) {
  const [showCompose, setShowCompose] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [message, setMessage] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [sending, setSending] = useState(false);
  const [composeError, setComposeError] = useState("");

  async function openCompose() {
    setShowCompose(true);
    setComposeError("");
    setSelectedUser("");
    setMessage("");
    setLoadingUsers(true);

    try {
      const response = await fetch(
        `${API_URL}/users/message/${organizationId}/${userId}`,
        { credentials: "include" }
      );

      if (!response.ok) {
        throw new Error("Unable to load organization users.");
      }

      const data = await response.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setComposeError(err.message);
    } finally {
      setLoadingUsers(false);
    }
  }

  function closeCompose() {
    if (sending) return;

    setShowCompose(false);
    setComposeError("");
  }

  async function handleSendMessage(e) {
    e.preventDefault();

    if (!selectedUser || !message.trim()) return;

    setSending(true);
    setComposeError("");

    try {
      const recipientId = Number(selectedUser);
      const currentUserId = Number(userId);

      const recipient = users.find(
        (user) => Number(user.id) === recipientId
      );

      if (!recipient) {
        throw new Error("Please select a valid recipient.");
      }

      // Find an existing conversation using its two participant IDs.
      const existingConversation = conversations.find(
        (conversation) => {
          const participants = [
            Number(conversation.user1_id),
            Number(conversation.user2_id)
          ];

          return (
            participants.includes(currentUserId) &&
            participants.includes(recipientId)
          );
        }
      );

      let conversation;

      if (existingConversation) {
        // Send to an existing conversation.
        const response = await fetch(`${API_URL}/messages`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            conv_id: existingConversation.conversation_id,
            sender_id: userId,
            message: message.trim()
          })
        });

        if (!response.ok) {
          throw new Error("Unable to send message.");
        }

        conversation = existingConversation;
      } else {
        // Create a new conversation with its first message.
        const response = await fetch(`${API_URL}/conversations`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            user1_id: userId,
            user2_id: recipientId,
            msg_content: message.trim()
          })
        });

        if (!response.ok) {
          throw new Error("Unable to create conversation.");
        }

        const data = await response.json();

        if (!data.conversation_id) {
          throw new Error("Missing conversation ID from server.");
        }

        conversation = {
          conversation_id: data.conversation_id,
          user1_id: userId,
          user2_id: recipientId,
          other_user_name: recipient.name,
          has_unread_message: false
        };
      }

      setShowCompose(false);
      setMessage("");
      setSelectedUser("");

      onConversationSent?.(conversation);

    } catch (err) {
      console.error("Error sending message:", err);
      setComposeError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <section className="upcoming-panel conversations-panel">
        <div className="conversations-heading">
          <div>
            <h2>Conversations</h2>
            <p className="upcoming-subtitle">
              Your recent messages
            </p>
          </div>

          <button
            type="button"
            className="new-message-button"
            onClick={openCompose}
          >
            + New Message
          </button>
        </div>

        <div className="conversations-list">
          {loading && (
            <p className="upcoming-message">
              Loading conversations...
            </p>
          )}

          {error && (
            <p className="upcoming-message upcoming-error">
              {error}
            </p>
          )}

          {!loading && !error && conversations.length === 0 && (
            <p className="upcoming-message">
              You don't have any conversations yet.
            </p>
          )}

          {!loading && !error && conversations.map((conversation) => (
            <button
              type="button"
              className="conversation-item"
              key={conversation.conversation_id}
              onClick={() => onConversationClick?.(conversation)}
            >
              <div className="conversation-details">
                <h3>{conversation.other_user_name}</h3>
                <p>Conversation</p>
              </div>

              {conversation.has_unread_message && (
                <span
                  className="conversation-unread-dot"
                  aria-label="Unread message"
                  title="Unread message"
                />
              )}
            </button>
          ))}
        </div>
      </section>

      {showCompose && (
        <div
          className="compose-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeCompose();
          }}
        >
          <section
            className="compose-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="compose-title"
          >
            <header className="compose-header">
              <h2 id="compose-title">New Message</h2>

              <button
                type="button"
                className="compose-close"
                onClick={closeCompose}
                disabled={sending}
                aria-label="Close"
              >
                &times;
              </button>
            </header>

            <form onSubmit={handleSendMessage}>
              <div className="compose-field">
                <label htmlFor="message-recipient">To</label>

                {loadingUsers ? (
                  <p className="compose-info">
                    Loading organization users...
                  </p>
                ) : (
                  <select
                    id="message-recipient"
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    disabled={sending}
                    required
                  >
                    <option value="">Select a recipient</option>

                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="compose-field">
                <label htmlFor="message-content">Message</label>

                <textarea
                  id="message-content"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your message..."
                  rows={6}
                  maxLength={5000}
                  disabled={sending}
                  required
                />

                <span className="compose-character-count">
                  {message.length}/5000
                </span>
              </div>

              {composeError && (
                <p className="compose-error" role="alert">
                  {composeError}
                </p>
              )}

              <footer className="compose-footer">
                <button
                  type="button"
                  className="compose-cancel"
                  onClick={closeCompose}
                  disabled={sending}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="compose-send"
                  disabled={
                    sending ||
                    loadingUsers ||
                    !selectedUser ||
                    !message.trim()
                  }
                >
                  {sending ? "Sending..." : "Send Message"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
