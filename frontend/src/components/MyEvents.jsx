
import { useCallback, useEffect, useState } from "react";
import "../MyEvents.css";

const EVENTS_URL = (userId) =>
  `http://localhost:8000/events/user/${userId}`;

const CANCEL_EVENT_URL = (eventId) =>
  `http://localhost:8000/events/${eventId}/cancel`;

const COLUMNS = [
  { key: "title", label: "Event title" },
  { key: "venue", label: "Venue" },
  { key: "space", label: "Space" },
  { key: "start_time", label: "Start time" },
  { key: "end_time", label: "End time" },
  { key: "date_approved", label: "Approved at" },
];

function normalizeEvent(row) {
  if (Array.isArray(row)) {
    return {
      event_id: row[0],
      title: row[1],
      venue: row[2],
      space: row[3],
      start_time: row[4],
      end_time: row[5],
      date_approved: row[6],
    };
  }

  return {
    ...row,
    event_id: row.event_id ?? row.id,
    venue: row.venue ?? row.name,
    space: row.space ?? row.space_name,
  };
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const date = new Date(value);

  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) + "\n" + date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return String(value);
}

export default function MyEvents({
  userId,
  onClose,
  onRequestCancelled,
}) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [cancellingId, setCancellingId] = useState(null);

  const loadEvents = useCallback(async (signal) => {
    if (!userId) {
      setEvents([]);
      setError("A valid user ID is required.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(EVENTS_URL(userId), {
        credentials: "include",
        signal,
      });

      if (!response.ok) {
        throw new Error("Could not load your events.");
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("The server returned an unexpected response.");
      }

      setEvents(data.map(normalizeEvent));
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(err.message || "Failed to load events.");
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    const controller = new AbortController();
    loadEvents(controller.signal);

    return () => controller.abort();
  }, [loadEvents]);

  async function handleCancel(row) {
    const eventId = row.event_id;

    if (eventId == null) {
      setError("This event is missing its ID.");
      return;
    }

    if (!window.confirm(`Are you sure you want to cancel "${row.title}"?`)) {
      return;
    }

    setError("");
    setMessage("");
    setCancellingId(eventId);

    try {
      const response = await fetch(CANCEL_EVENT_URL(eventId), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_id: eventId,
          requesting_user_id: Number(userId),
        }),
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

      setEvents((previous) =>
        previous.filter((item) => item.event_id !== eventId)
      );

      setMessage(`"${row.title}" was cancelled successfully.`);
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

          {loading ? (
            <p className="my-requests-info">Loading your events...</p>
          ) : events.length === 0 ? (
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
                  {events.map((row, index) => (
                    <tr key={row.event_id ?? index}>
                      {COLUMNS.map((column) => (
                        <td key={column.key}>
                          {formatValue(row[column.key])}
                        </td>
                      ))}

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
