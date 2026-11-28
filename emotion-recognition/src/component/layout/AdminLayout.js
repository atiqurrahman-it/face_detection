import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
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
  const [isMenuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Close the phone menu after navigating to another page.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const sidebarContent = (
    <>
      <div className="mb-6 flex items-center gap-2 px-2 font-bold text-slate-800 dark:text-white">
        <span className="text-xl">🛡️</span>
        <span>Crime Track</span>
      </div>
      {/* Name/role sit in the header on larger screens; the drawer shows them here. */}
      <div className="mb-4 border-b border-slate-200 px-2 pb-4 dark:border-slate-800 sm:hidden">
        <p className="truncate font-medium text-slate-800 dark:text-white">{user.name || user.username}</p>
        <p className="text-xs uppercase tracking-wide text-slate-400">{user.role.replace("_", " ")}</p>
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
        onClick={() => {
          setMenuOpen(false);
          setLogoutModalOpen(true);
        }}
        className="mt-4 flex items-center gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        <LogoutIcon className="h-5 w-5" />
        Log out
      </button>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Desktop sidebar */}
      <aside className="thin-scrollbar hidden w-64 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:flex">
        {sidebarContent}
      </aside>

      {/* Phone/tablet drawer */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMenuOpen(false)} />
          <aside className="thin-scrollbar relative flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              ✕
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex h-screen flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-900 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 md:hidden"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <h1 className="truncate text-lg font-semibold text-slate-900 dark:text-white sm:text-xl">{title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden text-right text-sm sm:block">
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

        <main className="thin-scrollbar flex-1 overflow-y-auto p-3 sm:p-6">{children}</main>
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
