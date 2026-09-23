from app.models import Role, User
from app.security import hash_password


def _make_user(db_session, username, password, role, station_id=None):
    user = User(
        name=username.title(),
        username=username,
        password_hash=hash_password(password),
        role=role,
        station_id=station_id,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def _login(client, username, password):
    return client.post("/auth/login", json={"username": username, "password": password}).json()["access_token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_super_admin_can_create_station_with_first_admin(client, db_session):
    _make_user(db_session, "root", "s3cret", Role.SUPER_ADMIN)
    token = _login(client, "root", "s3cret")

    response = client.post(
        "/stations",
        json={
            "name": "Dhanmondi Thana",
            "district": "Dhaka",
            "code": "DHK-01",
            "admin_name": "Station Admin",
            "admin_username": "dhk01admin",
            "admin_password": "adminpass1",
        },
        headers=_auth(token),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["code"] == "DHK-01"

    admin_login = client.post("/auth/login", json={"username": "dhk01admin", "password": "adminpass1"})
    assert admin_login.status_code == 200


def test_non_super_admin_cannot_create_station(client, db_session):
    _make_user(db_session, "dhk01admin", "adminpass1", Role.ADMIN, station_id=None)
    token = _login(client, "dhk01admin", "adminpass1")

    response = client.post(
        "/stations",
        json={
            "name": "Dhanmondi Thana",
            "district": "Dhaka",
            "code": "DHK-01",
            "admin_name": "X",
            "admin_username": "y",
            "admin_password": "z",
        },
        headers=_auth(token),
    )

    assert response.status_code == 403


def test_duplicate_station_code_returns_400(client, db_session):
    _make_user(db_session, "root", "s3cret", Role.SUPER_ADMIN)
    token = _login(client, "root", "s3cret")
    payload = {
        "name": "Dhanmondi Thana",
        "district": "Dhaka",
        "code": "DHK-01",
        "admin_name": "A",
        "admin_username": "dhk01admin",
        "admin_password": "adminpass1",
    }
    client.post("/stations", json=payload, headers=_auth(token))

    payload["admin_username"] = "different-username"
    response = client.post("/stations", json=payload, headers=_auth(token))

    assert response.status_code == 400


def test_list_stations_requires_super_admin(client, db_session):
    _make_user(db_session, "dhk01admin", "adminpass1", Role.ADMIN)
    token = _login(client, "dhk01admin", "adminpass1")

    response = client.get("/stations", headers=_auth(token))

    assert response.status_code == 403


def test_super_admin_lists_all_stations(client, db_session):
    _make_user(db_session, "root", "s3cret", Role.SUPER_ADMIN)
    token = _login(client, "root", "s3cret")
    client.post(
        "/stations",
        json={
            "name": "Dhanmondi Thana",
            "district": "Dhaka",
            "code": "DHK-01",
            "admin_name": "A",
            "admin_username": "dhk01admin",
            "admin_password": "adminpass1",
        },
        headers=_auth(token),
    )

    response = client.get("/stations", headers=_auth(token))

    assert response.status_code == 200
    assert len(response.json()) == 1
