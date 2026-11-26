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

test("renders the Crime Track wordmark", () => {
  render(
    <AuthProvider>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </AuthProvider>
  );
  expect(screen.getByText("Crime Track")).toBeInTheDocument();
});

test("username and password inputs show placeholders", () => {
  render(
    <AuthProvider>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </AuthProvider>
  );

  expect(screen.getByLabelText("Username")).toHaveAttribute("placeholder", "Enter your username");
  expect(screen.getByLabelText("Password")).toHaveAttribute("placeholder", "Enter your password");
});

function renderLogin() {
  render(
    <AuthProvider>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </AuthProvider>
  );
}

test("submitting empty fields shows required messages and does not call the API", () => {
  renderLogin();

  fireEvent.click(screen.getByRole("button", { name: /log in/i }));

  expect(screen.getByText("Username is required")).toBeInTheDocument();
  expect(screen.getByText("Password is required")).toBeInTheDocument();
  expect(screen.getByLabelText("Username")).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByLabelText("Password")).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByLabelText("Username")).toHaveFocus();
  expect(global.fetch).not.toHaveBeenCalled();
});

test("only the missing field is flagged", () => {
  renderLogin();

  fireEvent.change(screen.getByLabelText("Username"), { target: { value: "root" } });
  fireEvent.click(screen.getByRole("button", { name: /log in/i }));

  expect(screen.queryByText("Username is required")).not.toBeInTheDocument();
  expect(screen.getByText("Password is required")).toBeInTheDocument();
  expect(screen.getByLabelText("Password")).toHaveFocus();
  expect(global.fetch).not.toHaveBeenCalled();
});

test("a required message clears once the user types in that field", () => {
  renderLogin();

  fireEvent.click(screen.getByRole("button", { name: /log in/i }));
  fireEvent.change(screen.getByLabelText("Username"), { target: { value: "r" } });

  expect(screen.queryByText("Username is required")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Username")).toHaveAttribute("aria-invalid", "false");
  expect(screen.getByText("Password is required")).toBeInTheDocument();
});

test("whitespace-only username counts as empty", () => {
  renderLogin();

  fireEvent.change(screen.getByLabelText("Username"), { target: { value: "   " } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "s3cret" } });
  fireEvent.click(screen.getByRole("button", { name: /log in/i }));

  expect(screen.getByText("Username is required")).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
});
