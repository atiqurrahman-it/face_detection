# Police Station Criminal Database & Face Recognition — Spec

> Source: plan doc authored 2026-09-23 (https://claude.ai/artifact/BimGB8rPT2H9oRsxKWKCjg). Captured verbatim as the spec this repo's plans implement.

This adds a police-station-wise criminal database to the existing face/emotion
detection app: officers add criminals under their own thana, and anyone can
auto-identify a criminal from an uploaded photo or a live camera feed,
matched against records from all of Bangladesh.

## Overview

Today the app only detects faces and classifies emotion in real time. This
adds a station-wise criminal registry on top of the same camera/upload
pipeline:

- Police stations (thana) add criminals they have arrested or are looking for.
- Anyone logged in can check an uploaded photo or a live camera feed against
  every criminal on record, not just their own station's.
- A match instantly surfaces the criminal's full profile: identity, case
  status, and which thana holds the file.

## Roles & access

| Role | Created by | Can do | Data scope |
|---|---|---|---|
| Super Admin | Seeded once at setup | Create/manage police stations; create the first Admin for each new station; view everything | All stations |
| Station Admin | Super Admin, at station creation | Create/manage Station Users for their thana; add, edit, delete criminals for their thana; run face checks | Edit own thana; search all Bangladesh |
| Station User | Station Admin | Add criminals for their thana; run face checks; view records (cannot delete) | Edit own thana; search all Bangladesh |

Station only controls who may edit a given criminal record. The Criminal
Search page and every face check (upload or live camera) always query all
stations at once — a check covers all of Bangladesh.

**Ruling (this repo, not overridden by user):** Super Admin can edit/delete
any criminal at any station, not just view.

## Criminal data fields

| Group | Fields |
|---|---|
| Identity | Full name, alias/nickname, father's name, mother's name, date of birth/age, gender; optional: NID or birth-certificate no., blood group, phone number, occupation |
| Address | Present address, permanent address (district, thana, village/area) |
| Physical description | Height, identifying marks (scars, tattoos, deformities) |
| Photos | 2-3 photos (front + both side profiles) — these generate the face-matching data, not just a plain attachment |
| Case | Criminal ID (auto), FIR/case number, crime type, penal code section(s), crime description, incident date, arrest date, status: Wanted / Arrested / Under trial / Convicted / Released / Absconding |
| Record | Registering thana, arresting officer, repeat-offender flag with links to earlier case IDs |
| System (auto-filled) | Added by, added date, last updated |

Only a few fields are required to save a record: full name, gender, at least
one front photo, crime type, status and registering thana (plus the
auto-filled system fields). Everything else — including NID/birth-certificate
no., blood group, phone number, occupation — is optional, fillable later.

Status drives the color badge shown everywhere in the UI: red = Wanted,
orange = Under trial, purple = Convicted, green = Released.

## Face recognition pipeline

```
Upload photo OR live camera frame
  -> Detect face
  -> Generate face embedding
  -> Compare vs every criminal's embedding, all Bangladesh
  -> Match above threshold? yes -> show profile + confidence %
                            no  -> "no match" -> offer to add as new criminal
```

The existing `model.h5` only scores emotion — it was never trained to tell
two faces apart, so it cannot power identification. **Ruling: use DeepFace
(ArcFace)** — reuses TensorFlow, already a project dependency, instead of
adding a separate dlib/InsightFace runtime.

Live camera works like the existing `/face-detection` page: frames stream
over the current WebSocket connection roughly once a second, each face gets
a bounding box, and a match is highlighted (name + confidence) directly on
the video — the same overlay pattern `FaceOverlay` already uses for emotion.

**Ruling: live-camera match alerts are a silent overlay only** (no
sound/visual alarm) for the initial build; can be extended later.

**Ruling: every face check, including non-matches, is logged** (who
checked, when, result) via `face_check_log`.

## Tech stack & database

The FastAPI backend gains a real database (SQLite via SQLAlchemy — no
separate DB server needed at this scale) plus JWT auth with bcrypt password
hashing and a role check on every endpoint.

| Table | Key columns |
|---|---|
| stations | id, name, district, code |
| users | id, name, username, password_hash, role (super_admin / admin / user), station_id |
| criminals | id, criminal_code, identity/address/case fields, station_id, added_by, created_at, updated_at |
| criminal_photos | id, criminal_id, photo_path, face_embedding, angle |
| face_check_log | id, checked_by, station_id, matched_criminal_id (nullable), confidence, checked_at |

Face embeddings load into an in-memory index at startup and refresh on
every add, so a match compares against a numpy array instead of hitting the
database per candidate.

**Ruling: photo storage is local disk under `server/`**, matching the
current setup (not cloud storage, for this build).

## Screens & data display

| Page | Who sees it | What it shows |
|---|---|---|
| Login | Everyone | Username + password |
| Super Admin Dashboard | Super Admin | Station count, criminals by status, create-station form (with its first Admin) |
| Station Dashboard | Admin, User | Own-station stat cards, recent additions, quick actions |
| Criminal Search | Everyone | Filterable table across all Bangladesh: name, NID, thana, status, crime type; status shown as a color badge |
| Criminal Detail | Everyone | Photo gallery, identity/address/case sections, edit/delete (permission-based) |
| Add/Edit Criminal | Admin, User | Sectioned form with camera/upload capture for the required photos |
| Face Check | Everyone | Tabs: Upload Image / Live Camera; ranked matches with photo, confidence %, link to full profile, or "no match, add new" |
| User Management | Admin | List/create/deactivate Station Users for their thana |

## Build roadmap

```
Phase 1: Auth + stations + roles
  -> Phase 2: Criminal CRUD + Bangladesh-wide search
  -> Phase 3: Face embedding + matching API
  -> Phase 4: Face Check page: upload + live camera
  -> Phase 5: Dashboards, stats, audit log, polish
```

Each phase ships and is testable on its own before the next starts. Phase 4
is the smallest jump of the five, since it reuses the WebSocket streaming
already built for the live emotion-detection page.

This repo executes the roadmap phase-by-phase, with a check-in after each
phase (user's choice, 2026-09-23), rather than all 5 phases in one
continuous run.

## Existing codebase (as of 2026-09-23, before this work)

- Backend: `server/main.py` — single-file FastAPI app, one WebSocket
  endpoint (`/`) that does emotion detection only (Haar cascade + `model.h5`
  Keras classifier). No database, no auth, no other routes. Deps in
  `server/requirements.txt` (FastAPI 0.75, TensorFlow 2.8, Keras 2.8,
  OpenCV, no test framework installed).
- Frontend: `emotion-recognition/` — Create React App (react-scripts 5,
  React 18, react-router-dom 6, Tailwind). Pages under
  `src/component/page/{home,face_detection,image_input}`. Shared bits:
  `src/component/common/FaceOverlay.js`, `EmotionBreakdown.js`,
  `src/context/ThemeContext.js`. No auth, no routing guards, no API client
  layer yet.
