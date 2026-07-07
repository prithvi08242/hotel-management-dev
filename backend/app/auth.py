from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, Header
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User

JWT_SECRET = "dev-only-secret-do-not-use-in-prod"
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_MINUTES = 60


def create_access_token(email: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRY_MINUTES)
    return jwt.encode(
        {"sub": email, "role": role, "exp": expire}, JWT_SECRET, algorithm=JWT_ALGORITHM
    )


def authenticate(db: Session, email: str, password: str):
    user = db.query(User).filter(User.email == email).first()
    if user is None or user.password != password:
        return None
    return user


def get_current_user(
    authorization: str = Header(None), db: Session = Depends(get_db)
) -> User:
    if authorization is None or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.query(User).filter(User.email == payload.get("sub")).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
