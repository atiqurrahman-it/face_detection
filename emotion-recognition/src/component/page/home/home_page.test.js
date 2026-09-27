import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { ThemeContext } from "../../../context/ThemeContext";
import HomePage from "./home_page";

jest.mock("../../backgorund/backgorun", () => () => null);

function renderHomePage(user = null) {
  return render(
    <AuthContext.Provider value={{ user, token: null, loading: false, logout: jest.fn() }}>
      <ThemeContext.Provider value={{ theme: "light", toggleTheme: jest.fn() }}>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/admin" element={<div>admin-dashboard</div>} />
            <Route path="/station" element={<div>station-dashboard</div>} />
          </Routes>
        </MemoryRouter>
      </ThemeContext.Provider>
    </AuthContext.Provider>
  );
}

test("renders the CrimTrace headline for a signed-out visitor", () => {
  renderHomePage();
  expect(screen.getByRole("heading", { level: 1, name: /CrimTrace/ })).toBeInTheDocument();
});

test("links the primary call to action to sign in", () => {
  renderHomePage();
  const link = screen.getByRole("link", { name: /sign in to your station/i });
  expect(link).toHaveAttribute("href", "/login");
});

test("does not link to the old public detection demo routes", () => {
  renderHomePage();
  expect(screen.queryByRole("link", { name: /try live detection/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /upload an image/i })).not.toBeInTheDocument();
});

test("redirects a signed-in station user to their dashboard instead of the marketing page", () => {
  renderHomePage({ id: 1, role: "user", username: "officer1", station_id: 1 });
  expect(screen.getByText("station-dashboard")).toBeInTheDocument();
});

test("redirects a signed-in super admin to the admin dashboard", () => {
  renderHomePage({ id: 2, role: "super_admin", username: "root", station_id: null });
  expect(screen.getByText("admin-dashboard")).toBeInTheDocument();
});
