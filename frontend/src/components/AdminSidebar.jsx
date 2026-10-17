export default function AdminSidebar({ logout }) {
  const unreadMessageCount = 0;
  const hasUnreadNotifications = false;

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
        <a href="#" className="nav-link active">
          <span className="nav-icon">▦</span>
          <span>Dashboard</span>
          <span className="active-indicator" />
        </a>

        <a href="#" className="nav-link">
          <span className="nav-icon">◉</span>
          <span>My Account</span>
        </a>

        <a href="#" className="nav-link">
          <span className="nav-icon">⌂</span>
          <span>My Organization</span>
        </a>

        <a href="#" className="nav-link">
          <span className="nav-icon">◷</span>
          <span>Event Requests</span>
        </a>

        <a href="#" className="nav-link">
          <span className="nav-icon">↗</span>
          <span>Analytics</span>
        </a>

        <a href="#" className="nav-link">
          <span className="nav-icon">✉</span>
          <span>Messages</span>
          {unreadMessageCount > 0 && (
            <span className="nav-badge">
              {unreadMessageCount}
            </span>
          )}
        </a>

        <a href="#" className="nav-link">
          <span className="nav-icon">♧</span>
          <span>Notifications</span>
          {hasUnreadNotifications && (
            <span className="notification-dot" />
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