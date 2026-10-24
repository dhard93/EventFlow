import '../Dashboard.css';
import { useState, useEffect } from "react";
import AdminSidebar from "./AdminSidebar";
import StaffSidebar from "./StaffSidebar";
import GuestSidebar from "./GuestSidebar";
import Calendar from './Calender';
import EventTable from "./EventTable";
import UpcomingEvents from './UpcomingEvents';
import RegisterUser from './RegisterUser';
import AddVenue from './AddVenue';
import RequestEvent from './RequestEvent';
import MyEvents from "./MyEvents";
import EventRequests from "./EventRequests";

// Determines whether a date is the same ordinal weekday as the
// original start date, e.g. the first Monday or last Friday.
function matchesMonthlyWeekday(dateKey, startDate) {
  const [sy, sm, sd] = startDate.split("-").map(Number);
  const [y, m, d] = dateKey.split("-").map(Number);

  const start = new Date(Date.UTC(sy, sm - 1, sd));
  const candidate = new Date(Date.UTC(y, m - 1, d));

  // Must be the same weekday.
  if (candidate.getUTCDay() !== start.getUTCDay()) {
    return false;
  }

  // Which occurrence of that weekday is the start date?
  const occurrence = Math.ceil(sd / 7);

  // Find the first occurrence of that weekday in this month.
  const firstDay = new Date(Date.UTC(y, m - 1, 1));
  const offset = (start.getUTCDay() - firstDay.getUTCDay() + 7) % 7;
  const firstOccurrence = 1 + offset;

  // Calculate the matching occurrence in this month.
  const targetDay = firstOccurrence + (occurrence - 1) * 7;

  // If the original was the last weekday of its month,
  // use the last occurrence in each month instead.
  const startDaysInMonth = new Date(Date.UTC(sy, sm, 0)).getUTCDate();
  const startWasLast = sd + 7 > startDaysInMonth;

  if (startWasLast) {
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const lastDay = daysInMonth -
      ((new Date(Date.UTC(y, m - 1, daysInMonth)).getUTCDay() -
        start.getUTCDay() + 7) % 7);

    return d === lastDay;
  }

  return d === targetDay;
}

// Shared recurrence logic for calendar highlighting and day selection.
//
// Existing event array fields:
// event[0] = event ID
// event[3] = start date/time
// event[6] = recurring flag
// event[7] = recurrence type
// event[8] = recurrence end date
function eventOccursOnDate(event, dateKey) {
  const startDate = event[3]?.slice(0, 10);

  if (!startDate || dateKey < startDate) {
    return false;
  }

  // A non-recurring event occurs only on its original date.
  if (!event[6]) {
    return dateKey === startDate;
  }

  const recurrenceType = String(event[7] || "").toLowerCase();
  const endDate = event[8]?.slice(0, 10);

  // Recurring events need an end date and cannot occur after it.
  if (!endDate || dateKey > endDate) {
    return false;
  }

  const [startYear, startMonth, startDay] =
    startDate.split("-").map(Number);

  const [year, month, day] =
    dateKey.split("-").map(Number);

  const startTimestamp = Date.UTC(
    startYear,
    startMonth - 1,
    startDay
  );

  const selectedTimestamp = Date.UTC(
    year,
    month - 1,
    day
  );

  const daysSinceStart =
    (selectedTimestamp - startTimestamp) / 86400000;

  if (recurrenceType === "daily") {
    return true;
  }

  if (recurrenceType === "weekly") {
    return daysSinceStart % 7 === 0;
  }

  // New monthly recurrence types, plus compatibility with
  // events already stored with recurrence_type = "monthly".
  if (
    recurrenceType === "monthly_date" ||
    recurrenceType === "monthly"
  ) {
    // Repeat on the same calendar date.
    // If that date does not exist, use the last day of the month.
    const daysInMonth = new Date(
      Date.UTC(year, month, 0)
    ).getUTCDate();

    return day === Math.min(startDay, daysInMonth);
  }

  if (recurrenceType === "monthly_weekday") {
    // Repeat on the same ordinal weekday as the original start date.
    return matchesMonthlyWeekday(dateKey, startDate);
  }

  return false;
}

export default function Dashboard({
  organizationId,
  userId,
  organizationName,
  accountType,
  logout
}) {
  const [showRegister, setShowRegister] = useState(false);
  const [showAddVenue, setShowAddVenue] = useState(false);
  const [showRequestEvent, setShowRequestEvent] = useState(false);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState([]);
  const [showMyEvents, setShowMyEvents] = useState(false);
  const [showEventRequests, setShowEventRequests] = useState(false);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  useEffect(() => {
    if (!organizationId) {
      setEvents([]);
      setSelectedDayEvents([]);
      setEventsError(null);
      setEventsLoading(false);
      return;
    }

    const controller = new AbortController();

    async function fetchEvents() {
      setEvents([]);
      setSelectedDayEvents([]);
      setEventsLoading(true);
      setEventsError(null);

      const month = currentMonth.getMonth() + 1;
      const year = currentMonth.getFullYear();

      try {
        const response = await fetch(
          `http://localhost:8000/events/approved/${organizationId}/${month}/${year}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch events: ${response.status}`
          );
        }

        const data = await response.json();

        setEvents(data);
      } catch (error) {
        if (error.name === "AbortError") return;

        console.error("Error fetching events:", error);
        setEventsError(error.message);
      } finally {
        if (!controller.signal.aborted) {
          setEventsLoading(false);
        }
      }
    }

    fetchEvents();

    return () => controller.abort();
  }, [organizationId, currentMonth]);

  // Generate the date keys for the current month.
  // A date is highlighted if at least one event occurs on it.
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const eventDates = Array.from(
    { length: daysInMonth },
    (_, index) => {
      const day = index + 1;

      return [
        year,
        String(month + 1).padStart(2, "0"),
        String(day).padStart(2, "0"),
      ].join("-");
    }
  ).filter((dateKey) =>
    events.some((event) =>
      eventOccursOnDate(event, dateKey)
    )
  );

  function handleDayClick(date) {
    if (!date) {
      setSelectedDayEvents([]);
      return;
    }

    const selectedDate = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");

    const matchingEvents = events.filter((event) =>
      eventOccursOnDate(event, selectedDate)
    );

    setSelectedDayEvents(matchingEvents);
  }

  return (
    <div className="app-layout">
      {accountType === 1 && (
        <AdminSidebar
          logout={logout}
          onAddUser={() => setShowRegister(true)}
          onAddVenue={() => setShowAddVenue(true)}
          onEventRequests={() => setShowEventRequests(true)}
        />
      )}

      {accountType === 2 && (
        <StaffSidebar logout={logout} />
      )}

      {accountType === 3 && (
        <GuestSidebar
          logout={logout}
          onRequestEvent={() => setShowRequestEvent(true)}
          onMyEvents={() => setShowMyEvents(true)}
        />
      )}

      <main className="main-content">
        <header className="page-header">
          <h1>{organizationName}</h1>
        </header>

        <section className="dashboard-content">
          <div className="dashboard-left">
            <Calendar
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
              onDayClick={handleDayClick}
              eventDates={eventDates}
            />

            <UpcomingEvents />
          </div>

          <EventTable
            selectedDayEvents={selectedDayEvents}
          />
        </section>

        {eventsError && (
          <p role="alert">{eventsError}</p>
        )}
      </main>

      {/* Register User Modal */}
      {accountType === 1 && showRegister && (
        <div
          className="modal-overlay"
          onClick={() => setShowRegister(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => setShowRegister(false)}
              aria-label="Close registration form"
            >
              &times;
            </button>

            <RegisterUser
              onRegister={() => setShowRegister(false)}
              organizationId={organizationId}
            />
          </div>
        </div>
      )}

      {/* Add Venue Modal */}
      {accountType === 1 && showAddVenue && (
        <div
          className="modal-overlay"
          onClick={() => setShowAddVenue(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <AddVenue
              organizationId={organizationId}
              onClose={() => setShowAddVenue(false)}
              onSubmit={async (venueData) => {
                console.log("Create venue:", {
                  ...venueData,
                  organizationId
                });

                setShowAddVenue(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Request Event Modal — Guest only */}
      {accountType === 3 && showRequestEvent && (
        <div
          className="modal-overlay"
          onClick={() => setShowRequestEvent(false)}
        >
          <div
            className="modal-content request-event-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <RequestEvent
              organizationId={organizationId}
              userId={userId}
              onClose={() => setShowRequestEvent(false)}
              onRequest={() => setShowRequestEvent(false)}
            />
          </div>
        </div>
      )}

      {/* My Events Modal — Guest only */}
      {accountType === 3 && showMyEvents && (
        <div
          className="modal-overlay"
          onClick={() => setShowMyEvents(false)}
        >
          <div
            className="modal-content my-requests-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <MyEvents
              userId={userId}
              onClose={() => setShowMyEvents(false)}
              onRequestCancelled={(cancelledEvent) => {
                const cancelledId = cancelledEvent.event_id;

                setEvents((previous) =>
                  previous.filter(
                    (event) => event[0] !== cancelledId
                  )
                );

                setSelectedDayEvents((previous) =>
                  previous.filter(
                    (event) => event[0] !== cancelledId
                  )
                );
              }}
            />
          </div>
        </div>
      )}

      {/* Event Requests Modal — Admin only */}
      {accountType === 1 && showEventRequests && (
        <div
          className="modal-overlay"
          onClick={() => setShowEventRequests(false)}
        >
          <div
            className="modal-content event-requests-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <EventRequests
              organizationId={organizationId}
              onClose={() => setShowEventRequests(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}