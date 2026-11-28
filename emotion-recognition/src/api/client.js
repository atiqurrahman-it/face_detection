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
    const message = (data && data.detail) || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
}

export { API_BASE_URL };
