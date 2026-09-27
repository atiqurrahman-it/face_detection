import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { ThemeContext } from "../../context/ThemeContext";
import AdminLayout from "./AdminLayout";

function renderLayout(user, { logout = jest.fn(), toggleTheme = jest.fn() } = {}) {
  return render(
    <AuthContext.Provider value={{ user, token: "abc123", loading: false, logout }}>
      <ThemeContext.Provider value={{ theme: "light", toggleTheme }}>
        <MemoryRouter>
          <AdminLayout title="Test Page">
            <p>page content</p>
          </AdminLayout>
        </MemoryRouter>
      </ThemeContext.Provider>
    </AuthContext.Provider>
  );
}

test("station user sees Dashboard, Criminal Search, Add Criminal but not User Management", () => {
  renderLayout({ id: 1, role: "user", username: "officer1", station_id: 1 });

  expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /criminal search/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /add criminal/i })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /user management/i })).not.toBeInTheDocument();
});

test("station admin additionally sees User Management", () => {
  renderLayout({ id: 2, role: "admin", username: "dhk01admin", station_id: 1 });

  expect(screen.getByRole("link", { name: /user management/i })).toBeInTheDocument();
});

test("super admin does not see User Management", () => {
  renderLayout({ id: 3, role: "super_admin", username: "root", station_id: null });

  expect(screen.queryByRole("link", { name: /user management/i })).not.toBeInTheDocument();
});

test("clicking log out shows a confirmation dialog, and confirming calls logout", () => {
  const logout = jest.fn();
  renderLayout({ id: 1, role: "user", username: "officer1", station_id: 1 }, { logout });

  fireEvent.click(screen.getByRole("button", { name: /^log ?out$/i }));
  expect(logout).not.toHaveBeenCalled();

  const dialog = screen.getByRole("dialog", { name: /log out/i });
  expect(within(dialog).getByText(/are you sure you want to log out/i)).toBeInTheDocument();

  fireEvent.click(within(dialog).getByRole("button", { name: /^log ?out$/i }));

  expect(logout).toHaveBeenCalledTimes(1);
});

test("cancelling the log out confirmation does not call logout", () => {
  const logout = jest.fn();
  renderLayout({ id: 1, role: "user", username: "officer1", station_id: 1 }, { logout });

  fireEvent.click(screen.getByRole("button", { name: /^log ?out$/i }));
  const dialog = screen.getByRole("dialog", { name: /log out/i });
  fireEvent.click(within(dialog).getByRole("button", { name: /cancel/i }));

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(logout).not.toHaveBeenCalled();
});

test("renders the page title and children", () => {
  renderLayout({ id: 1, role: "user", username: "officer1", station_id: 1 });

  expect(screen.getByRole("heading", { name: "Test Page" })).toBeInTheDocument();
  expect(screen.getByText("page content")).toBeInTheDocument();
});
