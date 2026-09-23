import enum
from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from .database import Base


class Role(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    USER = "user"


class Station(Base):
    __tablename__ = "stations"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    district = Column(String, nullable=False)
    code = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="station")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    username = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(Role), nullable=False)
    station_id = Column(Integer, ForeignKey("stations.id"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    station = relationship("Station", back_populates="users")


class CriminalStatus(str, enum.Enum):
    WANTED = "Wanted"
    ARRESTED = "Arrested"
    UNDER_TRIAL = "Under trial"
    CONVICTED = "Convicted"
    RELEASED = "Released"
    ABSCONDING = "Absconding"


class Criminal(Base):
    __tablename__ = "criminals"

    id = Column(Integer, primary_key=True)
    criminal_code = Column(String, unique=True, nullable=False)
    full_name = Column(String, nullable=False)
    alias = Column(String, nullable=True)
    father_name = Column(String, nullable=True)
    mother_name = Column(String, nullable=True)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String, nullable=False)
    nid_or_birth_cert = Column(String, nullable=True)
    blood_group = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    occupation = Column(String, nullable=True)
    present_address = Column(String, nullable=True)
    permanent_address = Column(String, nullable=True)
    height = Column(String, nullable=True)
    identifying_marks = Column(String, nullable=True)
    fir_case_number = Column(String, nullable=True)
    crime_type = Column(String, nullable=False)
    penal_code_sections = Column(String, nullable=True)
    crime_description = Column(String, nullable=True)
    incident_date = Column(Date, nullable=True)
    arrest_date = Column(Date, nullable=True)
    status = Column(Enum(CriminalStatus), nullable=False)
    station_id = Column(Integer, ForeignKey("stations.id"), nullable=False)
    arresting_officer = Column(String, nullable=True)
    repeat_offender = Column(Boolean, default=False, nullable=False)
    added_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    station = relationship("Station")
    photos = relationship("CriminalPhoto", back_populates="criminal", cascade="all, delete-orphan")


class CriminalPhoto(Base):
    __tablename__ = "criminal_photos"

    id = Column(Integer, primary_key=True)
    criminal_id = Column(Integer, ForeignKey("criminals.id"), nullable=False)
    photo_path = Column(String, nullable=False)
    angle = Column(String, nullable=False)
    face_embedding = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    criminal = relationship("Criminal", back_populates="photos")

    @property
    def url(self) -> str:
        return f"/uploads/{self.photo_path}"
