import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";

function Probe() {
  const { user, token, login, logout, loading } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.username : "none"}</span>
      <span data-testid="token">{token || "none"}</span>
      <button onClick={() => login("root", "s3cret").catch(() => {})}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  global.fetch = jest.fn();
});

test("login stores token and fetched user, logout clears them", async () => {
  global.fetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: "abc123", token_type: "bearer" }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, username: "root", role: "super_admin", station_id: null }),
    });

  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );

  fireEvent.click(screen.getByText("login"));

  await waitFor(() => expect(screen.getByTestId("token").textContent).toBe("abc123"));
  expect(screen.getByTestId("user").textContent).toBe("root");
  expect(localStorage.getItem("token")).toBe("abc123");

  fireEvent.click(screen.getByText("logout"));

  expect(screen.getByTestId("user").textContent).toBe("none");
  expect(localStorage.getItem("token")).toBeNull();
});

test("login rejects and leaves user unset on 401", async () => {
  global.fetch.mockResolvedValueOnce({
    ok: false,
    status: 401,
    json: async () => ({ detail: "Invalid username or password" }),
  });

  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );

  fireEvent.click(screen.getByText("login"));

  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  expect(screen.getByTestId("user").textContent).toBe("none");
});
