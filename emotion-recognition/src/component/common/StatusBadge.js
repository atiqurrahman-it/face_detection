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
