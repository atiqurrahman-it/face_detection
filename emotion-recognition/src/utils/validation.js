/**
 * Client-side form validation.
 *
 * rules: { field: { label, required?, minLength? } }
 * Returns { field: "message" } for every invalid field (empty object when valid).
 */
export function validateForm(values, rules) {
  const errors = {};
  Object.entries(rules).forEach(([field, rule]) => {
    const raw = values[field];
    const value = typeof raw === "string" ? raw.trim() : raw;
    const empty = value === undefined || value === null || value === "" || value === false;
    if (rule.required && empty) {
      errors[field] = `${rule.label} is required`;
    } else if (rule.minLength && !empty && String(raw).length < rule.minLength) {
      errors[field] = `${rule.label} must be at least ${rule.minLength} characters`;
    }
  });
  return errors;
}

export function hasErrors(errors) {
  return Object.values(errors || {}).some(Boolean);
}

// Move focus to the first field that has an error so the user sees it.
export function focusFirstError(errors, idPrefix = "") {
  const first = Object.keys(errors).find((k) => errors[k]);
  if (!first) return;
  const el = document.getElementById(`${idPrefix}${first}`);
  if (el && typeof el.focus === "function") el.focus();
}
