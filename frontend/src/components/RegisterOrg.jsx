import { useState } from "react";
import "../Register.css";

export default function RegisterOrg({
  onRegister,
  onLoginClick,
}) {
  const [organizationName, setOrganizationName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("Your password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    const registrationData = {
      organization_name: organizationName.trim(),
      email: email.trim(),
      password,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
    };

    if (onRegister) {
      onRegister(registrationData);
    } else {
      setMessage(
        "Organization registration is ready to connect to your backend."
      );
    }
  }

  function handleLoginClick(event) {
    event.preventDefault();
    onLoginClick?.();
  }

  return (
    <main className="register-page">
      <section className="register-card">
        <div className="register-brand">
          <div className="register-brand-mark">E</div>
          <span>EventFlow</span>
        </div>

        <div className="register-heading">
          <h1>Create your organization</h1>
          <p>
            Set up your organization and administrator account.
          </p>
        </div>

        <form className="register-form" onSubmit={handleSubmit}>
          <div className="register-field">
            <label htmlFor="organization-name">
              Organization name
            </label>
            <input
              id="organization-name"
              type="text"
              placeholder="Your organization"
              autoComplete="organization"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              required
            />
          </div>

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
            Create organization <span aria-hidden="true">→</span>
          </button>
        </form>

        <p className="register-login">
          Already have an account?{" "}
          <a href="#login" onClick={handleLoginClick}>
            Sign in
          </a>
        </p>

        <p className="register-footer">
          Plan better. Bring people together.
        </p>
      </section>
    </main>
  );
}