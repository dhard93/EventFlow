
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
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  useEffect(() => {
    if (!organizationId) return;

    const controller = new AbortController();

    const fetchEvents = async () => {
      setEvents([]);
      setEventsLoading(true);
      setEventsError(null);

      const month = currentMonth.getMonth() + 1;
      const year = currentMonth.getFullYear();

      try {
        const response = await fetch(
          `http://localhost:8000/events/${organizationId}/${month}/${year}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch events: ${response.status}`);
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
    };

    fetchEvents();

    return () => {
      controller.abort();
    };
  }, [organizationId, currentMonth]);

const eventDates = [
  ...new Set(
    events
      .map((event) => event[3]?.slice(0, 10))
      .filter(Boolean)
  ),
]

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

  const matchingEvents = events.filter((event) => {
    return event[3]?.slice(0, 10) === selectedDate;
  });

  setSelectedDayEvents(matchingEvents);
}

  return (
    <div className="app-layout">
      {accountType === 1 && (
        <AdminSidebar
          logout={logout}
          onAddUser={() => setShowRegister(true)}
          onAddVenue={() => setShowAddVenue(true)}
        />
      )}

      {accountType === 2 && <StaffSidebar logout={logout} />}

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

          <EventTable selectedDayEvents={selectedDayEvents} />
        </section>

        {/* Events are stored in state and ready for future use */}
        {eventsError && <p role="alert">{eventsError}</p>}
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
              onRequestCancelled={(event) => {
                console.log("Event cancellation requested:", event);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
