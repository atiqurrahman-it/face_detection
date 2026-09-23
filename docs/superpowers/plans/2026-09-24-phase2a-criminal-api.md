# Phase 2a: Criminal CRUD + Search API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the `criminals`/`criminal_photos` tables and a full CRUD + Bangladesh-wide search REST API on top of Phase 1's auth/stations backend, with photo upload to local disk. This is the backend half of Phase 2; the redesigned UI and new screens that consume this API are a separate plan (Phase 2b), built after this one ships and is tested.

**Architecture:** New SQLAlchemy models (`Criminal`, `CriminalPhoto`) alongside Phase 1's `Station`/`User` in `server/app/models.py`. A new `server/app/routers/criminals.py` reuses Phase 1's `require_roles` and `_station_scope` (imported from `stations.py`, not duplicated) for the same role/station enforcement pattern already established. Multipart requests (fields + photo files) are handled by accepting one `payload` form field containing a JSON string (validated against a Pydantic schema via `.parse_raw()`) alongside `UploadFile` file fields — the standard FastAPI pattern for combining structured data with file uploads on this FastAPI version. Photos are written to `server/uploads/criminals/<criminal_code>/` and served back via a mounted `StaticFiles` app at `/uploads`.

**Tech Stack:** FastAPI (existing) + SQLAlchemy (existing) + `python-multipart` (new — required for `File`/`Form` parameters).

**Spec:** `docs/superpowers/specs/2026-09-24-phase2-criminal-crud-search-and-ui-redesign.md` (this plan implements its "Criminal data model", "Permissions", and "API surface" sections, plus the "Decision: loosening `GET /stations`" section). The Phase 1 spec (`docs/superpowers/specs/2026-09-23-criminal-database-face-recognition.md`) is background context.

## Global Constraints

- Only the backend ships in this plan — no frontend changes. Phase 2b consumes this API afterward.
- Photo storage is local disk under `server/uploads/` (Phase 1 spec's ruling), never cloud storage.
- `face_embedding` on `criminal_photos` stays `NULL` in this phase — Phase 3 populates it. Do not add embedding-generation code here.
- Only Station Admin and Super Admin can delete criminals; Station User can create/edit but never delete (spec's role table) — enforced by the same `require_roles` dependency pattern Phase 1 uses, not an in-body role check.
- Search (`GET /criminals`) and detail (`GET /criminals/{id}`) are unscoped by station — every logged-in role sees every station's records, matching "Bangladesh-wide" in the spec.
- `GET /stations` changes from Super-Admin-only to any authenticated role (spec's explicit decision). The existing Phase 1 test asserting the opposite (`test_list_stations_requires_super_admin`) must be updated to match, not left failing or deleted silently.
- Reuse `_station_scope` from `server/app/routers/stations.py` for criminal station-permission checks — do not write a second copy of the same logic.

## Review Focus

- A required field is blank (e.g. `"full_name": ""`), not merely absent — must return 422, not a criminal silently created with blank data. Pydantic's `constr(min_length=1)` (already defined as `Name` in `schemas.py`) must be reused, not re-invented.
- The front photo is omitted entirely on create — must return 422 (FastAPI's own missing-required-`File` handling), never a criminal created with zero photos, since the spec requires "at least one front photo".
- A Station Admin/User submits a `station_id` that is not their own — must return 403, never a criminal silently created under a different thana or a 500 from a dangling foreign key.
- Editing or deleting a criminal id that doesn't exist — must return 404 before any station-scope check runs, so a missing record never crashes a `None.station_id` comparison inside `_station_scope`.
- A Station User (not Admin) calling `DELETE /criminals/{id}` — must return 403 from the role dependency alone, even for a criminal in their own station, since Station Users can never delete per the spec's role table.

---

### Task 1: Criminal & CriminalPhoto models

**Files:**
- Modify: `server/app/models.py` (add `CriminalStatus` enum, `Criminal`, `CriminalPhoto`)
- Test: `server/tests/test_criminal_models.py`

**Interfaces:**
- Consumes: `app.database.Base` (existing).
- Produces: `app.models.CriminalStatus` (str Enum: `WANTED="Wanted"`, `ARRESTED="Arrested"`, `UNDER_TRIAL="Under trial"`, `CONVICTED="Convicted"`, `RELEASED="Released"`, `ABSCONDING="Absconding"`), `app.models.Criminal` (all fields listed in the spec's Criminal data model table, `station` relationship, `photos` relationship), `app.models.CriminalPhoto` (`id, criminal_id, photo_path, angle, face_embedding, created_at`, plus a `url` property returning `f"/uploads/{self.photo_path}"`).

- [ ] **Step 1: Write the failing model test**

`server/tests/test_criminal_models.py`:
```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && ./myenv/bin/python -m pytest tests/test_criminal_models.py -v`
Expected: FAIL/ERROR — `ImportError: cannot import name 'Criminal' from 'app.models'`.

- [ ] **Step 3: Add `CriminalStatus`, `Criminal`, `CriminalPhoto` to `server/app/models.py`**

Add `Date, Text` to the existing `from sqlalchemy import ...` line (it currently imports `Boolean, Column, DateTime, Enum, ForeignKey, Integer, String`), so it reads:
```python
from sqlalchemy import Boolean, Column, Date, DateTime, Enum, ForeignKey, Integer, String, Text
```

Append to the bottom of the file:
```python
class CriminalStatus(str, enum.Enum):
    WANTED = "Wanted"
    ARRESTED = "Arrested"
    UNDER_TRIAL = "Under trial"
    CONVICTED = "Convicted"
    RELEASED = "Released"
    ABSCONDING = "Absconding"


class Criminal(Base):
    __tablename__ = "criminals"

    id = Column(Integer, primary_key=True)
    criminal_code = Column(String, unique=True, nullable=False)
    full_name = Column(String, nullable=False)
    alias = Column(String, nullable=True)
    father_name = Column(String, nullable=True)
    mother_name = Column(String, nullable=True)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String, nullable=False)
    nid_or_birth_cert = Column(String, nullable=True)
    blood_group = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    occupation = Column(String, nullable=True)
    present_address = Column(String, nullable=True)
    permanent_address = Column(String, nullable=True)
    height = Column(String, nullable=True)
    identifying_marks = Column(String, nullable=True)
    fir_case_number = Column(String, nullable=True)
    crime_type = Column(String, nullable=False)
    penal_code_sections = Column(String, nullable=True)
    crime_description = Column(String, nullable=True)
    incident_date = Column(Date, nullable=True)
    arrest_date = Column(Date, nullable=True)
    status = Column(Enum(CriminalStatus), nullable=False)
    station_id = Column(Integer, ForeignKey("stations.id"), nullable=False)
    arresting_officer = Column(String, nullable=True)
    repeat_offender = Column(Boolean, default=False, nullable=False)
    added_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    station = relationship("Station")
    photos = relationship("CriminalPhoto", back_populates="criminal", cascade="all, delete-orphan")


class CriminalPhoto(Base):
    __tablename__ = "criminal_photos"

    id = Column(Integer, primary_key=True)
    criminal_id = Column(Integer, ForeignKey("criminals.id"), nullable=False)
    photo_path = Column(String, nullable=False)
    angle = Column(String, nullable=False)
    face_embedding = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    criminal = relationship("Criminal", back_populates="photos")

    @property
    def url(self) -> str:
        return f"/uploads/{self.photo_path}"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && ./myenv/bin/python -m pytest tests/test_criminal_models.py -v`
Expected: PASS 1/1.

- [ ] **Step 5: Run the full backend suite so far**

Run: `cd server && ./myenv/bin/python -m pytest -v`
Expected: PASS, all 40 existing tests plus the new one (41 total), no regressions.

- [ ] **Step 6: Commit**

```bash
cd server && git add app/models.py tests/test_criminal_models.py && git commit -m "feat: add Criminal and CriminalPhoto models"
```

---

### Task 2: Loosen `GET /stations` to any authenticated role

**Files:**
- Modify: `server/app/routers/stations.py:49-53` (the `list_stations` function's `require_roles` dependency)
- Modify: `server/tests/test_stations.py` (replace `test_list_stations_requires_super_admin`)

**Interfaces:**
- Consumes: `app.deps.require_roles` (existing).
- Produces: no change to `GET /stations`'s response shape, only its role dependency. Phase 2b's Criminal Search screen relies on every logged-in role being able to call this endpoint for its station filter dropdown.

- [ ] **Step 1: Replace the failing-permission test with a passing-permission test**

In `server/tests/test_stations.py`, replace this existing test:
```python
def test_list_stations_requires_super_admin(client, db_session):
    _make_user(db_session, "dhk01admin", "adminpass1", Role.ADMIN)
    token = _login(client, "dhk01admin", "adminpass1")

    response = client.get("/stations", headers=_auth(token))

    assert response.status_code == 403
```

with:
```python
def test_any_authenticated_role_can_list_stations(client, db_session):
    station = _make_station(db_session)
    _make_user(db_session, "dhk01admin", "adminpass1", Role.ADMIN, station_id=station.id)
    _make_user(db_session, "officer1", "officerpass1", Role.USER, station_id=station.id)

    for username, password in (("dhk01admin", "adminpass1"), ("officer1", "officerpass1")):
        token = _login(client, username, password)
        response = client.get("/stations", headers=_auth(token))
        assert response.status_code == 200, f"{username} got {response.status_code}"


def _make_station(db_session, code="DHK-01"):
    station = Station(name="Dhanmondi Thana", district="Dhaka", code=code)
    db_session.add(station)
    db_session.commit()
    db_session.refresh(station)
    return station
```

(`_make_station` does not already exist in `test_stations.py` — Phase 1's `test_stations.py` only ever created stations through the API, never directly via ORM. Add the import it needs: change the file's `from app.models import Role, User` line to `from app.models import Role, Station, User`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && ./myenv/bin/python -m pytest tests/test_stations.py -v`
Expected: FAIL — `test_any_authenticated_role_can_list_stations` fails because `officer1` (a `USER`) still gets 403.

- [ ] **Step 3: Loosen the role dependency in `server/app/routers/stations.py`**

Change:
```python
@router.get("", response_model=list[StationOut])
def list_stations(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.SUPER_ADMIN)),
):
    return db.query(Station).all()
```
to:
```python
@router.get("", response_model=list[StationOut])
def list_stations(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.SUPER_ADMIN, Role.ADMIN, Role.USER)),
):
    return db.query(Station).all()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && ./myenv/bin/python -m pytest tests/test_stations.py -v`
Expected: PASS, all tests in the file green.

- [ ] **Step 5: Run the full backend suite**

Run: `cd server && ./myenv/bin/python -m pytest -v`
Expected: PASS, no regressions.

- [ ] **Step 6: Commit**

```bash
cd server && git add app/routers/stations.py tests/test_stations.py && git commit -m "feat: allow any authenticated role to list stations"
```

---

### Task 3: Photo storage helper + static file serving

**Files:**
- Create: `server/app/storage.py`
- Modify: `server/app/main.py` (mount `/uploads`)
- Modify: `.gitignore` (repo root, add `server/uploads/`)
- Test: `server/tests/test_storage.py`

**Interfaces:**
- Consumes: nothing new.
- Produces: `app.storage.save_criminal_photo(criminal_code: str, angle: str, upload) -> str` — writes the given file-like upload to `server/uploads/criminals/<criminal_code>/<angle><ext>` and returns the path relative to `server/uploads/` (e.g. `"criminals/CR-000001/front.jpg"`) — this is exactly the string `CriminalPhoto.photo_path` stores. Task 4 calls this directly.

- [ ] **Step 1: Write the failing storage test**

`server/tests/test_storage.py`:
```python
import io
import os

from app.storage import UPLOAD_ROOT, save_criminal_photo


class _FakeUpload:
    def __init__(self, filename: str, content: bytes):
        self.filename = filename
        self.file = io.BytesIO(content)


def test_save_criminal_photo_writes_file_and_returns_relative_path():
    upload = _FakeUpload("selfie.jpg", b"fake-image-bytes")

    relative_path = save_criminal_photo("CR-TEST-001", "front", upload)

    assert relative_path == "criminals/CR-TEST-001/front.jpg"
    written_path = os.path.join(UPLOAD_ROOT, relative_path)
    assert os.path.isfile(written_path)
    with open(written_path, "rb") as f:
        assert f.read() == b"fake-image-bytes"

    os.remove(written_path)
    os.rmdir(os.path.dirname(written_path))
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && ./myenv/bin/python -m pytest tests/test_storage.py -v`
Expected: FAIL/ERROR — `ModuleNotFoundError: No module named 'app.storage'`.

- [ ] **Step 3: Implement `server/app/storage.py`**

```python
import os
import shutil

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_ROOT = os.path.join(BASE_DIR, "uploads")
CRIMINAL_PHOTOS_ROOT = os.path.join(UPLOAD_ROOT, "criminals")


def save_criminal_photo(criminal_code: str, angle: str, upload) -> str:
    ext = os.path.splitext(upload.filename or "")[1] or ".jpg"
    directory = os.path.join(CRIMINAL_PHOTOS_ROOT, criminal_code)
    os.makedirs(directory, exist_ok=True)
    filename = f"{angle}{ext}"
    dest_path = os.path.join(directory, filename)
    with open(dest_path, "wb") as f:
        shutil.copyfileobj(upload.file, f)
    return os.path.relpath(dest_path, UPLOAD_ROOT).replace(os.sep, "/")
```

Note: `BASE_DIR` here is `server/app/../` = `server/`, so `UPLOAD_ROOT` is `server/uploads/`, matching where `server/app/main.py` will mount `StaticFiles` from in the next step.

- [ ] **Step 4: Mount static file serving in `server/app/main.py`**

Add `from fastapi.staticfiles import StaticFiles` to the imports, and add `from .storage import UPLOAD_ROOT`. Then, after `Base.metadata.create_all(bind=engine)` and before `app = FastAPI()` stays the same, but after the `app.include_router(...)` calls, add:
```python
os.makedirs(UPLOAD_ROOT, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_ROOT), name="uploads")
```
(`os` is already imported in this file from Task 1's work in Phase 1.)

- [ ] **Step 5: Add `server/uploads/` to `.gitignore`**

Append to the repo-root `.gitignore`:
```
server/uploads/
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd server && ./myenv/bin/python -m pytest tests/test_storage.py -v`
Expected: PASS 1/1.

- [ ] **Step 7: Run the full backend suite**

Run: `cd server && ./myenv/bin/python -m pytest -v`
Expected: PASS, no regressions.

- [ ] **Step 8: Commit**

```bash
cd server && git add app/storage.py app/main.py tests/test_storage.py && git -C .. add .gitignore && git commit -m "feat: add criminal photo storage helper and static file serving"
```

---

### Task 4: `POST /criminals` — create with photo upload

**Files:**
- Create: `server/app/routers/criminals.py`
- Modify: `server/app/schemas.py` (append `CriminalCreate`, `CriminalPhotoOut`, `CriminalOut`)
- Modify: `server/app/main.py` (include the criminals router)
- Modify: `server/requirements.txt` (append `python-multipart`)
- Test: `server/tests/test_criminals.py`

**Interfaces:**
- Consumes: `app.models.{Criminal, CriminalPhoto, CriminalStatus, Station, User, Role}`, `app.deps.require_roles`, `app.routers.stations._station_scope`, `app.storage.save_criminal_photo`, `app.schemas.StationOut` (Tasks 1-3, Phase 1).
- Produces: `POST /criminals`, `app.schemas.CriminalCreate`, `app.schemas.CriminalOut`, `app.schemas.CriminalPhotoOut`. Tasks 5-7 consume `CriminalOut`/`CriminalCreate` and extend `server/app/routers/criminals.py`'s `router`.

- [ ] **Step 1: Append `python-multipart` to `server/requirements.txt` and install it**

Append to `server/requirements.txt`:
```
python-multipart==0.0.9
```

Run: `cd server && ./myenv/bin/pip install python-multipart==0.0.9`
Expected: installs successfully.

- [ ] **Step 2: Write the failing create tests**

`server/tests/test_criminals.py`:
```python
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
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd server && ./myenv/bin/python -m pytest tests/test_criminals.py -v`
Expected: FAIL — 404s (`/criminals` route doesn't exist yet).

- [ ] **Step 4: Append criminal schemas to `server/app/schemas.py`**

Add `date, datetime` to the top-level typing import line (change `from typing import Optional` to `from typing import List, Optional`), and add a new import line `from datetime import date, datetime`. Then append:

```python
from .models import CriminalStatus


class CriminalCreate(BaseModel):
    full_name: Name
    gender: Name
    crime_type: Name
    status: CriminalStatus
    station_id: int
    alias: Optional[str] = None
    father_name: Optional[str] = None
    mother_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    nid_or_birth_cert: Optional[str] = None
    blood_group: Optional[str] = None
    phone: Optional[str] = None
    occupation: Optional[str] = None
    present_address: Optional[str] = None
    permanent_address: Optional[str] = None
    height: Optional[str] = None
    identifying_marks: Optional[str] = None
    fir_case_number: Optional[str] = None
    penal_code_sections: Optional[str] = None
    crime_description: Optional[str] = None
    incident_date: Optional[date] = None
    arrest_date: Optional[date] = None
    arresting_officer: Optional[str] = None
    repeat_offender: bool = False


class CriminalPhotoOut(BaseModel):
    id: int
    angle: str
    url: str

    class Config:
        orm_mode = True


class CriminalOut(BaseModel):
    id: int
    criminal_code: str
    full_name: str
    alias: Optional[str]
    father_name: Optional[str]
    mother_name: Optional[str]
    date_of_birth: Optional[date]
    gender: str
    nid_or_birth_cert: Optional[str]
    blood_group: Optional[str]
    phone: Optional[str]
    occupation: Optional[str]
    present_address: Optional[str]
    permanent_address: Optional[str]
    height: Optional[str]
    identifying_marks: Optional[str]
    fir_case_number: Optional[str]
    crime_type: str
    penal_code_sections: Optional[str]
    crime_description: Optional[str]
    incident_date: Optional[date]
    arrest_date: Optional[date]
    status: CriminalStatus
    station: StationOut
    arresting_officer: Optional[str]
    repeat_offender: bool
    added_by: int
    created_at: datetime
    updated_at: datetime
    photos: List[CriminalPhotoOut]

    class Config:
        orm_mode = True
```

(`StationOut` is already defined earlier in this file from Phase 1 — `CriminalOut.station` reuses it directly rather than duplicating station fields.)

- [ ] **Step 5: Implement `server/app/routers/criminals.py`**

```python
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import ValidationError
from sqlalchemy.orm import Session
from starlette import status

from ..database import get_db
from ..deps import require_roles
from ..models import Criminal, CriminalPhoto, Role, Station, User
from ..schemas import CriminalCreate, CriminalOut
from ..storage import save_criminal_photo
from .stations import _station_scope

router = APIRouter(prefix="/criminals", tags=["criminals"])


def _parse_payload(payload: str, model):
    try:
        return model.parse_raw(payload)
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.errors())


@router.post("", response_model=CriminalOut, status_code=status.HTTP_201_CREATED)
async def create_criminal(
    payload: str = Form(...),
    front_photo: UploadFile = File(...),
    left_photo: UploadFile = File(None),
    right_photo: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.SUPER_ADMIN, Role.ADMIN, Role.USER)),
):
    data = _parse_payload(payload, CriminalCreate)
    _station_scope(data.station_id, current_user)

    station = db.query(Station).filter(Station.id == data.station_id).first()
    if not station:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Station not found")

    criminal = Criminal(
        full_name=data.full_name,
        alias=data.alias,
        father_name=data.father_name,
        mother_name=data.mother_name,
        date_of_birth=data.date_of_birth,
        gender=data.gender,
        nid_or_birth_cert=data.nid_or_birth_cert,
        blood_group=data.blood_group,
        phone=data.phone,
        occupation=data.occupation,
        present_address=data.present_address,
        permanent_address=data.permanent_address,
        height=data.height,
        identifying_marks=data.identifying_marks,
        fir_case_number=data.fir_case_number,
        crime_type=data.crime_type,
        penal_code_sections=data.penal_code_sections,
        crime_description=data.crime_description,
        incident_date=data.incident_date,
        arrest_date=data.arrest_date,
        status=data.status,
        station_id=data.station_id,
        arresting_officer=data.arresting_officer,
        repeat_offender=data.repeat_offender,
        added_by=current_user.id,
        criminal_code="PENDING",
    )
    db.add(criminal)
    db.flush()

    criminal.criminal_code = f"CR-{criminal.id:06d}"

    for angle, upload in (("front", front_photo), ("left_profile", left_photo), ("right_profile", right_photo)):
        if upload is not None:
            path = save_criminal_photo(criminal.criminal_code, angle, upload)
            db.add(CriminalPhoto(criminal_id=criminal.id, photo_path=path, angle=angle))

    db.commit()
    db.refresh(criminal)
    return criminal
```

- [ ] **Step 6: Wire the criminals router and static mount into `server/app/main.py`**

Modify `server/app/main.py`: change the router import to `from .routers import auth, criminals, detection, stations, users` and add `app.include_router(criminals.router)` above `app.include_router(detection.router)`.

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd server && ./myenv/bin/python -m pytest tests/test_criminals.py -v`
Expected: PASS 5/5.

- [ ] **Step 8: Run the full backend suite**

Run: `cd server && ./myenv/bin/python -m pytest -v`
Expected: PASS, no regressions.

- [ ] **Step 9: Commit**

```bash
cd server && git add app/routers/criminals.py app/schemas.py app/main.py requirements.txt tests/test_criminals.py && git commit -m "feat: add POST /criminals with photo upload"
```

---

### Task 5: `GET /criminals` search + `GET /criminals/{id}` detail

**Files:**
- Modify: `server/app/routers/criminals.py` (append `list_criminals`, `get_criminal`)
- Modify: `server/app/schemas.py` (append `CriminalListOut`)
- Test: `server/tests/test_criminals.py` (append tests)

**Interfaces:**
- Consumes: `app.schemas.CriminalOut` (Task 4).
- Produces: `GET /criminals` (query params `q, station_id, status, crime_type, page, page_size`; response `{items, total, page, page_size}`), `GET /criminals/{id}`. Tasks 6-7 extend the same router file.

- [ ] **Step 1: Write the failing search/detail tests**

Append to `server/tests/test_criminals.py`:
```python
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && ./myenv/bin/python -m pytest tests/test_criminals.py -v`
Expected: FAIL — 404s on `GET /criminals` and `GET /criminals/{id}` (routes don't exist yet).

- [ ] **Step 3: Append `CriminalListOut` to `server/app/schemas.py`**

```python
class CriminalListOut(BaseModel):
    items: List[CriminalOut]
    total: int
    page: int
    page_size: int
```

- [ ] **Step 4: Append search and detail endpoints to `server/app/routers/criminals.py`**

Add `Optional` to the file's imports (`from typing import Optional`), add `Query` to the existing `from fastapi import ...` line (so it reads `from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile`), add `or_` to a new `from sqlalchemy import or_` import line, and add `CriminalListOut, CriminalStatus` to the existing schema/model import lines. Then append:

```python
@router.get("", response_model=CriminalListOut)
def list_criminals(
    q: Optional[str] = None,
    station_id: Optional[int] = None,
    status_filter: Optional[CriminalStatus] = Query(None, alias="status"),
    crime_type: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.SUPER_ADMIN, Role.ADMIN, Role.USER)),
):
    query = db.query(Criminal)
    if q:
        like = f"%{q}%"
        query = query.filter(or_(Criminal.full_name.ilike(like), Criminal.nid_or_birth_cert.ilike(like)))
    if station_id:
        query = query.filter(Criminal.station_id == station_id)
    if status_filter:
        query = query.filter(Criminal.status == status_filter)
    if crime_type:
        query = query.filter(Criminal.crime_type.ilike(f"%{crime_type}%"))

    total = query.count()
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)
    items = (
        query.order_by(Criminal.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return CriminalListOut(items=items, total=total, page=page, page_size=page_size)


@router.get("/{criminal_id}", response_model=CriminalOut)
def get_criminal(
    criminal_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.SUPER_ADMIN, Role.ADMIN, Role.USER)),
):
    criminal = db.query(Criminal).filter(Criminal.id == criminal_id).first()
    if not criminal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Criminal not found")
    return criminal
```

Note: the Python parameter is named `status_filter` (not `status`) to avoid shadowing the `starlette.status` module already imported in this file as `status` and used for `status.HTTP_*` constants throughout — `Query(None, alias="status")` keeps the actual query string key as `?status=Wanted`, matching the spec's documented API surface and this task's own test.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd server && ./myenv/bin/python -m pytest tests/test_criminals.py -v`
Expected: PASS 10/10.

- [ ] **Step 6: Run the full backend suite**

Run: `cd server && ./myenv/bin/python -m pytest -v`
Expected: PASS, no regressions.

- [ ] **Step 7: Commit**

```bash
cd server && git add app/routers/criminals.py app/schemas.py tests/test_criminals.py && git commit -m "feat: add criminal search and detail endpoints"
```

---

### Task 6: `PATCH /criminals/{id}` — edit

**Files:**
- Modify: `server/app/routers/criminals.py` (append `update_criminal`)
- Modify: `server/app/schemas.py` (append `CriminalUpdate`)
- Test: `server/tests/test_criminals.py` (append tests)

**Interfaces:**
- Consumes: `app.schemas.CriminalOut`, `_parse_payload`, `_station_scope` (Tasks 4-5).
- Produces: `PATCH /criminals/{id}`. Task 7 does not depend on this task's additions.

- [ ] **Step 1: Write the failing edit tests**

Append to `server/tests/test_criminals.py`:
```python
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && ./myenv/bin/python -m pytest tests/test_criminals.py -v`
Expected: FAIL — 405s (`PATCH /criminals/{id}` doesn't exist yet, `POST`/`GET` on that path aren't allowed).

- [ ] **Step 3: Append `CriminalUpdate` to `server/app/schemas.py`**

```python
class CriminalUpdate(BaseModel):
    full_name: Optional[Name] = None
    gender: Optional[Name] = None
    crime_type: Optional[Name] = None
    status: Optional[CriminalStatus] = None
    alias: Optional[str] = None
    father_name: Optional[str] = None
    mother_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    nid_or_birth_cert: Optional[str] = None
    blood_group: Optional[str] = None
    phone: Optional[str] = None
    occupation: Optional[str] = None
    present_address: Optional[str] = None
    permanent_address: Optional[str] = None
    height: Optional[str] = None
    identifying_marks: Optional[str] = None
    fir_case_number: Optional[str] = None
    penal_code_sections: Optional[str] = None
    crime_description: Optional[str] = None
    incident_date: Optional[date] = None
    arrest_date: Optional[date] = None
    arresting_officer: Optional[str] = None
    repeat_offender: Optional[bool] = None
```

- [ ] **Step 4: Append `update_criminal` to `server/app/routers/criminals.py`**

Add `CriminalUpdate` to the existing schema import line. Then append:

```python
@router.patch("/{criminal_id}", response_model=CriminalOut)
async def update_criminal(
    criminal_id: int,
    payload: str = Form(...),
    front_photo: UploadFile = File(None),
    left_photo: UploadFile = File(None),
    right_photo: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.SUPER_ADMIN, Role.ADMIN, Role.USER)),
):
    criminal = db.query(Criminal).filter(Criminal.id == criminal_id).first()
    if not criminal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Criminal not found")
    _station_scope(criminal.station_id, current_user)

    data = _parse_payload(payload, CriminalUpdate)
    for field, value in data.dict(exclude_unset=True).items():
        setattr(criminal, field, value)
    criminal.updated_at = datetime.utcnow()

    for angle, upload in (("front", front_photo), ("left_profile", left_photo), ("right_profile", right_photo)):
        if upload is not None:
            path = save_criminal_photo(criminal.criminal_code, angle, upload)
            existing = next((p for p in criminal.photos if p.angle == angle), None)
            if existing:
                existing.photo_path = path
            else:
                db.add(CriminalPhoto(criminal_id=criminal.id, photo_path=path, angle=angle))

    db.commit()
    db.refresh(criminal)
    return criminal
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd server && ./myenv/bin/python -m pytest tests/test_criminals.py -v`
Expected: PASS 14/14.

- [ ] **Step 6: Run the full backend suite**

Run: `cd server && ./myenv/bin/python -m pytest -v`
Expected: PASS, no regressions.

- [ ] **Step 7: Commit**

```bash
cd server && git add app/routers/criminals.py app/schemas.py tests/test_criminals.py && git commit -m "feat: add criminal edit endpoint"
```

---

### Task 7: `DELETE /criminals/{id}`

**Files:**
- Modify: `server/app/routers/criminals.py` (append `delete_criminal`)
- Test: `server/tests/test_criminals.py` (append tests)

**Interfaces:**
- Consumes: `_station_scope` (Task 4).
- Produces: `DELETE /criminals/{id}`. Last endpoint of Phase 2a — no later task depends on this one.

- [ ] **Step 1: Write the failing delete tests**

Append to `server/tests/test_criminals.py`:
```python
def test_station_admin_can_delete_own_station_criminal(client, db_session):
    station = _make_station(db_session)
    _make_user(db_session, "dhk01admin", "adminpass1", Role.ADMIN, station_id=station.id)
    token = _login(client, "dhk01admin", "adminpass1")
    created = _create_criminal(client, token, station.id)

    response = client.delete(f"/criminals/{created['id']}", headers=_auth(token))

    assert response.status_code == 204

    follow_up = client.get(f"/criminals/{created['id']}", headers=_auth(token))
    assert follow_up.status_code == 404


def test_station_user_cannot_delete_criminal(client, db_session):
    station = _make_station(db_session)
    _make_user(db_session, "officer1", "officerpass1", Role.USER, station_id=station.id)
    token = _login(client, "officer1", "officerpass1")
    created = _create_criminal(client, token, station.id)

    response = client.delete(f"/criminals/{created['id']}", headers=_auth(token))

    assert response.status_code == 403


def test_admin_cannot_delete_other_station_criminal(client, db_session):
    station_a = _make_station(db_session, code="DHK-01")
    station_b = _make_station(db_session, code="DHK-02")
    _make_user(db_session, "dhk01admin", "adminpass1", Role.ADMIN, station_id=station_a.id)
    _make_user(db_session, "officer_b", "pass12345", Role.USER, station_id=station_b.id)
    token_a = _login(client, "dhk01admin", "adminpass1")
    token_b = _login(client, "officer_b", "pass12345")
    created = _create_criminal(client, token_b, station_b.id)

    response = client.delete(f"/criminals/{created['id']}", headers=_auth(token_a))

    assert response.status_code == 403


def test_super_admin_can_delete_any_criminal(client, db_session):
    station = _make_station(db_session)
    _make_user(db_session, "officer1", "officerpass1", Role.USER, station_id=station.id)
    officer_token = _login(client, "officer1", "officerpass1")
    created = _create_criminal(client, officer_token, station.id)

    _make_user(db_session, "root", "s3cret", Role.SUPER_ADMIN)
    root_token = _login(client, "root", "s3cret")

    response = client.delete(f"/criminals/{created['id']}", headers=_auth(root_token))

    assert response.status_code == 204


def test_delete_404_for_missing_criminal(client, db_session):
    _make_user(db_session, "root", "s3cret", Role.SUPER_ADMIN)
    token = _login(client, "root", "s3cret")

    response = client.delete("/criminals/999", headers=_auth(token))

    assert response.status_code == 404
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && ./myenv/bin/python -m pytest tests/test_criminals.py -v`
Expected: FAIL — 405s (`DELETE /criminals/{id}` doesn't exist yet).

- [ ] **Step 3: Append `delete_criminal` to `server/app/routers/criminals.py`**

```python
@router.delete("/{criminal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_criminal(
    criminal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.SUPER_ADMIN, Role.ADMIN)),
):
    criminal = db.query(Criminal).filter(Criminal.id == criminal_id).first()
    if not criminal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Criminal not found")
    _station_scope(criminal.station_id, current_user)

    db.delete(criminal)
    db.commit()
    return None
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && ./myenv/bin/python -m pytest tests/test_criminals.py -v`
Expected: PASS 19/19.

- [ ] **Step 5: Run the full backend suite (final Phase 2a regression check)**

Run: `cd server && ./myenv/bin/python -m pytest -v`
Expected: PASS 61/61 (Phase 1's 40, minus 1 replaced `test_stations.py` test plus 1 new one from Task 2 — net unchanged — plus 1 from Task 1, 1 from Task 3, and 19 from `test_criminals.py` across Tasks 4-7).

- [ ] **Step 6: Commit**

```bash
cd server && git add app/routers/criminals.py tests/test_criminals.py && git commit -m "feat: add criminal delete endpoint"
```
