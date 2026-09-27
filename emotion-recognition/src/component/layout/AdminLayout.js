import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import Button from "../common/Button";
import Modal from "../common/Modal";
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
  const [isLogoutModalOpen, setLogoutModalOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <aside className="thin-scrollbar hidden w-64 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:flex">
        <div className="mb-6 flex items-center gap-2 px-2 font-bold text-slate-800 dark:text-white">
          <span className="text-xl">🛡️</span>
          <span>CrimTrace</span>
        </div>
        <nav className="flex-1 space-y-1">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end className={linkClasses}>
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          onClick={() => setLogoutModalOpen(true)}
          className="flex items-center gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <LogoutIcon className="h-5 w-5" />
          Log out
        </button>
      </aside>

      <div className="flex h-screen flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
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
          </div>
        </header>

        <main className="thin-scrollbar flex-1 overflow-y-auto p-6">{children}</main>
      </div>

      <Modal open={isLogoutModalOpen} onClose={() => setLogoutModalOpen(false)} title="Log out">
        <p className="text-sm text-slate-600 dark:text-slate-300">Are you sure you want to log out?</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => setLogoutModalOpen(false)}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={logout}>
            Log out
          </Button>
        </div>
      </Modal>
    </div>
  );
}
