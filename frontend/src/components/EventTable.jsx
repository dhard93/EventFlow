
import { useState, useEffect } from "react";
import "../styles/EventTable.css";

export default function EventTable({ selectedDayEvents = [] }) {
  const [selectedVenue, setSelectedVenue] = useState("All Venues");

  const columns = [
    { label: "Title", index: 2, width: "16%" },
    { label: "Venue", index: 3, width: "12%" },
    { label: "Space", index: 4, width: "12%" },
    { label: "Start Time", index: 5, width: "14%" },
    { label: "End Time", index: 6, width: "14%" },
    { label: "Description", index: 7, width: "32%" },
  ];

  // Only show venues represented in the selected day's events.
  const venues = [
    ...new Set(
      selectedDayEvents
        .map((event) => event[3])
        .filter(
          (venue) =>
            typeof venue === "string" && venue.trim() !== ""
        )
    ),
  ].sort();

  // Filter events by the selected venue.
  const filteredEvents =
    selectedVenue === "All Venues"
      ? selectedDayEvents
      : selectedDayEvents.filter(
          (event) => event[3] === selectedVenue
        );

  // Reset venue selection when the selected day's events change.
  useEffect(() => {
    setSelectedVenue("All Venues");
  }, [selectedDayEvents]);

  function formatTime(timestamp) {
    if (!timestamp) return "—";

    const time = timestamp.slice(11, 19);
    const [hours, minutes] = time.split(":").map(Number);

    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;

    return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`;
  }

  return (
    <section className="events-panel">
      {/* Original heading remains in its own row */}
      <div className="events-panel-header">
        <h2>Scheduled Events</h2>
        <span className="events-count">
          {filteredEvents.length} events
        </span>
      </div>


      {/* Venue filters - separate row above the heading */}
      {selectedDayEvents.length > 0 && (
        <div className="venue-tabs">
          <button
            type="button"
            className={`venue-tab ${
              selectedVenue === "All Venues" ? "active" : ""
            }`}
            onClick={() => setSelectedVenue("All Venues")}
          >
            All Venues
          </button>

          {venues.map((venue) => (
            <button
              key={venue}
              type="button"
              className={`venue-tab ${
                selectedVenue === venue ? "active" : ""
              }`}
              onClick={() => setSelectedVenue(venue)}
            >
              {venue}
            </button>
          ))}
        </div>
      )}

      {filteredEvents.length === 0 ? (
        <p className="events-empty">
          {selectedDayEvents.length === 0
            ? "Select a date with scheduled events to view them."
            : "No scheduled events for this venue on the selected date."}
        </p>
      ) : (
        <div className="events-table-wrapper">
          <table className="events-table">
            <colgroup>
              {columns.map((column) => (
                <col
                  key={column.index}
                  style={{ width: column.width }}
                />
              ))}
            </colgroup>

            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.index} scope="col">
                    <button
                      type="button"
                      className="events-sort-button"
                      aria-label={`Sort by ${column.label}`}
                    >
                      {column.label}
                      <span
                        className="sort-indicator"
                        aria-hidden="true"
                      >
                        ↕
                      </span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredEvents.map((event, index) => (
                <tr key={`${event[0]}-${event[3]}-${index}`}>
                  {columns.map((column) => (
                    <td key={column.index}>
                      {column.index === 5 || column.index === 6
                        ? formatTime(event[column.index])
                        : event[column.index] == null ||
                            event[column.index] === ""
                          ? "—"
                          : String(event[column.index])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
