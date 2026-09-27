import os
from datetime import datetime
from typing import Optional

import numpy as np
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import ValidationError
from sqlalchemy import or_
from sqlalchemy.orm import Session
from starlette import status

from ..database import get_db
from ..deps import require_roles
from ..face_matching import compute_face_embedding, decode_embedding, encode_embedding, face_distance
from ..models import Criminal, CriminalPhoto, CriminalStatus, Role, Station, User
from ..schemas import CriminalCreate, CriminalListOut, CriminalMatchOut, CriminalOut, CriminalUpdate
from ..storage import CONTENT_TYPE_EXTENSIONS, remove_criminal_photos, save_criminal_photo
from .stations import _station_scope

router = APIRouter(prefix="/criminals", tags=["criminals"])

MATCH_DISTANCE_THRESHOLD = 0.6


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


def _save_photo(db: Session, criminal: Criminal, angle: str, upload: UploadFile) -> None:
    _validate_photo(upload)
    content = upload.file.read()
    upload.file.seek(0)
    embedding = compute_face_embedding(content)
    face_embedding = encode_embedding(embedding) if embedding else None

    path = save_criminal_photo(criminal.criminal_code, angle, upload)
    existing = next((p for p in criminal.photos if p.angle == angle), None)
    if existing:
        existing.photo_path = path
        existing.face_embedding = face_embedding
    else:
        db.add(CriminalPhoto(criminal_id=criminal.id, photo_path=path, angle=angle, face_embedding=face_embedding))


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
            _save_photo(db, criminal, angle, upload)

    db.commit()
    db.refresh(criminal)
    return criminal


@router.post("/search-by-photo", response_model=list[CriminalMatchOut])
async def search_criminals_by_photo(
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.SUPER_ADMIN, Role.ADMIN, Role.USER)),
):
    _validate_photo(photo)
    content = await photo.read()
    query_embedding = compute_face_embedding(content)
    if query_embedding is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="No face detected in the uploaded photo")
    query_vector = np.array(query_embedding)

    photos_query = db.query(CriminalPhoto).filter(CriminalPhoto.face_embedding.isnot(None))
    if current_user.role != Role.SUPER_ADMIN:
        photos_query = photos_query.join(Criminal, CriminalPhoto.criminal_id == Criminal.id).filter(
            Criminal.station_id == current_user.station_id
        )

    best_distance_by_criminal = {}
    for candidate in photos_query.all():
        distance = face_distance(query_vector, decode_embedding(candidate.face_embedding))
        if distance > MATCH_DISTANCE_THRESHOLD:
            continue
        best = best_distance_by_criminal.get(candidate.criminal_id)
        if best is None or distance < best:
            best_distance_by_criminal[candidate.criminal_id] = distance

    if not best_distance_by_criminal:
        return []

    criminals = db.query(Criminal).filter(Criminal.id.in_(best_distance_by_criminal.keys())).all()
    results = [
        CriminalMatchOut(
            **CriminalOut.from_orm(criminal).dict(),
            distance=best_distance_by_criminal[criminal.id],
            confidence=round(max(0.0, 1 - best_distance_by_criminal[criminal.id]) * 100, 1),
        )
        for criminal in criminals
    ]
    results.sort(key=lambda r: r.distance)
    return results


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
            _save_photo(db, criminal, angle, upload)

    db.commit()
    db.refresh(criminal)
    return criminal
