import io
import json

from app.models import Role, Station, User
from app.security import hash_password

# Deterministic fake 128-d "embeddings" keyed by the raw upload bytes, so tests
# don't depend on real face_recognition detection or bundled photo fixtures.
FACE_A = [1.0] + [0.0] * 127
FACE_A_VARIANT = [0.9, 0.1] + [0.0] * 126  # same person, slightly different photo
FACE_B = [0.0, 1.0] + [0.0] * 126  # a different person entirely

EMBEDDINGS_BY_BYTES = {
    b"face-a": FACE_A,
    b"face-a-variant": FACE_A_VARIANT,
    b"face-b": FACE_B,
}


def _fake_embedding(image_bytes):
    return EMBEDDINGS_BY_BYTES.get(image_bytes)


def _make_station(db_session, code="DHK-01", division="Dhaka", district="Dhaka"):
    station = Station(name="Dhanmondi Thana", division=division, district=district, thana="Dhanmondi", code=code)
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


def _create_criminal(client, token, station_id, full_name, photo_bytes):
    payload = {
        "full_name": full_name,
        "gender": "Male",
        "crime_type": "Theft",
        "status": "Wanted",
        "station_id": station_id,
    }
    response = client.post(
        "/criminals",
        data={"payload": json.dumps(payload)},
        files={"front_photo": ("front.jpg", io.BytesIO(photo_bytes), "image/jpeg")},
        headers=_auth(token),
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_search_by_photo_returns_the_matching_criminal(client, db_session, monkeypatch):
    monkeypatch.setattr("app.routers.criminals.compute_face_embedding", _fake_embedding)
    station = _make_station(db_session)
    _make_user(db_session, "root", "s3cret", Role.SUPER_ADMIN)
    token = _login(client, "root", "s3cret")

    _create_criminal(client, token, station.id, "Face A Suspect", b"face-a")
    _create_criminal(client, token, station.id, "Face B Suspect", b"face-b")

    response = client.post(
        "/criminals/search-by-photo",
        files={"photo": ("query.jpg", io.BytesIO(b"face-a-variant"), "image/jpeg")},
        headers=_auth(token),
    )

    assert response.status_code == 200
    results = response.json()
    assert len(results) == 1
    assert results[0]["full_name"] == "Face A Suspect"
    assert 0 < results[0]["confidence"] <= 100
    assert results[0]["distance"] < 0.6


def test_search_by_photo_returns_empty_list_when_nothing_matches(client, db_session, monkeypatch):
    monkeypatch.setattr("app.routers.criminals.compute_face_embedding", _fake_embedding)
    station = _make_station(db_session)
    _make_user(db_session, "root", "s3cret", Role.SUPER_ADMIN)
    token = _login(client, "root", "s3cret")

    _create_criminal(client, token, station.id, "Face A Suspect", b"face-a")

    response = client.post(
        "/criminals/search-by-photo",
        files={"photo": ("query.jpg", io.BytesIO(b"face-b"), "image/jpeg")},
        headers=_auth(token),
    )

    assert response.status_code == 200
    assert response.json() == []


def test_search_by_photo_rejects_a_photo_with_no_detectable_face(client, db_session, monkeypatch):
    monkeypatch.setattr("app.routers.criminals.compute_face_embedding", _fake_embedding)
    _make_user(db_session, "root", "s3cret", Role.SUPER_ADMIN)
    token = _login(client, "root", "s3cret")

    response = client.post(
        "/criminals/search-by-photo",
        files={"photo": ("query.jpg", io.BytesIO(b"no-face-here"), "image/jpeg")},
        headers=_auth(token),
    )

    assert response.status_code == 422


def test_search_by_photo_is_scoped_to_the_caller_station(client, db_session, monkeypatch):
    monkeypatch.setattr("app.routers.criminals.compute_face_embedding", _fake_embedding)
    station_a = _make_station(db_session, code="DHK-01")
    station_b = _make_station(db_session, code="DHK-02")
    _make_user(db_session, "root", "s3cret", Role.SUPER_ADMIN)
    root_token = _login(client, "root", "s3cret")

    _create_criminal(client, root_token, station_a.id, "Own Station Suspect", b"face-a")
    _create_criminal(client, root_token, station_b.id, "Other Station Suspect", b"face-a")

    _make_user(db_session, "officer1", "officerpass1", Role.USER, station_id=station_a.id)
    officer_token = _login(client, "officer1", "officerpass1")

    response = client.post(
        "/criminals/search-by-photo",
        files={"photo": ("query.jpg", io.BytesIO(b"face-a-variant"), "image/jpeg")},
        headers=_auth(officer_token),
    )

    assert response.status_code == 200
    results = response.json()
    assert [r["full_name"] for r in results] == ["Own Station Suspect"]
