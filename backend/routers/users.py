from pydantic import BaseModel
from security import *
from fastapi import APIRouter, HTTPException, Response, Request
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
    cursor.close()
    connection.close()
    return rows


# Get user with matching email/password for login
class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/users/login")
def login(data: LoginRequest, response: Response):
    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("""
            SELECT U.id, U.password, U.account_type_id, O.id, O.name
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

        token = create_session(cursor, user[0])
        if not token:
            raise HTTPException(
                status_code=401,
                detail="Not logged in"
            )

        connection.commit()
        response.set_cookie(
            key="eventflow_session",
            value=token,
            httponly=True,
            secure=False,
            samesite="lax",
            max_age=7 * 24 * 60 * 60,
            path="/",
        )

        return {
            "user_id": user[0],
            "account_type": user[2],
            "organization_id": user[3],
            "organization_name": user[4]
        }

    finally:
        cursor.close()
        connection.close()


@router.post("/users/logout")
def logout(request: Request, response: Response):
    token = request.cookies.get("eventflow_session")
    if token:
        connection = get_db_connection()
        cursor = connection.cursor()

        try:
            cursor.execute("""
                DELETE FROM user_sessions
                WHERE session_token_hash = %s
            """, (hash_session_token(token),))

            connection.commit()

        finally:
            cursor.close()
            connection.close()

    response.delete_cookie(
        key="eventflow_session",
        path="/",
        httponly=True,
        secure=False,
        samesite="lax",
    )

    return {"message": "Logged out successfully"}


@router.get("/users/me")
def get_user_session(request: Request):
    token = request.cookies.get("eventflow_session")
    if not token:
        raise HTTPException(
            status_code=401,
            detail="Not logged in"
        )

    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("""
            SELECT U.id, U.account_type_id, O.id, O.name
            FROM users U
            JOIN organizations O ON U.org_id = O.id
            JOIN user_sessions S ON U.id = S.user_id
            WHERE session_token_hash = %s
            AND expires_at > %s
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

        return {
            "user_id": session[0],
            "account_type": session[1],
            "organization_id": session[2],
            "organization_name": session[3]
            }

    finally:
        cursor.close()
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
    cursor.close()
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
    cursor.close()
    connection.close()
    return rows


# Add a user to an org
class UserData(BaseModel):
    org_id: int
    email: str
    password: str
    f_name: str
    l_name: str
    account_type_id: int

@router.post("/users")
def add_user(data: UserData):
    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("""
            INSERT INTO users (org_id, email, password, f_name, l_name, account_type_id)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
                data.org_id,
                data.email,
                hash_password(data.password),
                data.f_name,
                data.l_name,
                data.account_type_id
            )
        )
        connection.commit()
        return {"message": "User created."}
    finally:
        connection.commit()
        cursor.close()
        connection.close()


# Delete a user from an org
@router.delete("/users")
def delete_user(user_id: int):
    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute("DELETE FROM users WHERE id = %s", (user_id))
    connection.commit()
    cursor.close()
    connection.close()
    return {"message": "User deleted"}