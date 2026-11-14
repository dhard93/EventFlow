import { useState } from "react";
import { API_URL } from "../config";
import "../styles/MyEvents.css";

const CANCEL_EVENT_URL = (eventId) =>
  `${API_URL}/events/cancel/${eventId}`;

const COLUMNS = [
  { key: "title", label: "Event title" },
  { key: "venue", label: "Venue" },
  { key: "space", label: "Space" },
  { key: "start_time", label: "Start time" },
  { key: "end_time", label: "End time" },
  { key: "recurring", label: "Recurring" },
  { key: "recurrence_type", label: "Recurrence" },
  { key: "recurrence_end_date", label: "Recurrence Ends" },
];

function normalizeEvent(row) {
  return {
    event_id: row[0],
    user_id: row[1],
    title: row[2],
    venue: row[3],
    space: row[4],
    start_time: row[5],
    end_time: row[6],
    description: row[7],
    is_recurring: row[8],
    recurrence_type: row[9],
    recurrence_end_date: row[10],
    recurring: row[8] ? "Yes" : "No",
  };
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const date = new Date(value);

  if (!Number.isNaN(date.getTime())) {
    return (
      date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }) +
      "\n" +
      date.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    );
  }

  return String(value);
}

export default function MyEvents({
  events = [],
  onClose,
  onRequestCancelled,
}) {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [cancellingId, setCancellingId] = useState(null);

  // Convert the arrays received from Dashboard into table-friendly objects.
  const userEvents = Array.isArray(events)
    ? events.map(normalizeEvent)
    : [];

  async function handleCancel(row) {
    const eventId = row.event_id;

    if (eventId == null) {
      setError("This event is missing its ID.");
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to cancel "${row.title}"?`
      )
    ) {
      return;
    }

    setError("");
    setMessage("");
    setCancellingId(eventId);

    try {
      const response = await fetch(CANCEL_EVENT_URL(eventId), {
        method: "PATCH",
        credentials: "include",
      });

      if (!response.ok) {
        let detail = "Failed to cancel the event.";

        try {
          const result = await response.json();

          if (result.detail) {
            detail =
              typeof result.detail === "string"
                ? result.detail
                : JSON.stringify(result.detail);
          }
        } catch {
          // Keep the default error message.
        }

        throw new Error(detail);
      }

      setMessage(`"${row.title}" was cancelled successfully.`);

      // Dashboard updates both events datasets.
      onRequestCancelled?.(row);
    } catch (err) {
      setError(err.message || "Failed to cancel the event.");
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div
      className="my-requests-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <section
        className="my-requests-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="my-requests-title"
      >
        <header className="my-requests-header">
          <div className="my-requests-brand">
            <div className="my-requests-brand-mark">E</div>
            <span>EventFlow</span>
          </div>

          <button
            type="button"
            className="my-requests-close"
            onClick={onClose}
            aria-label="Close events"
          >
            &times;
          </button>
        </header>

        <div className="my-requests-heading">
          <h1 id="my-requests-title">My Events</h1>
          <p>View your approved events and manage your bookings.</p>
        </div>

        <div className="my-requests-content">
          {error && (
            <p className="my-requests-error" role="alert">
              {error}
            </p>
          )}

          {message && (
            <p className="my-requests-message" role="status">
              {message}
            </p>
          )}

          {userEvents.length === 0 ? (
            <div className="my-requests-empty">
              <div className="my-requests-empty-mark">E</div>
              <h2>No approved events</h2>
              <p>Your approved events will appear here.</p>
            </div>
          ) : (
            <div className="my-requests-table-wrapper">
              <table className="my-requests-table">
                <thead>
                  <tr>
                    {COLUMNS.map((column) => (
                      <th key={column.key} scope="col">
                        {column.label}
                      </th>
                    ))}
                    <th scope="col">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {userEvents.map((row, index) => (
                    <tr key={row.event_id ?? index}>
                      {COLUMNS.map((column) => {
                        const value = row[column.key];

                        return (
                          <td key={column.key}>
                            {column.key === "recurrence_end_date" &&
                            !row.is_recurring
                              ? "—"
                              : formatValue(value)}
                          </td>
                        );
                      })}

                      <td className="my-requests-actions">
                        <button
                          type="button"
                          className="my-requests-cancel"
                          disabled={cancellingId === row.event_id}
                          onClick={() => handleCancel(row)}
                        >
                          {cancellingId === row.event_id
                            ? "Cancelling..."
                            : "Cancel event"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <footer className="my-requests-footer">
          <span className="my-requests-footer-note">
            Plan better. Bring people together.
          </span>

          <button
            type="button"
            className="my-requests-done"
            onClick={onClose}
          >
            Close
          </button>
        </footer>
      </section>
    </div>
  );
}
