import { useState } from "react";
import Login from "./components/Login";
import Register from "./components/Register";
import RegisterOrg from "./components/RegisterOrg";

export default function App() {
  const [page, setPage] = useState("login");

  if (page === "register-org") {
    return (
      <RegisterOrg
        onLoginClick={() => setPage("login")}
        onRegister={(data) => {
          console.log("Organization registration:", data);
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

  return (
    <Login
      onCreateOrganizationClick={() => setPage("register-org")}
    />
  );
}