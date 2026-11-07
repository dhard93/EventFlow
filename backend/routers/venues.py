from fastapi import APIRouter, HTTPException
from database import get_db_connection
from pydantic import BaseModel
from psycopg2.extras import execute_values, RealDictCursor
from util import *
import traceback

router = APIRouter()

# Modify venue data
class SpaceData(BaseModel):
    id: int | None = None
    name: str | None = None
    floor: int | None = None
    capacity: int | None = None
    chair_count: int | None = None
    table_count: int | None = None
    table_max: int | None = None

def process_venue_spaces(op, curs, v_id, spaces):
    match op:
        case 0:
            query = """
                INSERT INTO spaces
                    (venue_id, name, floor, capacity, chair_count,
                     table_count, table_max)
                VALUES %s
            """
            values = [(
                    v_id,
                    s.name,
                    s.floor,
                    s.capacity,
                    s.chair_count,
                    s.table_count,
                    s.table_max
                ) for s in spaces]
            execute_values(curs, query, values)
        case 1:
            for s in spaces:
                update_table(
                    curs, SPACES, SpaceData, s,
                    "venue_id = %s AND id = %s",
                    (v_id, s.id))
        case 2:
            query = """
                DELETE FROM spaces
                WHERE venue_id = %s AND
                id = %s
            """
            values = [(v_id, s.id) for s in spaces]
            curs.executemany(query, values)


# Get all data for a single venue and all of its spaces
@router.get("/venues/{venue_id}")
def get_venue_data(venue_id: int):
    connection = get_db_connection()
    cursor = connection.cursor(cursor_factory=RealDictCursor)

    try:
        # Get the venue data
        cursor.execute("""
            SELECT name, address, city, state, zip
            FROM venues
            WHERE id = %s
        """, (venue_id,))
        venue = cursor.fetchone()

        # Get all spaces data for the venue
        cursor.execute("""
            SELECT id, name, floor, capacity, chair_count,
                   table_count, table_max
            FROM spaces
            WHERE venue_id = %s
        """, (venue_id,))
        venue["spaces"] = cursor.fetchall()
        return venue
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to get venue."
        )
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# Get all venues for an organization
@router.get("/venues/all/{org_id}")
def get_org_venues(org_id: int):
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        cursor.execute("""
            SELECT id, name
            FROM VENUES
            WHERE org_id = %s
        """, (org_id,))
        rows = cursor.fetchall()
        return [{"id": row[0], "name": row[1]} for row in rows]
    except Exception:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail="Unable to get venues."
        )
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# Update a venue and/or any of its spaces
class VenueUpdateData(BaseModel):
    name: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    zip: str | None = None
    del_spaces: list[SpaceData] | None = None
    upd_spaces: list[SpaceData] | None = None
    new_spaces: list[SpaceData] | None = None

@router.patch("/venues/{v_id}")
def modify_venue(v_id: int, data: VenueUpdateData):
    connection = get_db_connection()
    cursor = connection.cursor()
    
    try:
        # Update venue
        update_table(cursor, VENUES, VenueUpdateData, data,
        "id = %s", (v_id,))

        # Add new spaces if any data was sent
        if data.del_spaces:
            process_venue_spaces(DELETE, cursor, v_id, data.del_spaces)
        if data.upd_spaces:
            process_venue_spaces(UPDATE, cursor, v_id, data.upd_spaces)
        if data.new_spaces:
            process_venue_spaces(ADD, cursor, v_id, data.new_spaces)

        connection.commit()

        return {"message": "Venue updated."}
    except Exception:
            connection.rollback()
            traceback.print_exc()
            raise HTTPException(
                status_code=500,
                detail="Unable to update venue."
            )
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# Add a venue to an organization
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
        # Add the new venue to the database
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

        # Get the new venue's id and use it to add all its spaces
        # to the database in 1 multirow query
        venue_id = cursor.fetchone()[0]
        process_venue_spaces(cursor, venue_id, data.spaces)

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
        if cursor:
            cursor.close()
        if connection:
            connection.close()

# Delete a venue from an organization
@router.delete("/venues")
def delete_venue(venue_id: int):
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        cursor.execute("DELETE FROM venues WHERE id = %s", (venue_id,))
        return {"message": "Venue deleted"}
    except Exception:
            connection.rollback()
            raise HTTPException(
                status_code=500,
                detail="Unable to delete venue."
            )
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

########
# TEST #
########
# Update a venue and its spaces from My Organization menu.
#
# In My Organizations, when a venue is clicked, it pulls up
# the AddVenue component but with all the data of the clicked
# venue filled in. To do this, it retrieves all spaces for
# that venue.
#
# The component should keep track of updated spaces, added spaces,
# and deleted spaces.
#
# When user hits submit, it sends all 3 lists in a JSON object
# to the update endpoint.
#
# For each of the 3 lists that is not empty, perform an
# execute_values query on spaces table. Use pydantic class
# to accept the 3 lists and have one of these objects in a
# pydantic class for venue data.