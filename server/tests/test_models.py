from app.models import Role, Station, User


def test_create_station_and_user(db_session):
    station = Station(name="Dhanmondi Thana", division="Dhaka", district="Dhaka", thana="Dhanmondi", code="DHK-01")
    db_session.add(station)
    db_session.flush()

    user = User(
        name="Admin One",
        username="admin1",
        password_hash="x",
        role=Role.ADMIN,
        station_id=station.id,
    )
    db_session.add(user)
    db_session.commit()

    fetched = db_session.query(User).filter(User.username == "admin1").first()
    assert fetched.role == Role.ADMIN
    assert fetched.station.code == "DHK-01"
    assert fetched.is_active is True
