from fastapi import APIRouter, Body, Response, Request
from database import get_db_connection
from security import *
from pydantic import BaseModel

router = APIRouter()

# TODO #
# Use pydantic classes for endpoints with structured data
# instead of Bodies

@router.get("/organizations/name/{user_id}")
def get_user_org_name(user_id: int):
    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute("""
        SELECT O.name
        FROM organizations O
        JOIN users U
        ON O.id = U.org_id
        WHERE U.id = %s
    """, (user_id,))
    row = cursor.fetchone()
    cursor.close()
    connection.close()
    return row


# TODO #
# Create function for checking if email already exists
class CreateOrg(BaseModel):
    organization_name: str
    email: str
    password: str
    f_name: str
    l_name: str

@router.post("/organizations")
def add_org(data: CreateOrg, response: Response):
    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("""
            INSERT INTO organizations (name)
            VALUES (%s)
            RETURNING id
        """, (data.organization_name,))

        org_id = cursor.fetchone()[0]

        cursor.execute("""
            INSERT INTO users (org_id, email, password, f_name, l_name, account_type_id)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            org_id,
            data.organization_name,
            data.email,
            data.password,
            data.f_name,
            data.l_name,
            1
        ))

        user_id = cursor.fetchone()[0]

        token = create_session(cursor, user_id)
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
        return {"user_id": user_id}

    except Exception:
        connection.rollback()
        raise

    finally:
        cursor.close()
        connection.close()

@router.patch("/organizations")
def set_org_name(data: dict = Body(...)):
    connection = get_db_connection()
    cursor = connection.cursor()
    query = """
            UPDATE organizations
            SET name = %s
            WHERE id = %s
        """
    cursor.execute(
        query, (
            data["name"],
            data["id"]
        )
    )
    connection.commit()
    cursor.close()
    connection.close()
    return {"message": "Organization name successfully changed."}

@router.delete("/organizations")
def delete_org(org_id: int):
    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute("DELETE FROM organizations WHERE id = %s", (org_id,))
    connection.commit()
    cursor.close()
    connection.close()
    return {"messgage": "Organization has beed deleted."}