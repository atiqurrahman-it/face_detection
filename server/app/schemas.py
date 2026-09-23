from typing import Optional

from pydantic import BaseModel

from .models import Role


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    name: str
    username: str
    role: Role
    station_id: Optional[int]
    is_active: bool

    class Config:
        orm_mode = True
