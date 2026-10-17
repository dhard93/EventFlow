from fastapi import APIRouter, Body
from database import get_db_connection

router = APIRouter()

# Get all venes for an organization
@router.get("/venues")
def get_org_venues(org_id: int):
    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute(
        """
        SELECT name, address, city, state, zip, is_active
        FROM VENUES
        WHERE org_id = %s""", (org_id,))
    rows = cursor.fetchall()
    cursor.close
    connection.close()
    return rows

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
    cursor.close
    connection.close()
    return rows

# Add a venue to an organization
@router.post("/venues")
def add_venue(data: dict = Body(...)):
    query = """
        INSERT INTO VENUES (org_id, name, address, city, state, zip)
        VALUES (%s, %s, %s, %s, %s, %s)
    """
    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute(
        query,
        (
            data["org_id"],
            data["name"],
            data["address"],
            data["city"],
            data["state"],
            data["zip"]
        )
    )
    connection.commit()
    cursor.close
    connection.close()
    return {"message": "Venue added successfully."}

# Delete a venue for an organization
@router.delete("/venues")
def delete_venue(venue_id: int):
    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute("DELETE FROM venues WHERE id = %s", (venue_id,))
    connection.commit()
    cursor.close
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
    cursor.close
    connection.close()
    return {"message": "Venue status updated."}