import './Dashboard.css';
import Sidebar from "./components/Sidebar";
import Calendar from './components/Calender';
import EventTable from "./components/EventTable";
import UpcomingEvents from './components/UpcomingEvents';

function App() {
  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <header className="page-header">
          <h1>Organization Name</h1>
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

export default Dashboard;