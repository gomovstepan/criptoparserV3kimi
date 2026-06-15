"""JWT аутентификация для API Gateway."""

import os
import time
import jwt
import secrets
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

SECURITY = HTTPBearer()

JWT_SECRET = os.getenv("JWT_SECRET", secrets.token_hex(32))
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_SECONDS = 86400  # 24 часа


class UserLogin(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = JWT_EXPIRY_SECONDS


def create_token(email: str) -> str:
    """Создать JWT токен."""
    payload = {
        "sub": email,
        "iat": int(time.time()),
        "exp": int(time.time()) + JWT_EXPIRY_SECONDS,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_token(token: str) -> dict:
    """Проверить JWT токен."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Токен истёк",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Невалидный токен",
        )


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(SECURITY)) -> str:
    """Dependency для защищённых endpoints."""
    payload = verify_token(credentials.credentials)
    return payload["sub"]


# Тестовые пользователи (заменить на БД в проде)
TEST_USERS = {
    "test@example.com": "test123",
}


def authenticate_user(email: str, password: str) -> bool:
    """Проверить email/password."""
    return TEST_USERS.get(email) == password
