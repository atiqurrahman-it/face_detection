from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_roles
from ..models import Role, User
from ..schemas import UserOut
from .stations import _station_scope

router = APIRouter(prefix="/users", tags=["users"])


@router.patch("/{user_id}/deactivate", response_model=UserOut)
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.SUPER_ADMIN, Role.ADMIN)),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    _station_scope(user.station_id, current_user)

    user.is_active = False
    db.commit()
    db.refresh(user)
    return user
