const errorBorders = [
  "[&>input]:!border-red-500 [&>select]:!border-red-500 [&>textarea]:!border-red-500 [&>div>input:first-child]:!border-red-500",
  "[&>input]:!ring-red-500 [&>select]:!ring-red-500 [&>textarea]:!ring-red-500 [&>div>input:first-child]:!ring-red-500",
].join(" ");

export default function FormField({ label, htmlFor, error, required = false, children }) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={htmlFor}
        className={`block text-sm font-medium text-slate-700 dark:text-slate-300 ${
          required ? "after:ml-0.5 after:text-red-500 after:content-['*']" : ""
        }`}
      >
        {label}
      </label>
      <div className={error ? errorBorders : undefined}>{children}</div>
      {error && (
        <p id={htmlFor ? `${htmlFor}-error` : undefined} className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
