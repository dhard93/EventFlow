
import { useEffect, useState } from "react";
import "../RequestEvent.css";

const RECURRENCE_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  {
    value: "monthly_date",
    label: "Monthly (same date)",
  },
  {
    value: "monthly_weekday",
    label: "Monthly (same weekday)",
  },
];

export default function RequestEvent({
  organizationId,
  userId,
  adminId,
  onClose,
  onRequest,
}) {
  const [venues, setVenues] = useState([]);
  const [spaces, setSpaces] = useState([]);

  const [venueId, setVenueId] = useState("");
  const [spaceId, setSpaceId] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [attendeeCount, setAttendeeCount] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [isRecurring, setIsRecurring] = useState("false");
  const [recurrenceType, setRecurrenceType] = useState("");
  const [recurrenceEndDate, setRecurrenceEndDate] =
    useState("");

  const [loadingVenues, setLoadingVenues] = useState(false);
  const [loadingSpaces, setLoadingSpaces] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [venueError, setVenueError] = useState("");

  const [resources, setResources] = useState({
  chairs: 0,
  tables: 0,
  microphones: 0,
  podiums: 0,
  tvs: 0,
});

  // Load the organization's venues.
  useEffect(() => {
    console.log("Venue useEffect ran. organizationId:", organizationId);
    if (!organizationId) {
      setVenues([]);
      setVenueId("");
      setSpaces([]);
      setSpaceId("");
      return;
    }

    const controller = new AbortController();

    async function loadVenues() {
      setLoadingVenues(true);
      setError("");
      setVenues([]);
      setVenueId("");
      setSpaces([]);
      setSpaceId("");

      try {
        const response = await fetch(
          `http://localhost:8000/venues/${organizationId}`,
          {
            credentials: "include",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error("Could not load venues.");
        }

        const data = await response.json();

        console.log("Organization ID:", organizationId);
        console.log("Venues response:", data);


        setVenues(data);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Failed to load venues.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingVenues(false);
        }
      }
    }

    loadVenues();

    return () => controller.abort();
  }, [organizationId]);

  // Load spaces whenever the selected venue changes.
  useEffect(() => {
    if (!venueId) {
      setSpaces([]);
      setSpaceId("");
      return;
    }

    const controller = new AbortController();

    async function loadSpaces() {
      setLoadingSpaces(true);
      setError("");
      setSpaces([]);
      setSpaceId("");

      try {
        const response = await fetch(
          `http://localhost:8000/spaces/${venueId}`,
          {
            credentials: "include",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error("Could not load spaces.");
        }

        const data = await response.json();

        // Adjust this if your API returns a wrapper object.
        setSpaces(Array.isArray(data) ? data : data.spaces ?? []);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Failed to load spaces.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingSpaces(false);
        }
      }
    }

    loadSpaces();

    return () => controller.abort();
  }, [venueId]);

  function handleVenueChange(value) {
    setVenueId(value);
    setSpaceId("");
    setSpaces([]);
    setError("");
    setMessage("");
  }

    async function handleSubmit(event) {
        try {
            event.preventDefault();
            setError("");
            setMessage("");

            if (!venueId || !spaceId) {
                setError("Please select a venue and a space.");
                return;
            }

            if (
                !startTime ||
                !endTime ||
                new Date(endTime) <= new Date(startTime)
            ) {
                setError("The end time must be after the start time.");
                return;
            }

            if (isRecurring === "true") {
              if (!recurrenceType || !recurrenceEndDate) {
                setError(
                  "Please select a recurrence type and end date."
                );
                return;
              }

              if (recurrenceEndDate < startTime.slice(0, 10)) {
                setError(
                  "The recurrence end date cannot be before the event start date."
                );
                return;
              }

              if (
                !RECURRENCE_OPTIONS.some(
                  (option) => option.value === recurrenceType
                )
              ) {
                setError("Please select a valid recurrence type.");
                return;
              }
            }

            const eventData = {
                admin_id: Number(adminId),
                org_id: Number(organizationId),
                venue_id: Number(venueId),
                space_id: Number(spaceId),
                requesting_user_id: Number(userId),
                title: title.trim(),
                description: description.trim() || null,
                attendee_count: Number(attendeeCount),
                start_time: startTime,
                end_time: endTime,
                is_recurring: isRecurring === "true",
                recurrence_type:
                    isRecurring === "true" ? recurrenceType : null,
                recurrence_end_date:
                    isRecurring === "true" ? recurrenceEndDate : null,
                resources: {
                    Chairs: Number(resources.chairs),
                    Tables: Number(resources.tables),
                    Microphones: Number(resources.microphones),
                    Podiums: Number(resources.podiums),
                    TVs: Number(resources.tvs),
                },
            };

            const response = await fetch(
                "http://localhost:8000/events",
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(eventData),
                }
            );

            if (!response.ok) {
              const result = await response.json();

              console.error("API error:", {
                status: response.status,
                response: result,
                submittedData: eventData,
              });

              throw new Error(
                typeof result.detail === "string"
                  ? result.detail
                  : JSON.stringify(result.detail ?? result)
              );
            }

            setMessage("Event request submitted successfully.");
            onRequest?.(eventData);

        } catch (err) {
            console.error("Event request failed:", err);
            setError(err.message || "Failed to submit event request.");
        }
    }

  return (
    <main className="request-event-page">
      <section className="request-event-card">
        <header className="request-event-header">
          <div className="request-event-brand">
            <div className="request-event-brand-mark">E</div>
            <span>EventFlow</span>
          </div>

          <button
            type="button"
            className="request-event-close"
            onClick={onClose}
            aria-label="Close form"
          >
            &times;
          </button>
        </header>

        <div className="request-event-heading">
          <h1>Request an event</h1>
          <p>
            Choose a venue, reserve a space, and tell us
            about your event.
          </p>
        </div>

        <form
          className="request-event-form"
          onSubmit={handleSubmit}
        >
          {/* Venue selection */}
          <fieldset className="request-event-section">
            <legend>1. Select a venue</legend>
            <p className="request-event-hint">
              Choose one venue for your event.
            </p>

            {loadingVenues ? (
              <p className="request-event-info">
                Loading venues...
              </p>
            ) : venues.length === 0 ? (
              <p className="request-event-info">
                No venues available.
              </p>
            ) : (
              <div className="request-event-options">
                {venues.map((venue) => (
                  <label
                    className={`request-event-option ${
                      venueId === String(venue.id)
                        ? "selected"
                        : ""
                    }`}
                    key={venue.id}
                  >
                    <input
                      type="radio"
                      name="venue"
                      value={String(venue.id)}
                      checked={venueId === String(venue.id)}
                      onChange={(e) =>
                        handleVenueChange(e.target.value)
                      }
                      required
                    />
                    <span>
                      {venue.name ?? venue.title ?? `Venue ${venue.id}`}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          {/* Space selection */}
          <fieldset className="request-event-section">
            <legend>2. Select a space</legend>
            <p className="request-event-hint">
              Available spaces depend on the selected venue.
            </p>

            {!venueId ? (
              <p className="request-event-info">
                Select a venue to view its spaces.
              </p>
            ) : loadingSpaces ? (
              <p className="request-event-info">
                Loading spaces...
              </p>
            ) : spaces.length === 0 ? (
              <p className="request-event-info">
                No spaces available for this venue.
              </p>
            ) : (
              <div className="request-event-options">
                {spaces.map((space) => (
                  <label
                    className={`request-event-option ${
                      spaceId === String(space.id)
                        ? "selected"
                        : ""
                    }`}
                    key={space.id}
                  >
                    <input
                      type="radio"
                      name="space"
                      value={String(space.id)}
                      checked={spaceId === String(space.id)}
                      onChange={(e) =>
                        setSpaceId(e.target.value)
                      }
                      required
                    />
                    <span>
                      {space.name ?? space.title ?? `Space ${space.id}`}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          {/* Event details */}
          <fieldset className="request-event-section">
            <legend>3. Event details</legend>

            <div className="request-event-field">
            <label htmlFor="event-title">Event title</label>
            <input
                id="event-title"
                type="text"
                maxLength={255}
                placeholder="e.g. Annual staff meeting"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
            />
            </div>

            <div className="request-event-field">
            <label htmlFor="event-description">
                Description
            </label>
            <textarea
                id="event-description"
                rows={3}
                placeholder="Describe the purpose of your event..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
            />
            </div>

            <div className="request-event-field">
            <label htmlFor="attendee-count">
                Expected attendees
            </label>
            <input
                id="attendee-count"
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 50"
                value={attendeeCount}
                onChange={(e) =>
                setAttendeeCount(e.target.value)
                }
            />
            </div>

            <div className="request-event-time-row">
            <div className="request-event-field">
                <label htmlFor="event-start">
                Start date and time
                </label>
                <input
                    id="event-start"
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                />
            </div>

            <div className="request-event-field">
                <label htmlFor="event-end">
                End date and time
                </label>
                <input
                    id="event-start"
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                />
            </div>
            </div>
        </fieldset>

        {/* Recurrence */}
        <fieldset className="request-event-section">
            <legend>4. Recurrence</legend>
            <p className="request-event-hint">
            Will this event repeat?
            </p>

            <div className="request-event-options">
            <label className="request-event-option">
                <input
                type="radio"
                name="isRecurring"
                value="false"
                checked={isRecurring === "false"}
                onChange={() => {
                    setIsRecurring("false");
                    setRecurrenceType("");
                    setRecurrenceEndDate("");
                }}
                />
                No, one-time event
            </label>

            <label className="request-event-option">
                <input
                type="radio"
                name="isRecurring"
                value="true"
                checked={isRecurring === "true"}
                onChange={() => setIsRecurring("true")}
                />
                Yes, recurring event
            </label>
            </div>

            {isRecurring === "true" && (
            <div className="request-event-recurrence">
                <div className="request-event-field">
                <span className="request-event-label">
                    Repeat frequency
                </span>

                <div className="request-event-options">
                  {RECURRENCE_OPTIONS.map((option) => (
                    <label
                      className="request-event-option"
                      key={option.value}
                    >
                      <input
                        type="radio"
                        name="recurrenceType"
                        value={option.value}
                        checked={recurrenceType === option.value}
                        onChange={(e) =>
                          setRecurrenceType(e.target.value)
                        }
                        required
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
                </div>

                <div className="request-event-field">
                <label htmlFor="recurrence-end">
                    Recurrence end date
                </label>
                <input
                    id="recurrence-end"
                    type="date"
                    min={startTime ? startTime.slice(0, 10) : undefined}
                    value={recurrenceEndDate}
                    onChange={(e) =>
                    setRecurrenceEndDate(e.target.value)
                    }
                    required
                />
                </div>
            </div>
            )}
        </fieldset>

            {/* Resource requests */}
            <fieldset className="request-event-section">
            <legend>5. Resource requests</legend>
            <p className="request-event-hint">
                Specify how many of each resource you need.
                Leave at 0 if you don't need any.
            </p>

            <div className="request-event-resource-grid">
                {[
                { key: "chairs", label: "Chairs" },
                { key: "tables", label: "Tables" },
                { key: "microphones", label: "Microphones" },
                { key: "podiums", label: "Podiums" },
                { key: "tvs", label: "TVs" },
                ].map((resource) => (
                <div className="request-event-field" key={resource.key}>
                    <label htmlFor={`resource-${resource.key}`}>
                    {resource.label}
                    </label>
                    <input
                    id={`resource-${resource.key}`}
                    type="number"
                    min="0"
                    step="1"
                    value={resources[resource.key]}
                    onChange={(e) =>
                        setResources((previous) => ({
                            ...previous,
                            [resource.key]: e.target.value,
                        }))
                    }
                    />
                </div>
                ))}
            </div>
            </fieldset>

          {error && (
            <p className="request-event-error" role="alert">
              {error}
            </p>
          )}

          {message && (
            <p className="request-event-message" role="status">
              {message}
            </p>
          )}

          <footer className="request-event-footer">
            <button
              type="button"
              className="request-event-cancel"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="request-event-submit"
              disabled={
                loadingVenues ||
                loadingSpaces ||
                !venueId ||
                !spaceId
              }
            >
              Submit Request <span aria-hidden="true">→</span>
            </button>
          </footer>
        </form>

        <p className="request-event-bottom-note">
          Plan better. Bring people together.
        </p>
      </section>
    </main>
  );
}
