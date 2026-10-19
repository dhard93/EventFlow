import '../Dashboard.css';
import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import StaffSidebar from "./StaffSidebar";
import GuestSidebar from "./GuestSidebar";
import Calendar from './Calender';
import EventTable from "./EventTable";
import UpcomingEvents from './UpcomingEvents';
import RegisterUser from './RegisterUser'

export default function Dashboard({ organizationName, accountType, logout }) {
  const [showRegister, setShowRegister] = useState(false);
  return (
    <div className="app-layout">
      {accountType === 1 && (
        <AdminSidebar
          logout={logout}
          onAddUser={() => setShowRegister(true)}
        />
      )}
      {accountType === 2 && <StaffSidebar logout={logout}/>}
      {accountType === 3 && <GuestSidebar logout={logout}/>}

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

      {showRegister && (
        <div
          className="modal-overlay"
          onClick={() => setShowRegister(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setShowRegister(false)}
            >
              &times;
            </button>

            <RegisterUser
              onRegister={() => setShowRegister(false)}
            />
          </div>
        </div>
      )}

    </div>
  );
}