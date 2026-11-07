
import '../AddVenue.css';
import { useEffect, useState } from "react";

const API_BASE = "http://localhost:8000";

const SPACE_FIELDS = [
  "name",
  "floor",
  "capacity",
  "chair_count",
  "table_count",
  "table_max",
];

function createSpace(id, data = {}, dbId = null) {
  return {
    id,
    dbId,
    name: data.name ?? "",
    floor: data.floor == null ? "" : String(data.floor),
    capacity: data.capacity == null ? "" : String(data.capacity),
    chair_count: data.chair_count == null ? "" : String(data.chair_count),
    table_count: data.table_count == null ? "" : String(data.table_count),
    table_max: data.table_max == null ? "" : String(data.table_max),
  };
}

export default function AddVenue({
  organizationId,
  venueId = null,
  onClose,
  onSubmit,
}) {
  const isEditing = venueId !== null && venueId !== undefined;

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");

  const [spaces, setSpaces] = useState([createSpace(1)]);
  const [originalSpaces, setOriginalSpaces] = useState([]);

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditing);

  // Fetch venue information when opening in edit mode.
  useEffect(() => {
    if (!isEditing) return;

    const controller = new AbortController();

    async function fetchVenue() {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${API_BASE}/venues/${venueId}`,
          {
            method: "GET",
            credentials: "include",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error("Unable to load venue information.");
        }

        const data = await response.json();

        if (!data) {
          throw new Error("Venue information was not found.");
        }

        setName(data.name || "");
        setAddress(data.address || "");
        setCity(data.city || "");
        setState(data.state || "");
        setZip(data.zip || "");

        const loadedSpaces = (data.spaces || []).map(
          (space, index) =>
            createSpace(index + 1, space, space.id)
        );

        setSpaces(loadedSpaces);

        setOriginalSpaces(
          loadedSpaces.map((space) => ({ ...space }))
        );
      } catch (err) {
        if (err.name === "AbortError") return;

        console.error("Venue fetch failed:", err);
        setError(err.message || "Unable to load venue.");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    fetchVenue();

    return () => controller.abort();
  }, [venueId, isEditing]);

  // Add a new space.
  function addSpace() {
    setSpaces((current) => {
      const nextId =
        Math.max(0, ...current.map((space) => space.id)) + 1;

      return [...current, createSpace(nextId)];
    });
  }

  // Remove a space.
  function removeSpace(id) {
    setSpaces((current) =>
      current.filter((space) => space.id !== id)
    );
  }

  // Update a space field.
  function updateSpace(id, field, value) {
    setSpaces((current) =>
      current.map((space) =>
        space.id === id ? { ...space, [field]: value } : space
      )
    );
  }

  // Validate all spaces before submission.
  function validateSpaces() {
    if (spaces.length === 0) {
      setError("Please add at least one space.");
      return false;
    }

    for (let i = 0; i < spaces.length; i++) {
      const space = spaces[i];

      if (
        !space.name.trim() ||
        space.floor === "" ||
        space.capacity === "" ||
        space.chair_count === "" ||
        space.table_count === "" ||
        space.table_max === ""
      ) {
        setError(`Please complete every field for Space ${i + 1}.`);
        return false;
      }

      const numericValues = [
        space.floor,
        space.capacity,
        space.chair_count,
        space.table_count,
        space.table_max,
      ];

      if (
        numericValues.some(
          (value) =>
            !Number.isInteger(Number(value)) ||
            Number(value) < 0
        )
      ) {
        setError(
          `All numeric fields for Space ${i + 1} must be whole numbers greater than or equal to zero.`
        );
        return false;
      }
    }

    return true;
  }

  // Convert a space into the format expected by the backend.
  function getSpacePayload(space) {
    return {
      name: space.name.trim(),
      floor: Number(space.floor),
      capacity: Number(space.capacity),
      chair_count: Number(space.chair_count),
      table_count: Number(space.table_count),
      table_max: Number(space.table_max),
    };
  }

  // Construct the PATCH request for editing a venue.
  function getUpdatePayload() {
    const currentExistingSpaces = spaces.filter(
      (space) => space.dbId != null
    );

    // Spaces without database IDs are new.
    const newSpaces = spaces
      .filter((space) => space.dbId == null)
      .map(getSpacePayload);

    // Original spaces that are no longer present have been deleted.
    const deletedSpaces = originalSpaces
      .filter(
        (original) =>
          !currentExistingSpaces.some(
            (current) => current.dbId === original.dbId
          )
      )
      .map((space) => ({
        id: space.dbId,
      }));

    // Only include existing spaces whose fields have changed.
    const updatedSpaces = currentExistingSpaces
      .filter((current) => {
        const original = originalSpaces.find(
          (space) => space.dbId === current.dbId
        );

        if (!original) return false;

        return SPACE_FIELDS.some(
          (field) =>
            String(current[field]) !== String(original[field])
        );
      })
      .map((space) => ({
        id: space.dbId,
        ...getSpacePayload(space),
      }));

    return {
      name: name.trim(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      zip: zip.trim(),
      del_spaces: deletedSpaces,
      upd_spaces: updatedSpaces,
      new_spaces: newSpaces,
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const venueName = name.trim();
    const venueAddress = address.trim();
    const venueCity = city.trim();
    const venueState = state.trim();
    const venueZip = zip.trim();

    if (
      !venueName ||
      !venueAddress ||
      !venueCity ||
      !venueState ||
      !venueZip
    ) {
      setError("Please complete all venue fields.");
      return;
    }

    if (!validateSpaces()) return;

    // Build the appropriate request body.
    const venueData = isEditing
      ? getUpdatePayload()
      : {
          org_id: Number(organizationId),
          name: venueName,
          address: venueAddress,
          city: venueCity,
          state: venueState,
          zip: venueZip,
          spaces: spaces.map(getSpacePayload),
        };

    try {
      setIsSubmitting(true);

      const response = await fetch(
        isEditing
          ? `${API_BASE}/venues/${venueId}`
          : `${API_BASE}/venues`,
        {
          method: isEditing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(venueData),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.detail ||
            (isEditing
              ? "Unable to update venue."
              : "Unable to create venue.")
        );
      }

      if (onSubmit) {
        await onSubmit(result);
      }

      onClose?.();

    } catch (err) {
      console.error("Venue submission failed:", err);

      setError(
        err.message ||
          (isEditing
            ? "Unable to update venue. Please try again."
            : "Unable to create venue. Please try again.")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="add-venue-page">
        <section className="add-venue-card">
          <p>Loading venue information...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="add-venue-page">
      <section
        className="add-venue-card"
        aria-labelledby="add-venue-title"
      >
        <header className="add-venue-header">
          <div className="add-venue-heading-icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 21h18" />
              <path d="M5 21V7l8-4v18" />
              <path d="M13 10h6v11" />
              <path d="M8 9v.01M8 12v.01M8 15v.01M8 18v.01" />
              <path d="M16 14v.01M16 17v.01" />
            </svg>
          </div>

          <div className="add-venue-heading-copy">
            <h1 id="add-venue-title">
              {isEditing ? "Edit venue" : "Add venue"}
            </h1>

            <p>
              {isEditing
                ? "Update venue details and manage its event spaces."
                : "Enter the venue details and configure its event spaces."}
            </p>
          </div>

          {onClose && (
            <button
              type="button"
              className="add-venue-close"
              onClick={onClose}
              aria-label="Close form"
              disabled={isSubmitting}
            >
              &times;
            </button>
          )}
        </header>

        <form className="add-venue-form" onSubmit={handleSubmit}>
          <div className="add-venue-form-content">

            {/* VENUE DETAILS */}

            <section className="add-venue-section">
              <div className="add-venue-section-heading">
                <h2>Venue details</h2>
                <p>All fields are required.</p>
              </div>

              <div className="add-venue-field">
                <label htmlFor="venue-name">Venue name</label>
                <input
                  id="venue-name"
                  type="text"
                  placeholder="e.g. Riverside Conference Center"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={255}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="add-venue-field">
                <label htmlFor="venue-address">Address</label>
                <input
                  id="venue-address"
                  type="text"
                  placeholder="Street address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  maxLength={255}
                  autoComplete="street-address"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="add-venue-location-row">
                <div className="add-venue-field">
                  <label htmlFor="venue-city">City</label>
                  <input
                    id="venue-city"
                    type="text"
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    maxLength={100}
                    autoComplete="address-level2"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="add-venue-field">
                  <label htmlFor="venue-state">State</label>
                  <input
                    id="venue-state"
                    type="text"
                    placeholder="State"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    maxLength={100}
                    autoComplete="address-level1"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="add-venue-field">
                  <label htmlFor="venue-zip">ZIP code</label>
                  <input
                    id="venue-zip"
                    type="text"
                    placeholder="ZIP"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    maxLength={20}
                    autoComplete="postal-code"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </section>

            {/* SPACES */}

            <section className="add-venue-section add-venue-spaces-section">
              <div className="add-venue-spaces-heading">
                <div className="add-venue-section-heading">
                  <h2>Spaces</h2>
                  <p>
                    Add each room or area available for events.
                    All fields are required.
                  </p>
                </div>
              </div>

              <div className="add-venue-space-list">
                <div className="add-venue-space-labels">
                  <span>Space name</span>
                  <span>Floor</span>
                  <span>Capacity</span>
                  <span>Chairs</span>
                  <span>Tables</span>
                  <span>Max/table</span>
                  <span aria-hidden="true" />
                </div>

                {spaces.map((space, index) => (
                  <div
                    className="add-venue-space-row"
                    key={space.id}
                  >
                    <div className="add-venue-space-name">
                      <label
                        className="add-venue-visually-hidden"
                        htmlFor={`space-name-${space.id}`}
                      >
                        Space {index + 1} name
                      </label>

                      <input
                        id={`space-name-${space.id}`}
                        type="text"
                        placeholder="e.g. Grand Ballroom"
                        value={space.name}
                        onChange={(e) =>
                          updateSpace(space.id, "name", e.target.value)
                        }
                        maxLength={255}
                        required
                        disabled={isSubmitting}
                      />
                    </div>

                    {[
                      ["floor", "Floor"],
                      ["capacity", "Capacity"],
                      ["chair_count", "Chair count"],
                      ["table_count", "Table count"],
                      ["table_max", "Max per table"],
                    ].map(([field, label]) => (
                      <div
                        className="add-venue-space-number"
                        key={field}
                      >
                        <label
                          className="add-venue-visually-hidden"
                          htmlFor={`space-${field}-${space.id}`}
                        >
                          Space {index + 1} {label}
                        </label>

                        <input
                          id={`space-${field}-${space.id}`}
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          value={space[field]}
                          onChange={(e) =>
                            updateSpace(
                              space.id,
                              field,
                              e.target.value
                            )
                          }
                          required
                          disabled={isSubmitting}
                        />
                      </div>
                    ))}

                    <button
                      type="button"
                      className="add-venue-remove-space"
                      onClick={() => removeSpace(space.id)}
                      aria-label={`Remove space ${index + 1}`}
                      disabled={
                        isSubmitting || spaces.length === 1
                      }
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="add-venue-add-space"
                onClick={addSpace}
                disabled={isSubmitting}
              >
                <span
                  className="add-venue-add-icon"
                  aria-hidden="true"
                >
                  +
                </span>
                Add another space
              </button>
            </section>

            {error && (
              <p className="add-venue-error" role="alert">
                {error}
              </p>
            )}
          </div>

          {/* FOOTER */}

          <footer className="add-venue-footer">
            <span className="add-venue-footer-note">
              All fields are required.
            </span>

            <div className="add-venue-actions">
              {onClose && (
                <button
                  type="button"
                  className="add-venue-cancel"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              )}

              <button
                type="submit"
                className="add-venue-submit"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? isEditing
                    ? "Saving changes..."
                    : "Creating venue..."
                  : isEditing
                    ? "Save changes"
                    : "Create venue"}

                {!isSubmitting && (
                  <span aria-hidden="true"> &rarr;</span>
                )}
              </button>
            </div>
          </footer>
        </form>
      </section>
    </main>
  );
}