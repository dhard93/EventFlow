import { useState } from "react";

export default function AdminSidebar({
  logout,
  onMyAccount,
  onAddUser,
  onMyOrganization,
  onAddVenue,
  onEventRequests,
  hasUnreadNotifications,
  hasUnreadEventRequests,
  onNotifications,
  onAnalytics,
  onDashboard
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
          <span className="brand-subtitle">EVENT MANAGEMENT</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <a
          href="#"
          className={`nav-link ${activeItem === "dashboard" ? "active" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            setActiveItem("dashboard");
            onDashboard();
          }}
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
          onClick={(e) => {
            e.preventDefault();
            onMyAccount();
          }}
        >
          <span className="nav-icon">◉</span>
          <span>My Account</span>
          {activeItem === "account" && (
            <span className="active-indicator" />
          )}
        </a>

        <a
          href="#"
          className={`nav-link ${activeItem === "organization" ? "active" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            onMyOrganization();
          }}
        >
          <span className="nav-icon">♙</span>
          <span>My Organization</span>
          {activeItem === "organization" && (
            <span className="active-indicator" />
          )}
        </a>

        <a
          href="#"
          className={`nav-link ${activeItem === "requests" ? "active" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            onEventRequests();
          }}
        >
          <span className="nav-icon">▣</span>
          <span>Event Requests</span>
          {hasUnreadEventRequests && (
            <span className="notification-dot" />
          )}
          {activeItem === "requests" && (
            <span className="active-indicator" />
          )}
        </a>

        <a
          href="#"
          className={`nav-link ${activeItem === "user" ? "active" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            onAddUser();
          }}
        >
          <span className="nav-icon">♟</span>
          <span>Add User</span>
          {activeItem === "user" && (
            <span className="active-indicator" />
          )}
        </a>

        <a
          href="#"
          className={`nav-link ${activeItem === "venue" ? "active" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            setActiveItem("venue");
            onAddVenue();
          }}
        >
          <span className="nav-icon">⌂</span>
          <span>Add Venue</span>
        </a>

        <a
          href="#"
          className={`nav-link ${activeItem === "analytics" ? "active" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            setActiveItem("analytics");
            onAnalytics();
          }}
        >
          <span className="nav-icon">↗</span>
          <span>Analytics</span>
          {activeItem === "analytics" && (
            <span className="active-indicator" />
          )}
        </a>

        <a
          href="#"
          className={`nav-link ${activeItem === "notifications" ? "active" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            onNotifications();
          }}
        >
          <span className="nav-icon">♧</span>
          <span>Notifications</span>
          {hasUnreadNotifications && (
            <span className="notification-dot" />
          )}
          {activeItem === "notifications" && (
            <span className="active-indicator" />
          )}
        </a>

        <a
          href="#"
          className="nav-link"
          onClick={(e) => {
            e.preventDefault();
            logout();
          }}
        >
          <span className="nav-icon">⎋</span>
          <span>Logout</span>
        </a>
      </nav>
    </aside>
  );
}