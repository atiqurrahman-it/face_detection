# Phase 1: Auth + Stations + Roles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the single-file emotion-only FastAPI app into a multi-role backend (Super Admin / Station Admin / Station User) with JWT login, a SQLite-backed `stations`/`users` schema, and a matching React login + role-gated dashboard shell — Phase 1 of the criminal-database roadmap.

**Architecture:** Backend becomes a package (`server/app/`) so routers/models/security concerns each get their own file; `server/main.py` becomes a one-line re-export so the existing `uvicorn main:app --reload` command keeps working. The existing emotion-detection websocket moves into `app/routers/detection.py` unchanged. Frontend gets an `AuthContext` (JWT held in memory + localStorage) and a small `apiFetch` client; routes are gated by a `ProtectedRoute` wrapper reading the logged-in user's role.

**Tech Stack:** FastAPI (existing 0.75.1) + SQLAlchemy 2.0 (new, SQLite) + PyJWT (new) + bcrypt (new) on the backend; existing CRA/React 18/react-router-dom 6 on the frontend, no new frontend deps.

**Spec:** `docs/superpowers/specs/2026-09-23-criminal-database-face-recognition.md`

## Global Constraints

- Only Phase 1 of the spec's roadmap ships in this plan: auth, stations, roles. No criminal records, no face matching yet (Phases 2-4).
- `uvicorn main:app --reload` run from `server/` must keep working exactly as in `run.txt` — `server/main.py` re-exports the app, it does not become the app.
- The existing `/` websocket emotion-detection behavior must be preserved byte-for-byte (same request/response shape) — it only moves file.
- Role scope per spec: Super Admin sees/manages all stations; Station Admin and Station User can only manage their own `station_id`; every station-scoped endpoint enforces that server-side, not just in the UI.
- Passwords are always bcrypt-hashed before touching the database; nothing ever returns `password_hash` in an API response.
- JWT secret and DB URL come from environment variables with dev-only fallbacks (`JWT_SECRET_KEY`, `DATABASE_URL`), never hardcoded as the only option.
- Frontend API base URL comes from `REACT_APP_API_URL`, falling back to `http://localhost:8000`, matching the existing WebSocket's own `localhost:8000` convention (see `emotion-recognition/src/component/page/face_detection/face_detection.js`).

## Review Focus

- Non-super-admin calling `POST /stations` or `GET /stations` gets 403, not a 500 or a silent empty list — the role dependency must reject before any DB query runs.
- Station Admin for station A calling any `/stations/{B}/...` endpoint for a different station B gets 403, not station A's or B's data — this is the core data-isolation guarantee of the spec's "Roles & access" table.
- Login with a wrong password or an unknown username returns the same 401 either way (no username enumeration via a different error/status).
- A deactivated user (`is_active=False`) cannot log in and cannot use an already-issued token to hit protected endpoints — `get_current_user` re-checks `is_active` on every request, not only at login.
- Duplicate `username` or duplicate station `code` on create returns a 400 with a clear message, not a raw SQLAlchemy `IntegrityError` / 500.

---

### Task 1: Backend package restructure + DB setup

**Files:**
- Create: `server/app/__init__.py`
- Create: `server/app/database.py`
- Create: `server/app/main.py`
- Create: `server/app/routers/__init__.py`
- Create: `server/app/routers/detection.py`
- Modify: `server/main.py` (replace entire contents)
- Modify: `server/requirements.txt` (append new deps)
- Create: `server/pytest.ini`
- Create: `server/tests/conftest.py`
- Create: `server/tests/test_health.py`
- Modify: `.gitignore` (repo root)

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `app.database.Base`, `app.database.engine`, `app.database.get_db()` (SQLAlchemy session dependency generator), `app.main.app` (the FastAPI instance every later router attaches to). `server/main.py` re-exports `app` from `app.main` so `uvicorn main:app` keeps working.

- [ ] **Step 1: Append new dependencies to `server/requirements.txt`**

Append these lines (keep the file alphabetized-ish is not required, append at end is fine):

```
SQLAlchemy==2.0.35
bcrypt==4.0.1
PyJWT==2.8.0
pytest==7.4.4
```

- [ ] **Step 2: Install the new dependencies**

Run: `cd server && ./myenv/bin/pip install SQLAlchemy==2.0.35 bcrypt==4.0.1 PyJWT==2.8.0 pytest==7.4.4`
Expected: all four install successfully (no error output ending in a traceback).

- [ ] **Step 3: Add `pytest.ini` so `app` is importable from `server/tests/`**

`server/pytest.ini`:
```ini
[pytest]
pythonpath = .
```

- [ ] **Step 4: Write the failing smoke test**

`server/tests/test_health.py`:
```python
def test_health_endpoint_returns_ok(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_main_module_reexports_app():
    from main import app
    from fastapi import FastAPI

    assert isinstance(app, FastAPI)
```

`server/tests/conftest.py`:
```python
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from starlette.testclient import TestClient

from app.database import Base, get_db
from app.main import app


@pytest.fixture()
def db_session(tmp_path):
    db_path = tmp_path / "test.db"
    engine = create_engine(
        f"sqlite:///{db_path}", connect_args={"check_same_thread": False}
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
```

- [ ] **Step 5: Run tests to verify they fail**

Run: `cd server && ./myenv/bin/python -m pytest tests/test_health.py -v`
Expected: FAIL/ERROR — `ModuleNotFoundError: No module named 'app'` (the package doesn't exist yet).

- [ ] **Step 6: Create `server/app/database.py`**

```python
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./app.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

- [ ] **Step 7: Move the emotion-detection websocket into `server/app/routers/detection.py`**

`server/app/routers/__init__.py`: empty file.

`server/app/routers/detection.py` (content is the existing `server/main.py` body, unchanged, wrapped in an `APIRouter`):
```python
import json
import base64
import os

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import cv2
import numpy as np
from keras.models import load_model
from keras.preprocessing.image import img_to_array

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

face_classifier = cv2.CascadeClassifier(os.path.join(BASE_DIR, 'haarcascade_frontalface_default.xml'))
classifier = load_model(os.path.join(BASE_DIR, 'model.h5'))

emotion_labels = ['Angry', 'Disgust', 'Fear', 'Happy', 'Neutral', 'Sad', 'Surprise']


@router.websocket("/")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            payload = await websocket.receive_text()
            payload = json.loads(payload)
            imageByt64 = payload['data']['image'].split(',')[1]

            image = np.frombuffer(base64.b64decode(imageByt64), np.uint8)
            image = cv2.imdecode(image, cv2.IMREAD_COLOR)

            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            faces = face_classifier.detectMultiScale(gray, 1.3, 5)

            results = []
            for (x, y, w, h) in faces:
                roi_gray = gray[y:y + h, x:x + w]
                roi_gray = cv2.resize(roi_gray, (48, 48), interpolation=cv2.INTER_AREA)

                roi = roi_gray.astype('float') / 255.0
                roi = img_to_array(roi)
                roi = np.expand_dims(roi, axis=0)

                prediction = classifier.predict(roi, verbose=0)[0]
                emotion = emotion_labels[prediction.argmax()]

                results.append({
                    "box": {"x": int(x), "y": int(y), "w": int(w), "h": int(h)},
                    "emotion": emotion,
                    "predictions": dict(zip(emotion_labels, map(float, prediction))),
                })

            response = {
                "faces": results,
                "imageWidth": image.shape[1],
                "imageHeight": image.shape[0],
            }
            if not results:
                response["error"] = "No face detected"

            await websocket.send_json(response)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"Error: {e}")
        await websocket.close()
```

Note: `BASE_DIR` now walks up two extra directories (`routers/` -> `app/` -> `server/`) to keep pointing at `server/` where `haarcascade_frontalface_default.xml` and `model.h5` actually live.

- [ ] **Step 8: Create `server/app/main.py`**

```python
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import detection

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(detection.router)


@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 9: Replace `server/main.py` with a re-export**

```python
from app.main import app  # noqa: F401
```

- [ ] **Step 10: Create `server/app/__init__.py`**

Empty file.

- [ ] **Step 11: Add `server/*.db` to `.gitignore`**

Append to the repo-root `.gitignore`:
```
server/*.db
server/.env
```

- [ ] **Step 12: Run tests to verify they pass**

Run: `cd server && ./myenv/bin/python -m pytest tests/test_health.py -v`
Expected: PASS 2/2 (`test_health_endpoint_returns_ok`, `test_main_module_reexports_app`).

- [ ] **Step 13: Commit**

```bash
cd server && git add app/ main.py requirements.txt pytest.ini tests/ && git -C .. add .gitignore && git commit -m "refactor: split backend into app package, add DB scaffolding"
```

---

### Task 2: Models + security utilities

**Files:**
- Create: `server/app/models.py`
- Create: `server/app/security.py`
- Create: `server/tests/test_security.py`
- Create: `server/tests/test_models.py`

**Interfaces:**
- Consumes: `app.database.Base` (Task 1).
- Produces: `app.models.Role` (str Enum: `SUPER_ADMIN`, `ADMIN`, `USER`), `app.models.Station` (`id, name, district, code, created_at, users`), `app.models.User` (`id, name, username, password_hash, role, station_id, is_active, created_at, station`). `app.security.hash_password(password: str) -> str`, `app.security.verify_password(password: str, password_hash: str) -> bool`, `app.security.create_access_token(data: dict, expires_minutes: int = 720) -> str`, `app.security.decode_access_token(token: str) -> dict`.

- [ ] **Step 1: Write failing security tests**

`server/tests/test_security.py`:
```python
import pytest
import jwt

from app.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_hash_password_does_not_return_plaintext():
    hashed = hash_password("hunter2")
    assert hashed != "hunter2"


def test_verify_password_accepts_correct_password():
    hashed = hash_password("hunter2")
    assert verify_password("hunter2", hashed) is True


def test_verify_password_rejects_wrong_password():
    hashed = hash_password("hunter2")
    assert verify_password("wrong-password", hashed) is False


def test_create_and_decode_access_token_round_trips_claims():
    token = create_access_token({"sub": "42", "role": "admin"})
    payload = decode_access_token(token)
    assert payload["sub"] == "42"
    assert payload["role"] == "admin"


def test_decode_access_token_rejects_garbage_token():
    with pytest.raises(jwt.PyJWTError):
        decode_access_token("not-a-real-token")
```

- [ ] **Step 2: Write failing model tests**

`server/tests/test_models.py`:
```python
from app.models import Role, Station, User


def test_create_station_and_user(db_session):
    station = Station(name="Dhanmondi Thana", district="Dhaka", code="DHK-01")
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
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd server && ./myenv/bin/python -m pytest tests/test_security.py tests/test_models.py -v`
Expected: FAIL/ERROR — `ModuleNotFoundError: No module named 'app.security'` / `No module named 'app.models'`.

- [ ] **Step 4: Implement `server/app/security.py`**

```python
import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-secret-change-me")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 12


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def create_access_token(data: dict, expires_minutes: int = ACCESS_TOKEN_EXPIRE_MINUTES) -> str:
    to_encode = data.copy()
    to_encode["exp"] = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
```

- [ ] **Step 5: Implement `server/app/models.py`**

```python
import enum
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from .database import Base


class Role(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    USER = "user"


class Station(Base):
    __tablename__ = "stations"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    district = Column(String, nullable=False)
    code = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="station")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    username = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(Role), nullable=False)
    station_id = Column(Integer, ForeignKey("stations.id"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    station = relationship("Station", back_populates="users")
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd server && ./myenv/bin/python -m pytest tests/test_security.py tests/test_models.py -v`
Expected: PASS 6/6.

- [ ] **Step 7: Commit**

```bash
cd server && git add app/models.py app/security.py tests/test_security.py tests/test_models.py && git commit -m "feat: add Station/User models and password/JWT security utilities"
```

---

### Task 3: Auth dependency + login/me endpoints

**Files:**
- Create: `server/app/deps.py`
- Create: `server/app/schemas.py`
- Create: `server/app/routers/auth.py`
- Modify: `server/app/main.py` (include the auth router)
- Create: `server/tests/test_auth.py`

**Interfaces:**
- Consumes: `app.models.{Role, User}`, `app.security.{verify_password, create_access_token, decode_access_token}` (Task 2), `app.database.get_db` (Task 1).
- Produces: `app.deps.get_current_user` (FastAPI dependency, returns `User`, raises 401), `app.deps.require_roles(*roles)` (dependency factory, raises 403), `app.schemas.{LoginRequest, TokenResponse, UserOut}`, `POST /auth/login`, `GET /auth/me` — later tasks depend on `require_roles` and on `client` test fixture pattern (login via `/auth/login` to get a bearer token, pass as `Authorization: Bearer <token>` header).

- [ ] **Step 1: Write failing auth endpoint tests**

`server/tests/test_auth.py`:
```python
from app.models import Role, User
from app.security import hash_password


def _make_user(db_session, username, password, role, station_id=None, is_active=True):
    user = User(
        name=username.title(),
        username=username,
        password_hash=hash_password(password),
        role=role,
        station_id=station_id,
        is_active=is_active,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def test_login_with_correct_credentials_returns_token(client, db_session):
    _make_user(db_session, "root", "s3cret", Role.SUPER_ADMIN)

    response = client.post("/auth/login", json={"username": "root", "password": "s3cret"})

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert isinstance(body["access_token"], str) and body["access_token"]


def test_login_with_wrong_password_returns_401(client, db_session):
    _make_user(db_session, "root", "s3cret", Role.SUPER_ADMIN)

    response = client.post("/auth/login", json={"username": "root", "password": "wrong"})

    assert response.status_code == 401


def test_login_with_unknown_username_returns_same_401(client, db_session):
    _make_user(db_session, "root", "s3cret", Role.SUPER_ADMIN)

    known = client.post("/auth/login", json={"username": "root", "password": "wrong"})
    unknown = client.post("/auth/login", json={"username": "ghost", "password": "wrong"})

    assert known.status_code == unknown.status_code == 401
    assert known.json()["detail"] == unknown.json()["detail"]


def test_login_rejects_deactivated_user(client, db_session):
    _make_user(db_session, "root", "s3cret", Role.SUPER_ADMIN, is_active=False)

    response = client.post("/auth/login", json={"username": "root", "password": "s3cret"})

    assert response.status_code == 401


def test_me_requires_bearer_token(client):
    response = client.get("/auth/me")
    assert response.status_code == 401


def test_me_returns_current_user_and_hides_password_hash(client, db_session):
    _make_user(db_session, "root", "s3cret", Role.SUPER_ADMIN)
    token = client.post("/auth/login", json={"username": "root", "password": "s3cret"}).json()["access_token"]

    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    body = response.json()
    assert body["username"] == "root"
    assert "password_hash" not in body


def test_me_rejects_token_for_deactivated_user(client, db_session):
    user = _make_user(db_session, "root", "s3cret", Role.SUPER_ADMIN)
    token = client.post("/auth/login", json={"username": "root", "password": "s3cret"}).json()["access_token"]

    user.is_active = False
    db_session.commit()

    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 401
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && ./myenv/bin/python -m pytest tests/test_auth.py -v`
Expected: FAIL/ERROR — `ModuleNotFoundError: No module named 'app.schemas'` (or similar, since nothing exists yet).

- [ ] **Step 3: Implement `server/app/schemas.py`**

```python
from typing import Optional

from pydantic import BaseModel

from .models import Role


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    name: str
    username: str
    role: Role
    station_id: Optional[int]
    is_active: bool

    class Config:
        orm_mode = True
```

- [ ] **Step 4: Implement `server/app/deps.py`**

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import jwt

from .database import get_db
from .models import User
from .security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user


def require_roles(*roles):
    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted")
        return user

    return checker
```

- [ ] **Step 5: Implement `server/app/routers/auth.py`**

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import User
from ..schemas import LoginRequest, TokenResponse, UserOut
from ..security import create_access_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username).first()
    invalid = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password"
    )
    if not user or not user.is_active:
        raise invalid
    if not verify_password(payload.password, user.password_hash):
        raise invalid

    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user
```

- [ ] **Step 6: Wire the auth router into `server/app/main.py`**

Modify `server/app/main.py`: add `from .routers import auth, detection` (replacing the `detection`-only import) and `app.include_router(auth.router)` above `app.include_router(detection.router)`.

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd server && ./myenv/bin/python -m pytest tests/test_auth.py -v`
Expected: PASS 7/7.

- [ ] **Step 8: Run the full backend test suite so far**

Run: `cd server && ./myenv/bin/python -m pytest -v`
Expected: PASS (all tests from Tasks 1-3 green, no regressions).

- [ ] **Step 9: Commit**

```bash
cd server && git add app/deps.py app/schemas.py app/routers/auth.py app/main.py tests/test_auth.py && git commit -m "feat: add JWT auth with login/me endpoints and role dependency"
```

---

### Task 4: Seed super admin + station creation endpoints

**Files:**
- Create: `server/app/seed.py`
- Create: `server/app/routers/stations.py`
- Modify: `server/app/schemas.py` (append station schemas)
- Modify: `server/app/main.py` (include the stations router)
- Create: `server/tests/test_stations.py`
- Create: `server/tests/test_seed.py`

**Interfaces:**
- Consumes: `app.deps.require_roles`, `app.models.{Role, Station, User}`, `app.security.hash_password` (Tasks 2-3).
- Produces: `app.seed.create_super_admin(db, username, password, name="Super Admin") -> User` (idempotent: no-op returning the existing user if a `SUPER_ADMIN` already exists), `POST /stations`, `GET /stations`. Later tasks (Task 5) depend on the `_station_scope(station_id, current_user)` helper defined in this task's `stations.py`.

- [ ] **Step 1: Write failing seed test**

`server/tests/test_seed.py`:
```python
from app.models import Role, User
from app.seed import create_super_admin


def test_create_super_admin_creates_user(db_session):
    user = create_super_admin(db_session, "root", "s3cret")

    assert user.role == Role.SUPER_ADMIN
    assert user.username == "root"
    assert user.station_id is None


def test_create_super_admin_is_idempotent(db_session):
    first = create_super_admin(db_session, "root", "s3cret")
    second = create_super_admin(db_session, "root", "different-password")

    assert first.id == second.id
    assert db_session.query(User).filter(User.role == Role.SUPER_ADMIN).count() == 1
```

- [ ] **Step 2: Write failing station endpoint tests**

`server/tests/test_stations.py`:
```python
from app.models import Role, User
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


def test_list_stations_requires_super_admin(client, db_session):
    _make_user(db_session, "dhk01admin", "adminpass1", Role.ADMIN)
    token = _login(client, "dhk01admin", "adminpass1")

    response = client.get("/stations", headers=_auth(token))

    assert response.status_code == 403


def test_super_admin_lists_all_stations(client, db_session):
    _make_user(db_session, "root", "s3cret", Role.SUPER_ADMIN)
    token = _login(client, "root", "s3cret")
    client.post(
        "/stations",
        json={
            "name": "Dhanmondi Thana",
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
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd server && ./myenv/bin/python -m pytest tests/test_seed.py tests/test_stations.py -v`
Expected: FAIL/ERROR — `ModuleNotFoundError: No module named 'app.seed'` and 404s from the missing `/stations` routes.

- [ ] **Step 4: Implement `server/app/seed.py`**

```python
from sqlalchemy.orm import Session

from .models import Role, User
from .security import hash_password


def create_super_admin(db: Session, username: str, password: str, name: str = "Super Admin") -> User:
    existing = db.query(User).filter(User.role == Role.SUPER_ADMIN).first()
    if existing:
        return existing

    user = User(
        name=name,
        username=username,
        password_hash=hash_password(password),
        role=Role.SUPER_ADMIN,
        station_id=None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
```

- [ ] **Step 5: Append station schemas to `server/app/schemas.py`**

```python
class StationCreate(BaseModel):
    name: str
    district: str
    code: str
    admin_name: str
    admin_username: str
    admin_password: str


class StationOut(BaseModel):
    id: int
    name: str
    district: str
    code: str

    class Config:
        orm_mode = True
```

- [ ] **Step 6: Implement `server/app/routers/stations.py`**

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_roles
from ..models import Role, Station, User
from ..schemas import StationCreate, StationOut
from ..security import hash_password

router = APIRouter(prefix="/stations", tags=["stations"])


def _station_scope(station_id: int, current_user: User) -> None:
    if current_user.role == Role.SUPER_ADMIN:
        return
    if current_user.station_id != station_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted for this station")


@router.post("", response_model=StationOut, status_code=status.HTTP_201_CREATED)
def create_station(
    payload: StationCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.SUPER_ADMIN)),
):
    if db.query(Station).filter(Station.code == payload.code).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Station code already exists")
    if db.query(User).filter(User.username == payload.admin_username).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists")

    station = Station(name=payload.name, district=payload.district, code=payload.code)
    db.add(station)
    db.flush()

    admin = User(
        name=payload.admin_name,
        username=payload.admin_username,
        password_hash=hash_password(payload.admin_password),
        role=Role.ADMIN,
        station_id=station.id,
    )
    db.add(admin)
    db.commit()
    db.refresh(station)
    return station


@router.get("", response_model=list[StationOut])
def list_stations(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.SUPER_ADMIN)),
):
    return db.query(Station).all()
```

- [ ] **Step 7: Wire the stations router into `server/app/main.py`**

Modify `server/app/main.py`: change the router import to `from .routers import auth, detection, stations` and add `app.include_router(stations.router)` above `app.include_router(detection.router)`.

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd server && ./myenv/bin/python -m pytest tests/test_seed.py tests/test_stations.py -v`
Expected: PASS 8/8.

- [ ] **Step 9: Run the full backend test suite so far**

Run: `cd server && ./myenv/bin/python -m pytest -v`
Expected: PASS (no regressions from Tasks 1-3).

- [ ] **Step 10: Commit**

```bash
cd server && git add app/seed.py app/routers/stations.py app/schemas.py app/main.py tests/test_seed.py tests/test_stations.py && git commit -m "feat: add super-admin seed helper and station creation/listing endpoints"
```

---

### Task 5: Station-scoped user management endpoints

**Files:**
- Create: `server/app/routers/users.py`
- Modify: `server/app/schemas.py` (append `StationUserCreate`)
- Modify: `server/app/main.py` (include the users router)
- Modify: `server/app/routers/stations.py` (export `_station_scope` — already module-level, no signature change needed)
- Create: `server/tests/test_users.py`
- Create: `server/app/seed_cli.py` (command-line entrypoint: `python -m app.seed_cli <username> <password>`)

**Interfaces:**
- Consumes: `app.routers.stations._station_scope`, `app.deps.require_roles`, `app.models.{Role, User, Station}` (Tasks 2-4).
- Produces: `POST /stations/{station_id}/users`, `GET /stations/{station_id}/users`, `PATCH /users/{user_id}/deactivate`. Frontend (Tasks 6-7) calls these three plus `POST /stations`, `GET /stations`, `POST /auth/login`, `GET /auth/me` — that is the complete Phase 1 API surface.

- [ ] **Step 1: Write failing user-management endpoint tests**

`server/tests/test_users.py`:
```python
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && ./myenv/bin/python -m pytest tests/test_users.py -v`
Expected: FAIL — 404s (`/stations/{id}/users` and `/users/{id}/deactivate` don't exist yet).

- [ ] **Step 3: Append `StationUserCreate` to `server/app/schemas.py`**

```python
class StationUserCreate(BaseModel):
    name: str
    username: str
    password: str
    role: Role = Role.USER
```

- [ ] **Step 4: Add station-scoped user routes to `server/app/routers/stations.py`**

Append to the bottom of `server/app/routers/stations.py` (imports at the top of that file need `StationUserCreate` and `UserOut` added, and `require_roles` already imported):

```python
from ..schemas import StationUserCreate, UserOut  # add to existing schema import line


@router.post("/{station_id}/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_station_user(
    station_id: int,
    payload: StationUserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.SUPER_ADMIN, Role.ADMIN)),
):
    _station_scope(station_id, current_user)
    if not db.query(Station).filter(Station.id == station_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Station not found")
    if payload.role not in (Role.USER, Role.ADMIN):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists")

    user = User(
        name=payload.name,
        username=payload.username,
        password_hash=hash_password(payload.password),
        role=payload.role,
        station_id=station_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/{station_id}/users", response_model=list[UserOut])
def list_station_users(
    station_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.SUPER_ADMIN, Role.ADMIN)),
):
    _station_scope(station_id, current_user)
    return db.query(User).filter(User.station_id == station_id).all()
```

(Place the `/{station_id}/users` routes below the existing `/` routes in the same file — FastAPI matches by path+method, order among distinct paths doesn't matter here.)

- [ ] **Step 5: Implement `server/app/routers/users.py`**

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_roles
from ..models import Role, User
from ..schemas import UserOut
from .stations import _station_scope

router = APIRouter(prefix="/users", tags=["users"])


@router.patch("/{user_id}/deactivate", response_model=UserOut)
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.SUPER_ADMIN, Role.ADMIN)),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    _station_scope(user.station_id, current_user)

    user.is_active = False
    db.commit()
    db.refresh(user)
    return user
```

- [ ] **Step 6: Wire the users router into `server/app/main.py`**

Modify `server/app/main.py`: change the router import to `from .routers import auth, detection, stations, users` and add `app.include_router(users.router)` above `app.include_router(detection.router)`.

- [ ] **Step 7: Add the seed CLI entrypoint**

`server/app/seed_cli.py`:
```python
import sys

from .database import SessionLocal
from .seed import create_super_admin


def main():
    if len(sys.argv) != 3:
        print("Usage: python -m app.seed_cli <username> <password>")
        sys.exit(1)

    username, password = sys.argv[1], sys.argv[2]
    db = SessionLocal()
    try:
        user = create_super_admin(db, username, password)
        print(f"Super admin ready: {user.username} (id={user.id})")
    finally:
        db.close()


if __name__ == "__main__":
    main()
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd server && ./myenv/bin/python -m pytest tests/test_users.py -v`
Expected: PASS 7/7.

- [ ] **Step 9: Run the full backend test suite**

Run: `cd server && ./myenv/bin/python -m pytest -v`
Expected: PASS, all tests from Tasks 1-5 green.

- [ ] **Step 10: Commit**

```bash
cd server && git add app/routers/users.py app/routers/stations.py app/schemas.py app/main.py app/seed_cli.py tests/test_users.py && git commit -m "feat: add station-scoped user management and deactivate endpoint"
```

---

### Task 6: Frontend auth context, API client, login page, protected routing

**Files:**
- Create: `emotion-recognition/src/api/client.js`
- Create: `emotion-recognition/src/context/AuthContext.js`
- Create: `emotion-recognition/src/component/routing/ProtectedRoute.js`
- Create: `emotion-recognition/src/component/page/login/login_page.js`
- Create: `emotion-recognition/src/component/page/login/login_page.test.js`
- Create: `emotion-recognition/src/context/AuthContext.test.js`
- Modify: `emotion-recognition/src/App.js`

**Interfaces:**
- Consumes: `POST /auth/login`, `GET /auth/me` (Task 3).
- Produces: `AuthContext` exposing `{ user, token, login(username, password), logout(), loading }` via `useAuth()` hook; `apiFetch(path, options)` in `src/api/client.js` (adds `Authorization` header when a token is passed, prefixes `REACT_APP_API_URL || 'http://localhost:8000'`); `<ProtectedRoute roles={[...]}>` component. Tasks 7 consumes `useAuth()` and `apiFetch`.

- [ ] **Step 1: Write failing `apiFetch` / `AuthContext` tests**

`emotion-recognition/src/context/AuthContext.test.js`:
```javascript
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";

function Probe() {
  const { user, token, login, logout, loading } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.username : "none"}</span>
      <span data-testid="token">{token || "none"}</span>
      <button onClick={() => login("root", "s3cret")}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  global.fetch = jest.fn();
});

test("login stores token and fetched user, logout clears them", async () => {
  global.fetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: "abc123", token_type: "bearer" }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, username: "root", role: "super_admin", station_id: null }),
    });

  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );

  fireEvent.click(screen.getByText("login"));

  await waitFor(() => expect(screen.getByTestId("token").textContent).toBe("abc123"));
  expect(screen.getByTestId("user").textContent).toBe("root");
  expect(localStorage.getItem("token")).toBe("abc123");

  fireEvent.click(screen.getByText("logout"));

  expect(screen.getByTestId("user").textContent).toBe("none");
  expect(localStorage.getItem("token")).toBeNull();
});

test("login rejects and leaves user unset on 401", async () => {
  global.fetch.mockResolvedValueOnce({
    ok: false,
    status: 401,
    json: async () => ({ detail: "Invalid username or password" }),
  });

  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );

  fireEvent.click(screen.getByText("login"));

  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  expect(screen.getByTestId("user").textContent).toBe("none");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd emotion-recognition && CI=true npx react-scripts test src/context/AuthContext.test.js --watchAll=false`
Expected: FAIL — `Cannot find module './AuthContext'`.

- [ ] **Step 3: Implement `emotion-recognition/src/api/client.js`**

```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

export async function apiFetch(path, { method = "GET", body, token, headers = {} } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = (data && data.detail) || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
}

export { API_BASE_URL };
```

- [ ] **Step 4: Implement `emotion-recognition/src/context/AuthContext.js`**

```javascript
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { apiFetch } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const me = await apiFetch("/auth/me", { token });
        if (!cancelled) setUser(me);
      } catch (err) {
        if (!cancelled) {
          setUser(null);
          setToken(null);
          localStorage.removeItem("token");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadUser();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = useCallback(async (username, password) => {
    const { access_token: accessToken } = await apiFetch("/auth/login", {
      method: "POST",
      body: { username, password },
    });
    const me = await apiFetch("/auth/me", { token: accessToken });
    localStorage.setItem("token", accessToken);
    setToken(accessToken);
    setUser(me);
    return me;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd emotion-recognition && CI=true npx react-scripts test src/context/AuthContext.test.js --watchAll=false`
Expected: PASS 2/2.

- [ ] **Step 6: Write failing login page test**

`emotion-recognition/src/component/page/login/login_page.test.js`:
```javascript
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../../../context/AuthContext";
import LoginPage from "./login_page";

beforeEach(() => {
  localStorage.clear();
  global.fetch = jest.fn();
});

test("submitting valid credentials logs the user in", async () => {
  global.fetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "abc123" }) })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, username: "root", role: "super_admin", station_id: null }),
    });

  render(
    <AuthProvider>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </AuthProvider>
  );

  fireEvent.change(screen.getByLabelText(/username/i), { target: { value: "root" } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "s3cret" } });
  fireEvent.click(screen.getByRole("button", { name: /log in/i }));

  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
});

test("shows an error message on invalid credentials", async () => {
  global.fetch.mockResolvedValueOnce({
    ok: false,
    status: 401,
    json: async () => ({ detail: "Invalid username or password" }),
  });

  render(
    <AuthProvider>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </AuthProvider>
  );

  fireEvent.change(screen.getByLabelText(/username/i), { target: { value: "root" } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "wrong" } });
  fireEvent.click(screen.getByRole("button", { name: /log in/i }));

  expect(await screen.findByText(/invalid username or password/i)).toBeInTheDocument();
});
```

- [ ] **Step 7: Run tests to verify they fail**

Run: `cd emotion-recognition && CI=true npx react-scripts test src/component/page/login/login_page.test.js --watchAll=false`
Expected: FAIL — `Cannot find module './login_page'`.

- [ ] **Step 8: Implement `emotion-recognition/src/component/page/login/login_page.js`**

```javascript
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(username, password);
      navigate(user.role === "super_admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">Log in</h1>
        <div>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border rounded px-2 py-1"
          />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded px-2 py-1"
          />
        </div>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={submitting} className="w-full border rounded px-2 py-1">
          Log in
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `cd emotion-recognition && CI=true npx react-scripts test src/component/page/login/login_page.test.js --watchAll=false`
Expected: PASS 2/2.

- [ ] **Step 10: Implement `emotion-recognition/src/component/routing/ProtectedRoute.js`**

```javascript
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;

  return children;
}
```

- [ ] **Step 11: Wire routing into `emotion-recognition/src/App.js`**

Replace the file with:
```javascript
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import HomePage from "./component/page/home/home_page";
import RealFaceDetection from "./component/page/face_detection/face_detection";
import ImageInput from "./component/page/image_input/image_input";
import LoginPage from "./component/page/login/login_page";
import ProtectedRoute from "./component/routing/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route exact path="/" element={<HomePage />} />
            <Route exact path="/login" element={<LoginPage />} />
            <Route exact path="/face-detection" element={<RealFaceDetection />} />
            <Route exact path="/input-image" element={<ImageInput />} />
            <Route
              exact
              path="/admin"
              element={
                <ProtectedRoute roles={["super_admin"]}>
                  <div>Super Admin Dashboard placeholder</div>
                </ProtectedRoute>
              }
            />
            <Route
              exact
              path="/dashboard"
              element={
                <ProtectedRoute roles={["admin", "user"]}>
                  <div>Station Dashboard placeholder</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
```

(Task 7 replaces both placeholder `<div>`s with the real dashboard components.)

- [ ] **Step 12: Run the full frontend test suite**

Run: `cd emotion-recognition && CI=true npx react-scripts test --watchAll=false`
Expected: PASS, no regressions in `App.test.js` or any other existing test.

- [ ] **Step 13: Commit**

```bash
cd emotion-recognition && git add src/api/client.js src/context/AuthContext.js src/context/AuthContext.test.js src/component/routing/ProtectedRoute.js src/component/page/login/ src/App.js && git commit -m "feat: add auth context, API client, login page, and protected routing"
```

---

### Task 7: Super Admin Dashboard, Station Dashboard, User Management page

**Files:**
- Create: `emotion-recognition/src/component/page/dashboard/super_admin_dashboard.js`
- Create: `emotion-recognition/src/component/page/dashboard/super_admin_dashboard.test.js`
- Create: `emotion-recognition/src/component/page/dashboard/station_dashboard.js`
- Create: `emotion-recognition/src/component/page/users/user_management.js`
- Create: `emotion-recognition/src/component/page/users/user_management.test.js`
- Modify: `emotion-recognition/src/App.js` (swap the two placeholder routes for the real components; add `/users`)

**Interfaces:**
- Consumes: `useAuth()`, `apiFetch()` (Task 6), `POST /stations`, `GET /stations`, `POST /stations/{id}/users`, `GET /stations/{id}/users`, `PATCH /users/{id}/deactivate` (Tasks 4-5).
- Produces: nothing further consumed by later tasks — Phase 1 ends here.

- [ ] **Step 1: Write failing Super Admin Dashboard test**

`emotion-recognition/src/component/page/dashboard/super_admin_dashboard.test.js`:
```javascript
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AuthContext } from "../../../context/AuthContext";
import SuperAdminDashboard from "./super_admin_dashboard";

function renderWithAuth(ui) {
  return render(
    <AuthContext.Provider value={{ user: { role: "super_admin" }, token: "abc123", loading: false }}>
      {ui}
    </AuthContext.Provider>
  );
}

beforeEach(() => {
  global.fetch = jest.fn();
});

test("lists existing stations on load", async () => {
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => [{ id: 1, name: "Dhanmondi Thana", district: "Dhaka", code: "DHK-01" }],
  });

  renderWithAuth(<SuperAdminDashboard />);

  expect(await screen.findByText("Dhanmondi Thana")).toBeInTheDocument();
});

test("submitting the create-station form posts and appends the new station", async () => {
  global.fetch
    .mockResolvedValueOnce({ ok: true, json: async () => [] })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 2, name: "Gulshan Thana", district: "Dhaka", code: "DHK-02" }),
    });

  renderWithAuth(<SuperAdminDashboard />);
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

  fireEvent.change(screen.getByLabelText(/station name/i), { target: { value: "Gulshan Thana" } });
  fireEvent.change(screen.getByLabelText(/district/i), { target: { value: "Dhaka" } });
  fireEvent.change(screen.getByLabelText(/station code/i), { target: { value: "DHK-02" } });
  fireEvent.change(screen.getByLabelText(/admin name/i), { target: { value: "Admin Two" } });
  fireEvent.change(screen.getByLabelText(/admin username/i), { target: { value: "dhk02admin" } });
  fireEvent.change(screen.getByLabelText(/admin password/i), { target: { value: "adminpass2" } });
  fireEvent.click(screen.getByRole("button", { name: /create station/i }));

  expect(await screen.findByText("Gulshan Thana")).toBeInTheDocument();
});
```

- [ ] **Step 2: Export a raw `AuthContext` for test harnesses**

Modify `emotion-recognition/src/context/AuthContext.js`: change `const AuthContext = createContext(null);` to `export const AuthContext = createContext(null);` (keep the existing default export of `AuthProvider` and named export of `useAuth` as-is).

- [ ] **Step 3: Run test to verify it fails**

Run: `cd emotion-recognition && CI=true npx react-scripts test src/component/page/dashboard/super_admin_dashboard.test.js --watchAll=false`
Expected: FAIL — `Cannot find module './super_admin_dashboard'`.

- [ ] **Step 4: Implement `emotion-recognition/src/component/page/dashboard/super_admin_dashboard.js`**

```javascript
import { useEffect, useState } from "react";
import { apiFetch } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";

const emptyForm = {
  name: "",
  district: "",
  code: "",
  admin_name: "",
  admin_username: "",
  admin_password: "",
};

export default function SuperAdminDashboard() {
  const { token } = useAuth();
  const [stations, setStations] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch("/stations", { token }).then(setStations).catch((err) => setError(err.message));
  }, [token]);

  function updateField(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      const created = await apiFetch("/stations", { method: "POST", body: form, token });
      setStations((prev) => [...prev, created]);
      setForm(emptyForm);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Super Admin Dashboard</h1>

      <section>
        <h2 className="text-lg font-medium">Stations ({stations.length})</h2>
        <ul>
          {stations.map((s) => (
            <li key={s.id}>
              {s.name} — {s.district} ({s.code})
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-medium">Create station</h2>
        <form onSubmit={handleSubmit} className="space-y-2 max-w-sm">
          <div>
            <label htmlFor="name">Station name</label>
            <input id="name" value={form.name} onChange={updateField("name")} className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label htmlFor="district">District</label>
            <input id="district" value={form.district} onChange={updateField("district")} className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label htmlFor="code">Station code</label>
            <input id="code" value={form.code} onChange={updateField("code")} className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label htmlFor="admin_name">Admin name</label>
            <input id="admin_name" value={form.admin_name} onChange={updateField("admin_name")} className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label htmlFor="admin_username">Admin username</label>
            <input id="admin_username" value={form.admin_username} onChange={updateField("admin_username")} className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label htmlFor="admin_password">Admin password</label>
            <input id="admin_password" type="password" value={form.admin_password} onChange={updateField("admin_password")} className="w-full border rounded px-2 py-1" />
          </div>
          {error && <p role="alert">{error}</p>}
          <button type="submit" className="border rounded px-2 py-1">
            Create station
          </button>
        </form>
      </section>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd emotion-recognition && CI=true npx react-scripts test src/component/page/dashboard/super_admin_dashboard.test.js --watchAll=false`
Expected: PASS 2/2.

- [ ] **Step 6: Write failing User Management test**

`emotion-recognition/src/component/page/users/user_management.test.js`:
```javascript
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AuthContext } from "../../../context/AuthContext";
import UserManagement from "./user_management";

function renderWithAuth(ui) {
  return render(
    <AuthContext.Provider value={{ user: { role: "admin", station_id: 1 }, token: "abc123", loading: false }}>
      {ui}
    </AuthContext.Provider>
  );
}

beforeEach(() => {
  global.fetch = jest.fn();
});

test("lists station users and can deactivate one", async () => {
  global.fetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 5, name: "Officer One", username: "officer1", role: "user", station_id: 1, is_active: true },
      ],
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 5, name: "Officer One", username: "officer1", role: "user", station_id: 1, is_active: false }),
    });

  renderWithAuth(<UserManagement />);

  expect(await screen.findByText("officer1")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /deactivate/i }));

  await waitFor(() => expect(screen.getByText(/inactive/i)).toBeInTheDocument());
});

test("creating a new station user appends it to the list", async () => {
  global.fetch
    .mockResolvedValueOnce({ ok: true, json: async () => [] })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 6, name: "Officer Two", username: "officer2", role: "user", station_id: 1, is_active: true }),
    });

  renderWithAuth(<UserManagement />);
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

  fireEvent.change(screen.getByLabelText(/^name/i), { target: { value: "Officer Two" } });
  fireEvent.change(screen.getByLabelText(/^username/i), { target: { value: "officer2" } });
  fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: "officerpass2" } });
  fireEvent.click(screen.getByRole("button", { name: /add user/i }));

  expect(await screen.findByText("officer2")).toBeInTheDocument();
});
```

- [ ] **Step 7: Run tests to verify they fail**

Run: `cd emotion-recognition && CI=true npx react-scripts test src/component/page/users/user_management.test.js --watchAll=false`
Expected: FAIL — `Cannot find module './user_management'`.

- [ ] **Step 8: Implement `emotion-recognition/src/component/page/users/user_management.js`**

```javascript
import { useEffect, useState } from "react";
import { apiFetch } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";

const emptyForm = { name: "", username: "", password: "" };

export default function UserManagement() {
  const { token, user } = useAuth();
  const stationId = user.station_id;
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch(`/stations/${stationId}/users`, { token }).then(setUsers).catch((err) => setError(err.message));
  }, [token, stationId]);

  function updateField(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    try {
      const created = await apiFetch(`/stations/${stationId}/users`, {
        method: "POST",
        body: { ...form, role: "user" },
        token,
      });
      setUsers((prev) => [...prev, created]);
      setForm(emptyForm);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeactivate(userId) {
    setError(null);
    try {
      const updated = await apiFetch(`/users/${userId}/deactivate`, { method: "PATCH", token });
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">User Management</h1>

      <ul>
        {users.map((u) => (
          <li key={u.id}>
            {u.username} — {u.is_active ? "active" : "inactive"}{" "}
            {u.is_active && <button onClick={() => handleDeactivate(u.id)}>Deactivate</button>}
          </li>
        ))}
      </ul>

      <form onSubmit={handleCreate} className="space-y-2 max-w-sm">
        <div>
          <label htmlFor="name">Name</label>
          <input id="name" value={form.name} onChange={updateField("name")} className="w-full border rounded px-2 py-1" />
        </div>
        <div>
          <label htmlFor="username">Username</label>
          <input id="username" value={form.username} onChange={updateField("username")} className="w-full border rounded px-2 py-1" />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={form.password} onChange={updateField("password")} className="w-full border rounded px-2 py-1" />
        </div>
        {error && <p role="alert">{error}</p>}
        <button type="submit" className="border rounded px-2 py-1">
          Add user
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `cd emotion-recognition && CI=true npx react-scripts test src/component/page/users/user_management.test.js --watchAll=false`
Expected: PASS 2/2.

- [ ] **Step 10: Implement `emotion-recognition/src/component/page/dashboard/station_dashboard.js`**

```javascript
import { Link } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";

export default function StationDashboard() {
  const { user } = useAuth();

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Station Dashboard</h1>
      <p>Welcome, {user.name || user.username}.</p>
      {user.role === "admin" && (
        <Link to="/users" className="underline">
          Manage station users
        </Link>
      )}
    </div>
  );
}
```

- [ ] **Step 11: Wire the real pages into `emotion-recognition/src/App.js`**

Replace the `/admin` and `/dashboard` placeholder elements, and add `/users`:
```javascript
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import HomePage from "./component/page/home/home_page";
import RealFaceDetection from "./component/page/face_detection/face_detection";
import ImageInput from "./component/page/image_input/image_input";
import LoginPage from "./component/page/login/login_page";
import SuperAdminDashboard from "./component/page/dashboard/super_admin_dashboard";
import StationDashboard from "./component/page/dashboard/station_dashboard";
import UserManagement from "./component/page/users/user_management";
import ProtectedRoute from "./component/routing/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route exact path="/" element={<HomePage />} />
            <Route exact path="/login" element={<LoginPage />} />
            <Route exact path="/face-detection" element={<RealFaceDetection />} />
            <Route exact path="/input-image" element={<ImageInput />} />
            <Route
              exact
              path="/admin"
              element={
                <ProtectedRoute roles={["super_admin"]}>
                  <SuperAdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              exact
              path="/dashboard"
              element={
                <ProtectedRoute roles={["admin", "user"]}>
                  <StationDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              exact
              path="/users"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
```

- [ ] **Step 12: Run the full frontend test suite**

Run: `cd emotion-recognition && CI=true npx react-scripts test --watchAll=false`
Expected: PASS, no regressions.

- [ ] **Step 13: Run the full backend test suite (final Phase 1 regression check)**

Run: `cd server && ./myenv/bin/python -m pytest -v`
Expected: PASS, all tests from Tasks 1-5 still green.

- [ ] **Step 14: Commit**

```bash
cd emotion-recognition && git add src/component/page/dashboard/ src/component/page/users/ src/context/AuthContext.js src/App.js && git commit -m "feat: add Super Admin Dashboard, Station Dashboard, and User Management pages"
```
