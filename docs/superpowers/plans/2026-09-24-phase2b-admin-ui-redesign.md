# Phase 2b: Admin Portal UI Redesign + Criminal Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain, unstyled Phase 1 admin screens (login, dashboards, user management) with a professional back-office UI built on shared primitives, and add the three new Phase 2 screens (Criminal Search, Criminal Detail, Add/Edit Criminal) that consume Phase 2a's API.

**Architecture:** A small set of Tailwind-only presentational components (`Button`, `FormField`, `Card`/`StatCard`, `StatusBadge`, `DataTable`) plus an `AdminLayout` shell (sidebar + top bar) that every authenticated page renders inside. Phase 1's screens are rewritten to use these instead of ad-hoc markup; the three new screens are built the same way from the start. No new npm dependencies — reuses the existing Tailwind setup, `ThemeContext`, and `react-webcam` (already a dependency, used today by `face_detection.js`) for photo capture.

**Tech Stack:** React 18, Tailwind CSS, `react-webcam` (existing), `react-router-dom` (existing). No new packages.

**Spec:** `docs/superpowers/specs/2026-09-24-phase2-criminal-crud-search-and-ui-redesign.md` (the "UI system" and "Screens" sections). Depends on Phase 2a (`docs/superpowers/plans/2026-09-24-phase2a-criminal-api.md`) being merged first — this plan's screens call `POST/GET/PATCH/DELETE /criminals` and the now-unrestricted `GET /stations`.

## Global Constraints

- No new npm dependencies. Hand-roll any needed icons as inline SVG components, matching the existing `SunIcon`/`MoonIcon` pattern in `src/component/navbar/navbar.js`.
- Reuse the established palette: `slate` neutrals, `emerald-500` accent, `rounded-2xl` cards, `border`, `shadow-lg`, dark: variants via the existing class-based `ThemeContext` — never introduce a second color system.
- `AdminLayout`'s sidebar nav links are role-filtered exactly as specified: Station User gets Dashboard + Criminal Search + Add Criminal; Station Admin additionally gets User Management; Super Admin gets Dashboard + Criminal Search + Add Criminal (no User Management — that's station-scoped, Super Admin has no station).
- Status badge colors are fixed: Wanted=red, Under trial=orange, Convicted=purple, Released=green, Arrested=amber, Absconding=slate (per the spec's color line, extended to the two statuses it didn't name).
- Rewriting Phase 1 screens is a visual/structural change only — no behavior change. Existing behavioral guarantees (redirect targets, who sees what, error messages) must still hold; tests are rewritten against the same behaviors with updated selectors, never deleted wholesale.
- Photo capture in Add/Edit Criminal reuses `react-webcam` (already imported by `face_detection.js`) for the camera path, plus a plain `<input type="file">` for upload — both write into the same in-memory `File`/`Blob` state before submit, matching how the spec describes "camera/upload capture" as one control, not two separate flows.

## Review Focus

- A Station User opens `/users` directly by URL (not just by hiding the sidebar link) — `ProtectedRoute`'s existing `roles` prop must still block it (403-equivalent redirect), since the sidebar is a convenience, not the access control.
- The Criminal Search station-filter dropdown must still work for a Station User even though they can't create stations — it only needs `GET /stations` (now unrestricted per Phase 2a), never `POST /stations`.
- A `StatusBadge` given a status string it doesn't recognize (defensive: the backend enum should prevent this, but the component must not crash the page) renders a visible fallback style, not a blank/undefined class.
- The Add Criminal form's required-field validation (front photo, full name, gender, crime type, status, station) must block submission client-side with a visible message, not silently POST an incomplete `payload` and surface only the backend's 422 as an unexplained failure.
- Uploading a very large photo or a non-image file through the camera/upload control must not crash the form — the browser-side `File` handling must guard against `undefined`/non-image selections before attempting to preview or submit them.

---

### Task 1: Shared UI primitives

**Files:**
- Create: `emotion-recognition/src/component/common/Button.js`
- Create: `emotion-recognition/src/component/common/FormField.js`
- Create: `emotion-recognition/src/component/common/Card.js`
- Create: `emotion-recognition/src/component/common/StatCard.js`
- Create: `emotion-recognition/src/component/common/StatusBadge.js`
- Create: `emotion-recognition/src/component/common/StatusBadge.test.js`
- Create: `emotion-recognition/src/component/common/DataTable.js`
- Create: `emotion-recognition/src/component/common/icons.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: `<Button variant="primary"|"secondary"|"danger" ...props>`, `<FormField label htmlFor ...props><input .../></FormField>`, `<Card>`, `<StatCard label value />`, `<StatusBadge status="Wanted"|"Arrested"|"Under trial"|"Convicted"|"Released"|"Absconding"|other />`, `<DataTable columns={[{key,header,render?}]} rows={[]} emptyMessage keyField />`, and icon components (`DashboardIcon, SearchIcon, PlusIcon, UsersIcon, LogoutIcon, SunIcon, MoonIcon`) from `icons.js`. Every later task in this plan imports from these files.

- [ ] **Step 1: Write the failing `StatusBadge` test**

`emotion-recognition/src/component/common/StatusBadge.test.js`:
```javascript
import { render, screen } from "@testing-library/react";
import StatusBadge from "./StatusBadge";

test("renders the correct color class for each known status", () => {
  const cases = [
    ["Wanted", "bg-red-100"],
    ["Under trial", "bg-orange-100"],
    ["Convicted", "bg-purple-100"],
    ["Released", "bg-green-100"],
    ["Arrested", "bg-amber-100"],
    ["Absconding", "bg-slate-100"],
  ];

  for (const [status, expectedClass] of cases) {
    const { unmount } = render(<StatusBadge status={status} />);
    expect(screen.getByText(status).className).toEqual(expect.stringContaining(expectedClass));
    unmount();
  }
});

test("falls back to a visible style for an unrecognized status instead of crashing", () => {
  render(<StatusBadge status="Some Future Status" />);

  const badge = screen.getByText("Some Future Status");
  expect(badge).toBeInTheDocument();
  expect(badge.className).toEqual(expect.stringContaining("bg-slate-100"));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd emotion-recognition && CI=true npx react-scripts test src/component/common/StatusBadge.test.js --watchAll=false`
Expected: FAIL — `Cannot find module './StatusBadge'`.

- [ ] **Step 3: Implement `emotion-recognition/src/component/common/StatusBadge.js`**

```javascript
const STATUS_STYLES = {
  Wanted: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  Arrested: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  "Under trial": "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
  Convicted: "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  Released: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  Absconding: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const FALLBACK_STYLE = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || FALLBACK_STYLE;

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${style}`}>
      {status}
    </span>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd emotion-recognition && CI=true npx react-scripts test src/component/common/StatusBadge.test.js --watchAll=false`
Expected: PASS 2/2.

- [ ] **Step 5: Implement the remaining primitives (no dedicated tests — pure presentational wrappers exercised through the screens that use them in later tasks)**

`emotion-recognition/src/component/common/Button.js`:
```javascript
const VARIANT_CLASSES = {
  primary: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm shadow-emerald-500/30",
  secondary: "border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800",
  danger: "border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10",
};

export default function Button({ variant = "primary", className = "", ...props }) {
  return (
    <button
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
```

`emotion-recognition/src/component/common/FormField.js`:
```javascript
export default function FormField({ label, htmlFor, error, children }) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      {children}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
```

(The `<input>`/`<select>`/`<textarea>` itself is passed as `children` rather than rendered by `FormField`, so callers keep full control of `value`/`onChange`/`type` — `FormField` only standardizes the label/spacing/error wrapper. Every input rendered inside it should carry this shared class string: `"w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"`.)

`emotion-recognition/src/component/common/Card.js`:
```javascript
export default function Card({ className = "", children }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      {children}
    </div>
  );
}
```

`emotion-recognition/src/component/common/StatCard.js`:
```javascript
import Card from "./Card";

export default function StatCard({ label, value }) {
  return (
    <Card>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
    </Card>
  );
}
```

`emotion-recognition/src/component/common/DataTable.js`:
```javascript
export default function DataTable({ columns, rows, keyField, emptyMessage = "No records found." }) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-800/60">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
          {rows.map((row) => (
            <tr key={row[keyField]} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

`emotion-recognition/src/component/common/icons.js` (extracted/expanded from the inline SVGs already hand-rolled in `navbar.js`, kept as one file so `AdminLayout` and the navbar can both use `SunIcon`/`MoonIcon` without duplicating them):
```javascript
export const SunIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
  </svg>
);

export const MoonIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
  </svg>
);

export const DashboardIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
  </svg>
);

export const SearchIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
  </svg>
);

export const PlusIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

export const UsersIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
  </svg>
);

export const LogoutIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 -3H9m0 0 3-3m-3 3 3 3" />
  </svg>
);
```

- [ ] **Step 6: Run the full frontend test suite**

Run: `cd emotion-recognition && CI=true npx react-scripts test --watchAll=false`
Expected: same result as the Phase 1 baseline — 1 known pre-existing failed suite (`App.test.js`, the unrelated `@tsparticles/react` ESM issue), all other suites pass, plus `StatusBadge.test.js`'s 2 new passing tests.

- [ ] **Step 7: Commit**

```bash
cd emotion-recognition && git add src/component/common/Button.js src/component/common/FormField.js src/component/common/Card.js src/component/common/StatCard.js src/component/common/StatusBadge.js src/component/common/StatusBadge.test.js src/component/common/DataTable.js src/component/common/icons.js && git commit -m "feat: add shared admin UI primitives"
```

---

### Task 2: `AdminLayout` shell

**Files:**
- Create: `emotion-recognition/src/component/layout/AdminLayout.js`
- Create: `emotion-recognition/src/component/layout/AdminLayout.test.js`
- Modify: `emotion-recognition/src/context/ThemeContext.js` (export the raw context)

**Interfaces:**
- Consumes: `useAuth()`, `useTheme()` (existing), the icon components from Task 1's `icons.js`.
- Produces: `<AdminLayout title="...">{children}</AdminLayout>`. Tasks 3-8 wrap every authenticated page (except the login page) in this.

- [ ] **Step 1: Export the raw `ThemeContext` for test harnesses**

Modify `emotion-recognition/src/context/ThemeContext.js`: change `const ThemeContext = createContext(null);` to `export const ThemeContext = createContext(null);` (keep the existing exports of `ThemeProvider` and `useTheme` as-is). This mirrors how `AuthContext` was already exported in Phase 1 (Task 7's Step 2) so tests can supply a fixed `{ theme, toggleTheme }` value without going through `ThemeProvider`'s `window.matchMedia` call, which jsdom's test environment does not implement.

- [ ] **Step 2: Write the failing `AdminLayout` tests**

`emotion-recognition/src/component/layout/AdminLayout.test.js`:
```javascript
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { ThemeContext } from "../../context/ThemeContext";
import AdminLayout from "./AdminLayout";

function renderLayout(user, { logout = jest.fn(), toggleTheme = jest.fn() } = {}) {
  return render(
    <AuthContext.Provider value={{ user, token: "abc123", loading: false, logout }}>
      <ThemeContext.Provider value={{ theme: "light", toggleTheme }}>
        <MemoryRouter>
          <AdminLayout title="Test Page">
            <p>page content</p>
          </AdminLayout>
        </MemoryRouter>
      </ThemeContext.Provider>
    </AuthContext.Provider>
  );
}

test("station user sees Dashboard, Criminal Search, Add Criminal but not User Management", () => {
  renderLayout({ id: 1, role: "user", username: "officer1", station_id: 1 });

  expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /criminal search/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /add criminal/i })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /user management/i })).not.toBeInTheDocument();
});

test("station admin additionally sees User Management", () => {
  renderLayout({ id: 2, role: "admin", username: "dhk01admin", station_id: 1 });

  expect(screen.getByRole("link", { name: /user management/i })).toBeInTheDocument();
});

test("super admin does not see User Management", () => {
  renderLayout({ id: 3, role: "super_admin", username: "root", station_id: null });

  expect(screen.queryByRole("link", { name: /user management/i })).not.toBeInTheDocument();
});

test("clicking log out calls logout", () => {
  const logout = jest.fn();
  renderLayout({ id: 1, role: "user", username: "officer1", station_id: 1 }, { logout });

  fireEvent.click(screen.getByRole("button", { name: /log ?out/i }));

  expect(logout).toHaveBeenCalledTimes(1);
});

test("renders the page title and children", () => {
  renderLayout({ id: 1, role: "user", username: "officer1", station_id: 1 });

  expect(screen.getByRole("heading", { name: "Test Page" })).toBeInTheDocument();
  expect(screen.getByText("page content")).toBeInTheDocument();
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd emotion-recognition && CI=true npx react-scripts test src/component/layout/AdminLayout.test.js --watchAll=false`
Expected: FAIL — `Cannot find module './AdminLayout'`.

- [ ] **Step 4: Implement `emotion-recognition/src/component/layout/AdminLayout.js`**

```javascript
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import {
  DashboardIcon,
  LogoutIcon,
  MoonIcon,
  PlusIcon,
  SearchIcon,
  SunIcon,
  UsersIcon,
} from "../common/icons";

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: DashboardIcon, roles: ["super_admin"] },
  { to: "/dashboard", label: "Dashboard", icon: DashboardIcon, roles: ["admin", "user"] },
  { to: "/criminals", label: "Criminal Search", icon: SearchIcon, roles: ["super_admin", "admin", "user"] },
  { to: "/criminals/new", label: "Add Criminal", icon: PlusIcon, roles: ["super_admin", "admin", "user"] },
  { to: "/users", label: "User Management", icon: UsersIcon, roles: ["admin"] },
];

const linkClasses = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "bg-emerald-500 text-white"
      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
  }`;

export default function AdminLayout({ title, children }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:block">
        <div className="mb-6 flex items-center gap-2 px-2 font-bold text-slate-800 dark:text-white">
          <span className="text-xl">🛡️</span>
          <span>Criminal Records</span>
        </div>
        <nav className="space-y-1">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end className={linkClasses}>
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{title}</h1>
          <div className="flex items-center gap-3">
            <div className="text-right text-sm">
              <p className="font-medium text-slate-800 dark:text-white">{user.name || user.username}</p>
              <p className="text-xs uppercase tracking-wide text-slate-400">{user.role.replace("_", " ")}</p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <LogoutIcon className="h-4 w-4" />
              Log out
            </button>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd emotion-recognition && CI=true npx react-scripts test src/component/layout/AdminLayout.test.js --watchAll=false`
Expected: PASS 5/5.

- [ ] **Step 6: Run the full frontend test suite**

Run: `cd emotion-recognition && CI=true npx react-scripts test --watchAll=false`
Expected: same known baseline (`App.test.js` fails on the pre-existing `@tsparticles/react` issue), all other suites — including the new `AdminLayout.test.js` — pass.

- [ ] **Step 7: Commit**

```bash
cd emotion-recognition && git add src/component/layout/AdminLayout.js src/component/layout/AdminLayout.test.js src/context/ThemeContext.js && git commit -m "feat: add AdminLayout shell with role-filtered navigation"
```

---

### Task 3: Restyle the login page

**Files:**
- Modify: `emotion-recognition/src/component/page/login/login_page.js`

**Interfaces:**
- Consumes: `Card`, `FormField`, `Button` (Task 1).
- Produces: no interface change — same `id="username"`/`id="password"` fields, same "Log in" button text, same `role="alert"` error element. This is a pure visual refactor; Phase 1's `login_page.test.js` is the regression gate and needs no changes.

- [ ] **Step 1: Run the existing test to confirm the baseline is green**

Run: `cd emotion-recognition && CI=true npx react-scripts test src/component/page/login/login_page.test.js --watchAll=false`
Expected: PASS 2/2 (this is the pre-change baseline — no new test is written for this task since it changes no behavior, only markup/styling; Phase 1's existing test is what must keep passing).

- [ ] **Step 2: Rewrite `emotion-recognition/src/component/page/login/login_page.js`**

```javascript
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import Button from "../../common/Button";
import Card from "../../common/Card";
import FormField from "../../common/FormField";

const inputClasses =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white";

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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <Card className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-white">
          <span className="text-2xl">🛡️</span>
          <span>Criminal Records Portal</span>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Username" htmlFor="username">
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={inputClasses}
            />
          </FormField>
          <FormField label="Password" htmlFor="password">
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClasses}
            />
          </FormField>
          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <Button type="submit" disabled={submitting} className="w-full">
            Log in
          </Button>
        </form>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Run the test again to confirm it still passes**

Run: `cd emotion-recognition && CI=true npx react-scripts test src/component/page/login/login_page.test.js --watchAll=false`
Expected: PASS 2/2, unchanged.

- [ ] **Step 4: Commit**

```bash
cd emotion-recognition && git add src/component/page/login/login_page.js && git commit -m "style: restyle login page with shared UI primitives"
```

---

### Task 4: Rewrite the dashboards to use `AdminLayout`

**Files:**
- Modify: `emotion-recognition/src/component/page/dashboard/super_admin_dashboard.js`
- Modify: `emotion-recognition/src/component/page/dashboard/super_admin_dashboard.test.js`
- Modify: `emotion-recognition/src/component/page/dashboard/station_dashboard.js`
- Modify: `emotion-recognition/src/component/page/dashboard/station_dashboard.test.js`

**Interfaces:**
- Consumes: `AdminLayout` (Task 2), `Button`, `Card`, `FormField`, `StatCard` (Task 1).
- Produces: no API-facing interface change. The standalone "Log out" button and its dedicated test are removed from both page files — that behavior is now `AdminLayout`'s, already covered by `AdminLayout.test.js`, so testing it again per-page would be redundant coverage of the same code path.

- [ ] **Step 1: Update the dashboard tests to prove `AdminLayout` integration**

Replace `emotion-recognition/src/component/page/dashboard/super_admin_dashboard.test.js` with:
```javascript
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { ThemeContext } from "../../../context/ThemeContext";
import SuperAdminDashboard from "./super_admin_dashboard";

function renderWithAuth(ui) {
  return render(
    <AuthContext.Provider
      value={{ user: { role: "super_admin", username: "root" }, token: "abc123", loading: false, logout: jest.fn() }}
    >
      <ThemeContext.Provider value={{ theme: "light", toggleTheme: jest.fn() }}>
        <MemoryRouter>{ui}</MemoryRouter>
      </ThemeContext.Provider>
    </AuthContext.Provider>
  );
}

beforeEach(() => {
  global.fetch = jest.fn();
});

test("renders inside AdminLayout with its sidebar navigation", async () => {
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

  renderWithAuth(<SuperAdminDashboard />);

  expect(screen.getByRole("heading", { name: "Super Admin Dashboard" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /criminal search/i })).toBeInTheDocument();
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

Replace `emotion-recognition/src/component/page/dashboard/station_dashboard.test.js` with:
```javascript
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { ThemeContext } from "../../../context/ThemeContext";
import StationDashboard from "./station_dashboard";

function renderWithAuth(user) {
  return render(
    <AuthContext.Provider value={{ user, token: "abc123", loading: false, logout: jest.fn() }}>
      <ThemeContext.Provider value={{ theme: "light", toggleTheme: jest.fn() }}>
        <MemoryRouter>
          <StationDashboard />
        </MemoryRouter>
      </ThemeContext.Provider>
    </AuthContext.Provider>
  );
}

test("renders inside AdminLayout with its sidebar navigation and a welcome message", () => {
  renderWithAuth({ role: "user", name: "Field Officer One", username: "officer1", station_id: 1 });

  expect(screen.getByRole("heading", { name: "Station Dashboard" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /criminal search/i })).toBeInTheDocument();
  expect(screen.getByText(/welcome, field officer one/i)).toBeInTheDocument();
});

test("station admin sees the User Management link, station user does not", () => {
  const { unmount } = renderWithAuth({ role: "admin", name: "Admin One", username: "dhk01admin", station_id: 1 });
  expect(screen.getByRole("link", { name: /user management/i })).toBeInTheDocument();
  unmount();

  renderWithAuth({ role: "user", name: "Officer One", username: "officer1", station_id: 1 });
  expect(screen.queryByRole("link", { name: /user management/i })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd emotion-recognition && CI=true npx react-scripts test src/component/page/dashboard/super_admin_dashboard.test.js src/component/page/dashboard/station_dashboard.test.js --watchAll=false`
Expected: FAIL — the new "renders inside AdminLayout" assertions (`getByRole("link", { name: /criminal search/i })`) find nothing, since neither page renders `AdminLayout` yet.

- [ ] **Step 3: Rewrite `emotion-recognition/src/component/page/dashboard/super_admin_dashboard.js`**

```javascript
import { useEffect, useState } from "react";
import { apiFetch } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";
import AdminLayout from "../../layout/AdminLayout";
import Button from "../../common/Button";
import Card from "../../common/Card";
import FormField from "../../common/FormField";
import StatCard from "../../common/StatCard";

const emptyForm = {
  name: "",
  district: "",
  code: "",
  admin_name: "",
  admin_username: "",
  admin_password: "",
};

const inputClasses =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white";

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
    <AdminLayout title="Super Admin Dashboard">
      <div className="space-y-6">
        <StatCard label="Stations" value={stations.length} />

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Stations</h2>
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {stations.map((s) => (
              <li key={s.id} className="py-2 text-sm text-slate-700 dark:text-slate-300">
                <span className="font-medium text-slate-900 dark:text-white">{s.name}</span> — {s.district} ({s.code})
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Create station</h2>
          <form onSubmit={handleSubmit} className="grid max-w-lg gap-4">
            <FormField label="Station name" htmlFor="name">
              <input id="name" value={form.name} onChange={updateField("name")} className={inputClasses} />
            </FormField>
            <FormField label="District" htmlFor="district">
              <input id="district" value={form.district} onChange={updateField("district")} className={inputClasses} />
            </FormField>
            <FormField label="Station code" htmlFor="code">
              <input id="code" value={form.code} onChange={updateField("code")} className={inputClasses} />
            </FormField>
            <FormField label="Admin name" htmlFor="admin_name">
              <input id="admin_name" value={form.admin_name} onChange={updateField("admin_name")} className={inputClasses} />
            </FormField>
            <FormField label="Admin username" htmlFor="admin_username">
              <input
                id="admin_username"
                value={form.admin_username}
                onChange={updateField("admin_username")}
                className={inputClasses}
              />
            </FormField>
            <FormField label="Admin password" htmlFor="admin_password">
              <input
                id="admin_password"
                type="password"
                value={form.admin_password}
                onChange={updateField("admin_password")}
                className={inputClasses}
              />
            </FormField>
            {error && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
            <Button type="submit">Create station</Button>
          </form>
        </Card>
      </div>
    </AdminLayout>
  );
}
```

- [ ] **Step 4: Rewrite `emotion-recognition/src/component/page/dashboard/station_dashboard.js`**

```javascript
import { useAuth } from "../../../context/AuthContext";
import AdminLayout from "../../layout/AdminLayout";

export default function StationDashboard() {
  const { user } = useAuth();

  return (
    <AdminLayout title="Station Dashboard">
      <p className="text-slate-700 dark:text-slate-300">Welcome, {user.name || user.username}.</p>
    </AdminLayout>
  );
}
```

(The old in-page "Manage station users" link is dropped — `AdminLayout`'s sidebar already shows a "User Management" link for the `admin` role, so keeping both would duplicate the same navigation affordance.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd emotion-recognition && CI=true npx react-scripts test src/component/page/dashboard/super_admin_dashboard.test.js src/component/page/dashboard/station_dashboard.test.js --watchAll=false`
Expected: PASS 5/5 (3 in `super_admin_dashboard.test.js`, 2 in `station_dashboard.test.js`).

- [ ] **Step 6: Run the full frontend test suite**

Run: `cd emotion-recognition && CI=true npx react-scripts test --watchAll=false`
Expected: same known baseline (`App.test.js` only), no other regressions.

- [ ] **Step 7: Commit**

```bash
cd emotion-recognition && git add src/component/page/dashboard/ && git commit -m "style: rewrite dashboards to use AdminLayout"
```

---

### Task 5: Rewrite User Management to use `AdminLayout` + `DataTable`

**Files:**
- Modify: `emotion-recognition/src/component/page/users/user_management.js`
- Modify: `emotion-recognition/src/component/page/users/user_management.test.js`

**Interfaces:**
- Consumes: `AdminLayout` (Task 2), `Button`, `Card`, `DataTable`, `FormField` (Task 1).
- Produces: no API-facing interface change.

- [ ] **Step 1: Rewrite the test file**

Replace `emotion-recognition/src/component/page/users/user_management.test.js` with:
```javascript
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { ThemeContext } from "../../../context/ThemeContext";
import UserManagement from "./user_management";

function renderWithAuth(ui, user = { id: 1, role: "admin", station_id: 1, username: "dhk01admin" }) {
  return render(
    <AuthContext.Provider value={{ user, token: "abc123", loading: false, logout: jest.fn() }}>
      <ThemeContext.Provider value={{ theme: "light", toggleTheme: jest.fn() }}>
        <MemoryRouter>{ui}</MemoryRouter>
      </ThemeContext.Provider>
    </AuthContext.Provider>
  );
}

beforeEach(() => {
  global.fetch = jest.fn();
});

test("renders inside AdminLayout with its sidebar navigation", async () => {
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

  renderWithAuth(<UserManagement />);

  expect(screen.getByRole("heading", { name: "User Management" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /criminal search/i })).toBeInTheDocument();
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

test("does not show a deactivate button on the current user's own row", async () => {
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => [
      { id: 5, name: "Officer One", username: "officer1", role: "user", station_id: 1, is_active: true },
      { id: 9, name: "Self Admin", username: "selfadmin", role: "admin", station_id: 1, is_active: true },
    ],
  });

  renderWithAuth(<UserManagement />, { id: 9, role: "admin", station_id: 1, username: "selfadmin" });

  await screen.findByText("selfadmin");

  expect(screen.getAllByRole("button", { name: /deactivate/i })).toHaveLength(1);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd emotion-recognition && CI=true npx react-scripts test src/component/page/users/user_management.test.js --watchAll=false`
Expected: FAIL — the "renders inside AdminLayout" test finds no sidebar link yet.

- [ ] **Step 3: Rewrite `emotion-recognition/src/component/page/users/user_management.js`**

```javascript
import { useEffect, useState } from "react";
import { apiFetch } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";
import AdminLayout from "../../layout/AdminLayout";
import Button from "../../common/Button";
import Card from "../../common/Card";
import DataTable from "../../common/DataTable";
import FormField from "../../common/FormField";

const emptyForm = { name: "", username: "", password: "" };

const inputClasses =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white";

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

  const columns = [
    { key: "username", header: "Username" },
    { key: "name", header: "Name" },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <span className={row.is_active ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}>
          {row.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) =>
        row.is_active && row.id !== user.id ? (
          <Button variant="danger" onClick={() => handleDeactivate(row.id)}>
            Deactivate
          </Button>
        ) : null,
    },
  ];

  return (
    <AdminLayout title="User Management">
      <div className="space-y-6">
        <Card>
          <DataTable columns={columns} rows={users} keyField="id" emptyMessage="No station users yet." />
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Add user</h2>
          <form onSubmit={handleCreate} className="grid max-w-lg gap-4">
            <FormField label="Name" htmlFor="name">
              <input id="name" value={form.name} onChange={updateField("name")} className={inputClasses} />
            </FormField>
            <FormField label="Username" htmlFor="username">
              <input id="username" value={form.username} onChange={updateField("username")} className={inputClasses} />
            </FormField>
            <FormField label="Password" htmlFor="password">
              <input
                id="password"
                type="password"
                value={form.password}
                onChange={updateField("password")}
                className={inputClasses}
              />
            </FormField>
            {error && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
            <Button type="submit">Add user</Button>
          </form>
        </Card>
      </div>
    </AdminLayout>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd emotion-recognition && CI=true npx react-scripts test src/component/page/users/user_management.test.js --watchAll=false`
Expected: PASS 4/4.

- [ ] **Step 5: Run the full frontend test suite**

Run: `cd emotion-recognition && CI=true npx react-scripts test --watchAll=false`
Expected: same known baseline (`App.test.js` only), no other regressions.

- [ ] **Step 6: Commit**

```bash
cd emotion-recognition && git add src/component/page/users/ && git commit -m "style: rewrite User Management to use AdminLayout and DataTable"
```

---

### Task 6: Criminal Search screen

**Files:**
- Create: `emotion-recognition/src/component/page/criminals/criminal_search.js`
- Create: `emotion-recognition/src/component/page/criminals/criminal_search.test.js`

**Interfaces:**
- Consumes: `AdminLayout`, `Card`, `DataTable`, `FormField`, `StatusBadge` (Task 1-2), `GET /stations`, `GET /criminals` (Phase 2a).
- Produces: the `/criminals` route's page component. Task 9 wires it into `App.js`. Task 7's Criminal Detail page is linked to from this screen's rows.

- [ ] **Step 1: Write the failing tests**

`emotion-recognition/src/component/page/criminals/criminal_search.test.js`:
```javascript
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { ThemeContext } from "../../../context/ThemeContext";
import CriminalSearch from "./criminal_search";

function renderWithAuth() {
  return render(
    <AuthContext.Provider
      value={{ user: { id: 1, role: "user", station_id: 1, username: "officer1" }, token: "abc123", loading: false, logout: jest.fn() }}
    >
      <ThemeContext.Provider value={{ theme: "light", toggleTheme: jest.fn() }}>
        <MemoryRouter>
          <CriminalSearch />
        </MemoryRouter>
      </ThemeContext.Provider>
    </AuthContext.Provider>
  );
}

const STATIONS = [{ id: 1, name: "Dhanmondi Thana", district: "Dhaka", code: "DHK-01" }];
const CRIMINAL = {
  id: 1,
  criminal_code: "CR-000001",
  full_name: "John Doe",
  crime_type: "Theft",
  status: "Wanted",
  station: { id: 1, name: "Dhanmondi Thana", district: "Dhaka", code: "DHK-01" },
};

beforeEach(() => {
  global.fetch = jest.fn();
});

test("renders inside AdminLayout and loads search results", async () => {
  global.fetch
    .mockResolvedValueOnce({ ok: true, json: async () => STATIONS })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [CRIMINAL], total: 1, page: 1, page_size: 20 }) });

  renderWithAuth();

  expect(screen.getByRole("heading", { name: "Criminal Search" })).toBeInTheDocument();
  expect(await screen.findByText("John Doe")).toBeInTheDocument();
  expect(screen.getByText("Wanted")).toBeInTheDocument();
  expect(screen.getByText("1 result(s)")).toBeInTheDocument();
});

test("changing the status filter re-queries with the status query param", async () => {
  global.fetch
    .mockResolvedValueOnce({ ok: true, json: async () => STATIONS })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [CRIMINAL], total: 1, page: 1, page_size: 20 }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [], total: 0, page: 1, page_size: 20 }) });

  renderWithAuth();
  await screen.findByText("John Doe");

  fireEvent.change(screen.getByLabelText(/status/i), { target: { value: "Released" } });

  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3));
  const lastCallUrl = global.fetch.mock.calls[2][0];
  expect(lastCallUrl).toContain("status=Released");
});

test("station filter dropdown is populated from GET /stations without requiring station-management permission", async () => {
  global.fetch
    .mockResolvedValueOnce({ ok: true, json: async () => STATIONS })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [], total: 0, page: 1, page_size: 20 }) });

  renderWithAuth();

  expect(await screen.findByRole("option", { name: "Dhanmondi Thana" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd emotion-recognition && CI=true npx react-scripts test src/component/page/criminals/criminal_search.test.js --watchAll=false`
Expected: FAIL — `Cannot find module './criminal_search'`.

- [ ] **Step 3: Implement `emotion-recognition/src/component/page/criminals/criminal_search.js`**

```javascript
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";
import AdminLayout from "../../layout/AdminLayout";
import Card from "../../common/Card";
import DataTable from "../../common/DataTable";
import FormField from "../../common/FormField";
import StatusBadge from "../../common/StatusBadge";

const STATUS_OPTIONS = ["", "Wanted", "Arrested", "Under trial", "Convicted", "Released", "Absconding"];

const inputClasses =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white";

export default function CriminalSearch() {
  const { token } = useAuth();
  const [stations, setStations] = useState([]);
  const [filters, setFilters] = useState({ q: "", station_id: "", status: "" });
  const [results, setResults] = useState({ items: [], total: 0 });
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch("/stations", { token }).then(setStations).catch(() => {});
  }, [token]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.station_id) params.set("station_id", filters.station_id);
    if (filters.status) params.set("status", filters.status);
    apiFetch(`/criminals?${params.toString()}`, { token })
      .then(setResults)
      .catch((err) => setError(err.message));
  }, [token, filters]);

  function updateFilter(field) {
    return (e) => setFilters((f) => ({ ...f, [field]: e.target.value }));
  }

  const columns = [
    { key: "criminal_code", header: "ID" },
    {
      key: "full_name",
      header: "Name",
      render: (row) => (
        <Link to={`/criminals/${row.id}`} className="font-medium text-emerald-600 hover:underline dark:text-emerald-400">
          {row.full_name}
        </Link>
      ),
    },
    { key: "crime_type", header: "Crime" },
    { key: "station", header: "Station", render: (row) => row.station.name },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <AdminLayout title="Criminal Search">
      <div className="space-y-6">
        <Card>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Name or NID" htmlFor="q">
              <input id="q" value={filters.q} onChange={updateFilter("q")} className={inputClasses} />
            </FormField>
            <FormField label="Station" htmlFor="station_id">
              <select id="station_id" value={filters.station_id} onChange={updateFilter("station_id")} className={inputClasses}>
                <option value="">All stations</option>
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Status" htmlFor="status">
              <select id="status" value={filters.status} onChange={updateFilter("status")} className={inputClasses}>
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt || "all"} value={opt}>
                    {opt || "All statuses"}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
        </Card>

        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <Card>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{results.total} result(s)</p>
          <DataTable columns={columns} rows={results.items} keyField="id" emptyMessage="No criminals match your search." />
        </Card>
      </div>
    </AdminLayout>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd emotion-recognition && CI=true npx react-scripts test src/component/page/criminals/criminal_search.test.js --watchAll=false`
Expected: PASS 3/3.

- [ ] **Step 5: Run the full frontend test suite**

Run: `cd emotion-recognition && CI=true npx react-scripts test --watchAll=false`
Expected: same known baseline (`App.test.js` only), no other regressions.

- [ ] **Step 6: Commit**

```bash
cd emotion-recognition && git add src/component/page/criminals/criminal_search.js src/component/page/criminals/criminal_search.test.js && git commit -m "feat: add Criminal Search screen"
```

---

### Task 7: Criminal Detail screen

**Files:**
- Create: `emotion-recognition/src/component/page/criminals/criminal_detail.js`
- Create: `emotion-recognition/src/component/page/criminals/criminal_detail.test.js`

**Interfaces:**
- Consumes: `AdminLayout`, `Button`, `Card`, `StatusBadge` (Task 1-2), `GET /criminals/{id}`, `DELETE /criminals/{id}` (Phase 2a).
- Produces: the `/criminals/:id` route's page component, and the `/criminals/:id/edit` link Task 8's Edit mode is reached from. Task 9 wires the route into `App.js`.

- [ ] **Step 1: Write the failing tests**

`emotion-recognition/src/component/page/criminals/criminal_detail.test.js`:
```javascript
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { ThemeContext } from "../../../context/ThemeContext";
import CriminalDetail from "./criminal_detail";

const CRIMINAL = {
  id: 1,
  criminal_code: "CR-000001",
  full_name: "John Doe",
  alias: null,
  father_name: null,
  mother_name: null,
  date_of_birth: null,
  gender: "Male",
  nid_or_birth_cert: null,
  blood_group: null,
  phone: null,
  occupation: null,
  present_address: null,
  permanent_address: null,
  height: null,
  identifying_marks: null,
  fir_case_number: null,
  crime_type: "Theft",
  penal_code_sections: null,
  crime_description: null,
  incident_date: null,
  arrest_date: null,
  arresting_officer: null,
  status: "Wanted",
  station: { id: 1, name: "Dhanmondi Thana", district: "Dhaka", code: "DHK-01" },
  repeat_offender: false,
  photos: [],
};

function renderWithAuth(user) {
  return render(
    <AuthContext.Provider value={{ user, token: "abc123", loading: false, logout: jest.fn() }}>
      <ThemeContext.Provider value={{ theme: "light", toggleTheme: jest.fn() }}>
        <MemoryRouter initialEntries={["/criminals/1"]}>
          <Routes>
            <Route path="/criminals/:id" element={<CriminalDetail />} />
          </Routes>
        </MemoryRouter>
      </ThemeContext.Provider>
    </AuthContext.Provider>
  );
}

beforeEach(() => {
  global.fetch = jest.fn();
});

test("renders inside AdminLayout and shows the criminal's profile", async () => {
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => CRIMINAL });

  renderWithAuth({ id: 1, role: "user", station_id: 1, username: "officer1" });

  expect(await screen.findByText("CR-000001")).toBeInTheDocument();
  expect(screen.getAllByText("John Doe").length).toBeGreaterThan(0);
  expect(screen.getByText("Wanted")).toBeInTheDocument();
});

test("same-station admin sees Edit and Delete", async () => {
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => CRIMINAL });

  renderWithAuth({ id: 2, role: "admin", station_id: 1, username: "dhk01admin" });

  await screen.findByText("CR-000001");
  expect(screen.getByRole("link", { name: /edit/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^delete$/i })).toBeInTheDocument();
});

test("other-station admin sees neither Edit nor Delete", async () => {
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => CRIMINAL });

  renderWithAuth({ id: 3, role: "admin", station_id: 2, username: "dhk02admin" });

  await screen.findByText("CR-000001");
  expect(screen.queryByRole("link", { name: /edit/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^delete$/i })).not.toBeInTheDocument();
});

test("station user sees Edit but not Delete", async () => {
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => CRIMINAL });

  renderWithAuth({ id: 1, role: "user", station_id: 1, username: "officer1" });

  await screen.findByText("CR-000001");
  expect(screen.getByRole("link", { name: /edit/i })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^delete$/i })).not.toBeInTheDocument();
});

test("delete requires confirmation before calling the API", async () => {
  global.fetch
    .mockResolvedValueOnce({ ok: true, json: async () => CRIMINAL })
    .mockResolvedValueOnce({ ok: true, json: async () => null });

  renderWithAuth({ id: 2, role: "admin", station_id: 1, username: "dhk01admin" });
  await screen.findByText("CR-000001");

  fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
  expect(global.fetch).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByRole("button", { name: /confirm delete/i }));
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
  expect(global.fetch.mock.calls[1][1].method).toBe("DELETE");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd emotion-recognition && CI=true npx react-scripts test src/component/page/criminals/criminal_detail.test.js --watchAll=false`
Expected: FAIL — `Cannot find module './criminal_detail'`.

- [ ] **Step 3: Implement `emotion-recognition/src/component/page/criminals/criminal_detail.js`**

```javascript
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";
import AdminLayout from "../../layout/AdminLayout";
import Button from "../../common/Button";
import Card from "../../common/Card";
import StatusBadge from "../../common/StatusBadge";

const FIELD_GROUPS = [
  {
    title: "Identity",
    fields: [
      ["full_name", "Full name"],
      ["alias", "Alias"],
      ["father_name", "Father's name"],
      ["mother_name", "Mother's name"],
      ["date_of_birth", "Date of birth"],
      ["gender", "Gender"],
      ["nid_or_birth_cert", "NID / birth certificate"],
      ["blood_group", "Blood group"],
      ["phone", "Phone"],
      ["occupation", "Occupation"],
    ],
  },
  {
    title: "Address",
    fields: [
      ["present_address", "Present address"],
      ["permanent_address", "Permanent address"],
    ],
  },
  {
    title: "Physical description",
    fields: [
      ["height", "Height"],
      ["identifying_marks", "Identifying marks"],
    ],
  },
  {
    title: "Case",
    fields: [
      ["fir_case_number", "FIR / case number"],
      ["crime_type", "Crime type"],
      ["penal_code_sections", "Penal code section(s)"],
      ["crime_description", "Crime description"],
      ["incident_date", "Incident date"],
      ["arrest_date", "Arrest date"],
      ["arresting_officer", "Arresting officer"],
    ],
  },
];

function canManage(user, criminal) {
  if (!criminal) return false;
  if (user.role === "super_admin") return true;
  return user.station_id === criminal.station.id;
}

export default function CriminalDetail() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [criminal, setCriminal] = useState(null);
  const [error, setError] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    apiFetch(`/criminals/${id}`, { token }).then(setCriminal).catch((err) => setError(err.message));
  }, [id, token]);

  async function handleDelete() {
    try {
      await apiFetch(`/criminals/${id}`, { method: "DELETE", token });
      navigate("/criminals");
    } catch (err) {
      setError(err.message);
    }
  }

  if (error) {
    return (
      <AdminLayout title="Criminal Detail">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      </AdminLayout>
    );
  }

  if (!criminal) {
    return (
      <AdminLayout title="Criminal Detail">
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
      </AdminLayout>
    );
  }

  const canEdit = canManage(user, criminal);
  const canDelete = user.role !== "user" && canManage(user, criminal);

  return (
    <AdminLayout title={criminal.full_name}>
      <div className="space-y-6">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{criminal.criminal_code}</p>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{criminal.full_name}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{criminal.station.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={criminal.status} />
              {canEdit && (
                <Link to={`/criminals/${id}/edit`}>
                  <Button variant="secondary">Edit</Button>
                </Link>
              )}
              {canDelete && !confirmingDelete && (
                <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
                  Delete
                </Button>
              )}
              {canDelete && confirmingDelete && (
                <div className="flex items-center gap-2">
                  <Button variant="danger" onClick={handleDelete}>
                    Confirm delete
                  </Button>
                  <Button variant="secondary" onClick={() => setConfirmingDelete(false)}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Photos</h3>
          <div className="flex flex-wrap gap-4">
            {criminal.photos.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">No photos on file.</p>
            )}
            {criminal.photos.map((photo) => (
              <div key={photo.id} className="text-center">
                <img src={photo.url} alt={photo.angle} className="h-32 w-32 rounded-lg object-cover" />
                <p className="mt-1 text-xs capitalize text-slate-500 dark:text-slate-400">
                  {photo.angle.replace("_", " ")}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {FIELD_GROUPS.map((group) => (
          <Card key={group.title}>
            <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">{group.title}</h3>
            <dl className="grid gap-4 sm:grid-cols-2">
              {group.fields.map(([key, label]) => (
                <div key={key}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
                  <dd className="text-sm text-slate-800 dark:text-slate-200">{criminal[key] || "—"}</dd>
                </div>
              ))}
            </dl>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd emotion-recognition && CI=true npx react-scripts test src/component/page/criminals/criminal_detail.test.js --watchAll=false`
Expected: PASS 5/5.

- [ ] **Step 5: Run the full frontend test suite**

Run: `cd emotion-recognition && CI=true npx react-scripts test --watchAll=false`
Expected: same known baseline (`App.test.js` only), no other regressions.

- [ ] **Step 6: Commit**

```bash
cd emotion-recognition && git add src/component/page/criminals/criminal_detail.js src/component/page/criminals/criminal_detail.test.js && git commit -m "feat: add Criminal Detail screen"
```

---

### Task 8: `FormData` support in `apiFetch` + `PhotoCapture` component

**Files:**
- Modify: `emotion-recognition/src/api/client.js`
- Create: `emotion-recognition/src/api/client.test.js`
- Create: `emotion-recognition/src/component/common/PhotoCapture.js`
- Create: `emotion-recognition/src/component/common/PhotoCapture.test.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: `apiFetch(path, { method, body, token })` now also accepts a `FormData` instance as `body` (skips `JSON.stringify` and the `Content-Type` header so the browser sets the correct multipart boundary itself) — existing JSON-body callers are unaffected. `<PhotoCapture label file onChange>` — `file` is a `File`/`null`, `onChange(file)` fires when the user picks or captures a new one. Task 9 consumes both.

- [ ] **Step 1: Write the failing `apiFetch` `FormData` test**

`emotion-recognition/src/api/client.test.js`:
```javascript
import { apiFetch } from "./client";

beforeEach(() => {
  global.fetch = jest.fn();
});

test("JSON body requests still send Content-Type: application/json", async () => {
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });

  await apiFetch("/stations", { method: "POST", body: { name: "Test" }, token: "abc" });

  const [, options] = global.fetch.mock.calls[0];
  expect(options.headers["Content-Type"]).toBe("application/json");
  expect(options.body).toBe(JSON.stringify({ name: "Test" }));
});

test("FormData body requests omit Content-Type and pass the FormData through untouched", async () => {
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
  const formData = new FormData();
  formData.append("payload", "{}");

  await apiFetch("/criminals", { method: "POST", body: formData, token: "abc" });

  const [, options] = global.fetch.mock.calls[0];
  expect(options.headers["Content-Type"]).toBeUndefined();
  expect(options.body).toBe(formData);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd emotion-recognition && CI=true npx react-scripts test src/api/client.test.js --watchAll=false`
Expected: FAIL — the `FormData` test fails because the current `apiFetch` always sets `Content-Type: application/json` and always `JSON.stringify`s the body, so `options.body` is a JSON string of `{}` (from `FormData`'s own enumerable-less shape), not the `formData` instance itself.

- [ ] **Step 3: Update `emotion-recognition/src/api/client.js`**

Replace the `apiFetch` function with:
```javascript
export async function apiFetch(path, { method = "GET", body, token, headers = {} } = {}) {
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body ? { body: isFormData ? body : JSON.stringify(body) } : {}),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = (data && data.detail) || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd emotion-recognition && CI=true npx react-scripts test src/api/client.test.js --watchAll=false`
Expected: PASS 2/2.

- [ ] **Step 5: Write the failing `PhotoCapture` tests**

`emotion-recognition/src/component/common/PhotoCapture.test.js`:
```javascript
import { render, screen, fireEvent } from "@testing-library/react";
import PhotoCapture from "./PhotoCapture";

beforeEach(() => {
  global.URL.createObjectURL = jest.fn(() => "blob:mock-url");
});

test("selecting an image file calls onChange with that file", () => {
  const handleChange = jest.fn();
  render(<PhotoCapture label="Front photo" file={null} onChange={handleChange} />);

  const file = new File(["fake-bytes"], "front.jpg", { type: "image/jpeg" });
  fireEvent.change(screen.getByLabelText(/upload file/i), { target: { files: [file] } });

  expect(handleChange).toHaveBeenCalledWith(file);
});

test("selecting a non-image file is ignored, not passed to onChange", () => {
  const handleChange = jest.fn();
  render(<PhotoCapture label="Front photo" file={null} onChange={handleChange} />);

  const file = new File(["fake-bytes"], "notes.txt", { type: "text/plain" });
  fireEvent.change(screen.getByLabelText(/upload file/i), { target: { files: [file] } });

  expect(handleChange).not.toHaveBeenCalled();
});

test("renders a preview image when a file is already selected", () => {
  const file = new File(["fake-bytes"], "front.jpg", { type: "image/jpeg" });
  render(<PhotoCapture label="Front photo" file={file} onChange={jest.fn()} />);

  expect(screen.getByAltText(/front photo preview/i)).toBeInTheDocument();
});

test("clicking Use camera reveals a Capture control without crashing", () => {
  render(<PhotoCapture label="Front photo" file={null} onChange={jest.fn()} />);

  fireEvent.click(screen.getByRole("button", { name: /use camera/i }));

  expect(screen.getByRole("button", { name: /^capture$/i })).toBeInTheDocument();
});
```

Note: the fourth test only asserts the "Capture" button appears after switching modes — it does not click "Capture" itself, since that path calls `react-webcam`'s `getScreenshot()`, which depends on an actual camera stream `jsdom` cannot provide. The camera-capture path (`dataUrlToFile` conversion) is exercised manually in the browser, not by this automated suite — the same limitation Phase 1's `face_detection.js` (which also renders `<Webcam>`) already lives with untested.

- [ ] **Step 6: Run tests to verify they fail**

Run: `cd emotion-recognition && CI=true npx react-scripts test src/component/common/PhotoCapture.test.js --watchAll=false`
Expected: FAIL — `Cannot find module './PhotoCapture'`.

- [ ] **Step 7: Implement `emotion-recognition/src/component/common/PhotoCapture.js`**

```javascript
import { useRef, useState } from "react";
import Webcam from "react-webcam";
import Button from "./Button";

function dataUrlToFile(dataUrl, filename) {
  const [header, base64] = dataUrl.split(",");
  const mimeMatch = header.match(/data:(.*);base64/);
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

export default function PhotoCapture({ label, file, onChange }) {
  const webcamRef = useRef(null);
  const [showCamera, setShowCamera] = useState(false);
  const previewUrl = file ? URL.createObjectURL(file) : null;

  function handleCapture() {
    const shot = webcamRef.current && webcamRef.current.getScreenshot();
    if (!shot) return;
    const filename = `${label.toLowerCase().replace(/\s+/g, "-")}.jpg`;
    onChange(dataUrlToFile(shot, filename));
    setShowCamera(false);
  }

  function handleFileSelect(e) {
    const selected = e.target.files && e.target.files[0];
    if (!selected || !selected.type.startsWith("image/")) return;
    onChange(selected);
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
      {previewUrl && (
        <img src={previewUrl} alt={`${label} preview`} className="h-32 w-32 rounded-lg object-cover" />
      )}
      {showCamera ? (
        <div className="space-y-2">
          <Webcam ref={webcamRef} screenshotFormat="image/jpeg" className="w-48 rounded-lg" />
          <div className="flex gap-2">
            <Button type="button" onClick={handleCapture}>
              Capture
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowCamera(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => setShowCamera(true)}>
            Use camera
          </Button>
          <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
            Upload file
            <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          </label>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd emotion-recognition && CI=true npx react-scripts test src/component/common/PhotoCapture.test.js --watchAll=false`
Expected: PASS 4/4.

- [ ] **Step 9: Run the full frontend test suite**

Run: `cd emotion-recognition && CI=true npx react-scripts test --watchAll=false`
Expected: same known baseline (`App.test.js` only), no other regressions.

- [ ] **Step 10: Commit**

```bash
cd emotion-recognition && git add src/api/client.js src/api/client.test.js src/component/common/PhotoCapture.js src/component/common/PhotoCapture.test.js && git commit -m "feat: add FormData support to apiFetch and a PhotoCapture component"
```

---

### Task 9: Add/Edit Criminal screen

**Files:**
- Create: `emotion-recognition/src/component/page/criminals/add_edit_criminal.js`
- Create: `emotion-recognition/src/component/page/criminals/add_edit_criminal.test.js`

**Interfaces:**
- Consumes: `AdminLayout`, `Button`, `Card`, `FormField`, `PhotoCapture` (Tasks 1, 2, 8), `apiFetch`'s `FormData` support (Task 8), `POST/PATCH /criminals`, `GET /criminals/{id}`, `GET /stations` (Phase 2a).
- Produces: the `/criminals/new` and `/criminals/:id/edit` route's page component (one component, mode determined by whether `useParams().id` is present). Task 10 wires both routes into `App.js`.

- [ ] **Step 1: Write the failing tests**

`emotion-recognition/src/component/page/criminals/add_edit_criminal.test.js`:
```javascript
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { ThemeContext } from "../../../context/ThemeContext";
import AddEditCriminal from "./add_edit_criminal";

function renderCreate(user) {
  return render(
    <AuthContext.Provider value={{ user, token: "abc123", loading: false, logout: jest.fn() }}>
      <ThemeContext.Provider value={{ theme: "light", toggleTheme: jest.fn() }}>
        <MemoryRouter initialEntries={["/criminals/new"]}>
          <Routes>
            <Route path="/criminals/new" element={<AddEditCriminal />} />
          </Routes>
        </MemoryRouter>
      </ThemeContext.Provider>
    </AuthContext.Provider>
  );
}

function renderEdit(user) {
  return render(
    <AuthContext.Provider value={{ user, token: "abc123", loading: false, logout: jest.fn() }}>
      <ThemeContext.Provider value={{ theme: "light", toggleTheme: jest.fn() }}>
        <MemoryRouter initialEntries={["/criminals/1/edit"]}>
          <Routes>
            <Route path="/criminals/:id/edit" element={<AddEditCriminal />} />
          </Routes>
        </MemoryRouter>
      </ThemeContext.Provider>
    </AuthContext.Provider>
  );
}

const EXISTING_CRIMINAL = {
  id: 1,
  criminal_code: "CR-000001",
  full_name: "John Doe",
  gender: "Male",
  crime_type: "Theft",
  status: "Wanted",
  station: { id: 1, name: "Dhanmondi Thana", district: "Dhaka", code: "DHK-01" },
  repeat_offender: false,
  photos: [],
  alias: null,
  father_name: null,
  mother_name: null,
  date_of_birth: null,
  nid_or_birth_cert: null,
  blood_group: null,
  phone: null,
  occupation: null,
  present_address: null,
  permanent_address: null,
  height: null,
  identifying_marks: null,
  fir_case_number: null,
  penal_code_sections: null,
  crime_description: null,
  incident_date: null,
  arrest_date: null,
  arresting_officer: null,
};

beforeEach(() => {
  global.fetch = jest.fn();
  global.URL.createObjectURL = jest.fn(() => "blob:mock-url");
});

test("station user does not see a station picker", () => {
  renderCreate({ id: 1, role: "user", station_id: 1, username: "officer1" });

  expect(screen.queryByLabelText(/^station$/i)).not.toBeInTheDocument();
});

test("super admin sees a station picker; submitting without one is blocked client-side", async () => {
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => [{ id: 1, name: "Dhanmondi Thana", district: "Dhaka", code: "DHK-01" }],
  });

  renderCreate({ id: 2, role: "super_admin", station_id: null, username: "root" });

  expect(await screen.findByLabelText(/^station$/i)).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "John Doe" } });
  fireEvent.change(screen.getByLabelText(/^gender$/i), { target: { value: "Male" } });
  fireEvent.change(screen.getByLabelText(/crime type/i), { target: { value: "Theft" } });
  fireEvent.click(screen.getByRole("button", { name: /create criminal record/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent(/station/i);
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test("blocks submission client-side when the front photo is missing", async () => {
  renderCreate({ id: 1, role: "user", station_id: 1, username: "officer1" });

  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "John Doe" } });
  fireEvent.change(screen.getByLabelText(/^gender$/i), { target: { value: "Male" } });
  fireEvent.change(screen.getByLabelText(/crime type/i), { target: { value: "Theft" } });
  fireEvent.click(screen.getByRole("button", { name: /create criminal record/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent(/photo/i);
  expect(global.fetch).not.toHaveBeenCalled();
});

test("submits a complete form as multipart FormData for a station user", async () => {
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 42 }) });

  renderCreate({ id: 1, role: "user", station_id: 1, username: "officer1" });

  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "John Doe" } });
  fireEvent.change(screen.getByLabelText(/^gender$/i), { target: { value: "Male" } });
  fireEvent.change(screen.getByLabelText(/crime type/i), { target: { value: "Theft" } });

  const frontPhotoInput = screen.getAllByLabelText(/upload file/i)[0];
  const file = new File(["fake-bytes"], "front.jpg", { type: "image/jpeg" });
  fireEvent.change(frontPhotoInput, { target: { files: [file] } });

  fireEvent.click(screen.getByRole("button", { name: /create criminal record/i }));

  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  const [url, options] = global.fetch.mock.calls[0];
  expect(url).toContain("/criminals");
  expect(options.method).toBe("POST");
  const payload = JSON.parse(options.body.get("payload"));
  expect(payload.full_name).toBe("John Doe");
  expect(payload.station_id).toBe(1);
  expect(options.body.get("front_photo")).toBe(file);
});

test("edit mode loads the existing criminal, pre-fills the form, and submits a PATCH without a new photo", async () => {
  global.fetch
    .mockResolvedValueOnce({ ok: true, json: async () => EXISTING_CRIMINAL })
    .mockResolvedValueOnce({ ok: true, json: async () => EXISTING_CRIMINAL });

  renderEdit({ id: 2, role: "admin", station_id: 1, username: "dhk01admin" });

  expect(await screen.findByDisplayValue("John Doe")).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/^status$/i), { target: { value: "Arrested" } });
  fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
  const [, options] = global.fetch.mock.calls[1];
  expect(options.method).toBe("PATCH");
  const payload = JSON.parse(options.body.get("payload"));
  expect(payload.status).toBe("Arrested");
  expect(payload.station_id).toBeUndefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd emotion-recognition && CI=true npx react-scripts test src/component/page/criminals/add_edit_criminal.test.js --watchAll=false`
Expected: FAIL — `Cannot find module './add_edit_criminal'`.

- [ ] **Step 3: Implement `emotion-recognition/src/component/page/criminals/add_edit_criminal.js`**

```javascript
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";
import AdminLayout from "../../layout/AdminLayout";
import Button from "../../common/Button";
import Card from "../../common/Card";
import FormField from "../../common/FormField";
import PhotoCapture from "../../common/PhotoCapture";

const STATUS_OPTIONS = ["Wanted", "Arrested", "Under trial", "Convicted", "Released", "Absconding"];

const inputClasses =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white";

const emptyForm = {
  full_name: "",
  alias: "",
  father_name: "",
  mother_name: "",
  date_of_birth: "",
  gender: "",
  nid_or_birth_cert: "",
  blood_group: "",
  phone: "",
  occupation: "",
  present_address: "",
  permanent_address: "",
  height: "",
  identifying_marks: "",
  fir_case_number: "",
  crime_type: "",
  penal_code_sections: "",
  crime_description: "",
  incident_date: "",
  arrest_date: "",
  arresting_officer: "",
  status: "Wanted",
  repeat_offender: false,
};

function cleanPayload(values) {
  const cleaned = {};
  for (const [key, value] of Object.entries(values)) {
    cleaned[key] = value === "" ? null : value;
  }
  return cleaned;
}

export default function AddEditCriminal() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    ...emptyForm,
    station_id: user.role === "super_admin" ? "" : user.station_id,
  });
  const [stations, setStations] = useState([]);
  const [photos, setPhotos] = useState({ front: null, left_profile: null, right_profile: null });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user.role === "super_admin" && !isEdit) {
      apiFetch("/stations", { token }).then(setStations).catch(() => {});
    }
  }, [user.role, isEdit, token]);

  useEffect(() => {
    if (!isEdit) return;
    apiFetch(`/criminals/${id}`, { token })
      .then((criminal) => {
        setForm({
          ...emptyForm,
          ...criminal,
          date_of_birth: criminal.date_of_birth || "",
          incident_date: criminal.incident_date || "",
          arrest_date: criminal.arrest_date || "",
          station_id: criminal.station.id,
        });
      })
      .catch((err) => setError(err.message));
  }, [id, isEdit, token]);

  function updateField(field) {
    return (e) => {
      const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
      setForm((f) => ({ ...f, [field]: value }));
    };
  }

  function updatePhoto(angle) {
    return (file) => setPhotos((p) => ({ ...p, [angle]: file }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!form.full_name || !form.gender || !form.crime_type || !form.status || (!isEdit && !form.station_id)) {
      setError(
        `Full name, gender, crime type, and status are all required${isEdit ? "." : ", along with a station."}`
      );
      return;
    }
    if (!isEdit && !photos.front) {
      setError("A front photo is required.");
      return;
    }

    setSubmitting(true);
    try {
      const rawPayload = isEdit
        ? Object.fromEntries(Object.entries(form).filter(([key]) => key !== "station_id"))
        : form;
      const payload = cleanPayload(rawPayload);

      const body = new FormData();
      body.append("payload", JSON.stringify(payload));
      if (photos.front) body.append("front_photo", photos.front);
      if (photos.left_profile) body.append("left_photo", photos.left_profile);
      if (photos.right_profile) body.append("right_photo", photos.right_profile);

      const url = isEdit ? `/criminals/${id}` : "/criminals";
      const method = isEdit ? "PATCH" : "POST";
      const saved = await apiFetch(url, { method, body, token });
      navigate(`/criminals/${saved.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminLayout title={isEdit ? "Edit Criminal" : "Add Criminal"}>
      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        {user.role === "super_admin" && !isEdit && (
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Registering station</h2>
            <FormField label="Station" htmlFor="station_id">
              <select id="station_id" value={form.station_id} onChange={updateField("station_id")} className={inputClasses}>
                <option value="">Select a station</option>
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </FormField>
          </Card>
        )}

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Identity</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Full name" htmlFor="full_name">
              <input id="full_name" value={form.full_name} onChange={updateField("full_name")} className={inputClasses} />
            </FormField>
            <FormField label="Gender" htmlFor="gender">
              <input id="gender" value={form.gender} onChange={updateField("gender")} className={inputClasses} />
            </FormField>
            <FormField label="Alias" htmlFor="alias">
              <input id="alias" value={form.alias} onChange={updateField("alias")} className={inputClasses} />
            </FormField>
            <FormField label="Date of birth" htmlFor="date_of_birth">
              <input
                id="date_of_birth"
                type="date"
                value={form.date_of_birth}
                onChange={updateField("date_of_birth")}
                className={inputClasses}
              />
            </FormField>
            <FormField label="Father's name" htmlFor="father_name">
              <input id="father_name" value={form.father_name} onChange={updateField("father_name")} className={inputClasses} />
            </FormField>
            <FormField label="Mother's name" htmlFor="mother_name">
              <input id="mother_name" value={form.mother_name} onChange={updateField("mother_name")} className={inputClasses} />
            </FormField>
            <FormField label="NID / birth certificate" htmlFor="nid_or_birth_cert">
              <input
                id="nid_or_birth_cert"
                value={form.nid_or_birth_cert}
                onChange={updateField("nid_or_birth_cert")}
                className={inputClasses}
              />
            </FormField>
            <FormField label="Blood group" htmlFor="blood_group">
              <input id="blood_group" value={form.blood_group} onChange={updateField("blood_group")} className={inputClasses} />
            </FormField>
            <FormField label="Phone" htmlFor="phone">
              <input id="phone" value={form.phone} onChange={updateField("phone")} className={inputClasses} />
            </FormField>
            <FormField label="Occupation" htmlFor="occupation">
              <input id="occupation" value={form.occupation} onChange={updateField("occupation")} className={inputClasses} />
            </FormField>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Address</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Present address" htmlFor="present_address">
              <input
                id="present_address"
                value={form.present_address}
                onChange={updateField("present_address")}
                className={inputClasses}
              />
            </FormField>
            <FormField label="Permanent address" htmlFor="permanent_address">
              <input
                id="permanent_address"
                value={form.permanent_address}
                onChange={updateField("permanent_address")}
                className={inputClasses}
              />
            </FormField>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Physical description</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Height" htmlFor="height">
              <input id="height" value={form.height} onChange={updateField("height")} className={inputClasses} />
            </FormField>
            <FormField label="Identifying marks" htmlFor="identifying_marks">
              <input
                id="identifying_marks"
                value={form.identifying_marks}
                onChange={updateField("identifying_marks")}
                className={inputClasses}
              />
            </FormField>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Photos</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            <PhotoCapture label="Front photo" file={photos.front} onChange={updatePhoto("front")} />
            <PhotoCapture label="Left profile" file={photos.left_profile} onChange={updatePhoto("left_profile")} />
            <PhotoCapture label="Right profile" file={photos.right_profile} onChange={updatePhoto("right_profile")} />
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Case</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Crime type" htmlFor="crime_type">
              <input id="crime_type" value={form.crime_type} onChange={updateField("crime_type")} className={inputClasses} />
            </FormField>
            <FormField label="Status" htmlFor="status">
              <select id="status" value={form.status} onChange={updateField("status")} className={inputClasses}>
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="FIR / case number" htmlFor="fir_case_number">
              <input
                id="fir_case_number"
                value={form.fir_case_number}
                onChange={updateField("fir_case_number")}
                className={inputClasses}
              />
            </FormField>
            <FormField label="Penal code section(s)" htmlFor="penal_code_sections">
              <input
                id="penal_code_sections"
                value={form.penal_code_sections}
                onChange={updateField("penal_code_sections")}
                className={inputClasses}
              />
            </FormField>
            <FormField label="Incident date" htmlFor="incident_date">
              <input
                id="incident_date"
                type="date"
                value={form.incident_date}
                onChange={updateField("incident_date")}
                className={inputClasses}
              />
            </FormField>
            <FormField label="Arrest date" htmlFor="arrest_date">
              <input
                id="arrest_date"
                type="date"
                value={form.arrest_date}
                onChange={updateField("arrest_date")}
                className={inputClasses}
              />
            </FormField>
            <FormField label="Arresting officer" htmlFor="arresting_officer">
              <input
                id="arresting_officer"
                value={form.arresting_officer}
                onChange={updateField("arresting_officer")}
                className={inputClasses}
              />
            </FormField>
          </div>
          <div className="mt-4">
            <FormField label="Crime description" htmlFor="crime_description">
              <textarea
                id="crime_description"
                value={form.crime_description}
                onChange={updateField("crime_description")}
                rows={3}
                className={inputClasses}
              />
            </FormField>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input type="checkbox" checked={form.repeat_offender} onChange={updateField("repeat_offender")} />
            Repeat offender
          </label>
        </Card>

        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <Button type="submit" disabled={submitting}>
          {isEdit ? "Save changes" : "Create criminal record"}
        </Button>
      </form>
    </AdminLayout>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd emotion-recognition && CI=true npx react-scripts test src/component/page/criminals/add_edit_criminal.test.js --watchAll=false`
Expected: PASS 5/5.

- [ ] **Step 5: Run the full frontend test suite**

Run: `cd emotion-recognition && CI=true npx react-scripts test --watchAll=false`
Expected: same known baseline (`App.test.js` only), no other regressions.

- [ ] **Step 6: Commit**

```bash
cd emotion-recognition && git add src/component/page/criminals/add_edit_criminal.js src/component/page/criminals/add_edit_criminal.test.js && git commit -m "feat: add Add/Edit Criminal screen"
```

---

### Task 10: `ProtectedRoute` test + wire all routes into `App.js`

**Files:**
- Create: `emotion-recognition/src/component/routing/ProtectedRoute.test.js`
- Modify: `emotion-recognition/src/App.js`

**Interfaces:**
- Consumes: every page component from Tasks 3, 4, 5, 6, 7, 9, plus Phase 1's `ProtectedRoute`, `AuthProvider`, `ThemeProvider`.
- Produces: nothing further — this is the last task of Phase 2b.

`ProtectedRoute.js` has existed since Phase 1 with no dedicated test of its own (it was only ever exercised indirectly through page-level tests). This task adds that direct test — it is the concrete test for this plan's Review Focus item about a Station User being blocked from `/users` by URL, not just by a hidden sidebar link. Because `ProtectedRoute`'s existing logic already satisfies it (no code changes needed here), this task's test step is a regression characterization, not a RED→GREEN cycle for new behavior — the same pattern Task 3 used for the login page restyle.

`App.js`'s own change (wiring 5 new routes plus 2 new `ProtectedRoute` role lists) has no dedicated new test in this task: every target page component already has its own test suite from Tasks 3-9 proving it renders correctly for its allowed roles, and `App.js` itself cannot be rendered in a test at all — `HomePage` pulls in `Background`, which imports `@tsparticles/react`, the same pre-existing ESM-parsing crash documented as the frontend test suite's one known baseline failure since Phase 1. Adding an `App.test.js` assertion here would hit that same wall, not exercise anything new about routing.

- [ ] **Step 1: Write the `ProtectedRoute` tests**

`emotion-recognition/src/component/routing/ProtectedRoute.test.js`:
```javascript
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import ProtectedRoute from "./ProtectedRoute";

function renderProtected(authValue, roles) {
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={["/users"]}>
        <Routes>
          <Route
            path="/users"
            element={
              <ProtectedRoute roles={roles}>
                <p>User Management content</p>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<p>Login page</p>} />
          <Route path="/dashboard" element={<p>Dashboard page</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

test("a station user opening an admin-only route by URL is redirected away, not shown the content", () => {
  renderProtected({ user: { role: "user" }, loading: false, token: "abc" }, ["admin"]);

  expect(screen.queryByText("User Management content")).not.toBeInTheDocument();
  expect(screen.getByText("Dashboard page")).toBeInTheDocument();
});

test("an allowed role sees the protected content", () => {
  renderProtected({ user: { role: "admin" }, loading: false, token: "abc" }, ["admin"]);

  expect(screen.getByText("User Management content")).toBeInTheDocument();
});

test("an unauthenticated visitor is redirected to /login", () => {
  renderProtected({ user: null, loading: false, token: null }, ["admin"]);

  expect(screen.getByText("Login page")).toBeInTheDocument();
});

test("renders nothing while auth is still loading", () => {
  const { container } = renderProtected({ user: null, loading: true, token: null }, ["admin"]);

  expect(container.textContent).toBe("");
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd emotion-recognition && CI=true npx react-scripts test src/component/routing/ProtectedRoute.test.js --watchAll=false`
Expected: PASS 4/4 (characterizes existing, already-correct behavior — see this task's note above).

- [ ] **Step 3: Rewrite `emotion-recognition/src/App.js`**

```javascript
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import HomePage from "./component/page/home/home_page";
import RealFaceDetection from "./component/page/face_detection/face_detection";
import ImageInput from "./component/page/image_input/image_input";
import LoginPage from "./component/page/login/login_page";
import SuperAdminDashboard from "./component/page/dashboard/super_admin_dashboard";
import StationDashboard from "./component/page/dashboard/station_dashboard";
import UserManagement from "./component/page/users/user_management";
import CriminalSearch from "./component/page/criminals/criminal_search";
import CriminalDetail from "./component/page/criminals/criminal_detail";
import AddEditCriminal from "./component/page/criminals/add_edit_criminal";
import ProtectedRoute from "./component/routing/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

const ANY_AUTHENTICATED_ROLE = ["super_admin", "admin", "user"];

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
            <Route
              exact
              path="/criminals"
              element={
                <ProtectedRoute roles={ANY_AUTHENTICATED_ROLE}>
                  <CriminalSearch />
                </ProtectedRoute>
              }
            />
            <Route
              exact
              path="/criminals/new"
              element={
                <ProtectedRoute roles={ANY_AUTHENTICATED_ROLE}>
                  <AddEditCriminal />
                </ProtectedRoute>
              }
            />
            <Route
              exact
              path="/criminals/:id"
              element={
                <ProtectedRoute roles={ANY_AUTHENTICATED_ROLE}>
                  <CriminalDetail />
                </ProtectedRoute>
              }
            />
            <Route
              exact
              path="/criminals/:id/edit"
              element={
                <ProtectedRoute roles={ANY_AUTHENTICATED_ROLE}>
                  <AddEditCriminal />
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

- [ ] **Step 4: Run the full frontend test suite (final Phase 2b regression check)**

Run: `cd emotion-recognition && CI=true npx react-scripts test --watchAll=false`
Expected: same known baseline — `App.test.js` fails on the pre-existing `@tsparticles/react` ESM issue (unchanged, confirm it's the same failure as the Phase 1 baseline, not a new one), every other suite (including all of this plan's new ones) passes.

- [ ] **Step 5: Commit**

```bash
cd emotion-recognition && git add src/component/routing/ProtectedRoute.test.js src/App.js && git commit -m "feat: wire criminal screens and routes into App.js"
```
