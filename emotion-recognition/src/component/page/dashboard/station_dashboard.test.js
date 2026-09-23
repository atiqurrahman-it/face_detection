import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { ThemeContext } from "../../../context/ThemeContext";
import StationDashboard from "./station_dashboard";

function renderWithAuth(user) {
  return render(
    <AuthContext.Provider value={{ user, token: "abc123", loading: false, logout: jest.fn() }}>
      <ThemeContext.Provider value={{ theme: "light", toggleTheme: jest.fn() }}>
        <MemoryRouter>
          <StationDashboard />
        </MemoryRouter>
      </ThemeContext.Provider>
    </AuthContext.Provider>
  );
}

test("renders inside AdminLayout with its sidebar navigation and a welcome message", () => {
  renderWithAuth({ role: "user", name: "Field Officer One", username: "officer1", station_id: 1 });

  expect(screen.getByRole("heading", { name: "Station Dashboard" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /criminal search/i })).toBeInTheDocument();
  expect(screen.getByText(/welcome, field officer one/i)).toBeInTheDocument();
});

test("station admin sees the User Management link, station user does not", () => {
  const { unmount } = renderWithAuth({ role: "admin", name: "Admin One", username: "dhk01admin", station_id: 1 });
  expect(screen.getByRole("link", { name: /user management/i })).toBeInTheDocument();
  unmount();

  renderWithAuth({ role: "user", name: "Officer One", username: "officer1", station_id: 1 });
  expect(screen.queryByRole("link", { name: /user management/i })).not.toBeInTheDocument();
});
