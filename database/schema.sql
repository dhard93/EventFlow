/*==========================
 Create database and tables
==========================*/

CREATE DATABASE EventFlowDB;
\connect EventFlowDB;

CREATE TABLE organizations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    date_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    date_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE spaces (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    venue_id BIGINT NOT NULL
        REFERENCES venues(id)
        ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    floor INTEGER,
    capacity INTEGER,
    chair_count INTEGER,
    table_count INTEGER,
    table_max INTEGER,
    is_bookable BOOLEAN NOT NULL DEFAULT TRUE,
    is_in_use BOOLEAN NOT NULL DEFAULT FALSE
);

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
    attendee_count INTEGER,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    is_recurring BOOLEAN NOT NULL,
    recurrence_type VARCHAR(20),
    recurrence_end_date DATE,
    request_status_id INTEGER DEFAULT 3 NOT NULL,
    is_set BOOLEAN NOT NULL DEFAULT FALSE,
    denied_reason TEXT DEFAULT NULL,
    denied_at TIMESTAMP DEFAULT NULL,
    date_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_approved TIMESTAMP DEFAULT NULL,
    last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE event_request_resources (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    request_id BIGINT NOT NULL
        REFERENCES events(id)
        ON DELETE CASCADE,
    resource_type_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL
);

CREATE TABLE conversations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user1_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,
    user2_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,
    date_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    conversation_id BIGINT NOT NULL
        REFERENCES conversations(id),
    sender_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,
    message TEXT NOT NULL,
    date_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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