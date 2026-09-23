import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import StationDashboard from "./station_dashboard";

function renderWithAuth(user, logout = jest.fn()) {
  return render(
    <AuthContext.Provider value={{ user, token: "abc123", loading: false, logout }}>
      <MemoryRouter>
        <StationDashboard />
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

test("clicking log out calls logout", () => {
  const logout = jest.fn();
  renderWithAuth({ role: "user", username: "officer1" }, logout);

  fireEvent.click(screen.getByRole("button", { name: /log ?out/i }));

  expect(logout).toHaveBeenCalledTimes(1);
});
