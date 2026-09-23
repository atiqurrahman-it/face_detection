from app.models import Role, Station, User
from app.security import hash_password


def _make_station(db_session, code="DHK-01"):
    station = Station(name="Dhanmondi Thana", district="Dhaka", code=code)
    db_session.add(station)
    db_session.commit()
    db_session.refresh(station)
    return station


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


def test_admin_can_create_station_user_for_own_station(client, db_session):
    station = _make_station(db_session)
    _make_user(db_session, "dhk01admin", "adminpass1", Role.ADMIN, station_id=station.id)
    token = _login(client, "dhk01admin", "adminpass1")

    response = client.post(
        f"/stations/{station.id}/users",
        json={"name": "Field Officer", "username": "officer1", "password": "officerpass1", "role": "user"},
        headers=_auth(token),
    )

    assert response.status_code == 201
    assert response.json()["role"] == "user"


def test_admin_cannot_create_user_for_other_station(client, db_session):
    station_a = _make_station(db_session, code="DHK-01")
    station_b = _make_station(db_session, code="DHK-02")
    _make_user(db_session, "dhk01admin", "adminpass1", Role.ADMIN, station_id=station_a.id)
    token = _login(client, "dhk01admin", "adminpass1")

    response = client.post(
        f"/stations/{station_b.id}/users",
        json={"name": "Field Officer", "username": "officer1", "password": "officerpass1", "role": "user"},
        headers=_auth(token),
    )

    assert response.status_code == 403


def test_station_user_cannot_create_station_user(client, db_session):
    station = _make_station(db_session)
    _make_user(db_session, "officer1", "officerpass1", Role.USER, station_id=station.id)
    token = _login(client, "officer1", "officerpass1")

    response = client.post(
        f"/stations/{station.id}/users",
        json={"name": "X", "username": "officer2", "password": "officerpass2", "role": "user"},
        headers=_auth(token),
    )

    assert response.status_code == 403


def test_admin_lists_only_own_station_users(client, db_session):
    station_a = _make_station(db_session, code="DHK-01")
    station_b = _make_station(db_session, code="DHK-02")
    _make_user(db_session, "dhk01admin", "adminpass1", Role.ADMIN, station_id=station_a.id)
    _make_user(db_session, "officer_a", "pass12345", Role.USER, station_id=station_a.id)
    _make_user(db_session, "officer_b", "pass12345", Role.USER, station_id=station_b.id)
    token = _login(client, "dhk01admin", "adminpass1")

    response = client.get(f"/stations/{station_a.id}/users", headers=_auth(token))

    assert response.status_code == 200
    usernames = {u["username"] for u in response.json()}
    assert usernames == {"dhk01admin", "officer_a"}


def test_admin_can_deactivate_own_station_user(client, db_session):
    station = _make_station(db_session)
    _make_user(db_session, "dhk01admin", "adminpass1", Role.ADMIN, station_id=station.id)
    officer = _make_user(db_session, "officer1", "officerpass1", Role.USER, station_id=station.id)
    token = _login(client, "dhk01admin", "adminpass1")

    response = client.patch(f"/users/{officer.id}/deactivate", headers=_auth(token))

    assert response.status_code == 200
    assert response.json()["is_active"] is False

    login_after = client.post("/auth/login", json={"username": "officer1", "password": "officerpass1"})
    assert login_after.status_code == 401


def test_admin_cannot_deactivate_other_stations_user(client, db_session):
    station_a = _make_station(db_session, code="DHK-01")
    station_b = _make_station(db_session, code="DHK-02")
    _make_user(db_session, "dhk01admin", "adminpass1", Role.ADMIN, station_id=station_a.id)
    officer_b = _make_user(db_session, "officer_b", "pass12345", Role.USER, station_id=station_b.id)
    token = _login(client, "dhk01admin", "adminpass1")

    response = client.patch(f"/users/{officer_b.id}/deactivate", headers=_auth(token))

    assert response.status_code == 403


def test_admin_cannot_deactivate_own_account(client, db_session):
    station = _make_station(db_session)
    admin = _make_user(db_session, "dhk01admin", "adminpass1", Role.ADMIN, station_id=station.id)
    token = _login(client, "dhk01admin", "adminpass1")

    response = client.patch(f"/users/{admin.id}/deactivate", headers=_auth(token))

    assert response.status_code == 400

    still_works = client.post("/auth/login", json={"username": "dhk01admin", "password": "adminpass1"})
    assert still_works.status_code == 200


def test_super_admin_cannot_deactivate_own_account(client, db_session):
    root = _make_user(db_session, "root", "s3cret", Role.SUPER_ADMIN)
    token = _login(client, "root", "s3cret")

    response = client.patch(f"/users/{root.id}/deactivate", headers=_auth(token))

    assert response.status_code == 400


def test_admin_cannot_deactivate_super_admin(client, db_session):
    station = _make_station(db_session)
    _make_user(db_session, "dhk01admin", "adminpass1", Role.ADMIN, station_id=station.id)
    root = _make_user(db_session, "root", "s3cret", Role.SUPER_ADMIN)
    token = _login(client, "dhk01admin", "adminpass1")

    response = client.patch(f"/users/{root.id}/deactivate", headers=_auth(token))

    assert response.status_code == 403


def test_admin_cannot_list_other_stations_users(client, db_session):
    station_a = _make_station(db_session, code="DHK-01")
    station_b = _make_station(db_session, code="DHK-02")
    _make_user(db_session, "dhk01admin", "adminpass1", Role.ADMIN, station_id=station_a.id)
    _make_user(db_session, "officer_b", "pass12345", Role.USER, station_id=station_b.id)
    token = _login(client, "dhk01admin", "adminpass1")

    response = client.get(f"/stations/{station_b.id}/users", headers=_auth(token))

    assert response.status_code == 403


def test_create_station_user_rejects_blank_username(client, db_session):
    station = _make_station(db_session)
    _make_user(db_session, "dhk01admin", "adminpass1", Role.ADMIN, station_id=station.id)
    token = _login(client, "dhk01admin", "adminpass1")

    response = client.post(
        f"/stations/{station.id}/users",
        json={"name": "Field Officer", "username": "", "password": "officerpass1", "role": "user"},
        headers=_auth(token),
    )

    assert response.status_code == 422


def test_create_station_user_rejects_short_password(client, db_session):
    station = _make_station(db_session)
    _make_user(db_session, "dhk01admin", "adminpass1", Role.ADMIN, station_id=station.id)
    token = _login(client, "dhk01admin", "adminpass1")

    response = client.post(
        f"/stations/{station.id}/users",
        json={"name": "Field Officer", "username": "officer1", "password": "short", "role": "user"},
        headers=_auth(token),
    )

    assert response.status_code == 422


def test_admin_cannot_create_another_admin(client, db_session):
    station = _make_station(db_session)
    _make_user(db_session, "dhk01admin", "adminpass1", Role.ADMIN, station_id=station.id)
    token = _login(client, "dhk01admin", "adminpass1")

    response = client.post(
        f"/stations/{station.id}/users",
        json={"name": "Peer Admin", "username": "peeradmin", "password": "peerpass123", "role": "admin"},
        headers=_auth(token),
    )

    assert response.status_code == 403


def test_super_admin_can_create_another_admin(client, db_session):
    station = _make_station(db_session)
    _make_user(db_session, "root", "s3cret", Role.SUPER_ADMIN)
    token = _login(client, "root", "s3cret")

    response = client.post(
        f"/stations/{station.id}/users",
        json={"name": "Peer Admin", "username": "peeradmin", "password": "peerpass123", "role": "admin"},
        headers=_auth(token),
    )

    assert response.status_code == 201
    assert response.json()["role"] == "admin"


def test_create_station_user_with_duplicate_username_returns_400(client, db_session):
    station = _make_station(db_session)
    _make_user(db_session, "dhk01admin", "adminpass1", Role.ADMIN, station_id=station.id)
    _make_user(db_session, "officer1", "officerpass1", Role.USER, station_id=station.id)
    token = _login(client, "dhk01admin", "adminpass1")

    response = client.post(
        f"/stations/{station.id}/users",
        json={"name": "Dup", "username": "officer1", "password": "otherpass1", "role": "user"},
        headers=_auth(token),
    )

    assert response.status_code == 400
