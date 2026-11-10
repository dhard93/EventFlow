import { useEffect, useState } from "react";
import Login from "./components/Login";
import RegisterUser from "./components/RegisterUser";
import RegisterOrg from "./components/RegisterOrg";
import Dashboard from "./components/Dashboard";
import { API_URL } from "./config";

/*
  TODO:
  - Analytics module
  - Implement web sockets
  - Test all endpoints
  - Host with render
*/

export default function App() {
  const [page, setPage] = useState("login");
  const [userId, setUserId] = useState(null);
  const [organizationId, setOrganizationId] = useState(null);
  const [organizationName, setOrganizationName] = useState("");
  const [accountType, setAccountType] = useState(null);
  const [adminId, setAdminId] = useState(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [hasUnreadEventRequests, setHasUnreadEventRequests] = useState(false);

  async function fetchPendingEventRequests(organizationId) {
    if (!organizationId) {
      setHasUnreadEventRequests(false);
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/events/pending/${organizationId}`,
        { credentials: "include" }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch pending event requests.");
      }

      const requests = await response.json();

      setHasUnreadEventRequests(
        Array.isArray(requests) && requests.length > 0
      );
    } catch (error) {
      console.error("Failed to fetch pending event requests:", error);
    }
  }
  
  async function fetchUnreadNotifications(userId) {
    if (!userId) {
      setHasUnreadNotifications(false);
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/notifications/unread/${userId}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch unread notifications.");
      }

      const notifications = await response.json();

      const unreadNotifications = Array.isArray(notifications)
        ? notifications
        : [];

      setHasUnreadNotifications(
        unreadNotifications.length > 0
      );
    } catch (error) {
      console.error("Failed to fetch unread notifications:", error);
      setHasUnreadNotifications(false);
    }
  }

  // Restore the login session whenever the app first loads.
  useEffect(() => {
    async function restoreSession() {
      try {
        const response = await fetch(
          `${API_URL}/users/sessions/me`,
          {
            method: "GET",
            credentials: "include",
          }
        );

        if (!response.ok) {
          // No valid session: the user needs to log in.
          setPage("login");
          return;
        }

        const user = await response.json();
        console.log("Restored session user:", user);

        setUserId(user.user_id);
        setOrganizationId(user.organization_id);
        setOrganizationName(user.organization_name);
        setAccountType(user.account_type);
        setAdminId(user.admin_id);

        await fetchUnreadNotifications(user.user_id);

        if (user.account_type === 1) {
          await fetchPendingEventRequests(user.organization_id);
        }

        setPage("dashboard");
      } catch (error) {
        console.error("Session restoration failed:", error);
        setPage("login");
      } finally {
        setIsCheckingSession(false);
      }
    }

    restoreSession();
  }, []);


  const logout = async () => {
      try {
        const response = await fetch(
          `${API_URL}/users/logout`,
          {
            method: "POST",
            credentials: "include",
          }
        );

        const result = await response.json();

        if (!response.ok) {
          console.error("Logout failed:", result);
          return;
        }

        console.log("Logout result:", result);

        setUserId(null);
        setOrganizationId(null);
        setOrganizationName("");
        setAccountType(null);
        setAdminId(null);
        setHasUnreadNotifications(false);
        setHasUnreadEventRequests(false);
        setPage("login");

      } catch (err) {
        console.error("Logout error:", err);
      }
    };


  // Avoid briefly showing the login screen before checking the cookie.
  if (isCheckingSession) {
    return <div>Checking your session...</div>;
  }

  if (page === "register-org") {
    return (
      <RegisterOrg
        onLoginClick={() => setPage("login")}
        onRegister={(data) => {
          console.log("Organization registration:", data);
          setOrganizationName(data.organization_name);
          setAccountType(data.account_type);
          setUserId(data.user_id);
          setOrganizationId(data.organization_id);
          setAdminId(data.user_id);
          setPage("dashboard");
        }}
      />
    );
  }

  if (page === "register-user") {
    return (
      <RegisterUser
        onRegister={async (data) => {
            setUserId(data.user_id);
            setAccountType(data.account_type);
            setOrganizationId(data.organization_id);
            setOrganizationName(data.organization_name);
            setAdminId(data.admin_id);

            await fetchUnreadNotifications(data.user_id);

            if (data.account_type === 1) {
                await fetchPendingEventRequests(data.organization_id);
            }

            setPage("dashboard");
        }}
      />
    );
  }

  if (page === "dashboard") {
    return (
      <Dashboard
        organizationId={organizationId}
        userId={userId}
        organizationName={organizationName}
        onOrganizationNameChange={setOrganizationName}
        accountType={accountType}
        adminId={adminId}
        hasUnreadNotifications={hasUnreadNotifications}
        hasUnreadEventRequests={hasUnreadEventRequests}
        onEventRequestsChange={setHasUnreadEventRequests}
        onNotificationsChange={setHasUnreadNotifications}
        logout={logout}
      />
    );
  }

  return (
    <Login
      onLogin={async (user) => {
        setOrganizationName(user.organization_name);
        setAccountType(user.account_type);
        setUserId(user.user_id);
        setOrganizationId(user.organization_id);
        setAdminId(user.admin_id);

        await fetchUnreadNotifications(user.user_id);

        if (user.account_type === 1) {
          await fetchPendingEventRequests(user.organization_id);
        }

        setPage("dashboard");
      }}
      onCreateOrganizationClick={() => setPage("register-org")}
    />
  );
}