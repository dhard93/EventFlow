
import '../Dashboard.css';
import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import StaffSidebar from "./StaffSidebar";
import GuestSidebar from "./GuestSidebar";
import Calendar from './Calender';
import EventTable from "./EventTable";
import UpcomingEvents from './UpcomingEvents';
import RegisterUser from './RegisterUser';
import AddVenue from './AddVenue';
import RequestEvent from './RequestEvent';

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
        />
        )}

      <main className="main-content">
        <header className="page-header">
          <h1>{organizationName}</h1>
        </header>

        <section className="dashboard-content">
          <div className="dashboard-left">
            <Calendar />
            <UpcomingEvents />
          </div>

          <EventTable />
        </section>
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
              onRequest={() => {
                setShowRequestEvent(false);
              }}
            />
          </div>
        </div>
      )}

    </div>
  );
}
