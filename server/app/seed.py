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



# Initial super admin, created on backend startup if this username doesn't exist yet.
# The repo is private, so these live here on purpose. An existing user's password is
# never overwritten: change it in the app or the DB after the first login.
DEFAULT_SUPER_ADMIN_USERNAME = "superadmin"
DEFAULT_SUPER_ADMIN_PASSWORD = "atik@120"
DEFAULT_SUPER_ADMIN_NAME = "Super Admin"


def seed_default_super_admin(
    db: Session,
    username: str = DEFAULT_SUPER_ADMIN_USERNAME,
    password: str = DEFAULT_SUPER_ADMIN_PASSWORD,
    name: str = DEFAULT_SUPER_ADMIN_NAME,
) -> User:
    existing = db.query(User).filter(User.username == username).first()
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
