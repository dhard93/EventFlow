from fastapi import APIRouter, HTTPException
from database import get_db_connection
from pydantic import BaseModel
import traceback

router = APIRouter()

# Get messages in a conversation
@router.get("/messages/{conv_id}")
def get_messages(conv_id: int):
    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("""
            SELECT M.sender_id, M.message, M.date_created,
                   U.f_name || ' ' || U.l_name AS other_user_name
            FROM messages M
            JOIN users U ON M.sender_id = U.id
            WHERE conversation_id = %s
            ORDER BY date_created DESC
        """, (conv_id,))
        rows = cursor.fetchall()
        return rows
    except Exception:
        connection.rollback()
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail="Unable to get messages."
        )
    finally:
        cursor.close()
        connection.close()


# Send a message in an existing conversation
class MessageData(BaseModel):
    conv_id: int
    sender_id: int
    message: str

@router.post("/messages")
def send_message(data: MessageData):
    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("""
            INSERT INTO messages (conversation_id, sender_id, message)
            VALUES (%s, %s, %s)
        """, (data.conv_id, data.sender_id, data.message))
        connection.commit()
        return {"message": "Message sent."}

    except Exception:
            connection.rollback()
            traceback.print_exc()
            raise HTTPException(
                status_code=500,
                detail="Unable to send message."
            )
    finally:
        cursor.close()
        connection.close()

# Mark unread messages as read
@router.patch("/messages/unread/{conv_id}/{user_id}")
def mark_unread_messages(conv_id: int, user_id: int):
    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("""
            UPDATE messages
            SET has_read = TRUE
            WHERE conversation_id = %s AND
            has_read = FALSE AND
            sender_id <> %s
        """, (conv_id, user_id))
        connection.commit()
        return {"message":"message(s) read"}
    except Exception:
        connection.rollback()
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail="Unable to mark message as read."
        )
    finally:
        cursor.close()
        connection.close()