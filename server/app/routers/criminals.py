import os
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import ValidationError
from sqlalchemy import or_
from sqlalchemy.orm import Session
from starlette import status

from ..database import get_db
from ..deps import require_roles
from ..models import Criminal, CriminalPhoto, CriminalStatus, Role, Station, User
from ..schemas import CriminalCreate, CriminalListOut, CriminalOut, CriminalUpdate
from ..storage import CONTENT_TYPE_EXTENSIONS, remove_criminal_photos, save_criminal_photo
from .stations import _station_scope

router = APIRouter(prefix="/criminals", tags=["criminals"])


def _parse_payload(payload: str, model):
    try:
        return model.parse_raw(payload)
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.errors())


def _validate_photo(upload: UploadFile) -> None:
    if upload.content_type not in CONTENT_TYPE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported photo type: {upload.content_type}",
        )
    upload.file.seek(0, os.SEEK_END)
    size = upload.file.tell()
    upload.file.seek(0)
    if size == 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Photo file is empty")


@router.post("", response_model=CriminalOut, status_code=status.HTTP_201_CREATED)
async def create_criminal(
    payload: str = Form(...),
    front_photo: UploadFile = File(...),
    left_photo: UploadFile = File(None),
    right_photo: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.SUPER_ADMIN, Role.ADMIN, Role.USER)),
):
    data = _parse_payload(payload, CriminalCreate)
    _station_scope(data.station_id, current_user)

    station = db.query(Station).filter(Station.id == data.station_id).first()
    if not station:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Station not found")

    criminal = Criminal(
        full_name=data.full_name,
        alias=data.alias,
        father_name=data.father_name,
        mother_name=data.mother_name,
        date_of_birth=data.date_of_birth,
        gender=data.gender,
        nid_or_birth_cert=data.nid_or_birth_cert,
        blood_group=data.blood_group,
        phone=data.phone,
        occupation=data.occupation,
        present_address=data.present_address,
        permanent_address=data.permanent_address,
        height=data.height,
        identifying_marks=data.identifying_marks,
        fir_case_number=data.fir_case_number,
        crime_type=data.crime_type,
        penal_code_sections=data.penal_code_sections,
        crime_description=data.crime_description,
        incident_date=data.incident_date,
        arrest_date=data.arrest_date,
        status=data.status,
        station_id=data.station_id,
        arresting_officer=data.arresting_officer,
        repeat_offender=data.repeat_offender,
        added_by=current_user.id,
        criminal_code="PENDING",
    )
    db.add(criminal)
    db.flush()

    criminal.criminal_code = f"CR-{criminal.id:06d}"

    for angle, upload in (("front", front_photo), ("left_profile", left_photo), ("right_profile", right_photo)):
        if upload is not None:
            _validate_photo(upload)
            path = save_criminal_photo(criminal.criminal_code, angle, upload)
            db.add(CriminalPhoto(criminal_id=criminal.id, photo_path=path, angle=angle))

    db.commit()
    db.refresh(criminal)
    return criminal


@router.delete("/{criminal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_criminal(
    criminal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.SUPER_ADMIN, Role.ADMIN)),
):
    criminal = db.query(Criminal).filter(Criminal.id == criminal_id).first()
    if not criminal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Criminal not found")
    _station_scope(criminal.station_id, current_user)

    criminal_code = criminal.criminal_code
    db.delete(criminal)
    db.commit()
    remove_criminal_photos(criminal_code)
    return None


@router.get("", response_model=CriminalListOut)
def list_criminals(
    q: Optional[str] = None,
    station_id: Optional[int] = None,
    status_filter: Optional[CriminalStatus] = Query(None, alias="status"),
    crime_type: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.SUPER_ADMIN, Role.ADMIN, Role.USER)),
):
    query = db.query(Criminal)
    if q:
        like = f"%{q}%"
        query = query.filter(or_(Criminal.full_name.ilike(like), Criminal.nid_or_birth_cert.ilike(like)))
    if station_id:
        query = query.filter(Criminal.station_id == station_id)
    if status_filter:
        query = query.filter(Criminal.status == status_filter)
    if crime_type:
        query = query.filter(Criminal.crime_type.ilike(f"%{crime_type}%"))

    total = query.count()
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)
    items = (
        query.order_by(Criminal.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return CriminalListOut(items=items, total=total, page=page, page_size=page_size)


@router.get("/{criminal_id}", response_model=CriminalOut)
def get_criminal(
    criminal_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.SUPER_ADMIN, Role.ADMIN, Role.USER)),
):
    criminal = db.query(Criminal).filter(Criminal.id == criminal_id).first()
    if not criminal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Criminal not found")
    return criminal


@router.patch("/{criminal_id}", response_model=CriminalOut)
async def update_criminal(
    criminal_id: int,
    payload: str = Form(...),
    front_photo: UploadFile = File(None),
    left_photo: UploadFile = File(None),
    right_photo: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.SUPER_ADMIN, Role.ADMIN, Role.USER)),
):
    criminal = db.query(Criminal).filter(Criminal.id == criminal_id).first()
    if not criminal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Criminal not found")
    _station_scope(criminal.station_id, current_user)

    data = _parse_payload(payload, CriminalUpdate)
    for field, value in data.dict(exclude_unset=True).items():
        setattr(criminal, field, value)
    criminal.updated_at = datetime.utcnow()

    for angle, upload in (("front", front_photo), ("left_profile", left_photo), ("right_profile", right_photo)):
        if upload is not None:
            _validate_photo(upload)
            path = save_criminal_photo(criminal.criminal_code, angle, upload)
            existing = next((p for p in criminal.photos if p.angle == angle), None)
            if existing:
                existing.photo_path = path
            else:
                db.add(CriminalPhoto(criminal_id=criminal.id, photo_path=path, angle=angle))

    db.commit()
    db.refresh(criminal)
    return criminal
