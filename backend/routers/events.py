from fastapi import APIRouter, HTTPException
from database import get_db_connection
from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import Optional
from constants import *
from sse_manager import send_to_org, send_to_user
import traceback

router = APIRouter()

# Query used to get an org's approved events whose end date or
# recurrence end date are >= either current month or current date.
# Added onto by different endpoints depending on the request
EVENTS_QUERY = """
    SELECT E.id, E.requesting_user_id, E.title, V.name, S.name, 
           E.start_time, E.end_time, E.description, E.is_recurring,
           E.recurrence_type, E.recurrence_end_date
    FROM events E
    JOIN venues V ON E.venue_id = V.id
    JOIN spaces S ON E.space_id = S.id
"""


####################
# HELPER FUNCTIONS ###################################################
####################

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

# Check if an event request's requested chair/table numbers exceed
# the limits of the requested space's max chair/table numbers
def check_resources(curs, req_id):
    curs.execute("""
        SELECT *
        FROM event_request_resources RR
        JOIN events E ON E.id = RR.request_id
        JOIN spaces S ON E.space_id = S.id
        WHERE RR.request_id = %s
        AND RR.quantity > CASE
            WHEN R.resource_type_id = %s THEN S.capacity
            WHEN R.resource_type_id = %s THEN S.table_max
            ELSE 0
        END
    """, (req_id, CHAIR, TABLE))
    rows = curs.fetchall()
    return rows

def send_notification(curs, user, n_type, n_content):
    curs.execute("""
        INSERT INTO notifications (user_id, type_id, content)
        VALUES (%s, %s, %s)
    """, (user, n_type, n_content))

def approve_event(curs, req_id):
    curs.execute(f"""
        UPDATE events
        SET request_status_id = %s,
            date_approved = CURRENT_TIMESTAMP,
            last_updated = CURRENT_TIMESTAMP
        WHERE id = %s
        RETURNING org_id, requesting_user_id, title
    """, (APPROVED, req_id))
    org_id, req_user_id, e_name = curs.fetchone()
    send_notification(
        curs,
        req_user_id,
        REQ_APPROVED,
        f"Your event request for {e_name} has been approved!"
    )

    return org_id, req_user_id

def deny_event(curs, req_id, d_reason):
    curs.execute(f"""
        UPDATE events
        SET request_status_id = %s,
            denied_reason = %s,
            denied_at = CURRENT_TIMESTAMP,
            last_updated = CURRENT_TIMESTAMP
        WHERE id = %s
        RETURNING org_id, requesting_user_id, title
    """, (DENIED, d_reason, req_id,))
    org_id, req_user_id, e_name = curs.fetchone()
    send_notification(
        curs,
        req_user_id,
        REQ_DENIED,
        f"Your event request for {e_name} has been denied. Reason: {d_reason}"
    )

    return org_id, req_user_id

def cancel_event(curs, event_id):
    curs.execute("""
        UPDATE events E
        SET request_status_id = %s
        WHERE E.id = %s
        RETURNING E.org_id, E.title
    """, (CANCELLED, event_id))

    result = curs.fetchone()

    if not result:
        raise ValueError("Event not found.")

    org_id, e_name = result

    curs.execute("""
        SELECT id
        FROM users
        WHERE org_id = %s
        AND account_type_id = %s
    """, (org_id, ADMIN))

    admin = curs.fetchone()

    if not admin:
        raise ValueError("Organization admin not found.")

    admin_id = admin[0]

    send_notification(
        curs,
        admin_id,
        EVENT_CANCELLED,
        f"{e_name} has been cancelled."
    )

    return org_id, admin_id

#############
# ENDPOINTS #######################################################
#############


# Manually approve event
@router.patch("/events/approve/{req_id}")
async def manual_approve(req_id: int):
    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        org_id, user_id = approve_event(cursor, req_id)
        connection.commit()
        await send_to_org(org_id, {"resource":"events"})
        return {"message":"Event request approved."}
    except Exception:
        connection.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to approve event."
        )
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# Cancel a pending/approved event
@router.patch("/events/cancel/{req_id}")
async def manual_cancel(req_id: int):
    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        org_id, admin_id = cancel_event(cursor, req_id)
        connection.commit()
        await send_to_org(org_id, {"resource":"events"})
        await send_to_user(org_id, admin_id, {"resource":"notifications"})
        return {"message":"Event cancelled."}
    except Exception:
        traceback.print_exc()
        connection.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to cancel event."
        )
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# Manually deny event
class DenialReason(BaseModel):
    reason: str = Field(min_length=1, max_length=1000)

@router.patch("/events/deny/{req_id}")
async def manual_deny(req_id: int, data: DenialReason):
    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        org_id, user_id = deny_event(cursor, req_id, data.reason)
        connection.commit()
        await send_to_user(org_id, user_id, {"resource":"notifications"})
        return {"message":"Event request denied."}
    except Exception:
        connection.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to deny event."
        )
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# Auto-approve/deny event request
@router.patch("/events/process/auto/{req_id}")
async def auto_process_event_request(req_id: int):
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
            org_id, user_id = deny_event(cursor, req_id, denied_reason)
            output = {"message":f"{denied_reason}"}
            connection.commit()
            await send_to_user(org_id, user_id, {"resource":"notifications"})
        else:
            org_id, user_id = approve_event(cursor, req_id)
            connection.commit()
            await send_to_org(org_id, {"resource":"events"})

    except Exception:
        connection.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to process event."
        )
    finally:
        if cursor:
            cursor.close()
        if connection:
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
    admin_id: int
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
async def create_event_request(data: EventData):
    query = """
        INSERT INTO events
            (
                org_id, venue_id, space_id, requesting_user_id, title, description,
                attendee_count, start_time, end_time, is_recurring, recurrence_type,
                recurrence_end_date, request_status_id
            )
        VALUES
            (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id, title
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

        req = cursor.fetchone()

        # Insert row(s) into event resources table
        resources = data.resources.model_dump()
        for resource_type_id, quantity in enumerate(
            resources.values(), start=1
        ):
            if quantity > 0:
                cursor.execute("""
                    INSERT INTO event_request_resources
                        (request_id, resource_type_id, quantity)
                    VALUES (%s, %s, %s)
                """, (req[0], resource_type_id, quantity))  
        
        connection.commit()
        await send_to_user(data.org_id, data.admin_id, {"resource":"event_requests"})
        return {"message": "Event request created"}
    except Exception:
        connection.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to create event request."
        )
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


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
        raise HTTPException(
            status_code=500,
            detail="Unable to get pending events."
        )
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# Get all pending and approved events in the current month or
# recurring through or past the current month
@router.get("/events/approved/{org_id}/{month}/{year}")
def get_events(org_id: int, month: int, year: int):
    connection = get_db_connection()
    cursor = connection.cursor()
    event_date = datetime(year, month, 1)
    try:
        cursor.execute(f"""
            {EVENTS_QUERY}
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
        raise HTTPException(
            status_code=500,
            detail="Unable to get events."
        )
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# Get all approved events requested by a particular user whose
# end date or recurrence end date is >= current date
@router.get("/events/user/{user_id}")
def get_user_req_events(user_id):
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        cursor.execute(f"""
            {EVENTS_QUERY}
            WHERE E.request_status_id = %s AND 
            E.requesting_user_id = %s AND ((
                E.is_recurring = FALSE AND
                E.end_time >= NOW()
            ) OR (
                E.is_recurring = TRUE AND
                E.recurrence_end_date >= CURRENT_DATE
            ))
        """, (APPROVED, user_id))
        rows = cursor.fetchall()
        return rows
    except Exception:
        traceback.print_exc()
        connection.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to get events."
        )
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()