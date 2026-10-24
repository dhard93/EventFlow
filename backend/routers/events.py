from fastapi import APIRouter, Body
from database import get_db_connection
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import json

# Constants
APPROVED = 1
DENIED = 2
PENDING = 3
CANCELLED = 4
CHAIR = 1
TABLE = 2

router = APIRouter()

# Check if an event request's data and time is vacant for the requested space.
def check_event_time(curs, req_id):
    curs.execute("""
        SELECT RE.space_id, RE.start_time, RE.end_time
        FROM events RE
        JOIN events E
        ON E.id = %s
        WHERE E.space_id = RE.space_id AND E.request_status_id = %s
        AND E.start_time < RE.end_time AND E.end_time > RE.start_time
    """, (req_id, APPROVED,))
    rows = curs.fetchall()
    return rows

# Check if event request attendee count meets requested space capacity constraints and is bookable.
def check_capacity(curs, req_id):
    curs.execute("""
        SELECT E.attendee_count, S.capacity
        FROM events E
        JOIN spaces S ON E.space_id = S.id
        WHERE E.id = %s
        AND E.attendee_count <= S.capacity AND S.is_bookable
    """, (req_id,))
    row = curs.fetchone()
    return row

def check_resources(curs, req_id):
    curs.execute("""
        SELECT *
        FROM event_request_resources RR
        JOIN events E ON E.id = RR.request_id
        JOIN spaces S ON E.space_id = S.id
        JOIN resource_inventory R
        ON RR.resource_type_id = R.resource_type_id
        WHERE RR.request_id = %s
        AND RR.quantity > R.available_quantity
        AND RR.quantity > CASE
            WHEN R.resource_type_id = %s THEN S.capacity
            WHEN R.resource_type_id = %s THEN S.table_max
            ELSE 0
        END
    """, (req_id, CHAIR, TABLE))
    rows = curs.fetchall()
    return rows

def approve_event(curs, req_id):
    curs.execute("""
        UPDATE events
        SET request_status_id = %s,
            date_approved = CURRENT_TIMESTAMP,
            last_updated = CURRENT_TIMESTAMP
        WHERE id = %s
    """, (APPROVED, req_id))

def deny_event(curs, req_id, d_reason):
    curs.execute("""
        UPDATE events
        SET request_status_id = %s,
        denied_reason = %s,
        denied_at = CURRENT_TIMESTAMP,
        last_updated = CURRENT_TIMESTAMP
        WHERE id = %s
    """, (DENIED, d_reason, req_id,))

# Update inventory after approving event request.
# Check event space's chair and table counts and compare these to the
# requested amounts. If more are requested than are in there, then
# subtract the remainder from inventory and set the updated chair/table counts.
def check_inventory_remainder(curs, req_id):
    curs.execute("""
        SELECT R.quantity - CASE
            WHEN R.resource_type_id = %s THEN S.chair_count
            WHEN R.resource_type_id = %s THEN S.table_count
        END as Remainder
        FROM event_request_resources R
        JOIN events E ON E.id = R.request_id
        JOIN spaces S ON E.space_id = S.id
        WHERE E.id = %s
    """, (CHAIR, TABLE, req_id))

    chair_diff = None
    table_diff = None
    rows = curs.fetchall()
    for row in rows:
        if row[0] == CHAIR:
            chair_diff = row[1]
        elif row[0] == TABLE:
            table_diff = row[1]

    return chair_diff, table_diff

def update_inventory(curs, chair_diff, table_diff):
    curs.execute("""
        UPDATE spaces AS S
        SET chair_count = CASE
            WHEN %s > 0 THEN chair_count - %s ELSE chair_count
        END,
        table_count = CASE
            WHEN %s > 0 THEN table_count - %s ELSE table_count
        END
        FROM events E
        WHERE E.space_id = S.id
    """, (chair_diff, chair_diff, table_diff, table_diff))


# Manually approve/deny/cancel event
@router.patch("/events/process/{status}/{req_id}")
def manual_process_event_request(status: int, req_id: int):
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        cursor.execute( """
            UPDATE events
            SET request_status_id = %s
            WHERE id = %s
        """, (status, req_id))
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    cursor.close()
    connection.close()


# Auto-approve/deny event request
@router.patch("/events/process/auto/{req_id}")
def auto_process_event_request(req_id: int):
    connection = get_db_connection()
    cursor = connection.cursor()
    output = {"message": "Event request approved."}
    denied_reason = None
    try:
        if check_event_time(cursor, req_id):
            denied_reason = "The requested space is unavailable at the requested time."
        elif not check_capacity(cursor, req_id):
            denied_reason = "The requested attendee count exceeds the requested space's capacity."
        elif check_resources(cursor, req_id):
            denied_reason = "The requested resources exceed our available inventory."

        if denied_reason:
            deny_event(cursor, req_id, denied_reason)
            output = {"message":f"{denied_reason}"}
        else:
            approve_event(cursor, req_id)
            chair_rem, table_rem = check_inventory_remainder(cursor, req_id)
            update_inventory(cursor, chair_rem, table_rem)
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    cursor.close()
    connection.close()
    return output


# Create new event request
class Resources(BaseModel):
    Chairs: int = 0
    Tables: int = 0
    Microphones: int = 0
    Podiums: int = 0
    TVs: int = 0

class EventData(BaseModel):
    org_id: int
    venue_id: int
    space_id: int
    requesting_user_id: int
    title: str
    description: Optional[str] = None
    attendee_count: int
    start_time: datetime
    end_time: datetime
    is_recurring: bool
    recurrence_type: Optional[str] = None
    recurrence_end_date: Optional[datetime] = None
    resources: Resources = Resources()

@router.post("/events")
def create_event_request(data: EventData):
    query = """
        INSERT INTO events
            (
                org_id, venue_id, space_id, requesting_user_id, title, description,
                attendee_count, start_time, end_time, is_recurring, recurrence_type,
                recurrence_end_date, request_status_id
            )
        VALUES
            (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """
    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        # Add row to events table
        cursor.execute(
            query,
            (
                data.org_id,
                data.venue_id,
                data.space_id,
                data.requesting_user_id,
                data.title,
                data.description,
                data.attendee_count,
                data.start_time,
                data.end_time,
                data.is_recurring,
                data.recurrence_type,
                data.recurrence_end_date,
                PENDING
            )
        )

        req_id = cursor.fetchone()[0]
        resources = data.resources.model_dump()

        for resource_type_id, (resource_name, quantity) in enumerate(
            resources.items(), start=1):
            if quantity > 0:
                cursor.execute("""
                    INSERT INTO event_request_resources
                        (request_id, resource_type_id, quantity)
                    VALUES (%s, %s, %s)
                """, (req_id, resource_type_id, quantity))
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    cursor.close()
    connection.close()
    return {"message": "Event request created"}


# Get all pending events for an organization
@router.get("/events/pending/{org_id}")
def get_pending_requests(org_id: int):
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        cursor.execute("""
            SELECT E.id, E.title, V.name, S.name, E.start_time, E.end_time, E.description, E.is_recurring, E.recurrence_type, E.recurrence_end_date, U.f_name, U.l_name
            FROM events E
            JOIN venues V ON E.venue_id = V.id
            JOIN spaces S ON E.space_id = S.id
            JOIN users U ON E.requesting_user_id = U.id
            WHERE E.org_id = %s
            AND request_status_id = %s
            ORDER BY E.start_time ASC
        """, (org_id, PENDING))
        rows = cursor.fetchall()
        return rows
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()


# Get all approved events in the current month
@router.get("/events/approved/{org_id}/{month}/{year}")
def get_events(org_id: int, month: int, year: int):
    connection = get_db_connection()
    cursor = connection.cursor()
    event_date = datetime(year, month, 1)
    try:
        cursor.execute("""
            SELECT E.title, V.name, S.name, E.start_time, E.end_time, E.description, E.is_recurring, E.recurrence_type, E.recurrence_end_date
            FROM events E
            JOIN venues V ON E.venue_id = V.id
            JOIN spaces S ON E.space_id = S.id
            WHERE E.org_id = %s AND
            E.request_status_id = %s AND ((
                EXTRACT(MONTH FROM E.start_time) = %s AND
                EXTRACT(YEAR FROM E.start_time) = %s
            ) OR (
                E.is_recurring = %s AND
                DATE_TRUNC('month', E.start_time) <= %s AND
                DATE_TRUNC('month', E.recurrence_end_date) >= %s
            ))
        """, (org_id, APPROVED, month, year, True, event_date, event_date))
        rows = cursor.fetchall()
        return rows
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()

# Get all approved events requested by a specific user
@router.get("/events/user/{user_id}")
def get_pending_requests(user_id: int):
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        cursor.execute("""
            SELECT E.id, E.title, V.name, S.name, E.start_time, E.end_time, E.date_approved
            FROM events E
            JOIN venues V ON E.venue_id = V.id
            JOIN spaces S ON E.space_id = S.id
            WHERE E.requesting_user_id = %s
            AND E.request_status_id = %s
        """, (user_id, APPROVED))
        rows = cursor.fetchall()
        return rows
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()