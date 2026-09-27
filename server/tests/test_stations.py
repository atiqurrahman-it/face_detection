from app.models import Criminal, CriminalStatus, Role, Station, User
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
            "thana": "Dhanmondi",
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
            "thana": "Dhanmondi",
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
            "thana": "Dhanmondi",
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
            "thana": "Dhanmondi",
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
            "thana": "Dhanmondi",
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
    station = Station(name="Dhanmondi Thana", division="Dhaka", district="Dhaka", thana="Dhanmondi", code=code)
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
            "thana": "Dhanmondi",
            "code": "DHK-01",
            "admin_name": "A",
            "admin_username": "dhk01admin",
            "admin_password": "adminpass1",
        },
        headers=_auth(token),
    )

    response = client.get("/stations", headers=_auth(token))

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert len(body["data"]) == 1
    assert body["pagination"] == {"total": 1, "page": 1, "limit": 20, "totalPages": 1}


def test_stations_list_is_paginated_and_filterable(client, db_session):
    _make_user(db_session, "root", "s3cret", Role.SUPER_ADMIN)
    token = _login(client, "root", "s3cret")
    for i in range(3):
        _make_station(db_session, code=f"DHK-0{i + 1}")
    other = Station(name="Kotwali Thana", division="Chattogram", district="Chattogram", thana="Kotwali", code="CTG-01")
    db_session.add(other)
    db_session.commit()

    response = client.get("/stations", params={"page": 1, "limit": 2}, headers=_auth(token))
    body = response.json()
    assert response.status_code == 200
    assert len(body["data"]) == 2
    assert body["pagination"] == {"total": 4, "page": 1, "limit": 2, "totalPages": 2}

    response = client.get("/stations", params={"division": "Chattogram"}, headers=_auth(token))
    body = response.json()
    assert len(body["data"]) == 1
    assert body["data"][0]["code"] == "CTG-01"
    assert body["pagination"]["total"] == 1


def test_stations_list_includes_criminal_count(client, db_session):
    root = _make_user(db_session, "root", "s3cret", Role.SUPER_ADMIN)
    token = _login(client, "root", "s3cret")
    station = _make_station(db_session)
    other_station = _make_station(db_session, code="DHK-02")

    for i in range(2):
        db_session.add(
            Criminal(
                criminal_code=f"CR-{i + 1}",
                full_name=f"Suspect {i + 1}",
                gender="Male",
                crime_type="Theft",
                status=CriminalStatus.WANTED,
                station_id=station.id,
                added_by=root.id,
            )
        )
    db_session.commit()

    response = client.get("/stations", headers=_auth(token))
    body = response.json()

    counts_by_code = {s["code"]: s["criminal_count"] for s in body["data"]}
    assert counts_by_code[station.code] == 2
    assert counts_by_code[other_station.code] == 0
