import { useState, useEffect } from "react";
import "../styles/EventTable.css";

const RESOURCE_IDS = {
  chairs: 1,
  tables: 2,
  microphones: 3,
  tvs: 4,
  podiums: 5,
};

export default function EventTable({ selectedDayEvents = [] }) {
  const [selectedVenue, setSelectedVenue] = useState("All Venues");

  const columns = [
    { label: "Title", index: 2, width: "180px" },
    { label: "Venue", index: 3, width: "160px" },
    { label: "Space", index: 4, width: "150px" },
    { label: "Start Time", index: 5, width: "140px" },
    { label: "End Time", index: 6, width: "140px" },
    { label: "Description", index: 7, width: "220px" },
    { label: "Attendees", index: 8, width: "100px" },
    { label: "Chairs", index: "chairs", width: "90px" },
    { label: "Tables", index: "tables", width: "90px" },
    { label: "Microphones", index: "microphones", width: "120px" },
    { label: "TVs", index: "tvs", width: "80px" },
    { label: "Podiums", index: "podiums", width: "90px" },
  ];

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

  const filteredEvents =
    selectedVenue === "All Venues"
      ? selectedDayEvents
      : selectedDayEvents.filter(
          (event) => event[3] === selectedVenue
        );

  useEffect(() => {
    setSelectedVenue("All Venues");
  }, [selectedDayEvents]);

  function formatTime(timestamp) {
    if (!timestamp) return "—";

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function getResourceCount(event, resourceTypeId) {
    const resources = event[9];

    if (!Array.isArray(resources)) return 0;

    return resources.reduce((total, resource) => {
      return Number(resource.resource_type_id) === resourceTypeId
        ? total + Number(resource.quantity || 0)
        : total;
    }, 0);
  }

  function getCellValue(event, column) {
    if (column.index === "chairs") {
      return getResourceCount(event, RESOURCE_IDS.chairs);
    }

    if (column.index === "tables") {
      return getResourceCount(event, RESOURCE_IDS.tables);
    }

    if (column.index === "microphones") {
      return getResourceCount(event, RESOURCE_IDS.microphones);
    }

    if (column.index === "tvs") {
      return getResourceCount(event, RESOURCE_IDS.tvs);
    }

    if (column.index === "podiums") {
      return getResourceCount(event, RESOURCE_IDS.podiums);
    }

    const value = event[column.index];

    if (column.index === 5 || column.index === 6) {
      return formatTime(value);
    }

    return value == null || value === "" ? "—" : String(value);
  }

  return (
    <section className="events-panel">
      <div className="events-panel-header">
        <h2>Scheduled Events</h2>
        <span className="events-count">
          {filteredEvents.length} events
        </span>
      </div>

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
                      {getCellValue(event, column)}
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
