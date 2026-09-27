# Face & Emotion Detection — Criminal Records Management System

A full-stack system combining real-time face/emotion detection with a role-based criminal records management platform. A **FastAPI** backend serves a WebSocket-based face/emotion detection endpoint (OpenCV + Keras/TensorFlow) alongside a REST API for authentication, police stations, users, and criminal records with photo uploads. A **React** frontend provides live webcam detection, image-upload detection, and an admin dashboard suite for managing stations, users, and criminal records.

## Features

- **Real-time emotion detection** — webcam frames are streamed over a WebSocket, faces are located with OpenCV's Haar cascade classifier, and emotions (Angry, Disgust, Fear, Happy, Neutral, Sad, Surprise) are classified with a trained Keras/TensorFlow model.
- **Image-upload detection** — run the same detection pipeline on a single uploaded image.
- **Role-based access control** — `super_admin`, `admin`, and `user` roles, authenticated with JWT bearer tokens.
- **Station management** — super admins create police stations and their initial station admins.
- **User management** — admins manage user accounts scoped to their station.
- **Criminal records** — CRUD for criminal records (personal details, case/crime details, status, arresting officer) with multi-angle photo uploads per record.
- **Admin dashboards** — separate super-admin and station-level dashboards built on a shared UI component library.

## Technology stack

| Layer | Technology |
|---|---|
| Backend framework | FastAPI, Starlette, Uvicorn |
| Database / ORM | SQLAlchemy 2.x, SQLite (default; configurable via `DATABASE_URL`) |
| Auth & security | JWT (`PyJWT`), `bcrypt` password hashing |
| Face & emotion detection | OpenCV (Haar cascade), Keras / TensorFlow 2.8, `fer`, `mtcnn` |
| Backend testing | pytest |
| Frontend framework | React 18, React Router 6 |
| Frontend styling | Tailwind CSS, PostCSS |
| Webcam / vision (client) | `react-webcam`, TensorFlow.js, `@tensorflow-models/face-landmarks-detection` |
| UI extras | `@tsparticles/react` |
| Frontend testing | React Testing Library, Jest (via `react-scripts test`) |

## Project structure

```
face_detection/
├── server/                        # FastAPI backend
│   ├── app/
│   │   ├── main.py                # App factory: CORS, routers, static /uploads mount, /health
│   │   ├── database.py            # SQLAlchemy engine/session (DATABASE_URL, default sqlite:///./app.db)
│   │   ├── models.py               # Station, User, Criminal, CriminalPhoto, Role/CriminalStatus enums
│   │   ├── schemas.py              # Pydantic request/response schemas
│   │   ├── security.py             # Password hashing + JWT issuing/verification
│   │   ├── deps.py                 # Auth dependencies (get_current_user, require_roles)
│   │   ├── storage.py              # Criminal photo upload storage helpers
│   │   ├── seed.py / seed_cli.py    # Super admin seeding (script + CLI)
│   │   └── routers/
│   │       ├── auth.py             # POST /auth/login, GET /auth/me
│   │       ├── stations.py         # Station + station-admin management
│   │       ├── users.py            # User management (deactivate, scoping)
│   │       ├── criminals.py        # Criminal record CRUD + photo uploads
│   │       └── detection.py        # WebSocket "/" — face + emotion detection
│   ├── tests/                      # pytest suite (auth, models, criminals, stations, users, storage...)
│   ├── model.h5                    # Trained emotion classification model
│   ├── haarcascade_frontalface_default.xml
│   ├── requirements.txt
│   └── pytest.ini
│
└── emotion-recognition/            # React frontend
    ├── src/
    │   ├── App.js                  # Route definitions
    │   ├── api/client.js           # API client (auth token handling, requests)
    │   ├── context/                # AuthContext, ThemeContext
    │   ├── component/
    │   │   ├── common/             # Shared UI primitives (Button, Card, DataTable, StatCard, ...)
    │   │   ├── layout/              # AdminLayout (role-filtered navigation shell)
    │   │   ├── navbar/
    │   │   ├── routing/             # ProtectedRoute (role-gated routes)
    │   │   └── page/
    │   │       ├── home/            # Landing page
    │   │       ├── login/           # Login page
    │   │       ├── face_detection/  # Live webcam detection
    │   │       ├── image_input/     # Image-upload detection
    │   │       ├── dashboard/       # super_admin_dashboard, station_dashboard
    │   │       └── users/           # User management
    │   └── utilities.js
    └── package.json
```

Supplementary, non-required directories: `optional_trail_emaition_data/` (training/experiment data) and `backgroundJson/` (UI background assets).

## Prerequisites

- **Python 3.10** — the pinned dependencies (`tensorflow==2.8.0`, `keras==2.8.0`) do not have wheels for Python 3.11/3.12, so a newer system Python (e.g. Ubuntu 24.04's default 3.12) will fail to install them. On Ubuntu, install 3.10 via the deadsnakes PPA if you don't have it:
  ```bash
  sudo add-apt-repository ppa:deadsnakes/ppa
  sudo apt update
  sudo apt install python3.10 python3.10-venv
  ```
- Node.js 16+ and npm
- Git
- A webcam (for the live face-detection page)

## Getting started

### 0. Clone the repository

```bash
git clone git@github.com:atiqurrahman-it/face_detection.git
# or, over HTTPS:
# git clone https://github.com/atiqurrahman-it/face_detection.git

cd face_detection
```

### 1. Run the backend (server)

```bash
cd server

# create and activate a virtual environment (use the Python 3.10 interpreter)
python3.10 -m venv myenv
# Linux/macOS
source myenv/bin/activate
# Windows
myenv\Scripts\activate

# install dependencies
pip install -r requirements.txt

# copy the env template and adjust values (host/port/CORS origin/etc.) as needed
cp .env.example .env

# start the API — dev.sh loads .env so host/port/CORS come from it, not hardcoded flags
./dev.sh
```

The API (REST + WebSocket) starts on `http://127.0.0.1:8000` by default, with the detection WebSocket at `ws://127.0.0.1:8000/`. To change the port, edit `UVICORN_PORT` in `server/.env` and restart `./dev.sh` — no code or command-line changes needed.

> Plain `uvicorn app.main:app --reload --env-file .env` does **not** work for `UVICORN_HOST`/`UVICORN_PORT`: uvicorn parses `--host`/`--port` before it loads `--env-file`, so those two are silently ignored. `dev.sh` exports `.env` into the shell first, which uvicorn does read correctly.

#### Optional backend configuration (environment variables)

Set these in `server/.env` (see `server/.env.example`); `./dev.sh` exports them before starting uvicorn.

| Variable | Default | Purpose |
|---|---|---|
| `UVICORN_HOST` | `127.0.0.1` | Host uvicorn binds to |
| `UVICORN_PORT` | `8000` | Port uvicorn binds to |
| `DATABASE_URL` | `sqlite:///./app.db` | SQLAlchemy database URL |
| `JWT_SECRET_KEY` | `dev-secret-change-me` | Secret used to sign JWTs — **required** when `APP_ENV=production` |
| `APP_ENV` | unset | Set to `production` to enforce `JWT_SECRET_KEY` |
| `FRONTEND_ORIGIN` | `http://localhost:3000` | Allowed CORS origin for the frontend — must match the frontend's actual URL/port |

> If the backend or frontend port changes, update `FRONTEND_ORIGIN` in `server/.env` and `REACT_APP_API_URL` in `emotion-recognition/.env` to match — otherwise the browser will show CORS/fetch errors.

#### Create the first super admin

The database tables are created automatically on startup, but you need an initial super-admin account to log in and create stations/users:

```bash
python -m app.seed_cli <username> <password>
```

### 2. Run the frontend (client)

In a separate terminal:

```bash
cd emotion-recognition
npm install
cp .env.example .env   # adjust PORT / REACT_APP_API_URL if the backend runs elsewhere
npm start
```

This starts the React app on `http://localhost:3000` (or the `PORT` set in `emotion-recognition/.env`).

## Full process (clone → run, end to end)

Two terminals are needed, one for the backend and one for the frontend.

```bash
# 1. Clone
git clone git@github.com:atiqurrahman-it/face_detection.git
cd face_detection

# 2. Terminal 1 — backend
cd server
python3.10 -m venv myenv
source myenv/bin/activate      # Windows: myenv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python -m app.seed_cli admin changeme                # one-time: create a super admin
./dev.sh                                             # keep this running (http://127.0.0.1:8000)

# 3. Terminal 2 — frontend
cd face_detection/emotion-recognition
npm install
cp .env.example .env
npm start                       # keep this running (http://localhost:3000)
```

## Usage

1. Start the backend, then the frontend, as above.
2. Open `http://localhost:3000` in your browser.
3. Visit `/face-detection` for live webcam emotion detection, or `/input-image` for detection on an uploaded image — no login required.
4. Visit `/login` to sign in with a seeded account:
   - `super_admin` → redirected to `/admin` to manage stations.
   - `admin` / `user` → redirected to `/dashboard` for station-level views; admins can also manage users at `/users`.
5. Allow camera access when prompted on the detection pages; detected faces and their predicted emotion are shown on screen.
6. Stop either process with `Ctrl+C` in its terminal when done.

## Running tests

**Backend** (from `server/`, with the virtual environment activated):
```bash
pytest
```

**Frontend** (from `emotion-recognition/`):
```bash
npm test
```

## Notes

- The detection router (`server/app/routers/detection.py`) loads `model.h5` and `haarcascade_frontalface_default.xml` from the `server/` directory using relative paths, so always run `uvicorn` from inside the `server/` directory.
- `server/myenv` is a leftover Windows virtual environment with no project packages installed. Do not reuse it — create a fresh virtual environment as shown above and install `requirements.txt` into it.
- If `python3 -m venv` fails with a missing `pip`/`ensurepip` module, install the venv/pip system packages first: `sudo apt install python3-venv python3-pip` (or `python3.10-venv` if using deadsnakes).
- SQLite database (`server/app.db`) and uploaded criminal photos (`server/uploads/`) are git-ignored and created automatically on first run.
- `server/dev.sh` requires bash/WSL/Git Bash. On plain Windows PowerShell, load `.env` and start uvicorn manually instead: `Get-Content .env | ForEach-Object { if ($_ -match '^\s*([^#=]+)=(.*)$') { [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2]) } }; uvicorn app.main:app --reload`.
