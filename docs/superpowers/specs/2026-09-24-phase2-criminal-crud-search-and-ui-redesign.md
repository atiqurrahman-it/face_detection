# Phase 2: Criminal CRUD + Search, and Admin Portal UI Redesign — Spec

> Addendum to `docs/superpowers/specs/2026-09-23-criminal-database-face-recognition.md`
> (the "Phase 1 spec"). This is Phase 2 of that spec's roadmap: "Criminal
> CRUD + Bangladesh-wide search". It also covers a full visual redesign of
> the admin portal, requested alongside Phase 2 (2026-09-24) because the
> Phase 1 screens (login, dashboards, user management) shipped
> functionally correct but visually unstyled.

## Why

Phase 1 shipped auth, stations, and roles with no way to actually register
or look up a criminal — there is no portal for it yet. This phase adds
that. Separately, the Phase 1 screens are plain (default browser input/
button styling, no layout) and need to look like professional
records-management software before more screens are added on top.

## Scope confirmed with the user (2026-09-24)

- Criminal search/check stays open to **every logged-in role** (Station
  User, Station Admin, Super Admin) — this already matched the Phase 1
  spec's "Roles & access" table, no change.
- UI redesign covers the **whole admin portal**: the new Phase 2 screens
  *and* the existing Phase 1 screens (login, Super Admin Dashboard,
  Station Dashboard, User Management).
- Visual direction: **clean light back-office look** — data tables,
  sidebar navigation, status-color badges — not the dark/particle theme
  used on the public Home/Face Detection pages.

## UI system

**No new npm dependencies.** The existing stack (Tailwind, `ThemeContext`
class-based dark mode, hand-rolled inline SVG icons as in
`navbar.js`'s `SunIcon`/`MoonIcon`) already supports everything this
needs. Reuse the established palette (`slate` neutrals, `emerald-500`
accent, `rounded-2xl` cards, `border`, `shadow-lg`, dark: variants) so the
admin portal reads as the same product, not a bolted-on template.

**`AdminLayout`** (`src/component/layout/AdminLayout.js`): the shell every
authenticated page renders inside.
- Left sidebar (fixed width, `slate-50`/`slate-900` background): app mark,
  then nav links filtered by the current user's role:
  - Super Admin: Dashboard (`/admin`), Criminal Search (`/criminals`),
    Add Criminal (`/criminals/new`)
  - Station Admin: Dashboard (`/dashboard`), Criminal Search
    (`/criminals`), Add Criminal (`/criminals/new`), User Management
    (`/users`)
  - Station User: Dashboard (`/dashboard`), Criminal Search
    (`/criminals`), Add Criminal (`/criminals/new`)
  Active link highlighted the same way `navbar.js`'s `navLinkClasses`
  does today (emerald pill).
- Top bar: page title (passed as a prop), user's display name + a small
  role badge, the existing theme toggle button (reused from
  `ThemeContext`/the icon components in `navbar.js`, extracted so both
  the public navbar and this layout can use them), and a Logout button
  (same behavior as Phase 1's dashboard logout buttons — call
  `useAuth().logout()`; `ProtectedRoute` already redirects to `/login`
  once `user` goes null, so no manual navigation needed here either).

**Reusable primitives** (`src/component/common/`):
- `StatusBadge.js` — pill with fixed color map: `Wanted` → red,
  `Under trial` → orange, `Convicted` → purple, `Released` → green,
  `Arrested` → amber, `Absconding` → slate (the two statuses not named in
  the Phase 1 spec's color line get a reasonable color, not an
  unstyled fallback).
- `DataTable.js` — a plain `<table>` wrapper (header row, striped rows,
  empty state, no virtualization/pagination library — Phase 2's data
  volume doesn't need one) used by Criminal Search and User Management.
- `Card.js` / `StatCard.js` — the `rounded-2xl border ... shadow-lg`
  container pattern already used by `EmotionBreakdown.js`, generalized.
- `Button.js` — `primary` (emerald, filled), `secondary` (slate, outline),
  `danger` (red, for delete/deactivate) variants, replacing the current
  bare `<button className="border rounded px-2 py-1">` used everywhere.
- `FormField.js` — label + input wrapper with consistent spacing/focus
  ring, replacing the hand-repeated `<div><label>...<input
  className="w-full border rounded px-2 py-1" /></div>` blocks in
  `login_page.js`, `super_admin_dashboard.js`, and `user_management.js`.

**Migration of Phase 1 screens:** `login_page.js` gets the same visual
polish (card, better spacing) but stays outside `AdminLayout` (no
sidebar before login). `super_admin_dashboard.js`, `station_dashboard.js`,
and `user_management.js` are rewritten to render inside `AdminLayout` and
use the new primitives instead of their current ad-hoc markup. This is a
visual/structural rewrite only — no behavior change, so Phase 1's existing
tests for these files are rewritten test-by-test against the same
behaviors (same assertions on what happens, updated selectors where the
DOM structure changes) rather than dropped.

## Criminal data model

New tables (SQLAlchemy models in `server/app/models.py`, alongside
`Station`/`User`):

**`criminals`**
| Column | Type | Notes |
|---|---|---|
| id | int, PK | |
| criminal_code | str, unique | auto-generated, e.g. `CR-000001` (zero-padded id) |
| full_name | str, required | |
| alias | str, nullable | |
| father_name | str, nullable | |
| mother_name | str, nullable | |
| date_of_birth | date, nullable | |
| gender | str, required | free text per spec (not an enum — spec doesn't enumerate values) |
| nid_or_birth_cert | str, nullable | |
| blood_group | str, nullable | |
| phone | str, nullable | |
| occupation | str, nullable | |
| present_address | str, nullable | |
| permanent_address | str, nullable | |
| height | str, nullable | |
| identifying_marks | str, nullable | |
| fir_case_number | str, nullable | |
| crime_type | str, required | |
| penal_code_sections | str, nullable | |
| crime_description | str, nullable | |
| incident_date | date, nullable | |
| arrest_date | date, nullable | |
| status | str, required | one of: Wanted / Arrested / Under trial / Convicted / Released / Absconding |
| station_id | int, FK stations.id, required | "registering thana" |
| arresting_officer | str, nullable | |
| repeat_offender | bool, default False | |
| added_by | int, FK users.id, required | |
| created_at | datetime | |
| updated_at | datetime | |

**`criminal_photos`**
| Column | Type | Notes |
|---|---|---|
| id | int, PK | |
| criminal_id | int, FK criminals.id | |
| photo_path | str | relative path under `server/uploads/criminals/<criminal_code>/` |
| angle | str | `front` / `left_profile` / `right_profile` |
| face_embedding | text, nullable | **left null in Phase 2** — Phase 3 populates it |
| created_at | datetime | |

At least one `front` photo is required to create a criminal record (the
spec's "at least one front photo" requirement); left/right profile photos
are optional at creation, addable later via edit.

**Repeat-offender links:** the spec mentions "links to earlier case IDs"
for repeat offenders — out of scope for Phase 2 (no linking UI/table yet);
`repeat_offender` is a flag only. Noted as a Phase 5 candidate, not
silently dropped.

## Permissions

Matches the Phase 1 spec's role table exactly:

| Action | Station User | Station Admin | Super Admin |
|---|---|---|---|
| Create (own station) | yes | yes | yes, but must pick a `station_id` explicitly (no `station_id` of their own) |
| Edit (own station) | yes | yes | yes, any station |
| Delete | **no** | yes (own station) | yes, any station |
| Search / view detail | yes, all stations | yes, all stations | yes, all stations |

Enforced the same way Phase 1 enforces station scope: a `_criminal_scope`
helper (same shape as `stations.py`'s `_station_scope`) checked before
mutating endpoints; search/detail endpoints have no station filter at
all — they already query across every station by design.

## API surface (`server/app/routers/criminals.py`)

- `POST /criminals` (multipart form: fields + `front_photo` required,
  `left_photo`/`right_photo` optional) — create. 201 with the created
  record. 400 on missing required fields beyond what Pydantic already
  validates (e.g. missing front photo), 403 on station-scope violation.
- `GET /criminals` — search/list. Query params: `q` (matches name or
  NID), `station_id`, `status`, `crime_type`, `page`, `page_size`
  (default 20, max 100). Returns `{items, total, page, page_size}`.
- `GET /criminals/{id}` — detail, including photo URLs.
- `PATCH /criminals/{id}` (multipart, all fields optional, including new
  photos) — edit. 403 on station-scope violation, 404 if not found.
- `DELETE /criminals/{id}` — 403 if caller is a Station User or a
  Station Admin/Super Admin outside their scope, 404 if not found, 204 on
  success.
- Static file serving for `server/uploads/` via FastAPI's `StaticFiles`,
  mounted at `/uploads`, so the frontend can render photos directly by
  URL.

## Screens

- **Criminal Search** (`/criminals`, everyone): `AdminLayout` + filter bar
  (name/NID text input, station dropdown restricted server-side only by
  what the API returns — the dropdown itself lists all stations, fetched
  from `GET /stations`... but that endpoint is Super-Admin-only in Phase
  1. **Open question below.**) + `DataTable` of results with
  `StatusBadge`, linking to detail.
- **Criminal Detail** (`/criminals/:id`, everyone): photo gallery (front +
  profiles), identity/address/case sections as labeled key-value pairs,
  Edit/Delete buttons shown only per the permissions table above.
- **Add/Edit Criminal** (`/criminals/new`, `/criminals/:id/edit`; Station
  User/Admin/Super Admin): sectioned form (Identity, Address, Physical
  description, Photos, Case, Record) matching the spec's field groups,
  camera-or-file-upload for photos reusing the existing
  `react-webcam` dependency already in `package.json` (used today by
  `face_detection.js`).

## Decision: loosening `GET /stations`

Criminal Search's station filter needs a station list, but `GET
/stations` is currently Super-Admin-only (Phase 1's
`require_roles(Role.SUPER_ADMIN)`). **Decision: loosen it to any
authenticated role** — change its dependency to
`require_roles(Role.SUPER_ADMIN, Role.ADMIN, Role.USER)`. Nothing in the
response (`id, name, district, code`) is sensitive, and the spec's own
Criminal Search page description implies station names must be visible
to every role ("Filterable table across all Bangladesh: ... thana"). A
second near-duplicate lookup endpoint was considered and rejected as
unnecessary complexity for the same data.

This is called out explicitly, rather than folded silently into the
plan, because it changes a Phase 1 permission boundary rather than only
adding new surface area — flagged for the spec-review gate below.
