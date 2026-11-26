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


def test_seed_default_super_admin_does_not_create_a_second_super_admin(db_session):
    from app.seed import seed_default_super_admin

    root = create_super_admin(db_session, "root", "s3cret")
    user = seed_default_super_admin(db_session)

    assert user.id == root.id
    assert db_session.query(User).filter(User.role == Role.SUPER_ADMIN).count() == 1


def test_database_rejects_a_second_super_admin(db_session):
    import pytest
    from sqlalchemy.exc import IntegrityError

    create_super_admin(db_session, "root", "s3cret")
    db_session.add(User(name="Other", username="other", password_hash="x", role=Role.SUPER_ADMIN))

    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_seed_default_super_admin_does_not_overwrite_existing_password(db_session):
    from app.security import verify_password
    from app.seed import seed_default_super_admin

    first = seed_default_super_admin(db_session, password="original")
    second = seed_default_super_admin(db_session)

    assert first.id == second.id
    assert verify_password("original", second.password_hash)


def test_super_admin_password_uses_env_secret_when_set():
    from app.seed import super_admin_password

    assert super_admin_password({"SUPER_ADMIN_PASSWORD": "live-secret-1"}) == "live-secret-1"


def test_super_admin_password_falls_back_to_seed_default_locally():
    from app.seed import DEFAULT_SUPER_ADMIN_PASSWORD, super_admin_password

    assert super_admin_password({}) == DEFAULT_SUPER_ADMIN_PASSWORD


def test_super_admin_password_required_in_production():
    import pytest
    from app.seed import super_admin_password

    with pytest.raises(RuntimeError):
        super_admin_password({"APP_ENV": "production"})
