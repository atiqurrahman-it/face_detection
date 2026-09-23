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
