from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, require_roles
from ..models import Role, User
from ..schemas import LoginRequest, SuperAdminUpdate, TokenResponse, UserOut
from ..security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username).first()
    invalid = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password"
    )
    if not user or not user.is_active:
        raise invalid
    if not verify_password(payload.password, user.password_hash):
        raise invalid

    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserOut)
def update_me(
    payload: SuperAdminUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.SUPER_ADMIN)),
):
    if payload.new_password is not None:
        if not payload.current_password or not verify_password(
            payload.current_password, current_user.password_hash
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect"
            )
        current_user.password_hash = hash_password(payload.new_password)

    if payload.username is not None and payload.username != current_user.username:
        taken = db.query(User).filter(User.username == payload.username).first()
        if taken:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken")
        current_user.username = payload.username

    if payload.name is not None:
        current_user.name = payload.name

    db.commit()
    db.refresh(current_user)
    return current_user
