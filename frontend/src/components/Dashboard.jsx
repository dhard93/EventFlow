
import '../Dashboard.css';
import { useState, useEffect } from "react";
import AdminSidebar from "./AdminSidebar";
import StaffSidebar from "./StaffSidebar";
import GuestSidebar from "./GuestSidebar";
import Calendar from './Calender';
import EventTable from "./EventTable";
import Conversations from './Conversations';
import RegisterUser from './RegisterUser';
import AddVenue from './AddVenue';
import RequestEvent from './RequestEvent';
import MyEvents from "./MyEvents";
import EventRequests from "./EventRequests";
import MyAccount from "./MyAccount";
import Notifications from "./Notifications";
import Messages from "./Messages";
import MyOrganization from "./MyOrganization";

function matchesMonthlyWeekday(dateKey, startDate) {
  const [sy, sm, sd] = startDate.split("-").map(Number);
  const [y, m, d] = dateKey.split("-").map(Number);

  const start = new Date(Date.UTC(sy, sm - 1, sd));
  const candidate = new Date(Date.UTC(y, m - 1, d));

  if (candidate.getUTCDay() !== start.getUTCDay()) {
    return false;
  }

  const occurrence = Math.ceil(sd / 7);
  const firstDay = new Date(Date.UTC(y, m - 1, 1));
  const offset = (start.getUTCDay() - firstDay.getUTCDay() + 7) % 7;
  const firstOccurrence = 1 + offset;
  const targetDay = firstOccurrence + (occurrence - 1) * 7;

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

function eventOccursOnDate(event, dateKey) {
  const startDate = event[5]?.slice(0, 10);

  if (!startDate || dateKey < startDate) return false;

  if (!event[8]) return dateKey === startDate;

  const recurrenceType = String(event[9] || "").toLowerCase();
  const endDate = event[10]?.slice(0, 10);

  if (!endDate || dateKey > endDate) return false;

  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
  const [year, month, day] = dateKey.split("-").map(Number);

  const startTimestamp = Date.UTC(startYear, startMonth - 1, startDay);
  const selectedTimestamp = Date.UTC(year, month - 1, day);
  const daysSinceStart = (selectedTimestamp - startTimestamp) / 86400000;

  if (recurrenceType === "daily") return true;

  if (recurrenceType === "weekly") {
    return daysSinceStart % 7 === 0;
  }

  if (
    recurrenceType === "monthly_date" ||
    recurrenceType === "monthly"
  ) {
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return day === Math.min(startDay, daysInMonth);
  }

  if (recurrenceType === "monthly_weekday") {
    return matchesMonthlyWeekday(dateKey, startDate);
  }

  return false;
}

export default function Dashboard({
  organizationId,
  userId,
  organizationName,
  onOrganizationNameChange,
  accountType,
  adminId,
  hasUnreadNotifications,
  hasUnreadEventRequests,
  onEventRequestsChange,
  onNotificationsChange,
  logout
}) {
  const [showRegister, setShowRegister] = useState(false);
  const [showAddVenue, setShowAddVenue] = useState(false);
  const [showRequestEvent, setShowRequestEvent] = useState(false);
  const [showMyAccount, setShowMyAccount] = useState(false);
  const [events, setEvents] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [eventsError, setEventsError] = useState(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState([]);
  const [showMyEvents, setShowMyEvents] = useState(false);
  const [showEventRequests, setShowEventRequests] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [conversationsError, setConversationsError] = useState(null);
  const [today] = useState(() => new Date());
  const [showMyOrganization, setShowMyOrganization] = useState(false);

  const [currentMonth, setCurrentMonth] = useState(() =>
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  useEffect(() => {
    if (!organizationId) {
      setEvents([]);
      setSelectedDayEvents([]);
      setEventsError(null);
      return;
    }

    const controller = new AbortController();

    async function fetchEvents() {
      setEvents([]);
      setSelectedDayEvents([]);
      setEventsError(null);

      const month = currentMonth.getMonth() + 1;
      const year = currentMonth.getFullYear();

      try {
        const response = await fetch(
          `http://localhost:8000/events/approved/${organizationId}/${month}/${year}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch events: ${response.status}`);
        }

        setEvents(await response.json());
      } catch (error) {
        if (error.name === "AbortError") return;
        console.error("Error fetching events:", error);
        setEventsError(error.message);
      }
    }

    fetchEvents();

    return () => controller.abort();
  }, [organizationId, currentMonth]);

  useEffect(() => {
    if (!userId || !organizationId) {
      setMyEvents([]);
      return;
    }

    const controller = new AbortController();

    async function fetchMyEvents() {
      try {
        const response = await fetch(
          `http://localhost:8000/events/user/${userId}`,
          {
            credentials: "include",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch your events.");
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Invalid My Events response.");
        }

        setMyEvents(data);
      } catch (error) {
        if (error.name === "AbortError") return;

        console.error("Error fetching My Events:", error);
      }
    }

    fetchMyEvents();

    return () => controller.abort();
  }, [userId, organizationId]);

  // Fetch conversations on dashboard load and whenever a message is sent.
  async function fetchConversations(signal) {
    if (!userId) {
      setConversations([]);
      return;
    }

    setConversationsLoading(true);
    setConversationsError(null);

    try {
      const response = await fetch(
        `http://localhost:8000/conversations/${userId}`,
        {
          method: "GET",
          credentials: "include",
          signal
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch conversations: ${response.status}`
        );
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("Invalid conversations response.");
      }

      setConversations(data);
    } catch (error) {
      if (error.name === "AbortError") return;

      console.error("Error fetching conversations:", error);
      setConversationsError(error.message);
    } finally {
      if (!signal?.aborted) {
        setConversationsLoading(false);
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    fetchConversations(controller.signal);

    return () => controller.abort();
  }, [userId]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const todayKey = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

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
    dateKey >= todayKey &&
    events.some((event) => eventOccursOnDate(event, dateKey))
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

    if (selectedDate < todayKey) {
      setSelectedDayEvents([]);
      return;
    }

    setSelectedDayEvents(
      events.filter((event) => eventOccursOnDate(event, selectedDate))
    );
  }

  return (
    <div className="app-layout">
      {accountType === 1 && (
        <AdminSidebar
          logout={logout}
          onMyAccount={() => setShowMyAccount(true)}
          onAddUser={() => setShowRegister(true)}
          onMyOrganization={() => setShowMyOrganization(true)}
          onAddVenue={() => setShowAddVenue(true)}
          onEventRequests={() => setShowEventRequests(true)}
          hasUnreadNotifications={hasUnreadNotifications}
          hasUnreadEventRequests={hasUnreadEventRequests}
          onNotifications={() => setShowNotifications(true)}
        />
      )}

      {accountType === 1 && showMyOrganization && (
        <MyOrganization
          organizationId={organizationId}
          organizationName={organizationName}
          onOrganizationNameChange={onOrganizationNameChange}
          onOrganizationDeleted={logout}
          onClose={() => setShowMyOrganization(false)}
        />
      )}

      {accountType === 2 && (
        <StaffSidebar
          logout={logout}
          onMyAccount={() => setShowMyAccount(true)}
          hasUnreadNotifications={hasUnreadNotifications}
          onNotifications={() => setShowNotifications(true)}
        />
      )}

      {accountType === 3 && (
        <GuestSidebar
          logout={logout}
          onMyAccount={() => setShowMyAccount(true)}
          onRequestEvent={() => setShowRequestEvent(true)}
          onMyEvents={() => setShowMyEvents(true)}
          hasUnreadNotifications={hasUnreadNotifications}
          onNotifications={() => setShowNotifications(true)}
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

            <Conversations
              conversations={conversations}
              loading={conversationsLoading}
              error={conversationsError}
              organizationId={organizationId}
              userId={userId}
              onConversationClick={setSelectedConversation}
              onConversationSent={(conversation) => {
                setSelectedConversation(conversation);
                fetchConversations();
              }}
            />
          </div>

          <EventTable selectedDayEvents={selectedDayEvents} />
        </section>

        {eventsError && <p role="alert">{eventsError}</p>}
      </main>

      {accountType === 1 && showRegister && (
        <div className="modal-overlay" onClick={() => setShowRegister(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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

      {accountType === 1 && showAddVenue && (
        <div className="modal-overlay" onClick={() => setShowAddVenue(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <AddVenue
              organizationId={organizationId}
              onClose={() => setShowAddVenue(false)}
              onSubmit={async (venueData) => {
                console.log("Create venue:", { ...venueData, organizationId });
                setShowAddVenue(false);
              }}
            />
          </div>
        </div>
      )}

      {accountType === 3 && showRequestEvent && (
        <div className="modal-overlay" onClick={() => setShowRequestEvent(false)}>
          <div
            className="modal-content request-event-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <RequestEvent
              organizationId={organizationId}
              userId={userId}
              adminId={adminId}
              onClose={() => setShowRequestEvent(false)}
              onRequest={() => setShowRequestEvent(false)}
            />
          </div>
        </div>
      )}

      {accountType === 3 && showMyEvents && (
        <div className="modal-overlay" onClick={() => setShowMyEvents(false)}>
          <div
            className="modal-content my-requests-modal"
            onClick={(e) => e.stopPropagation()}
          >

          <MyEvents
            userId={userId}
            events={myEvents}
            onClose={() => setShowMyEvents(false)}
            onRequestCancelled={(cancelledEvent) => {
              const cancelledId = cancelledEvent.event_id;

              // Remove from the user's events.
              setMyEvents((previous) =>
                previous.filter((event) => event[0] !== cancelledId)
              );

              // Remove from the organization's calendar events.
              setEvents((previous) =>
                previous.filter((event) => event[0] !== cancelledId)
              );

              // Remove from currently selected day's events.
              setSelectedDayEvents((previous) =>
                previous.filter((event) => event[0] !== cancelledId)
              );
            }}
          />
          </div>
        </div>
      )}

      {accountType === 1 && showEventRequests && (
        <div className="modal-overlay" onClick={() => setShowEventRequests(false)}>
          <div
            className="modal-content event-requests-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <EventRequests
              organizationId={organizationId}
              onClose={() => setShowEventRequests(false)}
              onPendingRequestsChange={onEventRequestsChange}
            />
          </div>
        </div>
      )}

      {showMyAccount && (
        <MyAccount
          organizationId={organizationId}
          userId={userId}
          onClose={() => setShowMyAccount(false)}
        />
      )}

      {showNotifications && (
        <Notifications
          userId={userId}
          onClose={() => setShowNotifications(false)}
          onNotificationsChange={onNotificationsChange}
        />
      )}

      {selectedConversation && (
        <Messages
          conversation={selectedConversation}
          userId={userId}
          onClose={() => setSelectedConversation(null)}
          onMessagesRead={(conversationId) => {
            setConversations((previous) =>
              previous.map((conversation) =>
                Number(conversation.conversation_id) === Number(conversationId)
                  ? { ...conversation, has_unread_message: false }
                  : conversation
              )
            );
          }}
          onMessageSent={() => fetchConversations()}
        />
      )}
    </div>
  );
}
