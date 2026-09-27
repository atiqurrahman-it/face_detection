import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "./icons";

export default function SearchableSelect({ id, options, value, onChange, placeholder, disabled, className = "" }) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);

  const filtered = value ? options.filter((option) => option.toLowerCase().includes(value.toLowerCase())) : options;

  useEffect(() => {
    setHighlightedIndex(0);
  }, [value, open]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectOption(option) {
    onChange({ target: { value: option } });
    setOpen(false);
  }

  function handleKeyDown(e) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlightedIndex]) selectOption(filtered[highlightedIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}_listbox`}
        aria-autocomplete="list"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => {
          onChange(e);
          setOpen(true);
        }}
        onFocus={() => !disabled && setOpen(true)}
        onKeyDown={handleKeyDown}
        style={{ paddingRight: "2.25rem" }}
        className={`${className} disabled:cursor-not-allowed disabled:opacity-60`}
      />
      <ChevronDownIcon
        className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${
          open ? "rotate-180" : ""
        }`}
      />
      {open && !disabled && (
        <ul
          id={`${id}_listbox`}
          role="listbox"
          className="thin-scrollbar absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
        >
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-400 dark:text-slate-500">No matches</li>
          )}
          {filtered.map((option, index) => (
            <li
              key={option}
              role="option"
              aria-selected={option === value}
              onMouseDown={(e) => {
                e.preventDefault();
                selectOption(option);
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`cursor-pointer px-3 py-2 text-sm ${
                index === highlightedIndex ? "bg-emerald-500 text-white" : "text-slate-700 dark:text-slate-200"
              }`}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
