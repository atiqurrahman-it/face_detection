from app.models import Role, Station, User
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
            "division": "Dhaka",
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
            "division": "Dhaka",
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
        "division": "Dhaka",
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


def test_create_station_rejects_blank_admin_username(client, db_session):
    _make_user(db_session, "root", "s3cret", Role.SUPER_ADMIN)
    token = _login(client, "root", "s3cret")

    response = client.post(
        "/stations",
        json={
            "name": "Dhanmondi Thana",
            "division": "Dhaka",
            "district": "Dhaka",
            "code": "DHK-01",
            "admin_name": "A",
            "admin_username": "",
            "admin_password": "adminpass1",
        },
        headers=_auth(token),
    )

    assert response.status_code == 422


def test_create_station_rejects_short_admin_password(client, db_session):
    _make_user(db_session, "root", "s3cret", Role.SUPER_ADMIN)
    token = _login(client, "root", "s3cret")

    response = client.post(
        "/stations",
        json={
            "name": "Dhanmondi Thana",
            "division": "Dhaka",
            "district": "Dhaka",
            "code": "DHK-01",
            "admin_name": "A",
            "admin_username": "dhk01admin",
            "admin_password": "short",
        },
        headers=_auth(token),
    )

    assert response.status_code == 422


def test_any_authenticated_role_can_list_stations(client, db_session):
    station = _make_station(db_session)
    _make_user(db_session, "dhk01admin", "adminpass1", Role.ADMIN, station_id=station.id)
    _make_user(db_session, "officer1", "officerpass1", Role.USER, station_id=station.id)

    for username, password in (("dhk01admin", "adminpass1"), ("officer1", "officerpass1")):
        token = _login(client, username, password)
        response = client.get("/stations", headers=_auth(token))
        assert response.status_code == 200, f"{username} got {response.status_code}"


def _make_station(db_session, code="DHK-01"):
    station = Station(name="Dhanmondi Thana", division="Dhaka", district="Dhaka", code=code)
    db_session.add(station)
    db_session.commit()
    db_session.refresh(station)
    return station


def test_super_admin_lists_all_stations(client, db_session):
    _make_user(db_session, "root", "s3cret", Role.SUPER_ADMIN)
    token = _login(client, "root", "s3cret")
    client.post(
        "/stations",
        json={
            "name": "Dhanmondi Thana",
            "division": "Dhaka",
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
