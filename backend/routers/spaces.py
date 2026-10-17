from fastapi import APIRouter, Body
from database import get_db_connection

router = APIRouter()

# Get all spaces for a venue
@router.get("/spaces")
def get_venue_spaces(venue_id: int):
    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute(
        """
        SELECT * FROM SPACES WHERE venue_id = %s""", (venue_id,)
    )
    rows = cursor.fetchall()
    cursor.close
    connection.close()
    return rows

# Add a space to a venue
@router.post("/spaces")
def add_space(data: dict = Body(...)):
    query = """
        INSERT INTO SPACES
            (venue_id, name, floor, capacity, table_max)
        VALUES
            (%s, %s, %s, %s, %s)
    """
    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute(
        query,
        (
            data["venue_id"],
            data["name"],
            data["floor"],
            data["capacity"],
            data["table_max"]
        )
    )
    connection.commit()
    cursor.close
    connection.close()
    return {"message": "Space added successfully."}

# Delete a space
@router.delete("/spaces")
def delete_space(space_id: int):
    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute("DELETE FROM venues WHERE id = %s", (space_id,))
    connection.commit()
    cursor.close
    connection.close()
    return {"message": "Space deleted"}

# Toggle space bookability
@router.patch("/spaces/bookable")
def toggle_venue_active_status(space_id: int):
    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute("""
        UPDATE spaces
        SET is_bookable = NOT is_bookable
        WHERE id = %s
    """, (space_id,))
    connection.commit()
    cursor.close
    connection.close()
    return {"message": "Space bookability updated."}

# Toggle space in_use status
@router.patch("/spaces/in_use")
def toggle_venue_active_status(space_id: int):
    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute("""
        UPDATE spaces
        SET is_in_use = NOT is_in_use
        WHERE id = %s
    """, (space_id,))
    connection.commit()
    cursor.close
    connection.close()
    return {"message": "Space in_use status updated."}\


# Show all spaces that are available in particular time range and date