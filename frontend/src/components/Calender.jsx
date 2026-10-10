import { useState } from "react";

function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(
    new Date(2026, 9, 1)
  );

  const today = new Date();
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const monthName = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  function previousMonth() {
    setCurrentMonth(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentMonth(new Date(year, month + 1, 1));
  }

  return (
    <section className="calendar-panel">
      <div className="calendar-header">
        <button onClick={previousMonth} aria-label="Previous month">
          {"<"}
        </button>

        <h2>{monthName}</h2>

        <button onClick={nextMonth} aria-label="Next month">
          {">"}
        </button>
      </div>

      <div className="calendar-grid">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
          (day) => (
            <div className="weekday" key={day}>
              {day}
            </div>
          )
        )}

        {Array.from({ length: firstDay }, (_, index) => (
          <div className="calendar-empty" key={`empty-${index}`} />
        ))}

        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1;

          const isToday =
            year === today.getFullYear() &&
            month === today.getMonth() &&
            day === today.getDate();

          return (
            <button
              className={`calendar-day${isToday ? " today" : ""}`}
              key={day}
              aria-current={isToday ? "date" : undefined}
            >
              {day}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default Calendar;