
import asyncio
import json

from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse
from database import get_db_connection
from sse_manager import connect, disconnect
from security import hash_session_token

router = APIRouter()


@router.get("/events/stream/{organization_id}")
async def event_stream(organization_id: int, request: Request):

    token = request.cookies.get("eventflow_session")

    if not token:
        raise HTTPException(status_code=401, detail="Not logged in")

    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("""
            SELECT U.id, U.org_id
            FROM users U
            JOIN user_sessions S ON U.id = S.user_id
            WHERE S.session_token_hash = %s
            AND S.expires_at > %s
        """, (
            hash_session_token(token),
            datetime.now(timezone.utc)
        ))

        session = cursor.fetchone()

        if not session:
            raise HTTPException(
                status_code=401,
                detail="Session invalid or expired"
            )

        if session[1] != organization_id:
            raise HTTPException(
                status_code=403,
                detail="Unauthorized organization"
            )

        user_id = session[0]

    finally:
        cursor.close()
        connection.close()

    queue = await connect(organization_id, user_id)

    async def event_generator():
        try:
            while True:
                if await request.is_disconnected():
                    break

                try:
                    event = await asyncio.wait_for(
                        queue.get(),
                        timeout=20
                    )

                    yield f"data: {json.dumps(event)}\n\n"

                except asyncio.TimeoutError:
                    yield ": keep-alive\n\n"

        finally:
            disconnect(organization_id, user_id, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )
