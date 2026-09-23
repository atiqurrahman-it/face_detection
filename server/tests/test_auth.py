from app.models import Role, User
from app.security import hash_password


def _make_user(db_session, username, password, role, station_id=None, is_active=True):
    user = User(
        name=username.title(),
        username=username,
        password_hash=hash_password(password),
        role=role,
        station_id=station_id,
        is_active=is_active,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def test_login_with_correct_credentials_returns_token(client, db_session):
    _make_user(db_session, "root", "s3cret", Role.SUPER_ADMIN)

    response = client.post("/auth/login", json={"username": "root", "password": "s3cret"})

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert isinstance(body["access_token"], str) and body["access_token"]


def test_login_with_wrong_password_returns_401(client, db_session):
    _make_user(db_session, "root", "s3cret", Role.SUPER_ADMIN)

    response = client.post("/auth/login", json={"username": "root", "password": "wrong"})

    assert response.status_code == 401


def test_login_with_unknown_username_returns_same_401(client, db_session):
    _make_user(db_session, "root", "s3cret", Role.SUPER_ADMIN)

    known = client.post("/auth/login", json={"username": "root", "password": "wrong"})
    unknown = client.post("/auth/login", json={"username": "ghost", "password": "wrong"})

    assert known.status_code == unknown.status_code == 401
    assert known.json()["detail"] == unknown.json()["detail"]


def test_login_rejects_deactivated_user(client, db_session):
    _make_user(db_session, "root", "s3cret", Role.SUPER_ADMIN, is_active=False)

    response = client.post("/auth/login", json={"username": "root", "password": "s3cret"})

    assert response.status_code == 401


def test_me_requires_bearer_token(client):
    response = client.get("/auth/me")
    assert response.status_code == 401


def test_me_returns_current_user_and_hides_password_hash(client, db_session):
    _make_user(db_session, "root", "s3cret", Role.SUPER_ADMIN)
    token = client.post("/auth/login", json={"username": "root", "password": "s3cret"}).json()["access_token"]

    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    body = response.json()
    assert body["username"] == "root"
    assert "password_hash" not in body


def test_me_rejects_token_for_deactivated_user(client, db_session):
    user = _make_user(db_session, "root", "s3cret", Role.SUPER_ADMIN)
    token = client.post("/auth/login", json={"username": "root", "password": "s3cret"}).json()["access_token"]

    user.is_active = False
    db_session.commit()

    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 401
