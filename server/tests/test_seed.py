from app.models import Role, User
from app.seed import create_super_admin


def test_create_super_admin_creates_user(db_session):
    user = create_super_admin(db_session, "root", "s3cret")

    assert user.role == Role.SUPER_ADMIN
    assert user.username == "root"
    assert user.station_id is None


def test_create_super_admin_is_idempotent(db_session):
    first = create_super_admin(db_session, "root", "s3cret")
    second = create_super_admin(db_session, "root", "different-password")

    assert first.id == second.id
    assert db_session.query(User).filter(User.role == Role.SUPER_ADMIN).count() == 1
