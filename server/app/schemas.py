from typing import Optional

from pydantic import BaseModel, constr

from .models import Role

Name = constr(min_length=1, strip_whitespace=True)
Password = constr(min_length=8)


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
    name: Name
    district: Name
    code: Name
    admin_name: Name
    admin_username: Name
    admin_password: Password


class StationOut(BaseModel):
    id: int
    name: str
    district: str
    code: str

    class Config:
        orm_mode = True


class StationUserCreate(BaseModel):
    name: Name
    username: Name
    password: Password
    role: Role = Role.USER
