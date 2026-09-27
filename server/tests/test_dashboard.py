from datetime import datetime

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


def _make_station(db_session, division, district, thana, code):
    station = Station(name=f"{thana} Thana", division=division, district=district, thana=thana, code=code)
    db_session.add(station)
    db_session.commit()
    db_session.refresh(station)
    return station


def _make_criminal(db_session, station_id, added_by, code, created_at=None):
    criminal = Criminal(
        criminal_code=code,
        full_name="John Doe",
        gender="Male",
        crime_type="Theft",
        status=CriminalStatus.WANTED,
        station_id=station_id,
        added_by=added_by,
        created_at=created_at or datetime.utcnow(),
    )
    db_session.add(criminal)
    db_session.commit()
    db_session.refresh(criminal)
    return criminal


def _login(client, username, password):
    return client.post("/auth/login", json={"username": username, "password": password}).json()["access_token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_super_admin_gets_dashboard_stats(client, db_session):
    root = _make_user(db_session, "root", "s3cret", Role.SUPER_ADMIN)
    token = _login(client, "root", "s3cret")

    dhaka_station = _make_station(db_session, "Dhaka", "Dhaka", "Gulshan", "DHK-01")
    ctg_station = _make_station(db_session, "Chattogram", "Chattogram", "Kotwali", "CTG-01")

    _make_criminal(db_session, dhaka_station.id, root.id, "CR-000001")
    _make_criminal(db_session, dhaka_station.id, root.id, "CR-000002")
    _make_criminal(db_session, ctg_station.id, root.id, "CR-000003")

    response = client.get("/dashboard/stats", headers=_auth(token))

    assert response.status_code == 200
    body = response.json()
    assert body["total_stations"] == 2
    assert body["total_criminals"] == 3

    by_division = {row["division"]: row for row in body["by_division"]}
    assert by_division["Dhaka"] == {"division": "Dhaka", "stations": 1, "criminals": 2}
    assert by_division["Chattogram"] == {"division": "Chattogram", "stations": 1, "criminals": 1}

    assert len(body["criminal_trend"]) == 6
    current_period = datetime.utcnow().strftime("%Y-%m")
    current_month = next(row for row in body["criminal_trend"] if row["period"] == current_period)
    assert current_month["count"] == 3


def test_division_with_no_criminals_reports_zero(client, db_session):
    root = _make_user(db_session, "root", "s3cret", Role.SUPER_ADMIN)
    token = _login(client, "root", "s3cret")

    _make_station(db_session, "Sylhet", "Sylhet", "Kotwali Model (Sylhet)", "SYL-01")

    response = client.get("/dashboard/stats", headers=_auth(token))

    assert response.status_code == 200
    by_division = {row["division"]: row for row in response.json()["by_division"]}
    assert by_division["Sylhet"] == {"division": "Sylhet", "stations": 1, "criminals": 0}


def test_non_super_admin_cannot_view_dashboard_stats(client, db_session):
    _make_user(db_session, "dhk01admin", "adminpass1", Role.ADMIN, station_id=None)
    token = _login(client, "dhk01admin", "adminpass1")

    response = client.get("/dashboard/stats", headers=_auth(token))

    assert response.status_code == 403
