/*=============
 Lookup Tables
=============*/

INSERT INTO account_types (name)
VALUES
    ('Admin'),
    ('Staff'),
    ('Guest');

INSERT INTO event_statuses (name)
VALUES
    ('Approved'),
    ('Denied'),
    ('Pending'),
    ('Cancelled');

INSERT INTO resource_types (name)
VALUES
    ('Chairs'),
    ('Tables'),
    ('Microphones'),
    ('Podiums'),
    ('TVs');

INSERT INTO notification_types (name)
VALUES
    ('Request_recieved'),
    ('Request_denied'),
    ('Request_approved'),
    ('Event_cancelled'),
    ('Message_recieved');

/*===============
 ORGANIZATION 1
===============*/

INSERT INTO organizations (name)
VALUES ('Stone Hill Baptist Church')
RETURNING id \gset org_

/*===========
 ORG 1 USERS
===========*/

INSERT INTO users
    (org_id, email, password, f_name, l_name, account_type_id)
VALUES
    (:org_id, 'test_user1@gmail.com', 'TesTpw123+_)', 'Jim', 'Jones', 1);

INSERT INTO users
    (org_id, email, password, f_name, l_name, account_type_id)
VALUES
    (:org_id, 'test_user2@gmail.com', 'TesTpw123+_)', 'Mark', 'Allen', 2);

INSERT INTO users
    (org_id, email, password, f_name, l_name, account_type_id)
VALUES
    (:org_id, 'test_user3@gmail.com', 'TesTpw123+_)', 'Sarah', 'Jackson', 3);

INSERT INTO users
    (org_id, email, password, f_name, l_name, account_type_id)
VALUES
    (:org_id, 'test_user4@gmail.com', 'TesTpw123+_)', 'Kimberly', 'James', 3);

/*=============
 ORG 1 VENUE 1
=============*/

INSERT INTO venues
    (org_id, name, address, city, state, zip)
VALUES
    (:org_id, 'Nashville Campus', '123 Dark Hollow Ln', 'Nashville', 'TN', '12345')
RETURNING id \gset v_

/*====================
 ORG 1 VENUE 1 SPACES
====================*/

INSERT INTO spaces
    (venue_id, name, floor, capacity, chair_count, table_count, table_max)
VALUES
    (:v_id, 'Conference Room', 1, 10, 10, 1, 2);

INSERT INTO spaces
    (venue_id, name, floor, capacity, chair_count, table_count, table_max)
VALUES
    (:v_id, 'Classroom A', 1, 30, 20, 0, 4);

INSERT INTO spaces
    (venue_id, name, floor, capacity, chair_count, table_count, table_max)
VALUES
    (:v_id, 'Classroom B', 1, 60, 45, 4, 8);

INSERT INTO spaces
    (venue_id, name, floor, capacity, chair_count, table_count, table_max)
VALUES
    (:v_id, 'Classroom C', 1, 30, 20, 4, 4);

INSERT INTO spaces
    (venue_id, name, floor, capacity, chair_count, table_count, table_max)
VALUES
    (:v_id, 'Multipurpose Room', 1, 400, 0, 0, 50);

INSERT INTO spaces
    (venue_id, name, floor, capacity, chair_count, table_count, table_max)
VALUES
    (:v_id, 'Auditorium', 1, 800, 800, 0, 0);

/*=======================
 ORG 1 VENUE 1 RESOURCES
=======================*/

INSERT INTO resource_inventory
    (resource_type_id, venue_id, available_quantity)
VALUES
    (1, :v_id, 2000);

INSERT INTO resource_inventory
    (resource_type_id, venue_id, available_quantity)
VALUES
    (2, :v_id, 300);

INSERT INTO resource_inventory
    (resource_type_id, venue_id, available_quantity)
VALUES
    (3, :v_id, 100);

INSERT INTO resource_inventory
    (resource_type_id, venue_id, available_quantity)
VALUES
    (4, :v_id, 70);

INSERT INTO resource_inventory
    (resource_type_id, venue_id, available_quantity)
VALUES
    (5, :v_id, 45);

/*==============
 ORG 1 VENUE 2
==============*/

INSERT INTO venues
    (org_id, name, address, city, state, zip)
VALUES
    (:org_id, 'Franklin Campus', '456 Treetop Blvd', 'Franklin', 'TN', '23456')
RETURNING id \gset v_

/*====================
 ORG 1 VENUE 2 SPACES
====================*/

INSERT INTO spaces
    (venue_id, name, floor, capacity, chair_count, table_count, table_max)
VALUES
    (:v_id, 'Room 101', 1, 30, 20, 0, 4);

INSERT INTO spaces
    (venue_id, name, floor, capacity, chair_count, table_count, table_max)
VALUES
    (:v_id, 'Room 102', 1, 30, 20, 0, 4);

INSERT INTO spaces
    (venue_id, name, floor, capacity, chair_count, table_count, table_max)
VALUES
    (:v_id, 'Room 103', 1, 40, 40, 2, 4);

INSERT INTO spaces
    (venue_id, name, floor, capacity, chair_count, table_count, table_max)
VALUES
    (:v_id, 'Room 201', 2, 15, 15, 0, 2);

INSERT INTO spaces
    (venue_id, name, floor, capacity, chair_count, table_count, table_max)
VALUES
    (:v_id, 'Room 202', 2, 30, 30, 3, 4);

INSERT INTO spaces
    (venue_id, name, floor, capacity, chair_count, table_count, table_max)
VALUES
    (:v_id, 'Room 203', 2, 30, 25, 0, 4);

INSERT INTO spaces
    (venue_id, name, floor, capacity, chair_count, table_count, table_max)
VALUES
    (:v_id, 'Auditorium', 1, 600, 600, 0, 0);

/*=======================
 ORG 1 VENUE 2 RESOURCES
=======================*/

INSERT INTO resource_inventory
    (resource_type_id, venue_id, available_quantity)
VALUES
    (1, :v_id, 1000);

INSERT INTO resource_inventory
    (resource_type_id, venue_id, available_quantity)
VALUES
    (2, :v_id, 100);

INSERT INTO resource_inventory
    (resource_type_id, venue_id, available_quantity)
VALUES
    (3, :v_id, 50);

INSERT INTO resource_inventory
    (resource_type_id, venue_id, available_quantity)
VALUES
    (4, :v_id, 50);

INSERT INTO resource_inventory
    (resource_type_id, venue_id, available_quantity)
VALUES
    (5, :v_id, 30);

/*=============
 ORG 1 EVENTS
=============*/

INSERT INTO events (
    org_id, venue_id, space_id, requesting_user_id, title, description,
    attendee_count, start_time, end_time, is_recurring, recurrence_type,
    recurrence_end_date, request_status_id
)
VALUES (
    1, 1, 1, 4, 'Staff Meeting', 'No additional setup needed',
    8, '2026-10-21 08:00:00', '2026-10-21 09:30:00', false, null,
    null, 3
);

INSERT INTO events (
    org_id, venue_id, space_id, requesting_user_id, title, description,
    attendee_count, start_time, end_time, is_recurring, recurrence_type,
    recurrence_end_date, request_status_id
)
VALUES (
    1, 1, 5, 4, 'Spring Concert', 'Need 400 chairs set up in rows, no tables needed.',
    400, '2026-10-23 20:00:00', '2026-10-23 22:30:00', false, null,
    null, 3
)
RETURNING id \gset e_

INSERT INTO event_request_resources
    (request_id, resource_type_id, quantity)
VALUES
    (:e_id, 1, 400);