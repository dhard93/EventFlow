
import { useCallback, useEffect, useState } from "react";
import "../EventRequests.css";

const API_URL = "http://localhost:8000";

// Change this to match the route decorator for auto_process_event_request.
const AUTO_PROCESS_URL = (reqId) =>
  `${API_URL}/events/process/auto/?req_id=${reqId}`;

const COLUMNS = [
  { key: "title", label: "Event" },
  { key: "venue", label: "Venue" },
  { key: "space", label: "Space" },
  { key: "start", label: "Start" },
  { key: "end", label: "End" },
  { key: "description", label: "Description" },
  { key: "recurring", label: "Recurring" },
  { key: "recurrenceType", label: "Recurrence" },
  { key: "recurrenceEnd", label: "Recurrence Ends" },
  { key: "requester", label: "Requested By" },
];

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getRequest(row) {
  // Backend row order:
  // req_id, title, venue, space, start, end, description,
  // is_recurring, recurrence_type, recurrence_end_date, first, last
  return {
    id: row[0],
    title: row[1],
    venue: row[2],
    space: row[3],
    start: row[4],
    end: row[5],
    description: row[6],
    recurring: row[7] ? "Yes" : "No",
    recurrenceType: row[8] || "—",
    recurrenceEnd: row[9] ? formatDate(row[9]) : "—",
    requester: [row[10], row[11]].filter(Boolean).join(" ") || "—",
  };
}

export default function EventRequests({ organizationId, onClose }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchRequests = useCallback(async () => {
    if (!organizationId) {
      setRequests([]);
      setLoading(false);
      setError("Organization ID is missing.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/events/pending/${organizationId}`,
        { credentials: "include" }
      );

      if (!response.ok) {
        throw new Error(`Failed to load requests (${response.status}).`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("The server returned an unexpected response.");
      }

      setRequests(data);
    } catch (err) {
      console.error("Error loading event requests:", err);
      setError(err.message || "Unable to load event requests.");
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  async function processRequest(reqId, action) {
    if (processingId !== null) return;

    const actionLabels = {
      approve: "approve",
      deny: "deny",
      auto: "automatically process",
    };

    if (
      action === "deny" &&
      !window.confirm("Are you sure you want to deny this event request?")
    ) {
      return;
    }

    setProcessingId(reqId);
    setError("");
    setMessage("");

    try {
      let response;

      if (action === "approve" || action === "deny") {
        const status = action === "approve" ? 1 : 2;

        response = await fetch(
          `${API_URL}/events/process/${status}/${encodeURIComponent(reqId)}`,
          {
            method: "PATCH",
            credentials: "include",
          }
        );
      } else {
        response = await fetch(AUTO_PROCESS_URL(reqId), {
          method: "POST",
          credentials: "include",
        });
      }

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.detail ||
          result?.message ||
          `Could not ${actionLabels[action]} request (${response.status}).`
        );
      }

      setMessage(
        result?.message ||
        `Request ${action === "auto" ? "processed automatically" : `${action}d`} successfully.`
      );

      // Reload the pending list so completed requests disappear.
      await fetchRequests();
    } catch (err) {
      console.error("Error processing event request:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <main className="event-requests-page">
      <section className="event-requests-card">
        <header className="event-requests-header">
          <div className="event-requests-brand">
            <div className="event-requests-brand-mark">E</div>
            <span>EventFlow</span>
          </div>

          <button
            type="button"
            className="event-requests-close"
            onClick={onClose}
            aria-label="Close event requests"
          >
            &times;
          </button>
        </header>

        <div className="event-requests-heading">
          <h1>Event Requests</h1>
          <p>Review and process pending event requests for your organization.</p>
        </div>

        {error && (
          <p className="event-requests-error" role="alert">
            {error}
          </p>
        )}

        {message && (
          <p className="event-requests-message" role="status">
            {message}
          </p>
        )}

        {loading ? (
          <p className="event-requests-state">Loading event requests…</p>
        ) : requests.length === 0 ? (
          <div className="event-requests-empty">
            <span className="event-requests-empty-icon" aria-hidden="true">
              ✓
            </span>
            <h2>All caught up!</h2>
            <p>There are no pending event requests right now.</p>
            <button
              type="button"
              className="event-requests-refresh"
              onClick={fetchRequests}
            >
              Refresh
            </button>
          </div>
        ) : (
          <div className="event-requests-table-wrap">
            <table className="event-requests-table">
              <thead>
                <tr>
                  {COLUMNS.map((column) => (
                    <th key={column.key} scope="col">
                      {column.label}
                    </th>
                  ))}
                  <th scope="col" className="event-requests-actions-heading">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {requests.map((row) => {
                  const request = getRequest(row);
                  const busy = processingId === request.id;
                  const anyBusy = processingId !== null;

                  return (
                    <tr key={request.id}>
                      {COLUMNS.map((column) => {
                        let value = request[column.key];

                        if (column.key === "start" || column.key === "end") {
                          value = formatDate(value);
                        }

                        return (
                          <td key={column.key}>
                            {value || "—"}
                          </td>
                        );
                      })}

                      <td className="event-requests-actions">
                        <div className="event-requests-action-group">
                          <button
                            type="button"
                            className="event-action-btn event-action-approve"
                            disabled={anyBusy}
                            onClick={() => processRequest(request.id, "approve")}
                          >
                            {busy ? "Working…" : "Approve"}
                          </button>

                          <button
                            type="button"
                            className="event-action-btn event-action-deny"
                            disabled={anyBusy}
                            onClick={() => processRequest(request.id, "deny")}
                          >
                            Deny
                          </button>

                          <button
                            type="button"
                            className="event-action-btn event-action-auto"
                            disabled={anyBusy}
                            onClick={() => processRequest(request.id, "auto")}
                            title="Automatically approve or deny based on scheduling, capacity, and resource checks"
                          >
                            Auto Decide
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {requests.length > 0 && (
        <footer className="event-requests-footer">
            <span>
            {requests.length} pending{" "}
            {requests.length === 1 ? "request" : "requests"}
            </span>

            <button
            type="button"
            className="event-requests-refresh"
            onClick={fetchRequests}
            disabled={loading || processingId !== null}
            >
            Refresh list
            </button>
        </footer>
        )}
      </section>
    </main>
  );
}
