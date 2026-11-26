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


def _token(client, username, password):
    return client.post("/auth/login", json={"username": username, "password": password}).json()["access_token"]


def test_super_admin_can_update_own_name_and_username(client, db_session):
    _make_user(db_session, "root", "s3cret12", Role.SUPER_ADMIN)
    token = _token(client, "root", "s3cret12")

    response = client.patch(
        "/auth/me",
        json={"name": "Chief", "username": "chief"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Chief"
    assert response.json()["username"] == "chief"
    assert client.post("/auth/login", json={"username": "chief", "password": "s3cret12"}).status_code == 200


def test_super_admin_can_change_password_with_current_password(client, db_session):
    _make_user(db_session, "root", "s3cret12", Role.SUPER_ADMIN)
    token = _token(client, "root", "s3cret12")

    response = client.patch(
        "/auth/me",
        json={"current_password": "s3cret12", "new_password": "brandnew99"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert client.post("/auth/login", json={"username": "root", "password": "s3cret12"}).status_code == 401
    assert client.post("/auth/login", json={"username": "root", "password": "brandnew99"}).status_code == 200


def test_password_change_requires_correct_current_password(client, db_session):
    _make_user(db_session, "root", "s3cret12", Role.SUPER_ADMIN)
    token = _token(client, "root", "s3cret12")

    missing = client.patch(
        "/auth/me", json={"new_password": "brandnew99"}, headers={"Authorization": f"Bearer {token}"}
    )
    wrong = client.patch(
        "/auth/me",
        json={"current_password": "nope", "new_password": "brandnew99"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert missing.status_code == 400
    assert wrong.status_code == 400
    assert client.post("/auth/login", json={"username": "root", "password": "s3cret12"}).status_code == 200


def test_update_rejects_username_taken_by_another_user(client, db_session):
    _make_user(db_session, "root", "s3cret12", Role.SUPER_ADMIN)
    _make_user(db_session, "officer1", "officerpass1", Role.USER)
    token = _token(client, "root", "s3cret12")

    response = client.patch(
        "/auth/me", json={"username": "officer1"}, headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 409


def test_only_super_admin_can_use_update_me(client, db_session):
    _make_user(db_session, "officer1", "officerpass1", Role.USER)
    token = _token(client, "officer1", "officerpass1")

    response = client.patch("/auth/me", json={"name": "X"}, headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 403
