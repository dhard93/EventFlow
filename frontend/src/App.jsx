import { useEffect, useState } from "react";
import Login from "./components/Login";
import RegisterUser from "./components/RegisterUser";
import RegisterOrg from "./components/RegisterOrg";
import Dashboard from "./components/Dashboard";

export default function App() {
  const [page, setPage] = useState("login");
  const [userId, setUserId] = useState(null);
  const [organizationId, setOrganizationId] = useState(null);
  const [organizationName, setOrganizationName] = useState("");
  const [accountType, setAccountType] = useState(null);
  const [adminId, setAdminId] = useState(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  
  async function fetchUnreadNotifications(userId) {
    if (!userId) {
      setHasUnreadNotifications(false);
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8000/notifications/unread/${userId}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch unread notifications.");
      }

      const notifications = await response.json();

      setHasUnreadNotifications(
        Array.isArray(notifications) && notifications.length > 0
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
          "http://localhost:8000/users/sessions/me",
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
        "http://localhost:8000/users/logout",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          }
        }
      );

      const result = await response.json();
      console.log(result);

      if (!response.ok) {
        SpeechSynthesisErrorEvent(`Request failed: ${response.status}`);
        return;
      }

    setUserId(null);
    setOrganizationId(null);
    setOrganizationName("");
    setAccountType(null);
    setAdminId(null);
    setPage("login");

    } catch (err) {
      console.error("Login error:", err);
      setMessage("An unexpected error occurred.");
    }
  }

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
          setAdminId(user.admin_id);
          setPage("dashboard");
        }}
      />
    );
  }

  if (page === "register-user") {
    return (
      <RegisterUser

        onRegister={(data) => {
          console.log("User registration:", data);
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
        accountType={accountType}
        adminId={adminId}
        hasUnreadNotifications={hasUnreadNotifications}
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

        setPage("dashboard");
      }}
      onCreateOrganizationClick={() => setPage("register-org")}
    />
  );
}