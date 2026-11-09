/* ==================================================
   EventFlow Database
================================================== */

CREATE DATABASE EventFlowDB;

-- PostgreSQL psql command
\connect EventFlowDB;


/* ==================================================
   Organizations
================================================== */

CREATE TABLE organizations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    date_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


/* ==================================================
   Users
================================================== */

CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    org_id BIGINT NOT NULL
        REFERENCES organizations(id)
        ON DELETE CASCADE,

    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    f_name VARCHAR(50) NOT NULL,
    l_name VARCHAR(50) NOT NULL,
    account_type_id INTEGER NOT NULL,
    last_login TIMESTAMP,
    date_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


/* ==================================================
   Venues
================================================== */

CREATE TABLE venues (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    org_id BIGINT NOT NULL
        REFERENCES organizations(id)
        ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,
    address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    zip VARCHAR(20),

    date_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


/* ==================================================
   Spaces
================================================== */

CREATE TABLE spaces (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    venue_id BIGINT NOT NULL
        REFERENCES venues(id)
        ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,
    floor INTEGER,
    capacity INTEGER CHECK (capacity >= 0),
    chair_count INTEGER CHECK (chair_count >= 0),
    table_count INTEGER CHECK (table_count >= 0),
    table_max INTEGER CHECK (table_max >= 0)
);


/* ==================================================
   Events
================================================== */

CREATE TABLE events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    org_id BIGINT NOT NULL
        REFERENCES organizations(id)
        ON DELETE CASCADE,

    venue_id BIGINT NOT NULL
        REFERENCES venues(id)
        ON DELETE CASCADE,

    space_id BIGINT NOT NULL
        REFERENCES spaces(id)
        ON DELETE CASCADE,

    requesting_user_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    title VARCHAR(255) NOT NULL,
    description TEXT,
    attendee_count INTEGER CHECK (attendee_count >= 0),

    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,

    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence_type VARCHAR(20),
    recurrence_end_date DATE,

    request_status_id INTEGER NOT NULL DEFAULT 3,

    is_set BOOLEAN NOT NULL DEFAULT FALSE,

    denied_reason TEXT,
    denied_at TIMESTAMP,

    date_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_approved TIMESTAMP,
    last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_event_times
        CHECK (end_time > start_time),

    CONSTRAINT chk_recurrence
        CHECK (
            is_recurring = FALSE
            OR (
                recurrence_type IS NOT NULL
                AND recurrence_end_date IS NOT NULL
            )
        )
);


/* ==================================================
   Event Request Resources
================================================== */

CREATE TABLE event_request_resources (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    request_id BIGINT NOT NULL
        REFERENCES events(id)
        ON DELETE CASCADE,

    resource_type_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0)
);


/* ==================================================
   Conversations
================================================== */

CREATE TABLE conversations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    user1_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    user2_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    date_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_different_users
        CHECK (user1_id <> user2_id)
);


/* ==================================================
   Messages
================================================== */

CREATE TABLE messages (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    conversation_id BIGINT NOT NULL
        REFERENCES conversations(id)
        ON DELETE CASCADE,

    sender_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    message TEXT NOT NULL,
    has_read BOOLEAN NOT NULL DEFAULT FALSE,
    date_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


/* ==================================================
   Notifications
================================================== */

CREATE TABLE notifications (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    user_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    type_id INTEGER NOT NULL,
    has_read BOOLEAN NOT NULL DEFAULT FALSE,
    content TEXT NOT NULL,
    date_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


/* ==================================================
   User Sessions
================================================== */

CREATE TABLE user_sessions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    session_token_hash VARCHAR(64) NOT NULL UNIQUE,

    user_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

    date_created TIMESTAMP WITH TIME ZONE NOT NULL
        DEFAULT CURRENT_TIMESTAMP
);


/* ==================================================
   INDEXES
================================================== */

/* Users */

CREATE INDEX idx_users_org_id
    ON users(org_id);


/* Venues */

CREATE INDEX idx_venues_org_id
    ON venues(org_id);


/* Spaces */

CREATE INDEX idx_spaces_venue_id
    ON spaces(venue_id);


/* Events */

CREATE INDEX idx_events_org_id
    ON events(org_id);

CREATE INDEX idx_events_venue_id
    ON events(venue_id);

CREATE INDEX idx_events_space_id
    ON events(space_id);

CREATE INDEX idx_events_requesting_user_id
    ON events(requesting_user_id);

/* Useful for organization event dashboards */
CREATE INDEX idx_events_org_start_time
    ON events(org_id, start_time);


/* Event Resources */

CREATE INDEX idx_event_resources_request_id
    ON event_request_resources(request_id);


/* Conversations */

CREATE INDEX idx_conversations_user1_id
    ON conversations(user1_id);

CREATE INDEX idx_conversations_user2_id
    ON conversations(user2_id);


/* Messages */

CREATE INDEX idx_messages_conversation_id
    ON messages(conversation_id);

CREATE INDEX idx_messages_sender_id
    ON messages(sender_id);


/* Notifications */

CREATE INDEX idx_notifications_user_id
    ON notifications(user_id);


/* User Sessions */

CREATE INDEX idx_user_sessions_user_id
    ON user_sessions(user_id);

CREATE INDEX idx_user_sessions_expires_at
    ON user_sessions(expires_at);