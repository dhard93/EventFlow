from fastapi import HTTPException
from pydantic import BaseModel
from security import hash_password

def build_update_clauses(update_data, model):
    excluded_fields = {
        "id",
        "del_spaces",
        "upd_spaces",
        "new_spaces",
    }

    allowed_cols = set(model.model_fields.keys()) - excluded_fields

    update_cols = {
        k: v
        for k, v in update_data.model_dump(exclude_unset=True).items()
        if k in allowed_cols and v is not None
    }

    if not update_cols:
        return None

    if "password" in update_cols:
        update_cols["password"] = hash_password(update_cols["password"])

    set_clause = ", ".join(f"{col} = %s" for col in update_cols)

    return update_cols, set_clause


def update_table(curs, table, model, data, where_clause, values):
    result = build_update_clauses(data, model)
    if result:
        update_cols, set_clause = result
        curs.execute(f"""
            UPDATE {table}
            SET {set_clause}
            WHERE {where_clause}
        """, (*update_cols.values(), *values))