import { NavLink } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";

const navLinkClasses = ({ isActive }) =>
  `px-4 py-2 sm:px-6 rounded-full text-sm sm:text-base font-semibold transition-colors duration-200 whitespace-nowrap ${
    isActive
      ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
  }`;

const SunIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="h-5 w-5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
    />
  </svg>
);

const MoonIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="h-5 w-5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
    />
  </svg>
);

const Nav = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="sticky top-0 z-30 w-full px-4 pt-4 sm:pt-6">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 rounded-2xl border border-slate-200/70 bg-white/90 px-3 py-2 shadow-lg shadow-black/5 backdrop-blur transition-colors dark:border-white/10 dark:bg-slate-900/80">
        <div className="hidden items-center gap-2 pl-2 font-bold text-slate-800 dark:text-white sm:flex">
          <span className="text-xl">🛡️</span>
          <span>ArgusID</span>
        </div>

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

        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </nav>
  );
};

export default Nav;
