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


class StationCreate(BaseModel):
    name: str
    district: str
    code: str
    admin_name: str
    admin_username: str
    admin_password: str


class StationOut(BaseModel):
    id: int
    name: str
    district: str
    code: str

    class Config:
        orm_mode = True


class StationUserCreate(BaseModel):
    name: str
    username: str
    password: str
    role: Role = Role.USER
