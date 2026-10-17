import { useEffect, useState } from "react";
import Login from "./components/Login";
import Register from "./components/Register";
import RegisterOrg from "./components/RegisterOrg";
import AdminDashboard from "./components/AdminDashboard";

export default function App() {
  const [page, setPage] = useState("login");
  const [organizationName, setOrganizationName] = useState("");
  const [accountType, setAccountType] = useState(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Restore the login session whenever the app first loads.
  useEffect(() => {
    async function restoreSession() {
      try {
        const response = await fetch(
          "http://localhost:8000/users/me",
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

        setOrganizationName(user.organization_name);
        setAccountType(user.account_type);
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
          setPage("dashboard");
        }}
      />
    );
  }

  if (page === "register-user") {
    return (
      <Register
        onLoginClick={() => setPage("login")}
        onRegister={(data) => {
          console.log("User registration:", data);
        }}
      />
    );
  }

  if (page === "dashboard") {
    
    switch (accountType) {
      case 1:
        return (
          <AdminDashboard
            organizationName={organizationName}
          />
        );

      case 2:
        return (
          <OStaffDashboard
            organizationName={organizationName}
          />
        );

      case 3:
        return (
          <GuestDashboard
            organizationName={organizationName}
          />
        );
    }
  }

  return (
    <Login
      onLogin={(user) => {
        setOrganizationName(user.organization_name);
        setAccountType(user.account_type);
        setPage("dashboard");
      }}
      onCreateOrganizationClick={() => setPage("register-org")}
    />
  );
}