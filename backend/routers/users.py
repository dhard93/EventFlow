from pydantic import BaseModel
from security import *
from fastapi import APIRouter, HTTPException, Response, Request
from database import get_db_connection
from constants import *

router = APIRouter()


# Validate user session on page reload
@router.get("/users/sessions/me")
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
            SELECT U.id, U.account_type_id, O.id, O.name, A.id
            FROM users U
            JOIN organizations O ON U.org_id = O.id
            JOIN users A ON O.id = A.org_id
            AND A.account_type_id = %s
            JOIN user_sessions S ON U.id = S.user_id
            WHERE session_token_hash = %s
            AND expires_at > %s
        """, (
            ADMIN,
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
            "organization_name": session[3],
            "admin_id": session[4]

        }

    finally:
        cursor.close()
        connection.close()


# Get info for 1 user account
@router.get("/users/account/{org_id}/{user_id}")
def get_user_data(org_id: int, user_id: int):
    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("""
            SELECT email, f_name, l_name
            FROM users
            WHERE id = %s
            AND org_id = %s
        """, (user_id, org_id))
        row = cursor.fetchall()
        return {
            "email": row[0][0],
            "first_name": row[0][1],
            "last_name": row[0][2],
        }
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()


# Get user with matching email/password for login and return
# data to be cahed in react state for the login session
class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/users/login")
def login(data: LoginRequest, response: Response):
    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("""
            SELECT U.id, U.password, U.account_type_id, O.id, O.name, A.id
            FROM users U
            JOIN organizations O
            ON O.id = U.org_id
            JOIN users A
            ON O.id = A.org_id
            AND A.account_type_id = %s
            WHERE U.email = %s
        """, (ADMIN, data.email)
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
            "organization_name": user[4],
            "admin_id": user[5]
        }

    finally:
        cursor.close()
        connection.close()


# Log user out by deleting their user_sessions entry
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


# Get all users who have requested an event at a particular venue
@router.get("/users/requested/{venue_id}")
def get_users_by_venue_req(venue_id: int):
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        cursor.execute("""
            SELECT DISTINCT U.f_name, U.l_name, U.email
            FROM users U
            JOIN events E ON U.id = E.requesting_user_id
            WHERE U.org_id = E.org_id
            AND E.venue_id = %s
        """, (venue_id,))
        return rows
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()


# Get all guest users who have a pending event request for an org
@router.get("/users/pending_request/{org_id}")
def get_requesting_users(org_id: int):
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        cursor.execute("""
            SELECT U.f_name, U.l_name, U.email
            FROM users U
            JOIN events E
            ON U.id = E.requesting_user_id
            WHERE E.request_status_id = 3 AND E.org_id = %s
        """, (org_id,))
        rows = cursor.fetchall()
        return rows
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()


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
            INSERT INTO users
                (org_id, email, password, f_name, l_name, account_type_id)
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
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()


# Delete user account
@router.delete("/users/{user_id}")
def delete_user(user_id: int):
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        cursor.execute("""
            DELETE FROM users
            WHERE id = %s
        """, (user_id))
        connection.commit()
        return rows
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()


# Update user account data
class UserData(BaseModel):
    email: str | None = None
    password: str | None = None
    f_name: str | None = None
    l_name: str | None = None

@router.patch("/users/account/{user_id}")
def modify_user_email(user_id: int, data: UserData):
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        update_cols = {
            k: v
            for k, v in data.model_dump(exclude_unset=True).items()
            if v is not None
        }

        if not update_cols:
            raise HTTPException(status_code=400, detail="No fields to update")

        if "password" in update_cols:
            update_cols["password"] = hash_password(update_cols["password"])

        set_clause = ", ".join(f"{col} = %s" for col in update_cols)

        cursor.execute("""
            UPDATE users
            SET %s
            WHERE id = %s
        """, (set_clause, user_id))

        connection.commit()
        return {"message":"Account info updated"}
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()