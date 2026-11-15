
import { useCallback, useEffect, useState } from "react";
import LoadingOverlay from "./LoadingOverlay";
import "../styles/EventRequests.css";
import { API_URL } from "../config";

const RESOURCE_TYPES = {
  1: "chairs",
  2: "tables",
};

const COLUMNS = [
  { key: "title", label: "Event" },
  { key: "venue", label: "Venue" },
  { key: "space", label: "Space" },
  { key: "start", label: "Start" },
  { key: "end", label: "End" },
  { key: "description", label: "Description" },
  { key: "attendees", label: "Attendees" },
  { key: "chairs", label: "Chairs" },
  { key: "tables", label: "Tables" },
  { key: "recurring", label: "Recurring" },
  { key: "recurrenceType", label: "Recurrence" },
  { key: "recurrenceEnd", label: "Recurrence Ends" },
  { key: "requester", label: "Requested By" },
];

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getResourceCounts(resources) {
  const counts = {
    chairs: 0,
    tables: 0,
  };

  if (!Array.isArray(resources)) return counts;

  resources.forEach((resource) => {
    const typeId = Array.isArray(resource)
      ? resource[0]
      : resource.resource_type_id;

    const quantity = Array.isArray(resource)
      ? resource[1]
      : resource.quantity;

    const key = RESOURCE_TYPES[Number(typeId)];

    if (key) {
      counts[key] += Number(quantity) || 0;
    }
  });

  return counts;
}


function getRequest(row) {
  const resources = getResourceCounts(row[9]);

  return {
    id: row[0],
    title: row[2],
    venue: row[3],
    space: row[4],
    start: row[5],
    end: row[6],
    description: row[7],
    attendees: row[8] ?? 0,
    chairs: resources.chairs,
    tables: resources.tables,
    recurring: row[10] ? "Yes" : "No",
    recurrenceType: row[11] || "—",
    recurrenceEnd: row[12] ? formatDate(row[12]) : "—",
    requester: row[13] || "—",
  };
}


export default function EventRequests({
  organizationId,
  onClose,
  onPendingRequestsChange,
}) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [denialRequest, setDenialRequest] = useState(null);
  const [denialReason, setDenialReason] = useState("");

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
        throw new Error(
          `Failed to load requests (${response.status}).`
        );
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error(
          "The server returned an unexpected response."
        );
      }

      setRequests(data);
      onPendingRequestsChange?.(data.length > 0);

    } catch (err) {
      console.error("Error loading event requests:", err);
      setError(err.message || "Unable to load event requests.");

    } finally {
      setLoading(false);
    }
  }, [organizationId, onPendingRequestsChange]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  async function processRequest(reqId, action, reason = "") {
    if (processingId !== null) return;

    const actionLabels = {
      approve: "approve",
      deny: "deny",
    };

    setProcessingId(reqId);
    setError("");
    setMessage("");

    try {
      const endpoint =
        `${API_URL}/events/${action}/${encodeURIComponent(reqId)}`;

      const options = {
        method: "PATCH",
        credentials: "include",
        headers: {},
      };

      if (action === "deny") {
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify({
          reason: reason.trim(),
        });
      }

      const response = await fetch(endpoint, options);
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
        `Request ${action === "deny" ? "denied" : "approved"} successfully.`
      );

      if (action === "deny") {
        setDenialRequest(null);
        setDenialReason("");
      }

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

      <LoadingOverlay
        isLoading={loading || processingId !== null}
        message={
          processingId !== null
            ? "Processing event request..."
            : "Loading event requests..."
        }
      />

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
          <p>
            Review and process pending event requests
            for your organization.
          </p>
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

        {loading ? null : requests.length === 0 ? (

          <div className="event-requests-empty">
            <span
              className="event-requests-empty-icon"
              aria-hidden="true"
            >
              ✓
            </span>

            <h2>All caught up!</h2>

            <p>
              There are no pending event requests right now.
            </p>

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

                  <th
                    scope="col"
                    className="event-requests-actions-heading"
                  >
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {requests.map((row) => {
                  const request = getRequest(row);
                  const anyBusy = processingId !== null;

                  return (
                    <tr key={request.id}>

                      {COLUMNS.map((column) => {
                        let value = request[column.key];

                        if (
                          column.key === "start" ||
                          column.key === "end"
                        ) {
                          value = formatDate(value);
                        }

                        return (
                          <td key={column.key}>
                            {value ?? "—"}
                          </td>
                        );
                      })}

                      <td className="event-requests-actions">
                        <div className="event-requests-action-group">

                          <button
                            type="button"
                            className="event-action-btn event-action-approve"
                            disabled={anyBusy}
                            onClick={() =>
                              processRequest(request.id, "approve")
                            }
                          >
                            Approve
                          </button>

                          <button
                            type="button"
                            className="event-action-btn event-action-deny"
                            disabled={anyBusy}
                            onClick={() => {
                              setDenialRequest({
                                id: request.id,
                                title: request.title,
                              });
                              setDenialReason("");
                              setError("");
                              setMessage("");
                            }}
                          >
                            Deny
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

        {denialRequest && (
          <div
            className="denial-modal-overlay"
            onMouseDown={(event) => {
              if (
                event.target === event.currentTarget &&
                processingId === null
              ) {
                setDenialRequest(null);
                setDenialReason("");
              }
            }}
          >
            <section
              className="denial-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="denial-modal-title"
            >
              <h2 id="denial-modal-title">
                Deny Event Request
              </h2>

              <p>
                Please provide a reason for denying{" "}
                <strong>{denialRequest.title}</strong>.
              </p>

              <form
                onSubmit={(event) => {
                  event.preventDefault();

                  if (
                    !denialReason.trim() ||
                    processingId !== null
                  ) {
                    return;
                  }

                  processRequest(
                    denialRequest.id,
                    "deny",
                    denialReason
                  );
                }}
              >
                <label htmlFor="denial-reason">
                  Reason for denial
                </label>

                <textarea
                  id="denial-reason"
                  value={denialReason}
                  onChange={(event) =>
                    setDenialReason(event.target.value)
                  }
                  placeholder="Explain why this event request is being denied..."
                  rows={4}
                  required
                  maxLength={1000}
                  disabled={processingId !== null}
                />

                {error && (
                  <p className="event-requests-error" role="alert">
                    {error}
                  </p>
                )}

                <div className="denial-modal-actions">
                  <button
                    type="button"
                    className="event-requests-refresh"
                    disabled={processingId !== null}
                    onClick={() => {
                      setDenialRequest(null);
                      setDenialReason("");
                      setError("");
                    }}
                  >
                    Back
                  </button>

                  <button
                    type="submit"
                    className="event-action-btn event-action-deny"
                    disabled={
                      processingId !== null ||
                      !denialReason.trim()
                    }
                  >
                    Submit Denial
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

      </section>
    </main>
  );
}
