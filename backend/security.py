from pwdlib import PasswordHash
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

password_hash = PasswordHash.recommended()

def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_session(cursor, user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    token_hash = hash_session_token(token)

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    cursor.execute("""
        INSERT INTO user_sessions
            (session_token_hash, user_id, expires_at)
        VALUES (%s, %s, %s)
    """, (token_hash, user_id, expires_at))

    return token
    