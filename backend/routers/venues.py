from fastapi import APIRouter, HTTPException
from database import get_db_connection
from pydantic import BaseModel
import traceback

router = APIRouter()

# Get all venes for an organization
@router.get("/venues/{org_id}")
def get_org_venues(org_id: int):
    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute("""
        SELECT id, name
        FROM VENUES
        WHERE org_id = %s""", (org_id,))
    rows = cursor.fetchall()
    cursor.close()
    connection.close()
    return [{"id": row[0], "name": row[1]} for row in rows]

# Get all active venues for an organization
@router.get("/venues/active")
def get_active_org_venues(org_id: int):
    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute(
        """
        SELECT name, address, city, state, zip
        FROM VENUES
        WHERE org_id = %s AND is_active""", (org_id,)
    )
    rows = cursor.fetchall()
    cursor.close()
    connection.close()
    return rows

# Add a venue to an organization
class SpaceData(BaseModel):
    name: str
    floor: int
    capacity: int
    chair_count: int
    table_count: int
    table_max: int

class VenueData(BaseModel):
    org_id: int
    name: str
    address: str
    city: str
    state: str
    zip: str
    spaces: list[SpaceData]
    

@router.post("/venues")
def add_venue(data: VenueData):
    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("""
            INSERT INTO VENUES (org_id, name, address, city, state, zip)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
                data.org_id,
                data.name,
                data.address,
                data.city,
                data.state,
                data.zip
            )
        )

        venue_id = cursor.fetchone()[0]

        for s in data.spaces:
            cursor.execute("""
                INSERT INTO SPACES
                    (venue_id, name, floor, capacity, chair_count, table_count, table_max)
                VALUES
                    (%s, %s, %s, %s, %s, %s, %s)
            """, (
                venue_id,
                s.name,
                s.floor,
                s.capacity,
                s.chair_count,
                s.table_count,
                s.table_max
            ))

        connection.commit()
        return {"message": "Venue added successfully."}

    except Exception:
            connection.rollback()
            traceback.print_exc()
            raise HTTPException(
                status_code=500,
                detail="Unable to create venue."
            )
    finally:
        cursor.close()
        connection.close()

# Delete a venue for an organization
@router.delete("/venues")
def delete_venue(venue_id: int):
    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute("DELETE FROM venues WHERE id = %s", (venue_id,))
    connection.commit()
    cursor.close()
    connection.close()
    return {"message": "Venue deleted"}

# Toggle a venue's active status
@router.patch("/venues/active")
def toggle_venue_active_status(venue_id: int):
    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute("""
        UPDATE venues
        SET is_active = NOT is_active
        WHERE id = %s
    """, (venue_id,))
    connection.commit()
    cursor.close()
    connection.close()
    return {"message": "Venue status updated."}