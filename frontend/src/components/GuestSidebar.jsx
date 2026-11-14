
import { useState } from "react";

export default function GuestSidebar({
  logout,
  onMyAccount,
  onRequestEvent,
  onMyEvents,
  hasUnreadNotifications,
  onNotifications,
}) {
  const [activeItem, setActiveItem] = useState("dashboard");

  const handleClick = (item, callback) => (e) => {
    e.preventDefault();
    setActiveItem(item);
    callback?.();
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">E</div>
        <div>
          <h2>EventFlow</h2>
          <span className="brand-subtitle">
            EVENT MANAGEMENT
          </span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <a
          href="#"
          className={`nav-link ${activeItem === "dashboard" ? "active" : ""}`}
          onClick={handleClick("dashboard")}
        >
          <span className="nav-icon">▦</span>
          <span>Dashboard</span>
          {activeItem === "dashboard" && (
            <span className="active-indicator" />
          )}
        </a>

        <a
          href="#"
          className={`nav-link ${activeItem === "account" ? "active" : ""}`}
          onClick={handleClick("account", onMyAccount)}
        >
          <span className="nav-icon">◉</span>
          <span>My Account</span>
        </a>

        <a
          href="#"
          className={`nav-link ${activeItem === "request" ? "active" : ""}`}
          onClick={handleClick("request", onRequestEvent)}
        >
          <span className="nav-icon">✚</span>
          <span>Request Event</span>
        </a>

        <a
          href="#"
          className={`nav-link ${activeItem === "events" ? "active" : ""}`}
          onClick={handleClick("events", onMyEvents)}
        >
          <span className="nav-icon">▥</span>
          <span>My Events</span>
        </a>

        <a
          href="#"
          className={`nav-link ${activeItem === "notifications" ? "active" : ""}`}
          onClick={handleClick("notifications", onNotifications)}
        >
          <span className="nav-icon">♧</span>
          <span>Notifications</span>
          {hasUnreadNotifications && (
            <span className="notification-dot" />
          )}
        </a>

        <a
          href="#"
          className="nav-link"
          onClick={handleClick("logout", logout)}
        >
          <span className="nav-icon">⎋</span>
          <span>Logout</span>
        </a>
      </nav>
    </aside>
  );
}
