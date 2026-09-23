from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import ValidationError
from sqlalchemy.orm import Session
from starlette import status

from ..database import get_db
from ..deps import require_roles
from ..models import Criminal, CriminalPhoto, Role, Station, User
from ..schemas import CriminalCreate, CriminalOut
from ..storage import save_criminal_photo
from .stations import _station_scope

router = APIRouter(prefix="/criminals", tags=["criminals"])


def _parse_payload(payload: str, model):
    try:
        return model.parse_raw(payload)
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.errors())


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
            path = save_criminal_photo(criminal.criminal_code, angle, upload)
            db.add(CriminalPhoto(criminal_id=criminal.id, photo_path=path, angle=angle))

    db.commit()
    db.refresh(criminal)
    return criminal
