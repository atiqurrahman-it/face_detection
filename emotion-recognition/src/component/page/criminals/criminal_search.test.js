import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { ThemeContext } from "../../../context/ThemeContext";
import CriminalSearch from "./criminal_search";

function renderWithAuth(ui, user) {
  return render(
    <AuthContext.Provider value={{ user, token: "abc123", loading: false, logout: jest.fn() }}>
      <ThemeContext.Provider value={{ theme: "light", toggleTheme: jest.fn() }}>
        <MemoryRouter>{ui}</MemoryRouter>
      </ThemeContext.Provider>
    </AuthContext.Provider>
  );
}

/**
 * Fakes `/criminals` (list + delete) and `/stations` (for the super-admin
 * station filter), mirroring the real backend's query params and shapes.
 */
function mockCriminalsApi({ criminals = [], stations = [] } = {}) {
  const items = [...criminals];

  global.fetch.mockImplementation(async (url, options = {}) => {
    const method = options.method || "GET";
    const parsed = new URL(url, "http://localhost");

    if (parsed.pathname === "/stations") {
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: stations,
          pagination: { total: stations.length, page: 1, limit: 100, totalPages: 1 },
        }),
      };
    }

    if (method === "DELETE" && parsed.pathname.startsWith("/criminals/")) {
      const id = Number(parsed.pathname.split("/").pop());
      const index = items.findIndex((c) => c.id === id);
      if (index !== -1) items.splice(index, 1);
      return { ok: true, json: async () => null };
    }

    const query = parsed.searchParams;
    const page = Number(query.get("page") || 1);
    const pageSize = Number(query.get("page_size") || 20);
    let filtered = items;
    const q = query.get("q");
    const status = query.get("status");
    const crimeType = query.get("crime_type");
    const stationId = query.get("station_id");
    if (q) filtered = filtered.filter((c) => c.full_name.toLowerCase().includes(q.toLowerCase()));
    if (status) filtered = filtered.filter((c) => c.status === status);
    if (crimeType) filtered = filtered.filter((c) => c.crime_type.toLowerCase().includes(crimeType.toLowerCase()));
    if (stationId) filtered = filtered.filter((c) => String(c.station.id) === stationId);

    const total = filtered.length;
    const data = filtered.slice((page - 1) * pageSize, page * pageSize);
    return { ok: true, json: async () => ({ items: data, total, page, page_size: pageSize }) };
  });

  return items;
}

function criminal(overrides) {
  return {
    id: 1,
    criminal_code: "CR-000001",
    full_name: "John Doe",
    crime_type: "Theft",
    status: "Wanted",
    station: { id: 1, name: "Dhanmondi Thana", code: "DHK-01" },
    photos: [],
    ...overrides,
  };
}

beforeEach(() => {
  global.fetch = jest.fn();
});

test("renders inside AdminLayout with an Add Criminal link", async () => {
  mockCriminalsApi({});

  renderWithAuth(<CriminalSearch />, { role: "user", username: "officer1", station_id: 1 });

  expect(screen.getByRole("heading", { name: "Criminal Search" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /^\+ add criminal$/i })).toHaveAttribute("href", "/criminals/new");
  await waitFor(() => expect(global.fetch).toHaveBeenCalled());
});

test("lists criminals with their status", async () => {
  mockCriminalsApi({ criminals: [criminal({ full_name: "Jane Roe", status: "Arrested" })] });

  renderWithAuth(<CriminalSearch />, { role: "user", username: "officer1", station_id: 1 });

  expect(await screen.findByText("Jane Roe")).toBeInTheDocument();
  expect(screen.getByText("Arrested", { selector: "span" })).toBeInTheDocument();
});

test("station users only see their own station's criminals, with no station filter shown", async () => {
  mockCriminalsApi({
    criminals: [
      criminal({ id: 1, full_name: "Own Station Suspect", station: { id: 1, name: "Dhanmondi Thana", code: "DHK-01" } }),
      criminal({ id: 2, full_name: "Other Station Suspect", station: { id: 2, name: "Gulshan Thana", code: "DHK-02" } }),
    ],
  });

  renderWithAuth(<CriminalSearch />, { role: "user", username: "officer1", station_id: 1 });

  expect(await screen.findByText("Own Station Suspect")).toBeInTheDocument();
  expect(screen.queryByText("Other Station Suspect")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Station")).not.toBeInTheDocument();
});

test("super admin can filter by station", async () => {
  mockCriminalsApi({
    criminals: [
      criminal({ id: 1, full_name: "Dhaka Suspect", station: { id: 1, name: "Dhanmondi Thana", code: "DHK-01" } }),
      criminal({ id: 2, full_name: "Gulshan Suspect", station: { id: 2, name: "Gulshan Thana", code: "DHK-02" } }),
    ],
    stations: [
      { id: 1, name: "Dhanmondi Thana", division: "Dhaka", district: "Dhaka", code: "DHK-01" },
      { id: 2, name: "Gulshan Thana", division: "Dhaka", district: "Dhaka", code: "DHK-02" },
    ],
  });

  renderWithAuth(<CriminalSearch />, { role: "super_admin", username: "root", station_id: null });
  await screen.findByText("Dhaka Suspect");

  const stationField = screen.getByLabelText("Station");
  expect(stationField).toBeDisabled();

  fireEvent.click(screen.getByLabelText("Division"));
  fireEvent.mouseDown(screen.getByRole("option", { name: "Dhaka" }));
  fireEvent.click(screen.getByLabelText("District"));
  fireEvent.mouseDown(screen.getByRole("option", { name: "Dhaka" }));

  fireEvent.click(stationField);
  fireEvent.mouseDown(screen.getByRole("option", { name: "Gulshan Thana (DHK-02)" }));

  await waitFor(() => expect(screen.queryByText("Dhaka Suspect")).not.toBeInTheDocument());
  expect(screen.getByText("Gulshan Suspect")).toBeInTheDocument();
});

test("admin can delete a criminal", async () => {
  mockCriminalsApi({ criminals: [criminal({ full_name: "Jane Roe" })] });

  renderWithAuth(<CriminalSearch />, { role: "admin", username: "dhk01admin", station_id: 1 });
  await screen.findByText("Jane Roe");

  fireEvent.click(screen.getByRole("button", { name: /delete jane roe/i }));

  await waitFor(() => expect(screen.queryByText("Jane Roe")).not.toBeInTheDocument());
});

test("a station user cannot delete a criminal", async () => {
  mockCriminalsApi({ criminals: [criminal({ full_name: "Jane Roe" })] });

  renderWithAuth(<CriminalSearch />, { role: "user", username: "officer1", station_id: 1 });
  await screen.findByText("Jane Roe");

  expect(screen.queryByRole("button", { name: /delete jane roe/i })).not.toBeInTheDocument();
});
