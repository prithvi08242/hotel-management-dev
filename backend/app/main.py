from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from jose import jwt

from app.auth import authenticate

JWT_SECRET = "dev-only-secret-do-not-use-in-prod"
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_MINUTES = 60

app = FastAPI(title="Wayfarer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoginRequest(BaseModel):
    email: str
    password: str


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/login")
def login(payload: LoginRequest):
    user = authenticate(payload.email, payload.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRY_MINUTES)
    token = jwt.encode(
        {"sub": user["email"], "role": user["role"], "exp": expire},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"email": user["email"], "full_name": user["full_name"], "role": user["role"]},
    }
