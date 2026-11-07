from fastapi import APIRouter, HTTPException
from database import get_db_connection
from pydantic import BaseModel

router = APIRouter()

# Get all spaces for a venue
@router.get("/spaces/{venue_id}")
def get_venue_spaces(venue_id: int):
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute("""
            SELECT id, name
            FROM SPACES
            WHERE venue_id = %s""", (venue_id,)
        )
        rows = cursor.fetchall()
        return [{"id": row[0], "name": row[1]} for row in rows]
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to get spaces."
        )
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# Delete a space
@router.delete("/spaces")
def delete_space(space_id: int):
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute("DELETE FROM spaces WHERE id = %s", (space_id,))
        return {"message":"Space deleted"}
    except Exception:
        connection.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to add space."
        )
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()