
import { useEffect, useState } from "react";
import { API_URL } from "../config";
import LoadingOverlay from "./LoadingOverlay";
import "../styles/MyAccount.css";

export default function MyAccount({
  organizationId,
  userId,
  onClose,
  onUpdated,
}) {
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Get existing account information
  useEffect(() => {
    const controller = new AbortController();

    async function fetchAccount() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${API_URL}/users/account/${organizationId}/${userId}`,
          {
            method: "GET",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          const details = await response.json().catch(() => null);

          throw new Error(
            details?.detail || "Failed to load account details."
          );
        }

        const data = await response.json();

        setForm({
          email: data.email ?? "",
          password: "",
          firstName: data.first_name ?? "",
          lastName: data.last_name ?? "",
        });

      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Unable to load account.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    if (organizationId && userId) {
      fetchAccount();
    } else {
      setError("Missing organization or user ID.");
      setLoading(false);
    }

    return () => controller.abort();

  }, [organizationId, userId]);

  // Handle input changes
  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setMessage("");
  }

  // Update account information
  async function handleSubmit(event) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const updateData = {
        email: form.email,
        f_name: form.firstName,
        l_name: form.lastName,
      };

      // Only send password when a new password is entered
      if (form.password.trim() !== "") {
        updateData.password = form.password;
      }

      const response = await fetch(
        `${API_URL}/users/account/${userId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
        }
      );

      if (!response.ok) {
        const details = await response.json().catch(() => null);

        throw new Error(
          details?.detail || "Failed to update account details."
        );
      }

      setMessage("Account details updated successfully.");

      setForm((previous) => ({
        ...previous,
        password: "",
      }));

      onUpdated?.();

    } catch (err) {
      setError(err.message || "Unable to save account changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="my-account-overlay"
      onClick={onClose}
    >
      <section
        className="my-account-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="my-account-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="my-account-header">
          <div className="my-account-brand">
            <div className="my-account-brand-mark">E</div>
            <span>EventFlow</span>
          </div>

          <button
            type="button"
            className="my-account-close"
            onClick={onClose}
            aria-label="Close account settings"
          >
            &times;
          </button>
        </header>

        <div className="my-account-heading">
          <h1 id="my-account-title">My Account</h1>
          <p>
            View and update your personal account information.
          </p>
        </div>

        <div className="my-account-content">
          {loading ? (
            <div className="my-account-loading">
              <LoadingOverlay />
            </div>
          ) : (
            <>
              {error && (
                <p className="my-account-error" role="alert">
                  {error}
                </p>
              )}

              {message && (
                <p className="my-account-message" role="status">
                  {message}
                </p>
              )}

              <form onSubmit={handleSubmit}>
                <div className="my-account-field">
                  <label htmlFor="account-email">
                    Email address
                  </label>

                  <input
                    id="account-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    disabled={saving}
                  />
                </div>

                <div className="my-account-field">
                  <label htmlFor="account-password">
                    Password
                  </label>

                  <input
                    id="account-password"
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter a new password"
                    disabled={saving}
                  />

                  <small>
                    Leave blank to keep your current password.
                  </small>
                </div>

                <div className="my-account-name-fields">
                  <div className="my-account-field">
                    <label htmlFor="account-first-name">
                      First name
                    </label>

                    <input
                      id="account-first-name"
                      type="text"
                      name="firstName"
                      autoComplete="given-name"
                      value={form.firstName}
                      onChange={handleChange}
                      required
                      disabled={saving}
                    />
                  </div>

                  <div className="my-account-field">
                    <label htmlFor="account-last-name">
                      Last name
                    </label>

                    <input
                      id="account-last-name"
                      type="text"
                      name="lastName"
                      autoComplete="family-name"
                      value={form.lastName}
                      onChange={handleChange}
                      required
                      disabled={saving}
                    />
                  </div>
                </div>

                <footer className="my-account-footer">
                  <button
                    type="button"
                    className="my-account-cancel"
                    onClick={onClose}
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="my-account-save"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save changes"}
                  </button>
                </footer>
              </form>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
