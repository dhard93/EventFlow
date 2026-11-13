from fastapi import APIRouter, HTTPException
from database import get_db_connection
from pydantic import BaseModel
from sse_manager import send_to_user
import traceback

router = APIRouter()

# Get all conversations for a particular user ordered in descending order of recent activity
@router.get("/conversations/{user_id}")
def get_user_conversations(user_id: int):
    connection = get_db_connection()
    cursor = connection.cursor()

    try:
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
        """, (user_id, user_id, user_id))
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
async def create_user__conversation(data: ConversationData):
    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("""
            INSERT INTO conversations (user1_id, user2_id)
            VALUES (%s, %s)
            RETURNING id
        """, (data.user1_id, data.user2_id))

        c_id = cursor.fetchone()[0]

        cursor.execute("""
            INSERT INTO messages (conversation_id, sender_id, message)
            VALUES (%s, %s, %s)
        """, (c_id, data.user1_id, data.msg_content))

        connection.commit()
        await send_to_user(data.org_id, data.user2_id, {"resource":"conversations"})
        return {
            "message": "Conversation created.",
            "conversation_id": c_id
        }

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