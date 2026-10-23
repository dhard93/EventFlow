import '../EventTable.css';

export default function EventTable({ selectedDayEvents = [] }) {
  const columns = [
    { label: "Title", index: 0, width: "16%" },
    { label: "Venue", index: 1, width: "12%" },
    { label: "Space", index: 2, width: "12%" },
    { label: "Start Time", index: 3, width: "14%" },
    { label: "End Time", index: 4, width: "14%" },
    { label: "Description", index: 5, width: "32%" },
  ];

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
      <div className="events-panel-header">
        <h2>Scheduled Events</h2>
        <span className="events-count">
          {selectedDayEvents.length} events
        </span>
      </div>

      <div className="events-toolbar">
        <input
          type="search"
          className="events-search"
          placeholder="Search events..."
          aria-label="Search scheduled events"
        />
      </div>

      {selectedDayEvents.length === 0 ? (
        <p className="events-empty">
          Select a date with scheduled events to view them.
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
                      <span className="sort-indicator" aria-hidden="true">
                        ↕
                      </span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {selectedDayEvents.map((event, index) => (
                <tr key={`${event[0]}-${event[3]}-${index}`}>
                  {columns.map((column) => (
                    <td key={column.index}>
                      {column.index === 3 || column.index === 4
                        ? formatTime(event[column.index])
                        : event[column.index] == null || event[column.index] === ""
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
