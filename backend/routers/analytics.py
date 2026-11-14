from fastapi import APIRouter, HTTPException
from database import get_db_connection
from constants import *
import traceback

router = APIRouter()

# Used to toggle correct WHERE clause for the time range passed into endpoints
# using this function
def time_range_where_clause():
    return """
    WHERE
        %s = 4
        OR E.date_created >= CASE %s
            WHEN 1 THEN DATE_TRUNC('week', NOW())
            WHEN 2 THEN DATE_TRUNC('month', NOW())
            WHEN 3 THEN DATE_TRUNC('year', NOW())
        END
    """


# Get number of all requested events in a given time range for an org
@router.get("/events/all/{time_range}/{org_id}")
def get_all_events_in_range(time_range: int, org_id: int):
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        cursor.execute(f"""
            SELECT COUNT(*)
            FROM events E
            {time_range_where_clause()} AND
            E.org_id = %s
        """, (time_range, time_range, org_id))
        row = cursor.fetchone()
        return row[0]
    except Exception:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail="Unable to get events."
        )
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

        
# Get number of approved/denied/cancelled/pending events for an org in a given time range
@router.get("/events/event_stats/{time_range}/{org_id}")
def get_approval_rate(time_range: int, org_id: int):
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        cursor.execute(f"""
            SELECT
                COUNT(*) AS total_requests,
                COUNT(*) FILTER (WHERE E.request_status_id = %s) AS approved,
                COUNT(*) FILTER (WHERE E.request_status_id = %s) AS denied,
                COUNT(*) FILTER (WHERE E.request_status_id = %s) AS cancelled,
                COUNT(*) FILTER (WHERE E.request_status_id = %s) AS pending
            FROM events E
            {time_range_where_clause()}
            AND E.org_id = %s
        """, (APPROVED, DENIED, CANCELLED, PENDING, time_range, time_range, org_id))

        row = cursor.fetchone()

        total, approved, denied, cancelled, pending = row
        approval_rate = approved / total * 100 if total else 0
        denial_rate = denied / total * 100 if total else 0
        return {
            "totalRequests": total,
            "approved": approved,
            "denied": denied,
            "cancelled": cancelled,
            "pending": pending,
            "approvalRate": approval_rate,
            "denialRate": denial_rate
        }
    except Exception:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail="Unable to get events."
        )
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# Get average event length for approved events in a time range for an org
@router.get("/events/avg_length/{time_range}/{org_id}")
def get_avg_event_len(time_range: int, org_id: int):
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        cursor.execute(f"""
            SELECT
                AVG(EXTRACT(EPOCH FROM (E.end_time - E.start_time)) / 3600.0)
            FROM events E
            {time_range_where_clause()} AND
            E.org_id = %s AND
            E.request_status_id = %s
        """, (time_range, time_range, org_id, APPROVED))
        row = cursor.fetchone()
        return row[0] or 0
    except Exception:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail="Unable to get events."
        )
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# Rank an org's venues by number of event requests received in a time range
@router.get("/venues/ranked/{time_range}/{org_id}")
def get_venues_ranked(time_range: int, org_id: int):
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        cursor.execute(f"""
            SELECT V.name, Count(E.id) as request_count
            FROM events E
            JOIN venues V ON E.venue_id = V.id
            {time_range_where_clause()} AND
            E.org_id = %s
            GROUP BY V.id, V.name
            ORDER BY request_count DESC;
        """, (time_range, time_range, org_id))
        rows = cursor.fetchall()

        return [
            {"name": row[0], "count": row[1]}
            for row in rows
        ]
    except Exception:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail="Unable to get venues."
        )
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# Rank an org's users by number of requested events reveived in a time frame
@router.get("/users/ranked/{time_range}/{org_id}")
def get_users_ranked(time_range: int, org_id: int):
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        cursor.execute(f"""
            SELECT U.f_name || ' ' || U.l_name AS name, Count(E.id) as request_count
            FROM events E
            JOIN users U ON E.requesting_user_id = U.id
            {time_range_where_clause()} AND
            E.org_id = %s
            GROUP BY U.id, U.f_name, U.l_name
            ORDER BY request_count DESC;
        """, (time_range, time_range, org_id))
        rows = cursor.fetchall()

        return [
            {"name": row[0], "count": row[1]}
            for row in rows
        ]
    except Exception:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail="Unable to get users."
        )
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# Ranke an org's spaces by number of events requested in a given time range.
@router.get("/spaces/ranked/{time_range}/{org_id}")
def get_spaces_ranked(time_range: int, org_id: int):
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        cursor.execute(f"""
            SELECT S.name, V.name, Count(E.id) as request_count
            FROM events E
            JOIN venues V on E.venue_id = V.id
            JOIN spaces S on E.space_id = S.id
            {time_range_where_clause()} AND
            E.org_id = %s
            GROUP BY S.id, S.name, V.id, V.name
            ORDER BY request_count DESC;
        """, (time_range, time_range, org_id))
        rows = cursor.fetchall()

        return [
            {
                "name": row[0],
                "venue": row[1],
                "count": row[2]
            }
            for row in rows
        ]
    except Exception:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail="Unable to get spaces."
        )
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()