import { useState } from "react";
import Login from "./components/Login";
import Register from "./components/Register";
import RegisterOrg from "./components/RegisterOrg";
import AdminDashboard from "./components/AdminDashboard"

export default function App() {
  const [page, setPage] = useState("login");
  const [organizationName, setOrganizationName] = useState("");

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
    return <AdminDashboard organizationName={organizationName} />;
  }

  return (
    <Login
      onCreateOrganizationClick={() => setPage("register-org")}
    />
  );
}