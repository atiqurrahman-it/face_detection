from sqlalchemy.orm import Session

from .models import Role, User
from .security import hash_password


def create_super_admin(db: Session, username: str, password: str, name: str = "Super Admin") -> User:
    existing = db.query(User).filter(User.role == Role.SUPER_ADMIN).first()
    if existing:
        return existing

    user = User(
        name=name,
        username=username,
        password_hash=hash_password(password),
        role=Role.SUPER_ADMIN,
        station_id=None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
