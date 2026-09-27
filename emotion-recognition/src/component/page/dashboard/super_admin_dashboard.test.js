import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { ThemeContext } from "../../../context/ThemeContext";
import SuperAdminDashboard from "./super_admin_dashboard";

function renderWithAuth(ui) {
  return render(
    <AuthContext.Provider
      value={{ user: { role: "super_admin", username: "root" }, token: "abc123", loading: false, logout: jest.fn() }}
    >
      <ThemeContext.Provider value={{ theme: "light", toggleTheme: jest.fn() }}>
        <MemoryRouter>{ui}</MemoryRouter>
      </ThemeContext.Provider>
    </AuthContext.Provider>
  );
}

beforeEach(() => {
  global.fetch = jest.fn();
});

test("renders inside AdminLayout with its sidebar navigation", async () => {
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

  renderWithAuth(<SuperAdminDashboard />);

  expect(screen.getByRole("heading", { name: "Super Admin Dashboard" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /criminal search/i })).toBeInTheDocument();
});

test("shows the station count from the API", async () => {
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => [
      { id: 1, name: "Dhanmondi Thana", district: "Dhaka", code: "DHK-01" },
      { id: 2, name: "Gulshan Thana", district: "Dhaka", code: "DHK-02" },
    ],
  });

  renderWithAuth(<SuperAdminDashboard />);

  expect(await screen.findByText("2")).toBeInTheDocument();
});

test("sidebar links to the Create Station page instead of an inline form", async () => {
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

  renderWithAuth(<SuperAdminDashboard />);

  expect(await screen.findByRole("link", { name: /create station/i })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /create station/i })).not.toBeInTheDocument();
});
