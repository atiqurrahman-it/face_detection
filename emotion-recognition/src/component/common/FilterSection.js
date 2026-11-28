import { useState } from "react";

// Filter panel that starts collapsed on phones (below `md`) to save screen space,
// and is always open on larger screens. Content is hidden with CSS only, so the
// inputs stay mounted and keep their values.
export default function FilterSection({ title, children }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-left md:hidden"
      >
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className={`h-5 w-5 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      <h2 className="mb-4 hidden text-lg font-semibold text-slate-900 dark:text-white md:block">{title}</h2>
      <div className={`${open ? "mt-4 block" : "hidden"} md:mt-0 md:block`}>{children}</div>
    </>
  );
}
