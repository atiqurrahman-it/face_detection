const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

// WebSocket base for face detection: same host as the API, ws:// or wss:// to match.
export function toWebSocketUrl(apiUrl) {
  return apiUrl.replace(/^http/, "ws");
}

export const WS_BASE_URL = toWebSocketUrl(API_BASE_URL);

export async function apiFetch(path, { method = "GET", body, token, headers = {} } = {}) {
  const isFormData = body instanceof FormData;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      // ngrok's free plan shows a warning page to browsers unless this header is sent.
      "ngrok-skip-browser-warning": "true",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body ? { body: isFormData ? body : JSON.stringify(body) } : {}),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = data && data.detail;
    const error = new Error(formatErrorDetail(detail) || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.fieldErrors = fieldErrorsFromDetail(detail);
    throw error;
  }

  return data;
}

// "admin_username" -> "Admin username"
function humanizeField(field) {
  const text = String(field).replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function fieldOf(item) {
  const loc = Array.isArray(item && item.loc) ? item.loc.filter((p) => p !== "body" && p !== "query") : [];
  return loc.length ? loc[loc.length - 1] : null;
}

// Pydantic's wording ("ensure this value has at least 8 characters") -> plain English.
function friendlyMessage(msg) {
  const text = (msg || "is invalid").replace(/^Value error, /, "");
  if (/field required|^missing$/i.test(text)) return "This field is required";
  const min = text.match(/at least (\d+) character/i);
  if (min) return min[1] === "1" ? "This field is required" : `Must be at least ${min[1]} characters`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// { field_name: "message" } for validation errors, or null when the error is not field-specific.
export function fieldErrorsFromDetail(detail) {
  if (!Array.isArray(detail)) return null;
  const errors = {};
  detail.forEach((item) => {
    const field = fieldOf(item);
    if (field && !errors[field]) errors[field] = friendlyMessage(item.msg);
  });
  return Object.keys(errors).length ? errors : null;
}

// FastAPI returns `detail` as a string for HTTPException, but as an array of
// { loc, msg } objects for request validation errors (422). Turn both into text.
export function formatErrorDetail(detail) {
  if (!detail) return null;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const lines = detail.map((item) => {
      if (typeof item === "string") return item;
      const field = fieldOf(item);
      const msg = friendlyMessage(item.msg);
      return field ? `${humanizeField(field)}: ${msg}` : msg;
    });
    return [...new Set(lines)].join("\n");
  }
  if (typeof detail === "object" && detail.msg) return detail.msg;
  return JSON.stringify(detail);
}

export { API_BASE_URL };
