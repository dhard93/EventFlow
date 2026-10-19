
import { useState } from "react";
import "../Register.css";

export default function RegisterUser({ onRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accountTypeId, setAccountTypeId] = useState("2");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      if (password.length < 8) {
        setError("Your password must be at least 8 characters long.");
        return;
      }

      if (password !== confirmPassword) {
        setError("Your passwords do not match.");
        return;
      }

      const registrationData = {
        email: email.trim(),
        password: password.trim(),
        f_name: firstName.trim(),
        l_name: lastName.trim(),
        account_type_id: Number(accountTypeId)
      };

      const response = await fetch("http://localhost:8000/users", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(registrationData),
      });

      const result = await response.json();
      console.log(result);

      if (!response.ok) {
        setError(`Request failed: ${response.status}`);
        return;
      }

      onRegister?.();
    } catch (err) {
      console.error("User registration error:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      // Runs after success, failure, or an early return.
    }
  }

  return (
    <main className="register-page">
      <section className="register-card">
        <div className="register-brand">
          <div className="register-brand-mark">E</div>
          <span>EventFlow</span>
        </div>

        <div className="register-heading">
          <h1>Create user account</h1>
          <p>
            Set up a staff or guest account for your organization.
          </p>
        </div>

        <form className="register-form" onSubmit={handleSubmit}>
          <div className="register-name-row">
            <div className="register-field">
              <label htmlFor="first-name">First name</label>
              <input
                id="first-name"
                type="text"
                placeholder="First name"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>

            <div className="register-field">
              <label htmlFor="last-name">Last name</label>
              <input
                id="last-name"
                type="text"
                placeholder="Last name"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="register-field">
            <label>Account type</label>

            <div className="account-type-options">
              <label>
                <input
                  type="radio"
                  name="accountType"
                  value="2"
                  checked={accountTypeId === "2"}
                  onChange={(e) => setAccountTypeId(e.target.value)}
                />
                Staff
              </label>

              <label>
                <input
                  type="radio"
                  name="accountType"
                  value="3"
                  checked={accountTypeId === "3"}
                  onChange={(e) => setAccountTypeId(e.target.value)}
                />
                Guest
              </label>
            </div>
          </div>

          <div className="register-field">
            <label htmlFor="register-email">Email address</label>
            <input
              id="register-email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="register-field">
            <label htmlFor="register-password">Password</label>
            <div className="register-password-wrapper">
              <input
                id="register-password"
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="register-show-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="register-field">
            <label htmlFor="register-confirm-password">
              Confirm password
            </label>
            <input
              id="register-confirm-password"
              type={showPassword ? "text" : "password"}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="register-error" role="alert">
              {error}
            </p>
          )}

          {message && (
            <p className="register-message" role="status">
              {message}
            </p>
          )}

          <button className="register-submit" type="submit">
            Create User <span aria-hidden="true">→</span>
          </button>
        </form>

        <p className="register-footer">
          Plan better. Bring people together.
        </p>
      </section>
    </main>
  );
}
