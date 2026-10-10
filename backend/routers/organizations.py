from fastapi import APIRouter, Body
from database import connection

router = APIRouter()

@router.post("/organizations")
def add_org(org_name: str):
    cursor = connection.cursor()
    cursor.execute("""
        INSERT INTO organizations (name)
        VALUES (%s)
    """, (org_name,))
    connection.commit()
    cursor.close()
    return {"message": "Organization has been added"}

@router.patch("/organizations")
def set_org_name(data: dict = Body(...)):
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
    return {"message": "Organization name successfully changed."}

@router.delete("/organizations")
def delete_org(org_id: int):
    cursor = connection.cursor()
    cursor.execute("DELETE FROM organizations WHERE id = %s", (org_id,))
    connection.commit()
    cursor.close()
    return {"messgage": "Organization has beed deleted."}