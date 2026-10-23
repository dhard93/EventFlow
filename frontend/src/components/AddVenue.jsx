
import { useState } from "react";

function createSpace(id) {
  return {
    id,
    name: "",
    floor: "",
    capacity: "",
    chair_count: "",
    table_count: "",
    table_max: "",
  };
}

export default function AddVenue({ organizationId, onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [spaces, setSpaces] = useState([createSpace(1)]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function addSpace() {
    setSpaces((current) => {
      const nextId =
        Math.max(0, ...current.map((space) => space.id)) + 1;

      return [...current, createSpace(nextId)];
    });
  }

  function removeSpace(id) {
    setSpaces((current) =>
      current.filter((space) => space.id !== id)
    );
  }

  function updateSpace(id, field, value) {
    setSpaces((current) =>
      current.map((space) =>
        space.id === id ? { ...space, [field]: value } : space
      )
    );
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

    if (spaces.length === 0) {
        setError("Please add at least one space.");
        return;
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
        return;
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
        return;
        }
    }

    const venueData = {
        org_id: Number(organizationId),
        name: venueName,
        address: venueAddress,
        city: venueCity,
        state: venueState,
        zip: venueZip,
        spaces: spaces.map((space) => ({
            name: space.name.trim(),
            floor: Number(space.floor),
            capacity: Number(space.capacity),
            chair_count: Number(space.chair_count),
            table_count: Number(space.table_count),
            table_max: Number(space.table_max),
        })),
    };

    try {
        setIsSubmitting(true);

        const response = await fetch("http://localhost:8000/venues", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(venueData),
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                result.detail || "Unable to create venue."
            );
        }

        if (onSubmit) {
            await onSubmit(result);
        }

        onClose?.();
    } catch (err) {
        setError(
        err.message || "Unable to create venue. Please try again."
        );
    } finally {
        setIsSubmitting(false);
    }
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
            <h1 id="add-venue-title">Add venue</h1>
            <p>
              Enter the venue details and configure its event spaces.
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
                  <div className="add-venue-space-row" key={space.id}>
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
                      disabled={isSubmitting || spaces.length === 1}
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
                <span className="add-venue-add-icon" aria-hidden="true">
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
                {isSubmitting ? "Creating venue..." : "Create venue"}
                {!isSubmitting && <span aria-hidden="true"> &rarr;</span>}
              </button>
            </div>
          </footer>
        </form>
      </section>
    </main>
  );
}