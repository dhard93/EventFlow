import { useCallback, useEffect, useState } from "react";
import "../Notifications.css";

const API_URL = "http://localhost:8000";

export default function Notifications({
  userId,
  onClose,
  onNotificationsChange,
}) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState("");

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      onNotificationsChange?.(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/notifications/unread/${userId}`,
        { credentials: "include" }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to load notifications (${response.status}).`
        );
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("Unexpected notification response.");
      }

      setNotifications(data);
      onNotificationsChange?.(data.length > 0);
    } catch (err) {
      console.error("Error loading notifications:", err);
      setError(err.message || "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [userId, onNotificationsChange]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  async function markAsRead(notificationId) {
    if (processingId !== null) return;

    setProcessingId(notificationId);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/notifications/read/${encodeURIComponent(notificationId)}`,
        {
          method: "PATCH",
          credentials: "include",
        }
      );

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.detail ||
          result?.message ||
          `Failed to mark notification as read (${response.status}).`
        );
      }

      const updatedNotifications = notifications.filter(
        (notification) => notification[0] !== notificationId
      );

      setNotifications(updatedNotifications);

      onNotificationsChange?.(updatedNotifications.length > 0);
    } catch (err) {
      console.error("Error marking notification as read:", err);
      setError(err.message || "Unable to mark notification as read.");
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div
      className="notifications-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && processingId === null) {
          onClose?.();
        }
      }}
    >
      <section
        className="notifications-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notifications-title"
      >
        <header className="notifications-header">
          <div className="notifications-brand">
            <div className="notifications-brand-mark">E</div>
            <span>EventFlow</span>
          </div>

          <button
            type="button"
            className="notifications-close"
            onClick={onClose}
            aria-label="Close notifications"
          >
            &times;
          </button>
        </header>

        <div className="notifications-heading">
          <h1 id="notifications-title">Notifications</h1>
          <p>Stay up to date with activity in your organization.</p>
        </div>

        <div className="notifications-content">
          {error && (
            <p className="notifications-error" role="alert">
              {error}
            </p>
          )}

          {loading ? (
            <p className="notifications-info">
              Loading notifications…
            </p>
          ) : notifications.length === 0 ? (
            <div className="notifications-empty">
              <span className="notifications-empty-mark">
                ✓
              </span>
              <h2>You're all caught up!</h2>
              <p>You have no unread notifications right now.</p>
            </div>
          ) : (
            <div className="notifications-list">
              {notifications.map((notification) => {
                const [id, typeId, content] = notification;
                const busy = processingId === id;

                return (
                  <button
                    key={id}
                    type="button"
                    className="notification-item"
                    disabled={processingId !== null}
                    onClick={() => markAsRead(id)}
                  >
                    <span className="notification-item-indicator" />

                    <span className="notification-item-content">
                      {content}
                    </span>

                    <span className="notification-item-action">
                      {busy ? "Marking read…" : " "}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <footer className="notifications-footer">
          <span className="notifications-footer-note">
            {notifications.length} unread{" "}
            {notifications.length === 1
              ? "notification"
              : "notifications"}
          </span>

          <button
            type="button"
            className="notifications-done"
            onClick={onClose}
            disabled={processingId !== null}
          >
            Done
          </button>
        </footer>
      </section>
    </div>
  );
}
