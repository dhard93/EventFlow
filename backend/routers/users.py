from pydantic import BaseModel
from security import verify_password
from fastapi import APIRouter, Body, HTTPException
from database import get_db_connection

router = APIRouter()

# Get all users associated with an org
@router.get("/users")
def get_users(org_id: int):
    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute("""
        SELECT * FROM users WHERE org_id = %s
    """, (org_id,))
    rows = cursor.fetchall()
    cursor.close
    connection.close()
    return rows


# Get user with matching email/password for login
class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/users/login")
def login(data: LoginRequest):
    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("""
            SELECT U.id, U.password, U.account_type_id, O.name
            FROM users U
            JOIN organizations O
            ON O.id = U.org_id
            WHERE email = %s
        """, (data.email,)
        )
        user = cursor.fetchone()

        if not user or not verify_password(data.password, user[1]):
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        return {
            "user_id": user[0],
            "account_type": user[2],
            "organization_name": user[3]
        }

    finally:
        cursor.close
        connection.close()


# Get all users who have requested an event at a particular venue
@router.get("/users/venue")
def get_users_by_venue_req(venue_id: int):
    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute("""
        SELECT DISTINCT U.f_name, U.l_name, U.email
        FROM users U
        JOIN events E ON U.id = E.requesting_user_id
        WHERE U.org_id = E.org_id
        AND E.venue_id = %s
    """, (venue_id,))
    rows = cursor.fetchall()
    cursor.close
    connection.close()
    return rows


# Get all guest users who have a pending event request for an org
@router.get("/users/req_event")
def get_requesting_users(org_id: int):
    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute("""
        SELECT U.f_name, U.l_name, U.email
        FROM users U
        JOIN events E
        ON U.id = E.requesting_user_id
        WHERE E.request_status_id = 3 AND E.org_id = %s
    """, (org_id,))
    rows = cursor.fetchall()
    cursor.close
    connection.close()
    return rows


# Add a user to an org
@router.post("/users")
def add_user(data: dict = Body(...)):
    query = """
        INSERT INTO users (org_id, email, password, f_name, l_name, account_type_id)
        VALUES (%s, %s, %s, %s, %s, %s)
    """
    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute(
        query,
        (
            data["org_id"],
            data["email"],
            data["password"],
            data["f_name"],
            data["l_name"],
            data["account_type_id"]
        )
    )
    connection.commit()
    cursor.close
    connection.close()
    return {"message": "User created."}


# Delete a user from an org
@router.delete("/users")
def delete_user(user_id: int):
    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute("DELETE FROM users WHERE id = %s", (user_id))
    connection.commit()
    cursor.close
    connection.close()
    return {"message": "User deleted"}