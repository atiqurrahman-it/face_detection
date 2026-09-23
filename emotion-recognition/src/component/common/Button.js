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
