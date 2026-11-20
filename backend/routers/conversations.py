from fastapi import APIRouter, HTTPException, Request
from database import get_db_connection
from pydantic import BaseModel
from sse_manager import send_to_user
import traceback

router = APIRouter()

# Get all conversations for a particular user ordered in descending order of recent activity
@router.get("/conversations")
def get_user_conversations(request: Request):
    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        current_user_id = get_session_user_id(request)

        cursor.execute("""
            SELECT C.id, C.user1_id, C.user2_id,
                   U.f_name || ' ' || U.l_name AS other_user_name,
                   EXISTS (
                        SELECT 1
                        FROM messages M
                        WHERE M.conversation_id = C.id AND
                        M.has_read = FALSE AND
                        M.sender_id <> %s
                    ) AS has_unread_message
            FROM conversations C
            JOIN users U
                ON U.id = CASE
                    WHEN C.user1_id = %s THEN C.user2_id
                    ELSE C.user1_id
                END
            WHERE %s IN (C.user1_id, C.user2_id)
            ORDER BY C.last_updated DESC
        """, (current_user_id, current_user_id, current_user_id))
        rows = cursor.fetchall()
        return [
            {
                "conversation_id": row[0],
                "user1_id": row[1],
                "user2_id": row[2],
                "other_user_name": row[3],
                "has_unread_message": row[4]
            }
            for row in rows
        ]
    except HTTPException:
        raise
    except Exception:
        connection.rollback()
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail="Unable to get conversations."
        )
    finally:
        cursor.close()
        connection.close()


# Create a new conversation between the current user and another user

class ConversationData(BaseModel):
    org_id: int
    user1_id: int
    user2_id: int
    msg_content: str


@router.post("/conversations")
async def create_user_conversation(data: ConversationData, request: Request):

    if not data.msg_content.strip():
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty."
        )

    if data.user1_id != get_session_user_id(request):
        raise HTTPException(
            status_code=401,
            detail='Sending user failed validation.'
        )
    elif data.user1_id == data.user2_id:
        raise HTTPException(
            status_code=400,
            detail="Cannot create a conversation with yourself."
        )

    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        # Create conversation.
        cursor.execute("""
            INSERT INTO conversations (
                user1_id,
                user2_id,
                last_updated
            )
            VALUES (%s, %s, CURRENT_TIMESTAMP)
            RETURNING id
        """, (
            data.user1_id,
            data.user2_id
        ))
        conversation_id = cursor.fetchone()[0]

        # Insert first message.
        cursor.execute("""
            INSERT INTO messages (
                conversation_id,
                sender_id,
                message
            )
            VALUES (%s, %s, %s)
        """, (
            conversation_id,
            data.user1_id,
            data.msg_content.strip()
        ))
        connection.commit()

    except Exception:
        connection.rollback()
        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail="Unable to create conversation."
        )
    finally:
        cursor.close()
        connection.close()

    # Notify recipient.
    try:
        await send_to_user(
            data.org_id,
            data.user2_id,
            {
                "resource": "conversations",
                "conversation_id": conversation_id
            }
        )
    except Exception:
        traceback.print_exc()
    return {
        "message": "Conversation created.",
        "conversation_id": conversation_id
    }