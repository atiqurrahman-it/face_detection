import io
import json

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


def _base_payload(station_id, **overrides):
    payload = {
        "full_name": "John Doe",
        "gender": "Male",
        "crime_type": "Theft",
        "status": "Wanted",
        "station_id": station_id,
    }
    payload.update(overrides)
    return payload


def _front_photo():
    return {"front_photo": ("front.jpg", io.BytesIO(b"fake-jpeg-bytes"), "image/jpeg")}


def test_station_user_can_create_criminal_with_front_photo(client, db_session):
    station = _make_station(db_session)
    _make_user(db_session, "officer1", "officerpass1", Role.USER, station_id=station.id)
    token = _login(client, "officer1", "officerpass1")

    response = client.post(
        "/criminals",
        data={"payload": json.dumps(_base_payload(station.id))},
        files=_front_photo(),
        headers=_auth(token),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["criminal_code"] == "CR-000001"
    assert body["full_name"] == "John Doe"
    assert body["station"]["code"] == "DHK-01"
    assert len(body["photos"]) == 1
    assert body["photos"][0]["angle"] == "front"

    photo_url = body["photos"][0]["url"]
    photo_response = client.get(photo_url)
    assert photo_response.status_code == 200
    assert photo_response.content == b"fake-jpeg-bytes"


def test_create_criminal_requires_front_photo(client, db_session):
    station = _make_station(db_session)
    _make_user(db_session, "officer1", "officerpass1", Role.USER, station_id=station.id)
    token = _login(client, "officer1", "officerpass1")

    response = client.post(
        "/criminals",
        data={"payload": json.dumps(_base_payload(station.id))},
        headers=_auth(token),
    )

    assert response.status_code == 422


def test_create_criminal_rejects_blank_full_name(client, db_session):
    station = _make_station(db_session)
    _make_user(db_session, "officer1", "officerpass1", Role.USER, station_id=station.id)
    token = _login(client, "officer1", "officerpass1")

    response = client.post(
        "/criminals",
        data={"payload": json.dumps(_base_payload(station.id, full_name=""))},
        files=_front_photo(),
        headers=_auth(token),
    )

    assert response.status_code == 422


def test_station_user_cannot_create_criminal_for_other_station(client, db_session):
    station_a = _make_station(db_session, code="DHK-01")
    station_b = _make_station(db_session, code="DHK-02")
    _make_user(db_session, "officer1", "officerpass1", Role.USER, station_id=station_a.id)
    token = _login(client, "officer1", "officerpass1")

    response = client.post(
        "/criminals",
        data={"payload": json.dumps(_base_payload(station_b.id))},
        files=_front_photo(),
        headers=_auth(token),
    )

    assert response.status_code == 403


def test_super_admin_can_create_criminal_for_any_station(client, db_session):
    station = _make_station(db_session)
    _make_user(db_session, "root", "s3cret", Role.SUPER_ADMIN)
    token = _login(client, "root", "s3cret")

    response = client.post(
        "/criminals",
        data={"payload": json.dumps(_base_payload(station.id))},
        files=_front_photo(),
        headers=_auth(token),
    )

    assert response.status_code == 201


def _create_criminal(client, token, station_id, **overrides):
    response = client.post(
        "/criminals",
        data={"payload": json.dumps(_base_payload(station_id, **overrides))},
        files=_front_photo(),
        headers=_auth(token),
    )
    assert response.status_code == 201
    return response.json()


def test_search_returns_criminals_across_all_stations(client, db_session):
    station_a = _make_station(db_session, code="DHK-01")
    station_b = _make_station(db_session, code="DHK-02")
    _make_user(db_session, "officer_a", "pass12345", Role.USER, station_id=station_a.id)
    _make_user(db_session, "officer_b", "pass12345", Role.USER, station_id=station_b.id)
    token_a = _login(client, "officer_a", "pass12345")
    token_b = _login(client, "officer_b", "pass12345")

    _create_criminal(client, token_a, station_a.id, full_name="Alpha Suspect")
    _create_criminal(client, token_b, station_b.id, full_name="Beta Suspect")

    response = client.get("/criminals", headers=_auth(token_a))

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 2
    names = {item["full_name"] for item in body["items"]}
    assert names == {"Alpha Suspect", "Beta Suspect"}


def test_search_filters_by_status(client, db_session):
    station = _make_station(db_session)
    _make_user(db_session, "officer1", "officerpass1", Role.USER, station_id=station.id)
    token = _login(client, "officer1", "officerpass1")

    _create_criminal(client, token, station.id, full_name="Wanted One", status="Wanted")
    _create_criminal(client, token, station.id, full_name="Released One", status="Released")

    response = client.get("/criminals", params={"status": "Wanted"}, headers=_auth(token))

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["full_name"] == "Wanted One"


def test_search_requires_authentication(client):
    response = client.get("/criminals")
    assert response.status_code == 401


def test_get_criminal_detail_returns_full_profile(client, db_session):
    station = _make_station(db_session)
    _make_user(db_session, "officer1", "officerpass1", Role.USER, station_id=station.id)
    token = _login(client, "officer1", "officerpass1")
    created = _create_criminal(client, token, station.id)

    response = client.get(f"/criminals/{created['id']}", headers=_auth(token))

    assert response.status_code == 200
    assert response.json()["criminal_code"] == created["criminal_code"]


def test_get_criminal_detail_404_for_missing(client, db_session):
    _make_user(db_session, "root", "s3cret", Role.SUPER_ADMIN)
    token = _login(client, "root", "s3cret")

    response = client.get("/criminals/999", headers=_auth(token))

    assert response.status_code == 404


def test_admin_can_edit_own_station_criminal(client, db_session):
    station = _make_station(db_session)
    _make_user(db_session, "dhk01admin", "adminpass1", Role.ADMIN, station_id=station.id)
    token = _login(client, "dhk01admin", "adminpass1")
    created = _create_criminal(client, token, station.id, status="Wanted")

    response = client.patch(
        f"/criminals/{created['id']}",
        data={"payload": json.dumps({"status": "Arrested"})},
        headers=_auth(token),
    )

    assert response.status_code == 200
    assert response.json()["status"] == "Arrested"


def test_admin_cannot_edit_other_station_criminal(client, db_session):
    station_a = _make_station(db_session, code="DHK-01")
    station_b = _make_station(db_session, code="DHK-02")
    _make_user(db_session, "dhk01admin", "adminpass1", Role.ADMIN, station_id=station_a.id)
    _make_user(db_session, "officer_b", "pass12345", Role.USER, station_id=station_b.id)
    token_a = _login(client, "dhk01admin", "adminpass1")
    token_b = _login(client, "officer_b", "pass12345")
    created = _create_criminal(client, token_b, station_b.id)

    response = client.patch(
        f"/criminals/{created['id']}",
        data={"payload": json.dumps({"status": "Arrested"})},
        headers=_auth(token_a),
    )

    assert response.status_code == 403


def test_edit_404_for_missing_criminal(client, db_session):
    _make_user(db_session, "root", "s3cret", Role.SUPER_ADMIN)
    token = _login(client, "root", "s3cret")

    response = client.patch(
        "/criminals/999",
        data={"payload": json.dumps({"status": "Arrested"})},
        headers=_auth(token),
    )

    assert response.status_code == 404


def test_edit_can_replace_front_photo(client, db_session):
    station = _make_station(db_session)
    _make_user(db_session, "officer1", "officerpass1", Role.USER, station_id=station.id)
    token = _login(client, "officer1", "officerpass1")
    created = _create_criminal(client, token, station.id)

    response = client.patch(
        f"/criminals/{created['id']}",
        data={"payload": json.dumps({})},
        files={"front_photo": ("new-front.jpg", io.BytesIO(b"new-jpeg-bytes"), "image/jpeg")},
        headers=_auth(token),
    )

    assert response.status_code == 200
    photo_url = response.json()["photos"][0]["url"]
    photo_response = client.get(photo_url)
    assert photo_response.content == b"new-jpeg-bytes"
