import '../Dashboard.css';
import AdminSidebar from "./AdminSidebar";
import StaffSidebar from "./StaffSidebar";
import GuestSidebar from "./GuestSidebar";
import Calendar from './Calender';
import EventTable from "./EventTable";
import UpcomingEvents from './UpcomingEvents';

export default function AdminDashboard({ organizationName, accountType, logout }) {
  return (
    <div className="app-layout">
      {accountType === 1 && <AdminSidebar logout={logout}/>}
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
    </div>
  );
}