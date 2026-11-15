
export default function GuestSidebar({
  logout,
  onMyAccount,
  onRequestEvent,
  onMyEvents,
  hasUnreadNotifications,
  onNotifications,
}) {
  const handleClick = (callback) => (e) => {
    e.preventDefault();
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
          className="nav-link active"
          onClick={(e) => e.preventDefault()}
        >
          <span className="nav-icon">▦</span>
          <span>Dashboard</span>
        </a>

        <a
          href="#"
          className="nav-link"
          onClick={handleClick(onMyAccount)}
        >
          <span className="nav-icon">◉</span>
          <span>My Account</span>
        </a>

        <a
          href="#"
          className="nav-link"
          onClick={handleClick(onRequestEvent)}
        >
          <span className="nav-icon">✚</span>
          <span>Request Event</span>
        </a>

        <a
          href="#"
          className="nav-link"
          onClick={handleClick(onMyEvents)}
        >
          <span className="nav-icon">▥</span>
          <span>My Events</span>
        </a>

        <a
          href="#"
          className="nav-link"
          onClick={handleClick(onNotifications)}
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
          onClick={handleClick(logout)}
        >
          <span className="nav-icon">⎋</span>
          <span>Logout</span>
        </a>
      </nav>
    </aside>
  );
}
