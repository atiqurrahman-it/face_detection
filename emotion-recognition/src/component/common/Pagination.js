import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

const inactiveClasses =
  "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700";
const activeClasses = "border border-emerald-500 bg-emerald-500 text-white";

const PAGE_LINKS_TO_SHOW = 5;

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = ["5", "10", "20", "50"],
}) {
  if (totalPages <= 1 && !onPageSizeChange) return null;

  const startPage = Math.max(1, currentPage - Math.floor(PAGE_LINKS_TO_SHOW / 2));
  const endPage = Math.min(totalPages, startPage + PAGE_LINKS_TO_SHOW - 1);

  function goTo(page) {
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange(page);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4 dark:border-slate-800">
      <nav aria-label="Pagination" className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Previous page"
          onClick={() => goTo(currentPage - 1)}
          disabled={currentPage === 1}
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${inactiveClasses} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>

        {startPage > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(1)}
              className={`h-8 min-w-8 rounded-lg px-2 text-sm font-medium ${inactiveClasses}`}
            >
              1
            </button>
            {startPage > 2 && <span className="px-1 text-slate-400 dark:text-slate-500">…</span>}
          </>
        )}

        {Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => goTo(page)}
            aria-current={page === currentPage ? "page" : undefined}
            className={`h-8 min-w-8 rounded-lg px-2 text-sm font-medium ${page === currentPage ? activeClasses : inactiveClasses}`}
          >
            {page}
          </button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="px-1 text-slate-400 dark:text-slate-500">…</span>}
            <button
              type="button"
              onClick={() => goTo(totalPages)}
              className={`h-8 min-w-8 rounded-lg px-2 text-sm font-medium ${inactiveClasses}`}
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          type="button"
          aria-label="Next page"
          onClick={() => goTo(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${inactiveClasses} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </nav>

      {onPageSizeChange && (
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          Per page
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
