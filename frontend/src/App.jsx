import { useEffect, useState } from "react";
import Login from "./components/Login";
import RegisterUser from "./components/RegisterUser";
import RegisterOrg from "./components/RegisterOrg";
import Dashboard from "./components/Dashboard";

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

    setOrganizationName("");
    setAccountType(null);
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
          setAccountType(data.account_type); // Add this line
          setPage("dashboard");
        }}
      />
    );
  }

  if (page === "register-user") {
    return (
      <RegisterUser
        onLoginClick={() => setPage("login")}
        onRegister={(data) => {
          console.log("User registration:", data);
        }}
      />
    );
  }

  if (page === "dashboard") {
    return (
      <Dashboard
        organizationName={organizationName}
        accountType={accountType}
        logout={logout}
      />
    );
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