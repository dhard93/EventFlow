from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone
from database import get_db_connection
from pydantic import BaseModel
from sse_manager import send_to_user
from security import hash_session_token
from util import *
import traceback

router = APIRouter()

# Get messages in a conversation
@router.get("/messages/{conv_id}")
def get_messages(conv_id: int, request: Request):
    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        current_user_id = get_session_user_id(request)

        cursor.execute("""
            SELECT user1_id, user2_id
            FROM conversations
            WHERE id = %s AND
            %s in (user1_id, user2_id)
        """, (conv_id, current_user_id))

        conversation = cursor.fetchone()

        if not conversation:
            raise HTTPException(
                status_code=404,
                detail="Conversation not found."
            )

        cursor.execute("""
            SELECT M.sender_id,
                   M.message,
                   M.date_created,
                   U.f_name || ' ' || U.l_name AS sender_name,
                   M.id
            FROM messages M
            JOIN users U ON M.sender_id = U.id
            WHERE M.conversation_id = %s
            ORDER BY M.date_created DESC, M.id DESC
        """, (conv_id,))

        rows = cursor.fetchall()
        return rows

    except HTTPException:
        raise
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
    org_id: int
    conv_id: int
    sender_id: int
    message: str

@router.post("/messages")
async def send_message(data: MessageData, request: Request):

    if not data.message.strip():
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty."
        )

    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        current_user_id = get_session_user_id(request)

        if current_user_id != data.sender_id:
            raise HTTPException(
                status_code=403,
                detail="Invalid sender."
            )

        cursor.execute("""
            SELECT user1_id, user2_id
            FROM conversations
            WHERE id = %s
        """, (data.conv_id,))

        conversation = cursor.fetchone()

        if not conversation:
            raise HTTPException(
                status_code=404,
                detail="Conversation not found."
            )

        user1_id, user2_id = conversation

        if current_user_id not in (user1_id, user2_id):
            raise HTTPException(
                status_code=403,
                detail="Not a conversation participant."
            )

        receiver_id = (
            user2_id if current_user_id == user1_id else user1_id
        )

        cursor.execute("""
            INSERT INTO messages (conversation_id, sender_id, message)
            VALUES (%s, %s, %s)
        """, (data.conv_id, current_user_id, data.message.strip()))

        cursor.execute("""
            UPDATE conversations
            SET last_updated = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (data.conv_id,))
        connection.commit()
    except HTTPException:
        connection.rollback()
        raise
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
    try:
        await send_to_user(
            data.org_id,
            receiver_id,
            {
                "resource": "messages",
                "conversation_id": data.conv_id
            }
        )
    except Exception:
        traceback.print_exc()
    return {"message": "Message sent."}


# Mark unread messages as read
@router.patch("/messages/unread/{conv_id}")
def mark_unread_messages(conv_id: int, request: Request):

    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        current_user_id = get_session_user_id(request)
        cursor.execute("""
            SELECT 1
            FROM conversations
            WHERE id = %s
            AND %s IN (user1_id, user2_id)
        """, (conv_id, current_user_id))

        if not cursor.fetchone():
            raise HTTPException(
                status_code=403,
                detail="You are not a participant in this conversation."
            )

        # Mark incoming messages as read.
        cursor.execute("""
            UPDATE messages
            SET has_read = TRUE
            WHERE conversation_id = %s
            AND has_read = FALSE
            AND sender_id <> %s
        """, (conv_id, current_user_id))

        updated_count = cursor.rowcount
        connection.commit()
        return {
            "message": "Messages marked as read.",
            "updated_count": updated_count
        }
    except HTTPException:
        connection.rollback()
        raise
    except Exception:
        connection.rollback()
        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail="Unable to mark messages as read."
        )
    finally:
        cursor.close()
        connection.close()