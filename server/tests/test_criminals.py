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
