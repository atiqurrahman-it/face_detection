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



def test_seed_default_super_admin_creates_superadmin(db_session):
    from app.security import verify_password
    from app.seed import seed_default_super_admin

    user = seed_default_super_admin(db_session)

    assert user.username == "superadmin"
    assert user.role == Role.SUPER_ADMIN
    assert user.station_id is None
    assert verify_password("atik@120", user.password_hash)


def test_seed_default_super_admin_creates_even_if_another_super_admin_exists(db_session):
    from app.seed import seed_default_super_admin

    create_super_admin(db_session, "root", "s3cret")
    user = seed_default_super_admin(db_session)

    assert user.username == "superadmin"
    assert db_session.query(User).filter(User.role == Role.SUPER_ADMIN).count() == 2


def test_seed_default_super_admin_does_not_overwrite_existing_password(db_session):
    from app.security import verify_password
    from app.seed import seed_default_super_admin

    first = seed_default_super_admin(db_session, password="original")
    second = seed_default_super_admin(db_session)

    assert first.id == second.id
    assert verify_password("original", second.password_hash)
