from datetime import date

from app.models import Criminal, CriminalPhoto, CriminalStatus, Station, User, Role
from app.security import hash_password


def test_create_criminal_with_photo(db_session):
    station = Station(name="Dhanmondi Thana", district="Dhaka", code="DHK-01")
    db_session.add(station)
    db_session.flush()

    officer = User(
        name="Officer One",
        username="officer1",
        password_hash=hash_password("officerpass1"),
        role=Role.USER,
        station_id=station.id,
    )
    db_session.add(officer)
    db_session.flush()

    criminal = Criminal(
        criminal_code="CR-000001",
        full_name="John Doe",
        gender="Male",
        crime_type="Theft",
        status=CriminalStatus.WANTED,
        station_id=station.id,
        added_by=officer.id,
        date_of_birth=date(1990, 1, 1),
    )
    db_session.add(criminal)
    db_session.flush()

    photo = CriminalPhoto(criminal_id=criminal.id, photo_path="criminals/CR-000001/front.jpg", angle="front")
    db_session.add(photo)
    db_session.commit()

    fetched = db_session.query(Criminal).filter(Criminal.criminal_code == "CR-000001").first()
    assert fetched.status == CriminalStatus.WANTED
    assert fetched.station.code == "DHK-01"
    assert len(fetched.photos) == 1
    assert fetched.photos[0].url == "/uploads/criminals/CR-000001/front.jpg"
    assert fetched.photos[0].face_embedding is None
    assert fetched.repeat_offender is False
