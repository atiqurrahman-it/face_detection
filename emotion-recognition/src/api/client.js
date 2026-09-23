const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

export async function apiFetch(path, { method = "GET", body, token, headers = {} } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = (data && data.detail) || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
}

export { API_BASE_URL };
