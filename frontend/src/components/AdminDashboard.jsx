import '../Dashboard.css';
import Sidebar from "./Sidebar";
import Calendar from './Calender';
import EventTable from "./EventTable";
import UpcomingEvents from './UpcomingEvents';

export default function AdminDashboard({ organizationName }) {
  return (
    <div className="app-layout">
      <Sidebar />

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