import { useEffect, useState } from "react";
import { API_URL } from "../config";
import LoadingOverlay from "./LoadingOverlay";
import "../MyOrganization.css";
import AddVenue from "./AddVenue";

export default function MyOrganization({
  organizationId,
  organizationName,
  onOrganizationNameChange,
  onOrganizationDeleted,
  onClose,
}) {
  const [name, setName] = useState(organizationName || "");
  const [venues, setVenues] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);
  const [deletingOrg, setDeletingOrg] = useState(false);

  const [isEditingName, setIsEditingName] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const isProcessing = loading || savingName || deletingUser || deletingOrg;

  useEffect(() => {
    setName(organizationName || "");
  }, [organizationName]);

  useEffect(() => {
    if (!organizationId) return;

    const controller = new AbortController();

    async function fetchOrganizationData() {
      setLoading(true);
      setError("");

      try {
        const [venuesResponse, usersResponse] = await Promise.all([
          fetch(`${API_URL}/venues/all/${organizationId}`, {
            method: "GET",
            credentials: "include",
            signal: controller.signal,
          }),

          fetch(`${API_URL}/users/${organizationId}`, {
            method: "GET",
            credentials: "include",
            signal: controller.signal,
          }),
        ]);

        if (!venuesResponse.ok) {
          throw new Error("Unable to load organization venues.");
        }

        if (!usersResponse.ok) {
          throw new Error("Unable to load organization users.");
        }

        const venuesData = await venuesResponse.json();
        const usersData = await usersResponse.json();

        setVenues(Array.isArray(venuesData) ? venuesData : []);
        setUsers(Array.isArray(usersData) ? usersData : []);
      } catch (err) {
        if (err.name === "AbortError") return;

        console.error("Organization data fetch failed:", err);
        setError(err.message || "Unable to load organization information.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchOrganizationData();

    return () => controller.abort();
  }, [organizationId]);

  async function handleSaveName() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Organization name cannot be empty.");
      return;
    }

    if (trimmedName === organizationName) {
      setIsEditingName(false);
      return;
    }

    setSavingName(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/organizations`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          new_name: trimmedName,
          org_id: organizationId,
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(
          result.detail || "Unable to update organization name."
        );
      }

      onOrganizationNameChange(trimmedName);
      setName(trimmedName);
      setIsEditingName(false);
      setMessage("Organization name successfully updated.");
    } catch (err) {
      console.error("Organization update failed:", err);
      setError(err.message);
    } finally {
      setSavingName(false);
    }
  }

  async function handleDeleteOrganization() {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${organizationName}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingOrg(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/organizations/${organizationId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(
          result.detail || "Unable to delete organization."
        );
      }

      onOrganizationDeleted();
    } catch (err) {
      console.error("Organization deletion failed:", err);
      setError(err.message);
      setDeletingOrg(false);
    }
  }

  async function handleDeleteUser(user) {
    setDeletingUser(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/users/${user.id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.detail || "Unable to delete user.");
      }

      setUsers((previous) =>
        previous.filter((item) => item.id !== user.id)
      );

      setSelectedUser(null);
      setMessage(`${user.name} was successfully deleted.`);
    } catch (err) {
      console.error("User deletion failed:", err);
      setError(err.message);
    } finally {
      setDeletingUser(false);
    }
  }

  function handleVenueClick(venue) {
    setSelectedVenue(venue);
  }

  return (
    <div
      className="my-organizations-overlay"
      onClick={onClose}
    >
      {isProcessing && <LoadingOverlay />}
      <div
        className="my-organizations-card"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="my-organizations-header">
          <div className="my-organizations-brand">
            <div className="my-organizations-brand-mark">E</div>
            <span>My Organization</span>
          </div>

          <button
            type="button"
            className="my-organizations-close"
            onClick={onClose}
            aria-label="Close organization settings"
          >
            &times;
          </button>
        </header>

        <div className="my-organizations-heading">
          <h1>Organization Management</h1>
          <p>
            Manage your organization, venues, and members.
          </p>
        </div>

        <div className="my-organizations-content">
          {error && (
            <p className="my-organizations-error" role="alert">
              {error}
            </p>
          )}

          {message && (
            <p className="my-organizations-message" role="status">
              {message}
            </p>
          )}
          {/* ORGANIZATION SECTION */}

          <section className="organization-section">
            <div className="my-organizations-section-heading">
              <div>
                <h2>Organization</h2>
                <p>Manage your organization details.</p>
              </div>
            </div>

            <div className="organization-name-field">
              <label htmlFor="organization-name">
                Organization Name
              </label>

              <div className="organization-name-controls">
                <input
                  id="organization-name"
                  type="text"
                  value={name}
                  disabled={!isEditingName || savingName}
                  onChange={(e) => setName(e.target.value)}
                />

                {!isEditingName ? (
                  <button
                    type="button"
                    className="my-organizations-secondary"
                    onClick={() => {
                      setError("");
                      setMessage("");
                      setIsEditingName(true);
                    }}
                  >
                    Edit
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="my-organizations-save"
                      onClick={handleSaveName}
                      disabled={savingName}
                    >
                      Save
                    </button>

                    <button
                      type="button"
                      className="my-organizations-secondary"
                      disabled={savingName}
                      onClick={() => {
                        setName(organizationName || "");
                        setIsEditingName(false);
                        setError("");
                      }}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="organization-danger-zone">
              <div>
                <strong>Delete Organization</strong>
                <p>
                  Permanently delete this organization.
                </p>
              </div>

              <button
                type="button"
                className="my-organizations-delete"
                onClick={handleDeleteOrganization}
                disabled={deletingOrg}
              >
                Delete Organization
              </button>
            </div>
          </section>

          {/* VENUES SECTION */}

          <section className="organization-list-section">
            <div className="my-organizations-section-heading">
              <div>
                <h2>Venues</h2>
                <p>
                  Select a venue to manage its information.
                </p>
              </div>

              <span className="my-organizations-count">
                {venues.length}
              </span>
            </div>

            {venues.length === 0 ? (
              <p className="my-organizations-info">
                No venues have been added to this organization.
              </p>
            ) : (
              <div className="my-organizations-list">
                {venues.map((venue) => (
                  <button
                    type="button"
                    key={venue.id}
                    className={`my-organizations-list-button ${
                      selectedVenue?.id === venue.id
                        ? "selected"
                        : ""
                    }`}
                    onClick={() => handleVenueClick(venue)}
                  >
                    <span className="organization-list-icon">
                      ⌂
                    </span>

                    <span className="organization-list-name">
                      {venue.name}
                    </span>

                    <span className="organization-list-arrow">
                      →
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* USERS SECTION */}

          <section className="organization-list-section">
            <div className="my-organizations-section-heading">
              <div>
                <h2>Users</h2>
                <p>
                  Manage staff and guest accounts in your organization.
                </p>
              </div>

              <span className="my-organizations-count">
                {users.length}
              </span>
            </div>

            {users.length === 0 ? (
              <p className="my-organizations-info">
                No additional users belong to this organization.
              </p>
            ) : (
              <div className="my-organizations-list">
                {users.map((user) => (
                  <div
                    className="organization-user-row"
                    key={user.id}
                  >
                    <button
                      type="button"
                      className={`my-organizations-list-button organization-user-button ${
                        selectedUser?.id === user.id
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        setSelectedUser(
                          selectedUser?.id === user.id ? null : user
                        )
                      }
                    >
                      <span className="organization-list-icon">
                        ♟
                      </span>

                      <span className="organization-list-name">
                        {user.name}
                      </span>

                      <span className="organization-list-arrow">
                        {selectedUser?.id === user.id ? "−" : "+"}
                      </span>
                    </button>

                    {selectedUser?.id === user.id && (
                      <div className="organization-user-actions">
                        <span>
                          Delete this user's account?
                        </span>

                        <div>
                          <button
                            type="button"
                            className="my-organizations-delete"
                            disabled={deletingUser}
                            onClick={() => handleDeleteUser(user)}
                          >
                            Delete User
                          </button>

                          <button
                            type="button"
                            className="my-organizations-secondary"
                            disabled={deletingUser}
                            onClick={() => setSelectedUser(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
        {selectedVenue && (
          <div
            className="modal-overlay"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedVenue(null);
            }}
          >
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <AddVenue
                key={selectedVenue.id}
                organizationId={organizationId}
                venueId={selectedVenue.id}
                onClose={() => setSelectedVenue(null)}
                onSubmit={async () => {
                  try {
                    const response = await fetch(
                      `${API_URL}/venues/all/${organizationId}`,
                      {
                        method: "GET",
                        credentials: "include",
                      }
                    );

                    if (!response.ok) {
                      throw new Error("Unable to refresh venues.");
                    }

                    const data = await response.json();

                    setVenues(
                      Array.isArray(data) ? data : []
                    );
                  } catch (err) {
                    console.error(
                      "Failed to refresh venues:",
                      err
                    );
                  }
                }}
              />
            </div>
          </div>
        )}
    </div>
  );
}