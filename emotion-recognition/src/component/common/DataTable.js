import { useEffect, useState } from "react";

// Below Tailwind's `md` breakpoint, rows are shown as cards instead of a table.
const PHONE_QUERY = "(max-width: 767px)";

function useIsPhone() {
  const getMatch = () =>
    typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(PHONE_QUERY).matches;
  const [isPhone, setIsPhone] = useState(getMatch);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const mql = window.matchMedia(PHONE_QUERY);
    const onChange = () => setIsPhone(mql.matches);
    // Older Safari (and some test mocks) only have addListener/removeListener.
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }
    if (typeof mql.addListener === "function") {
      mql.addListener(onChange);
      return () => mql.removeListener(onChange);
    }
    return undefined;
  }, []);

  return isPhone;
}

const cellValue = (col, row) => (col.render ? col.render(row) : row[col.key]);

// Card layout: unlabeled columns (e.g. a photo) and the first labeled column sit
// in the top row, the rest become label/value pairs, and "actions" goes at the bottom.
function RowCard({ columns, row }) {
  const actions = columns.find((c) => c.key === "actions");
  const rest = columns.filter((c) => c !== actions);
  const firstLabeled = rest.findIndex((c) => c.header);
  const top = rest.slice(0, firstLabeled + 1);
  const details = rest.slice(firstLabeled + 1);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
        {top.map((col) => (
          <div key={col.key} className={col.header ? "min-w-0 flex-1" : "shrink-0"}>
            {cellValue(col, row)}
          </div>
        ))}
      </div>
      {details.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {details.map((col) => (
            <div key={col.key} className="min-w-0">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{col.header}</dt>
              <dd className="break-words text-slate-700 dark:text-slate-300">{cellValue(col, row)}</dd>
            </div>
          ))}
        </dl>
      )}
      {actions && (
        <div className="mt-3 flex justify-end border-t border-slate-100 pt-3 dark:border-slate-800">
          {cellValue(actions, row)}
        </div>
      )}
    </div>
  );
}

export default function DataTable({ columns, rows, keyField, emptyMessage = "No records found." }) {
  const isPhone = useIsPhone();

  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">{emptyMessage}</p>;
  }

  if (isPhone) {
    return (
      <div className="space-y-3">
        {rows.map((row) => (
          <RowCard key={row[keyField]} columns={columns} row={row} />
        ))}
      </div>
    );
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
                  {cellValue(col, row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
