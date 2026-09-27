import { render, screen, within } from "@testing-library/react";
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

const emptyStats = {
  total_stations: 0,
  total_criminals: 0,
  by_division: [],
  criminal_trend: [{ period: "2026-09", count: 0 }],
};

beforeEach(() => {
  global.fetch = jest.fn();
});

test("renders inside AdminLayout with its sidebar navigation", async () => {
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => emptyStats });

  renderWithAuth(<SuperAdminDashboard />);

  expect(screen.getByRole("heading", { name: "Super Admin Dashboard" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /criminal search/i })).toBeInTheDocument();
});

test("shows the station and criminal totals from the API", async () => {
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      total_stations: 2,
      total_criminals: 5,
      by_division: [{ division: "Dhaka", stations: 2, criminals: 5 }],
      criminal_trend: [{ period: "2026-09", count: 5 }],
    }),
  });

  renderWithAuth(<SuperAdminDashboard />);

  const stationsCard = (await screen.findByText("Total Stations")).parentElement;
  expect(within(stationsCard).getByText("2")).toBeInTheDocument();

  const criminalsCard = screen.getByText("Total Criminals").parentElement;
  expect(within(criminalsCard).getByText("5")).toBeInTheDocument();
});

test("shows division-wise station and criminal cards", async () => {
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      total_stations: 3,
      total_criminals: 8,
      by_division: [
        { division: "Dhaka", stations: 2, criminals: 5 },
        { division: "Chattogram", stations: 1, criminals: 3 },
      ],
      criminal_trend: [{ period: "2026-09", count: 8 }],
    }),
  });

  renderWithAuth(<SuperAdminDashboard />);

  const dhakaCard = (await screen.findByRole("heading", { name: "Dhaka", level: 3 })).closest("div.rounded-2xl");
  expect(within(dhakaCard).getByText("Stations")).toBeInTheDocument();
  expect(within(dhakaCard).getByText("2")).toBeInTheDocument();
  expect(within(dhakaCard).getByText("Criminals")).toBeInTheDocument();
  expect(within(dhakaCard).getByText("5")).toBeInTheDocument();

  const ctgCard = screen.getByRole("heading", { name: "Chattogram", level: 3 }).closest("div.rounded-2xl");
  expect(within(ctgCard).getByText("3")).toBeInTheDocument();
});

test("shows every division, defaulting divisions with no stations to zero", async () => {
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      total_stations: 1,
      total_criminals: 2,
      by_division: [{ division: "Dhaka", stations: 1, criminals: 2 }],
      criminal_trend: [{ period: "2026-09", count: 2 }],
    }),
  });

  renderWithAuth(<SuperAdminDashboard />);

  const sylhetCard = (await screen.findByRole("heading", { name: "Sylhet", level: 3 })).closest("div.rounded-2xl");
  expect(within(sylhetCard).getAllByText("0")).toHaveLength(2);

  expect(screen.getByRole("heading", { name: "Mymensingh", level: 3 })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Rangpur", level: 3 })).toBeInTheDocument();
});

test("shows a fallback message when there are no stations yet", async () => {
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => emptyStats });

  renderWithAuth(<SuperAdminDashboard />);

  expect(await screen.findByText(/no stations yet/i)).toBeInTheDocument();
});

test("sidebar links to the Create Station page instead of an inline form", async () => {
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => emptyStats });

  renderWithAuth(<SuperAdminDashboard />);

  expect(await screen.findByRole("link", { name: /create station/i })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /create station/i })).not.toBeInTheDocument();
});
