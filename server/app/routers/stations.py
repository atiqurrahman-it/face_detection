from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_roles
from ..models import Criminal, Role, Station, User
from ..schemas import StationCreate, StationListResponse, StationOut, StationUserCreate, UserOut
from ..security import hash_password

router = APIRouter(prefix="/stations", tags=["stations"])


def _station_scope(station_id: int, current_user: User) -> None:
    if current_user.role == Role.SUPER_ADMIN:
        return
    if current_user.station_id != station_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted for this station")


@router.post("", response_model=StationOut, status_code=status.HTTP_201_CREATED)
def create_station(
    payload: StationCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.SUPER_ADMIN)),
):
    if db.query(Station).filter(Station.code == payload.code).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Station code already exists")
    if db.query(User).filter(User.username == payload.admin_username).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists")

    station = Station(
        name=payload.name,
        division=payload.division,
        district=payload.district,
        thana=payload.thana,
        code=payload.code,
    )
    db.add(station)
    db.flush()

    admin = User(
        name=payload.admin_name,
        username=payload.admin_username,
        password_hash=hash_password(payload.admin_password),
        role=Role.ADMIN,
        station_id=station.id,
    )
    db.add(admin)
    db.commit()
    db.refresh(station)
    return {
        "id": station.id,
        "name": station.name,
        "division": station.division,
        "district": station.district,
        "thana": station.thana,
        "code": station.code,
        "criminal_count": 0,
    }


@router.get("", response_model=StationListResponse)
def list_stations(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    division: Optional[str] = None,
    district: Optional[str] = None,
    thana: Optional[str] = None,
    name: Optional[str] = None,
    code: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.SUPER_ADMIN, Role.ADMIN, Role.USER)),
):
    query = db.query(Station)
    if division:
        query = query.filter(Station.division == division)
    if district:
        query = query.filter(Station.district == district)
    if thana:
        query = query.filter(Station.thana == thana)
    if name:
        query = query.filter(Station.name.ilike(f"%{name}%"))
    if code:
        query = query.filter(Station.code.ilike(f"%{code}%"))

    total = query.count()
    total_pages = max(1, -(-total // limit))
    stations = query.order_by(Station.id).offset((page - 1) * limit).limit(limit).all()

    counts = dict(
        db.query(Criminal.station_id, func.count(Criminal.id))
        .filter(Criminal.station_id.in_([s.id for s in stations]))
        .group_by(Criminal.station_id)
        .all()
    )
    data = [
        {
            "id": s.id,
            "name": s.name,
            "division": s.division,
            "district": s.district,
            "thana": s.thana,
            "code": s.code,
            "criminal_count": counts.get(s.id, 0),
        }
        for s in stations
    ]

    return {
        "success": True,
        "data": data,
        "pagination": {"total": total, "page": page, "limit": limit, "totalPages": total_pages},
    }


@router.post("/{station_id}/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_station_user(
    station_id: int,
    payload: StationUserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.SUPER_ADMIN, Role.ADMIN)),
):
    _station_scope(station_id, current_user)
    if not db.query(Station).filter(Station.id == station_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Station not found")
    if payload.role not in (Role.USER, Role.ADMIN):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")
    if payload.role == Role.ADMIN and current_user.role != Role.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only a super admin can create an admin")
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists")

    user = User(
        name=payload.name,
        username=payload.username,
        password_hash=hash_password(payload.password),
        role=payload.role,
        station_id=station_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/{station_id}/users", response_model=list[UserOut])
def list_station_users(
    station_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.SUPER_ADMIN, Role.ADMIN)),
):
    _station_scope(station_id, current_user)
    return db.query(User).filter(User.station_id == station_id).all()
