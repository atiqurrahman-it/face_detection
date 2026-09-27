# ArgusID Rebrand, Fun Game Navigation & Home Page Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the product to ArgusID, move the live webcam/image-upload demo behind login as a new "Fun Game" tab inside both portals, and replace the public home page with a product landing page for the platform instead of the demo.

**Architecture:** Pure frontend change in `emotion-recognition/` (React 18 + Tailwind, react-router-dom v6). No backend, dependency, or build-config changes. `RealFaceDetection` and `ImageInput` are reused as-is (stripped of their standalone page chrome) inside a new `FunGame` page rendered through the existing `AdminLayout` shell; the public `Nav`/`HomePage` lose the demo links and gain a sign-in-focused landing page.

**Tech Stack:** React 18, react-router-dom 6, Tailwind CSS, Jest + React Testing Library (`react-scripts test`).

**Spec:** https://claude.ai/artifact/GJi8d3ATZRJfZSutoEB74t ("Home Page Revamp & Fun Game Navigation Plan" — a product/UX doc; there is no repo-based spec file for this feature, so this plan itself is the binding technical spec for implementers).

## Global Constraints

- Product name is **ArgusID** everywhere a wordmark, page `<title>`, or headline names the product — exact string, no variations ("Argus ID", "argusId", etc.).
- No new npm dependencies. Use existing Tailwind utility classes and the existing icon style in `src/component/common/icons.js` (heroicons-outline `<svg>` with `strokeWidth={1.5}`, `className="h-5 w-5"`, spreading `{...props}`).
- Do not touch `server/` (the FastAPI backend) or any file under `emotion-recognition/build/`.
- Preserve existing role gating exactly: `super_admin`, `admin`, `user`. Do not widen or narrow any existing route's `roles` list except where a task explicitly adds the new `/fun-game` route.
- All new/changed markup keeps the existing `dark:` Tailwind variants alongside light-mode classes (the app supports a dark theme via `ThemeContext`; do not ship light-only styles).
- Test command for every task, run from `emotion-recognition/`: `CI=true npx react-scripts test <path(s)> --watchAll=false`.
- Baseline note: before this plan, `src/App.test.js` fails to run at all (`SyntaxError: Cannot use import statement outside a module`, from `@tsparticles/react` via `Background`) — 12 suites / 63 tests otherwise pass. Task 3 fixes this as a side effect of rewriting `App.test.js`; no other task should regress the 63 passing tests.
- Any test that renders `HomePage` or `App` (directly or via routing) must `jest.mock` `Background` (`.../backgorund/backgorun`) — real `Background` pulls in the ESM-only `@tsparticles/react` package, which Jest cannot parse, causing the exact baseline failure above.

## Review Focus

- **Removed public routes left dangling:** after `/face-detection` and `/input-image` are removed from `App.js`, a visitor with an old bookmark hits no matching `<Route>`. A reasonable person expects to land somewhere useful, not a blank screen. → Task 3 adds a catch-all redirect to `/`.
- **Already signed-in visitor reopening `/`:** with no redirect, a logged-in user who navigates back to the marketing home page sees the pitch again instead of their dashboard. → Task 4 makes `HomePage` redirect to `/admin` or `/station` when `AuthContext.user` is set.
- **`/fun-game` visited while logged out:** since it's a brand-new route, it needs the same "bounce to `/login`" behavior every other portal route already gets from `ProtectedRoute` — easy to forget to wrap it. → Task 3 adds an explicit test.
- **Fun Game link for a station-less `super_admin`:** existing `AdminLayout` tests always pass `station_id: 1` for `admin`/`user` and `station_id: null` only for the "does not see User Management" case; a new nav entry could accidentally be scoped by station and silently disappear for `super_admin`. → Task 2 adds an explicit `station_id: null` test.
- **Switching Fun Game tabs mid-session:** the webcam panel opens a `WebSocket`; switching tabs must fully unmount it (not stack both panels) so the socket closes instead of leaking. → Task 3's `fun_game.test.js` asserts only one panel's content is present at a time.

---

## Task 1: Rebrand the wordmark to ArgusID

**Files:**
- Modify: `emotion-recognition/public/index.html:9,27` (meta description + `<title>`)
- Modify: `emotion-recognition/public/manifest.json:2-3` (`short_name`, `name`)
- Modify: `emotion-recognition/package.json:2` (`name`)
- Modify: `emotion-recognition/src/component/navbar/navbar.js:52-53` (public nav wordmark)
- Modify: `emotion-recognition/src/component/layout/AdminLayout.js:46` (portal sidebar wordmark)
- Modify: `emotion-recognition/src/component/page/login/login_page.js:39` (login card wordmark)
- Test: Create `emotion-recognition/src/component/navbar/navbar.test.js`
- Test: Modify `emotion-recognition/src/component/layout/AdminLayout.test.js`
- Test: Modify `emotion-recognition/src/component/page/login/login_page.test.js`

**Interfaces:**
- Consumes: nothing from another task.
- Produces: the literal string `"ArgusID"` rendered by `Nav`, `AdminLayout`, and `LoginPage` — Task 2/3/4 do not depend on this text, only on the surrounding markup they separately touch.

- [ ] **Step 1: Write the failing test for the public nav wordmark**

Create `emotion-recognition/src/component/navbar/navbar.test.js`:

```javascript
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeContext } from "../../context/ThemeContext";
import Nav from "./navbar";

function renderNav() {
  return render(
    <ThemeContext.Provider value={{ theme: "light", toggleTheme: jest.fn() }}>
      <MemoryRouter>
        <Nav />
      </MemoryRouter>
    </ThemeContext.Provider>
  );
}

test("renders the ArgusID wordmark", () => {
  renderNav();
  expect(screen.getByText("ArgusID")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `CI=true npx react-scripts test src/component/navbar/navbar.test.js --watchAll=false`
Expected: FAIL — `Unable to find an element with the text: ArgusID` (the wordmark still says "EmotionAI").

- [ ] **Step 3: Rename the public nav wordmark**

In `emotion-recognition/src/component/navbar/navbar.js`, change:

```javascript
        <div className="hidden items-center gap-2 pl-2 font-bold text-slate-800 dark:text-white sm:flex">
          <span className="text-xl">🙂</span>
          <span>EmotionAI</span>
        </div>
```

to:

```javascript
        <div className="hidden items-center gap-2 pl-2 font-bold text-slate-800 dark:text-white sm:flex">
          <span className="text-xl">🛡️</span>
          <span>ArgusID</span>
        </div>
```

- [ ] **Step 4: Run it to verify it passes**

Run: `CI=true npx react-scripts test src/component/navbar/navbar.test.js --watchAll=false`
Expected: PASS 1/1.

- [ ] **Step 5: Write the failing tests for the portal sidebar and login wordmarks**

In `emotion-recognition/src/component/layout/AdminLayout.test.js`, add:

```javascript
test("renders the ArgusID wordmark in the sidebar", () => {
  renderLayout({ id: 1, role: "user", username: "officer1", station_id: 1 });
  expect(screen.getByText("ArgusID")).toBeInTheDocument();
});
```

In `emotion-recognition/src/component/page/login/login_page.test.js`, add:

```javascript
test("renders the ArgusID wordmark", () => {
  render(
    <AuthProvider>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </AuthProvider>
  );
  expect(screen.getByText("ArgusID")).toBeInTheDocument();
});
```

- [ ] **Step 6: Run both to verify they fail**

Run: `CI=true npx react-scripts test src/component/layout/AdminLayout.test.js src/component/page/login/login_page.test.js --watchAll=false`
Expected: FAIL — both new tests report `Unable to find an element with the text: ArgusID` (sidebar still says "Criminal Records", login card still says "Criminal Records Portal").

- [ ] **Step 7: Rename the sidebar and login wordmarks**

In `emotion-recognition/src/component/layout/AdminLayout.js`, change:

```javascript
          <span>Criminal Records</span>
```

to:

```javascript
          <span>ArgusID</span>
```

In `emotion-recognition/src/component/page/login/login_page.js`, change:

```javascript
          <span>Criminal Records Portal</span>
```

to:

```javascript
          <span>ArgusID</span>
```

- [ ] **Step 8: Run both to verify they pass**

Run: `CI=true npx react-scripts test src/component/layout/AdminLayout.test.js src/component/page/login/login_page.test.js --watchAll=false`
Expected: PASS — all tests in both files pass (existing tests plus the 2 new ones).

- [ ] **Step 9: Rebrand the static HTML shell (no test — not covered by Jest)**

In `emotion-recognition/public/index.html`, change:

```html
    <meta
      name="description"
      content="Web site created using create-react-app"
    />
```

to:

```html
    <meta
      name="description"
      content="ArgusID — facial recognition and case records for police stations."
    />
```

and change:

```html
    <title>Face Detection</title>
```

to:

```html
    <title>ArgusID</title>
```

In `emotion-recognition/public/manifest.json`, change:

```json
  "short_name": "React App",
  "name": "Create React App Sample",
```

to:

```json
  "short_name": "ArgusID",
  "name": "ArgusID",
```

In `emotion-recognition/package.json`, change:

```json
  "name": "emotion-recognition",
```

to:

```json
  "name": "argusid",
```

- [ ] **Step 10: Commit**

```bash
git add emotion-recognition/public/index.html emotion-recognition/public/manifest.json emotion-recognition/package.json emotion-recognition/src/component/navbar/navbar.js emotion-recognition/src/component/navbar/navbar.test.js emotion-recognition/src/component/layout/AdminLayout.js emotion-recognition/src/component/layout/AdminLayout.test.js emotion-recognition/src/component/page/login/login_page.js emotion-recognition/src/component/page/login/login_page.test.js
git commit -m "rebrand: rename product to ArgusID across nav, portal and login wordmarks"
```

---

## Task 2: Add the Fun Game sidebar entry

**Files:**
- Modify: `emotion-recognition/src/component/common/icons.js` (add `PuzzlePieceIcon`)
- Modify: `emotion-recognition/src/component/layout/AdminLayout.js` (import the icon, add a `NAV_ITEMS` entry)
- Test: Modify `emotion-recognition/src/component/layout/AdminLayout.test.js`

**Interfaces:**
- Consumes: nothing from Task 1 (Task 1 only edited the wordmark `<span>`, not `NAV_ITEMS` or imports).
- Produces: a sidebar link with `to: "/fun-game"` and accessible name "Fun Game", visible to `super_admin`, `admin`, and `user`. Task 3 must add a `<Route exact path="/fun-game">` in `App.js` matching this exact path, or the link 404s.

- [ ] **Step 1: Write the failing tests**

In `emotion-recognition/src/component/layout/AdminLayout.test.js`, add:

```javascript
test("station user sees the Fun Game link", () => {
  renderLayout({ id: 1, role: "user", username: "officer1", station_id: 1 });
  expect(screen.getByRole("link", { name: /fun game/i })).toBeInTheDocument();
});

test("station admin sees the Fun Game link", () => {
  renderLayout({ id: 2, role: "admin", username: "dhk01admin", station_id: 1 });
  expect(screen.getByRole("link", { name: /fun game/i })).toBeInTheDocument();
});

test("super admin with no station still sees the Fun Game link", () => {
  renderLayout({ id: 3, role: "super_admin", username: "root", station_id: null });
  expect(screen.getByRole("link", { name: /fun game/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `CI=true npx react-scripts test src/component/layout/AdminLayout.test.js --watchAll=false`
Expected: FAIL — all 3 new tests report `Unable to find role="link" and name /fun game/i`.

- [ ] **Step 3: Add the Fun Game icon**

In `emotion-recognition/src/component/common/icons.js`, add at the end of the file:

```javascript
export const PuzzlePieceIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 0 1-.657.643 48.39 48.39 0 0 1-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 0 1-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 0 0-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 0 1-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 0 0 .657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 0 1-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 0 0 5.427-.63 48.05 48.05 0 0 0 .582-4.717.532.532 0 0 0-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 0 0 .658-.663 48.422 48.422 0 0 0-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 0 1-.61-.58Z" />
  </svg>
);
```

- [ ] **Step 4: Wire the icon and the nav entry into AdminLayout**

In `emotion-recognition/src/component/layout/AdminLayout.js`, change the icon import:

```javascript
import {
  DashboardIcon,
  LogoutIcon,
  MoonIcon,
  PlusIcon,
  SearchIcon,
  SunIcon,
  UsersIcon,
} from "../common/icons";
```

to:

```javascript
import {
  DashboardIcon,
  LogoutIcon,
  MoonIcon,
  PlusIcon,
  PuzzlePieceIcon,
  SearchIcon,
  SunIcon,
  UsersIcon,
} from "../common/icons";
```

and add one entry to `NAV_ITEMS` (after the last existing entry, `/station/users`):

```javascript
const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: DashboardIcon, roles: ["super_admin"] },
  { to: "/station", label: "Dashboard", icon: DashboardIcon, roles: ["admin", "user"] },
  { to: "/admin/stations/new", label: "Create Station", icon: PlusIcon, roles: ["super_admin"] },
  { to: "/admin/criminals", label: "Criminal Search", icon: SearchIcon, roles: ["super_admin"] },
  { to: "/station/criminals", label: "Criminal Search", icon: SearchIcon, roles: ["admin", "user"] },
  { to: "/admin/criminals/new", label: "Add Criminal", icon: PlusIcon, roles: ["super_admin"] },
  { to: "/station/criminals/new", label: "Add Criminal", icon: PlusIcon, roles: ["admin"] },
  { to: "/station/users", label: "User Management", icon: UsersIcon, roles: ["admin"] },
  { to: "/fun-game", label: "Fun Game", icon: PuzzlePieceIcon, roles: ["super_admin", "admin", "user"] },
];
```

- [ ] **Step 5: Run it to verify it passes**

Run: `CI=true npx react-scripts test src/component/layout/AdminLayout.test.js --watchAll=false`
Expected: PASS — all tests in the file pass (existing tests plus the 3 new ones).

- [ ] **Step 6: Commit**

```bash
git add emotion-recognition/src/component/common/icons.js emotion-recognition/src/component/layout/AdminLayout.js emotion-recognition/src/component/layout/AdminLayout.test.js
git commit -m "feat: add Fun Game sidebar entry for all authenticated roles"
```

---

## Task 3: Move the demo behind login as the Fun Game page

**Files:**
- Modify: `emotion-recognition/src/component/page/face_detection/face_detection.js` (drop the standalone page chrome)
- Modify: `emotion-recognition/src/component/page/image_input/image_input.js` (drop the standalone page chrome)
- Create: `emotion-recognition/src/component/page/fun_game/fun_game.js`
- Create: `emotion-recognition/src/component/page/fun_game/fun_game.test.js`
- Modify: `emotion-recognition/src/App.js` (remove the two public routes, add the protected `/fun-game` route and a catch-all redirect)
- Modify: `emotion-recognition/src/component/navbar/navbar.js` (drop the two demo links, add a Sign In link)
- Modify: `emotion-recognition/src/App.test.js` (replace the stale CRA boilerplate test with real routing coverage)

**Interfaces:**
- Consumes: the `to: "/fun-game"` sidebar entry from Task 2 — this task's new route must match that exact path.
- Produces: `FunGame` default export at `emotion-recognition/src/component/page/fun_game/fun_game.js`, rendering `RealFaceDetection` (`.../face_detection/face_detection`) and `ImageInput` (`.../image_input/image_input`) as its two tabs. Task 4 does not consume this.

- [ ] **Step 1: Strip the standalone page chrome from the two demo components**

In `emotion-recognition/src/component/page/face_detection/face_detection.js`, remove the now-unused imports:

```javascript
import Background from "../../backgorund/backgorun";
import Nav from "../../navbar/navbar";
```

and change the `return` statement from:

```javascript
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-50 transition-colors duration-300 dark:bg-slate-950">
      <Background />
      <div className="relative z-10">
        <Nav />
        <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-16 pt-10 xl:flex-row xl:items-start">
```

to:

```javascript
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 xl:flex-row xl:items-start">
```

and change the matching closing tags at the end of the `return` from:

```javascript
        </main>
      </div>
    </div>
  );
};

export default RealFaceDetection;
```

to:

```javascript
    </main>
  );
};

export default RealFaceDetection;
```

In `emotion-recognition/src/component/page/image_input/image_input.js`, remove the same now-unused imports:

```javascript
import Background from "../../backgorund/backgorun";
import Nav from "../../navbar/navbar";
```

and change the `return` statement from:

```javascript
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-50 transition-colors duration-300 dark:bg-slate-950">
      <Background />
      <div className="relative z-10">
        <Nav />
        <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-16 pt-10 xl:flex-row xl:items-start">
```

to:

```javascript
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 xl:flex-row xl:items-start">
```

and change the matching closing tags at the end of the `return` from:

```javascript
        </main>
      </div>
    </div>
  );
};

export default ImageInput;
```

to:

```javascript
    </main>
  );
};

export default ImageInput;
```

- [ ] **Step 2: Write the failing tests for the Fun Game page**

Create `emotion-recognition/src/component/page/fun_game/fun_game.test.js`:

```javascript
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { ThemeContext } from "../../../context/ThemeContext";
import FunGame from "./fun_game";

jest.mock("../face_detection/face_detection", () => () => <div>webcam-panel</div>);
jest.mock("../image_input/image_input", () => () => <div>upload-panel</div>);

function renderFunGame() {
  return render(
    <AuthContext.Provider
      value={{ user: { id: 1, role: "user", username: "officer1", station_id: 1 }, token: "abc123", loading: false, logout: jest.fn() }}
    >
      <ThemeContext.Provider value={{ theme: "light", toggleTheme: jest.fn() }}>
        <MemoryRouter>
          <FunGame />
        </MemoryRouter>
      </ThemeContext.Provider>
    </AuthContext.Provider>
  );
}

test("shows the live webcam panel by default", () => {
  renderFunGame();
  expect(screen.getByText("webcam-panel")).toBeInTheDocument();
  expect(screen.queryByText("upload-panel")).not.toBeInTheDocument();
});

test("switches to the image upload panel on click, unmounting the webcam panel", () => {
  renderFunGame();
  fireEvent.click(screen.getByRole("button", { name: /image upload/i }));
  expect(screen.getByText("upload-panel")).toBeInTheDocument();
  expect(screen.queryByText("webcam-panel")).not.toBeInTheDocument();
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `CI=true npx react-scripts test src/component/page/fun_game/fun_game.test.js --watchAll=false`
Expected: FAIL — `Cannot find module './fun_game' from 'src/component/page/fun_game/fun_game.test.js'` (the file doesn't exist yet).

- [ ] **Step 4: Create the Fun Game page**

Create `emotion-recognition/src/component/page/fun_game/fun_game.js`:

```javascript
import { useState } from "react";
import AdminLayout from "../../layout/AdminLayout";
import RealFaceDetection from "../face_detection/face_detection";
import ImageInput from "../image_input/image_input";

const TABS = [
  { id: "webcam", label: "Live Webcam" },
  { id: "upload", label: "Image Upload" },
];

export default function FunGame() {
  const [activeTab, setActiveTab] = useState("webcam");

  return (
    <AdminLayout title="Fun Game">
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        Play with the detection engine that powers case matching.
      </p>
      <div className="mb-6 flex gap-2 border-b border-slate-200 dark:border-slate-800">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === "webcam" ? <RealFaceDetection /> : <ImageInput />}
    </AdminLayout>
  );
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `CI=true npx react-scripts test src/component/page/fun_game/fun_game.test.js --watchAll=false`
Expected: PASS 2/2.

- [ ] **Step 6: Write the failing tests for routing and the public nav**

In `emotion-recognition/src/component/navbar/navbar.test.js` (from Task 1), add:

```javascript
test("does not render Face Detection or Image Input links", () => {
  renderNav();
  expect(screen.queryByRole("link", { name: /face detection/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /image input/i })).not.toBeInTheDocument();
});

test("renders a Sign In link to /login", () => {
  renderNav();
  const link = screen.getByRole("link", { name: /sign in/i });
  expect(link).toHaveAttribute("href", "/login");
});
```

Replace the entire contents of `emotion-recognition/src/App.test.js` (its current "renders learn react link" test already fails against this codebase) with:

```javascript
import { render, screen } from "@testing-library/react";
import App from "./App";

jest.mock("./component/backgorund/backgorun", () => () => null);

test("redirects a removed or unknown route to the home page", () => {
  window.history.pushState({}, "", "/face-detection");
  render(<App />);
  expect(screen.getByText("ArgusID")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
});

test("bounces an unauthenticated visitor away from the Fun Game route to login", () => {
  window.history.pushState({}, "", "/fun-game");
  render(<App />);
  expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
  expect(screen.queryByText(/play with the detection engine/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 7: Run it to verify it fails**

Run: `CI=true npx react-scripts test src/component/navbar/navbar.test.js src/App.test.js --watchAll=false`
Expected: FAIL — `navbar.test.js`'s 2 new tests fail because the links still say "Face Detection"/"Image Input" and there is no "Sign In" link; `App.test.js`'s 2 tests fail because `/face-detection` still resolves the old demo route (no "ArgusID" text reachable via that path today, and there's no catch-all) and `/fun-game` isn't a route at all.

- [ ] **Step 8: Update the public nav and the routes**

In `emotion-recognition/src/component/navbar/navbar.js`, change:

```javascript
        <div className="flex flex-1 justify-center gap-1 overflow-x-auto sm:flex-none">
          <NavLink to="/" end className={navLinkClasses}>
            Home
          </NavLink>
          <NavLink to="/face-detection" className={navLinkClasses}>
            Face Detection
          </NavLink>
          <NavLink to="/input-image" className={navLinkClasses}>
            Image Input
          </NavLink>
        </div>
```

to:

```javascript
        <div className="flex flex-1 justify-center gap-1 overflow-x-auto sm:flex-none">
          <NavLink to="/" end className={navLinkClasses}>
            Home
          </NavLink>
          <NavLink to="/login" className={navLinkClasses}>
            Sign In
          </NavLink>
        </div>
```

In `emotion-recognition/src/App.js`, change the top imports from:

```javascript
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import HomePage from "./component/page/home/home_page";
import RealFaceDetection from "./component/page/face_detection/face_detection";
import ImageInput from "./component/page/image_input/image_input";
import LoginPage from "./component/page/login/login_page";
```

to:

```javascript
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import HomePage from "./component/page/home/home_page";
import FunGame from "./component/page/fun_game/fun_game";
import LoginPage from "./component/page/login/login_page";
```

Change:

```javascript
            <Route exact path="/" element={<HomePage />} />
            <Route exact path="/login" element={<LoginPage />} />
            <Route exact path="/face-detection" element={<RealFaceDetection />} />
            <Route exact path="/input-image" element={<ImageInput />} />
```

to:

```javascript
            <Route exact path="/" element={<HomePage />} />
            <Route exact path="/login" element={<LoginPage />} />
            <Route
              exact
              path="/fun-game"
              element={
                <ProtectedRoute roles={["super_admin", "admin", "user"]}>
                  <FunGame />
                </ProtectedRoute>
              }
            />
```

and, right before the closing `</Routes>`, add the catch-all:

```javascript
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
```

(replacing the bare `</Routes>` that follows the last `/station/users` route.)

- [ ] **Step 9: Run it to verify it passes**

Run: `CI=true npx react-scripts test src/component/navbar/navbar.test.js src/App.test.js src/component/page/fun_game/fun_game.test.js --watchAll=false`
Expected: PASS — all tests in all three files pass.

- [ ] **Step 10: Commit**

```bash
git add emotion-recognition/src/component/page/face_detection/face_detection.js emotion-recognition/src/component/page/image_input/image_input.js emotion-recognition/src/component/page/fun_game/fun_game.js emotion-recognition/src/component/page/fun_game/fun_game.test.js emotion-recognition/src/App.js emotion-recognition/src/App.test.js emotion-recognition/src/component/navbar/navbar.js emotion-recognition/src/component/navbar/navbar.test.js
git commit -m "feat: move live detection demo behind login as the Fun Game page"
```

---

## Task 4: Replace the public home page with a product landing page

**Files:**
- Modify: `emotion-recognition/src/component/page/home/home_page.js` (full rewrite)
- Create: `emotion-recognition/src/component/page/home/home_page.test.js`

**Interfaces:**
- Consumes: nothing from Tasks 1-3 (this task only touches `home_page.js`, which no other task edits).
- Produces: nothing later tasks depend on — this is the last task.

- [ ] **Step 1: Write the failing tests**

Create `emotion-recognition/src/component/page/home/home_page.test.js`:

```javascript
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { ThemeContext } from "../../../context/ThemeContext";
import HomePage from "./home_page";

jest.mock("../../backgorund/backgorun", () => () => null);

function renderHomePage(user = null) {
  return render(
    <AuthContext.Provider value={{ user, token: null, loading: false, logout: jest.fn() }}>
      <ThemeContext.Provider value={{ theme: "light", toggleTheme: jest.fn() }}>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/admin" element={<div>admin-dashboard</div>} />
            <Route path="/station" element={<div>station-dashboard</div>} />
          </Routes>
        </MemoryRouter>
      </ThemeContext.Provider>
    </AuthContext.Provider>
  );
}

test("renders the ArgusID headline for a signed-out visitor", () => {
  renderHomePage();
  expect(screen.getByText(/ArgusID/)).toBeInTheDocument();
});

test("links the primary call to action to sign in", () => {
  renderHomePage();
  const link = screen.getByRole("link", { name: /sign in to your station/i });
  expect(link).toHaveAttribute("href", "/login");
});

test("does not link to the old public detection demo routes", () => {
  renderHomePage();
  expect(screen.queryByRole("link", { name: /try live detection/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /upload an image/i })).not.toBeInTheDocument();
});

test("redirects a signed-in station user to their dashboard instead of the marketing page", () => {
  renderHomePage({ id: 1, role: "user", username: "officer1", station_id: 1 });
  expect(screen.getByText("station-dashboard")).toBeInTheDocument();
});

test("redirects a signed-in super admin to the admin dashboard", () => {
  renderHomePage({ id: 2, role: "super_admin", username: "root", station_id: null });
  expect(screen.getByText("admin-dashboard")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `CI=true npx react-scripts test src/component/page/home/home_page.test.js --watchAll=false`
Expected: FAIL — the redirect tests fail because `HomePage` never checks `AuthContext` (`station-dashboard`/`admin-dashboard` text never renders); the CTA test fails because the button is still labeled "Try Live Detection".

- [ ] **Step 3: Rewrite the home page**

Replace the entire contents of `emotion-recognition/src/component/page/home/home_page.js` with:

```javascript
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import Background from "../../backgorund/backgorun";
import Nav from "../../navbar/navbar";

const CAPABILITIES = [
  {
    icon: "🎯",
    title: "Face & Emotion Recognition Engine",
    description:
      "Real-time detection matches faces against records the moment a photo comes in.",
  },
  {
    icon: "🗂️",
    title: "Criminal Records Management",
    description:
      "Full case records with status, arresting officer, and multi-angle photos per record.",
  },
  {
    icon: "🏢",
    title: "Role-Based Station Network",
    description:
      "Super admins manage stations; station admins and officers see only their own station's cases.",
  },
  {
    icon: "🔒",
    title: "Secure Evidence Photos",
    description:
      "Uploaded photos are stored per record and served only to authenticated, authorized users.",
  },
];

const STEPS = [
  {
    step: "1",
    title: "Capture or upload a face",
    description: "From a live webcam feed or a single uploaded photo.",
  },
  {
    step: "2",
    title: "The engine matches it",
    description: "Faces are located and classified against the detection model.",
  },
  {
    step: "3",
    title: "It lands in the case record",
    description: "Matches and context attach to the right station's criminal record.",
  },
];

const HomePage = () => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) {
    return <Navigate to={user.role === "super_admin" ? "/admin" : "/station"} replace />;
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-50 transition-colors duration-300 dark:bg-slate-950">
      <Background />
      <div className="relative z-10">
        <Nav />
        <main className="mx-auto flex max-w-5xl flex-col items-center px-4 pb-20 pt-16 text-center sm:pt-24">
          <span className="mb-4 inline-block rounded-full bg-emerald-500/10 px-4 py-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            Facial Recognition for Law Enforcement
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-6xl">
            <span className="text-emerald-500">ArgusID</span> watches so your
            station doesn't have to
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
            Facial recognition and case records for police stations — match
            faces to records in seconds, and keep every station's data
            scoped to the people who are cleared to see it.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              to="/login"
              className="rounded-xl bg-emerald-500 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-500/30 transition-transform hover:-translate-y-0.5 hover:bg-emerald-600"
            >
              Sign in to your station
            </Link>
          </div>

          <div className="mt-20 grid w-full gap-6 sm:grid-cols-2">
            {CAPABILITIES.map((capability) => (
              <div
                key={capability.title}
                className="rounded-2xl border border-slate-200 bg-white/80 p-6 text-left shadow-sm backdrop-blur transition-transform hover:-translate-y-1 dark:border-slate-800 dark:bg-slate-900/70"
              >
                <div className="mb-3 text-3xl">{capability.icon}</div>
                <h3 className="mb-1 font-semibold text-slate-900 dark:text-white">
                  {capability.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {capability.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-20 w-full text-left">
            <h2 className="mb-8 text-center text-2xl font-bold text-slate-900 dark:text-white">
              How it works
            </h2>
            <div className="grid gap-6 sm:grid-cols-3">
              {STEPS.map((item) => (
                <div
                  key={item.step}
                  className="rounded-2xl border border-slate-200 bg-white/80 p-6 dark:border-slate-800 dark:bg-slate-900/70"
                >
                  <span className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white">
                    {item.step}
                  </span>
                  <h3 className="mb-1 font-semibold text-slate-900 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-20 w-full rounded-2xl border border-slate-200 bg-white/80 p-8 text-left dark:border-slate-800 dark:bg-slate-900/70">
            <h2 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">
              Security & compliance
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              JWT-authenticated sign-in, role-based access for super admins,
              station admins, and officers, and per-station data scoping keep
              every station's records visible only to the people cleared to
              see them.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default HomePage;
```

- [ ] **Step 4: Run it to verify it passes**

Run: `CI=true npx react-scripts test src/component/page/home/home_page.test.js --watchAll=false`
Expected: PASS 5/5.

- [ ] **Step 5: Commit**

```bash
git add emotion-recognition/src/component/page/home/home_page.js emotion-recognition/src/component/page/home/home_page.test.js
git commit -m "feat: replace the public home page with an ArgusID product landing page"
```
