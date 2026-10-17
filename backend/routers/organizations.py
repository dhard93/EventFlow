from fastapi import APIRouter, Body
from database import get_db_connection
from security import hash_password

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
@router.post("/organizations")
def add_org(data: dict = Body(...)):
    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("""
            INSERT INTO organizations (name)
            VALUES (%s)
            RETURNING id
        """, (data["organization_name"],))

        org_id = cursor.fetchone()[0]

        cursor.execute("""
            INSERT INTO users (org_id, email, password, f_name, l_name, account_type_id)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            org_id,
            data["email"],
            hash_password(data["password"]),
            data["first_name"],
            data["last_name"],
            1
        ))

        user_id = cursor.fetchone()[0]

        connection.commit()
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