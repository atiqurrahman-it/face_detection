import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import Base, SessionLocal, engine
from .routers import auth, criminals, dashboard, detection, stations, users
from .seed import seed_default_super_admin, super_admin_password
from .storage import UPLOAD_ROOT

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    # Comma-separated, e.g. "http://localhost:3060,https://myapp.vercel.app"
    allow_origins=[
        o.strip()
        for o in os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000").split(",")
        if o.strip()
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(stations.router)
app.include_router(users.router)
app.include_router(criminals.router)
app.include_router(dashboard.router)
app.include_router(detection.router)

os.makedirs(UPLOAD_ROOT, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_ROOT), name="uploads")


@app.on_event("startup")
def seed_initial_super_admin():
    # Writes to the real DB, so the test suite turns it off (see tests/conftest.py).
    if os.environ.get("SKIP_SUPER_ADMIN_SEED") == "1":
        return
    db = SessionLocal()
    try:
        seed_default_super_admin(db, password=super_admin_password(os.environ))
    finally:
        db.close()


@app.get("/health")
def health():
    return {"status": "ok"}
