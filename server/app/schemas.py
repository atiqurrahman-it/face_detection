from datetime import date, datetime
from typing import List, Optional

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


from .models import CriminalStatus


class CriminalCreate(BaseModel):
    full_name: Name
    gender: Name
    crime_type: Name
    status: CriminalStatus
    station_id: int
    alias: Optional[str] = None
    father_name: Optional[str] = None
    mother_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    nid_or_birth_cert: Optional[str] = None
    blood_group: Optional[str] = None
    phone: Optional[str] = None
    occupation: Optional[str] = None
    present_address: Optional[str] = None
    permanent_address: Optional[str] = None
    height: Optional[str] = None
    identifying_marks: Optional[str] = None
    fir_case_number: Optional[str] = None
    penal_code_sections: Optional[str] = None
    crime_description: Optional[str] = None
    incident_date: Optional[date] = None
    arrest_date: Optional[date] = None
    arresting_officer: Optional[str] = None
    repeat_offender: bool = False


class CriminalPhotoOut(BaseModel):
    id: int
    angle: str
    url: str

    class Config:
        orm_mode = True


class CriminalOut(BaseModel):
    id: int
    criminal_code: str
    full_name: str
    alias: Optional[str]
    father_name: Optional[str]
    mother_name: Optional[str]
    date_of_birth: Optional[date]
    gender: str
    nid_or_birth_cert: Optional[str]
    blood_group: Optional[str]
    phone: Optional[str]
    occupation: Optional[str]
    present_address: Optional[str]
    permanent_address: Optional[str]
    height: Optional[str]
    identifying_marks: Optional[str]
    fir_case_number: Optional[str]
    crime_type: str
    penal_code_sections: Optional[str]
    crime_description: Optional[str]
    incident_date: Optional[date]
    arrest_date: Optional[date]
    status: CriminalStatus
    station: StationOut
    arresting_officer: Optional[str]
    repeat_offender: bool
    added_by: int
    created_at: datetime
    updated_at: datetime
    photos: List[CriminalPhotoOut]

    class Config:
        orm_mode = True


class CriminalListOut(BaseModel):
    items: List[CriminalOut]
    total: int
    page: int
    page_size: int
