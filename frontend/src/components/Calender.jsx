
import { useState } from "react";

export default function Calendar({
  onDayClick,
  currentMonth,
  onMonthChange,
  eventDates = [],
}) {
  const today = new Date();

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const [selectedDate, setSelectedDate] = useState(null);

  const monthName = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build a Set of dates that have events for quick lookups.
  const eventDateSet = new Set(eventDates);

  function previousMonth() {
    onMonthChange(new Date(year, month - 1, 1));
    setSelectedDate(null);
    onDayClick(null);
  }

  function nextMonth() {
    onMonthChange(new Date(year, month + 1, 1));
    setSelectedDate(null);
    onDayClick(null);
  }

  return (
    <section className="calendar-panel">
      <div className="calendar-header">
        <button
          onClick={previousMonth}
          aria-label="Previous month"
        >
          {"<"}
        </button>

        <h2>{monthName}</h2>

        <button
          onClick={nextMonth}
          aria-label="Next month"
        >
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
          <div
            className="calendar-empty"
            key={`empty-${index}`}
          />
        ))}

        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1;

          const isToday =
            year === today.getFullYear() &&
            month === today.getMonth() &&
            day === today.getDate();

          const dateKey = [
            year,
            String(month + 1).padStart(2, "0"),
            String(day).padStart(2, "0"),
          ].join("-");

          const hasEvents = eventDateSet.has(dateKey);
          const isSelected = selectedDate === dateKey;

          return (
            <button
              className={[
                "calendar-day",
                isToday && "today",
                isSelected && "selected",
                hasEvents && "has-events",
              ]
                .filter(Boolean)
                .join(" ")}
              key={day}
              aria-current={isToday ? "date" : undefined}
              aria-label={`${monthName.split(" ")[0]} ${day}${
                hasEvents ? ", has events" : ""
              }`}
              onClick={() => {
                setSelectedDate(isSelected ? null : dateKey);

                onDayClick(
                  isSelected ? null : new Date(year, month, day)
                );
              }}
            >
              {day}
            </button>
          );
        })}
      </div>
    </section>
  );
}
