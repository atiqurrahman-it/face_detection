import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../../../context/AuthContext";
import LoginPage from "./login_page";

beforeEach(() => {
  localStorage.clear();
  global.fetch = jest.fn();
});

test("submitting valid credentials logs the user in", async () => {
  global.fetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "abc123" }) })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, username: "root", role: "super_admin", station_id: null }),
    });

  render(
    <AuthProvider>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </AuthProvider>
  );

  fireEvent.change(screen.getByLabelText("Username"), { target: { value: "root" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "s3cret" } });
  fireEvent.click(screen.getByRole("button", { name: /log in/i }));

  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
});

test("shows an error message on invalid credentials", async () => {
  global.fetch.mockResolvedValueOnce({
    ok: false,
    status: 401,
    json: async () => ({ detail: "Invalid username or password" }),
  });

  render(
    <AuthProvider>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </AuthProvider>
  );

  fireEvent.change(screen.getByLabelText("Username"), { target: { value: "root" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrong" } });
  fireEvent.click(screen.getByRole("button", { name: /log in/i }));

  expect(await screen.findByText(/invalid username or password/i)).toBeInTheDocument();
});

test("renders the CrimTrace wordmark", () => {
  render(
    <AuthProvider>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </AuthProvider>
  );
  expect(screen.getByText("CrimTrace")).toBeInTheDocument();
});
