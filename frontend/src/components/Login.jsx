import { useState } from "react";
import "../Login.css";

export default function Login({ onLogin, onCreateOrganizationClick }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    if (onLogin) {
      onLogin({ email, password });
    } else {
      setMessage("Login is ready to connect to your backend.");
    }
  }

  function handleCreateOrganization(event) {
    event.preventDefault();

    if (onCreateOrganizationClick) {
      onCreateOrganizationClick();
    } else {
      setMessage("Organization registration will be available soon.");
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <div className="login-brand-mark">E</div>
          <span>EventFlow</span>
        </div>

        <div className="login-heading">
          <h1>Welcome back</h1>
          <p>Sign in to manage your events.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="login-field">
            <div className="login-password-label">
              <label htmlFor="password">Password</label>
            </div>

            <div className="login-password-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />

              <button
                className="login-show-password"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button className="login-submit" type="submit">
            Sign in <span aria-hidden="true">→</span>
          </button>

          {message && (
            <p className="login-message" role="status">
              {message}
            </p>
          )}
        </form>

        <div className="login-divider">
          <span>NEW TO EVENTFLOW?</span>
        </div>

        <p className="login-register">
          New organization?{" "}
          <a
            href="#register-org"
            onClick={handleCreateOrganization}
          >
            Create one
          </a>
        </p>

        <p className="login-footer">
          Plan better. Bring people together.
        </p>
      </section>
    </main>
  );
}