from fastapi import APIRouter, Body
from database import get_db_connection
from pydantic import BaseModel, Field
from typing import Any
from constants import *

router = APIRouter()

# Add a notification for a user
class NotificationData(BaseModel):
    user_id: int
    type_id: int
    content: str

@router.post("/notifications")
def add_notification(data: NotificationData):
    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("""
            INSERT INTO notifications
                (user_id, type_id, content)
            VALUES
                (%s, %s, %s)
        """, (data.user_id, data.type_id, data.content))
        connection.commit()
        return {"message": "Notification received."}
    except Exception:
        connection.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to create notification."
        )
    finally:
        cursor.close()
        connection.close()


# Get all unread notifications for a user
@router.get("/notifications/unread/{user_id}")
def get_unread_notifications(user_id: int):
    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("""
            SELECT id, type_id, content
            FROM notifications
            WHERE user_id = %s
            AND has_read = %s
            ORDER BY date_created DESC
        """, (user_id, False))
        rows = cursor.fetchall()
        return rows
    except Exception:
        connection.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to mark notification as read."
        )
    finally:
        cursor.close()
        connection.close()


# Mark a notification as read
# TODO: implement this in dashboard
@router.patch("/notifications/read/{n_id}")
def mark_notification(n_id: int):
    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("""
            UPDATE notifications
            SET has_read = %s
            WHERE id = %s
        """, (True, n_id))
        connection.commit()
        return {"message":"Notification read"}
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()