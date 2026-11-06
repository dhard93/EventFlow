from fastapi import HTTPException
from pydantic import BaseModel
from security import *

def build_set_clause(data):
    update_cols = {
        k: v
        for k, v in data.model_dump(exclude_unset=True).items()
        if v is not None
    }

    if not update_cols:
        raise HTTPException(status_code=400, detail="No fields to update")

    if "password" in update_cols:
        update_cols["password"] = hash_password(update_cols["password"])

    return ", ".join(f"{col} = %s" for col in update_cols)