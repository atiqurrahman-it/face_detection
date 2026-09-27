import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { ThemeContext } from "../../../context/ThemeContext";
import CreateStation from "./create_station";

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

/**
 * Fakes the `/stations` API: GET applies the same query params the backend
 * supports (page, limit, division, district, thana, name, code) and returns
 * the { success, data, pagination } envelope; POST appends a station (or
 * rejects a duplicate code), mirroring the real endpoint's contract.
 */
function mockStationsApi(initialStations) {
  const stations = [...initialStations];
  let nextId = stations.reduce((max, s) => Math.max(max, s.id), 0) + 1;

  global.fetch.mockImplementation(async (url, options = {}) => {
    const method = options.method || "GET";
    const parsed = new URL(url, "http://localhost");

    if (method === "POST" && parsed.pathname === "/stations") {
      const body = JSON.parse(options.body);
      if (stations.some((s) => s.code === body.code)) {
        return { ok: false, json: async () => ({ detail: "Station code already exists" }) };
      }
      const created = {
        id: nextId++,
        name: body.name,
        division: body.division,
        district: body.district,
        thana: body.thana,
        code: body.code,
        criminal_count: 0,
      };
      stations.push(created);
      return { ok: true, json: async () => created };
    }

    const query = parsed.searchParams;
    const page = Number(query.get("page") || 1);
    const limit = Number(query.get("limit") || 20);
    const division = query.get("division");
    const district = query.get("district");
    const thana = query.get("thana");
    const name = query.get("name");
    const code = query.get("code");

    let filtered = stations;
    if (division) filtered = filtered.filter((s) => s.division === division);
    if (district) filtered = filtered.filter((s) => s.district === district);
    if (thana) filtered = filtered.filter((s) => s.thana === thana);
    if (name) filtered = filtered.filter((s) => s.name.toLowerCase().includes(name.toLowerCase()));
    if (code) filtered = filtered.filter((s) => s.code.toLowerCase().includes(code.toLowerCase()));

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const data = filtered.slice((page - 1) * limit, page * limit);

    return { ok: true, json: async () => ({ success: true, data, pagination: { total, page, limit, totalPages } }) };
  });
}

beforeEach(() => {
  global.fetch = jest.fn();
});

test("renders inside AdminLayout with its own page title", async () => {
  mockStationsApi([]);

  renderWithAuth(<CreateStation />);

  expect(screen.getByRole("heading", { name: "Create Station" })).toBeInTheDocument();
  await waitFor(() => expect(global.fetch).toHaveBeenCalled());
});

test("shows the total station count", async () => {
  mockStationsApi([
    { id: 1, name: "Dhanmondi Thana", division: "Dhaka", district: "Dhaka", thana: "Dhanmondi", code: "DHK-01", criminal_count: 0 },
    { id: 2, name: "Gulshan Thana", division: "Dhaka", district: "Dhaka", thana: "Gulshan", code: "DHK-02", criminal_count: 0 },
  ]);

  renderWithAuth(<CreateStation />);

  expect(await screen.findByText("2")).toBeInTheDocument();
});

test("lists existing stations on load", async () => {
  mockStationsApi([
    { id: 1, name: "Dhanmondi Thana", division: "Dhaka", district: "Dhaka", thana: "Dhanmondi", code: "DHK-01", criminal_count: 3 },
  ]);

  renderWithAuth(<CreateStation />);

  expect(await screen.findByText(/Dhanmondi Thana/)).toBeInTheDocument();
  expect(screen.getByText("3 criminals")).toBeInTheDocument();
});

test("filters the station list by division, district and thana", async () => {
  mockStationsApi([
    { id: 1, name: "Dhanmondi Thana", division: "Dhaka", district: "Dhaka", thana: "Dhanmondi", code: "DHK-01", criminal_count: 0 },
    { id: 2, name: "Kotwali Thana", division: "Chattogram", district: "Chattogram", thana: "Kotwali", code: "CTG-01", criminal_count: 0 },
  ]);

  renderWithAuth(<CreateStation />);
  await screen.findByText(/Dhanmondi Thana/);

  fireEvent.click(screen.getByLabelText("Division"));
  fireEvent.mouseDown(screen.getByRole("option", { name: "Chattogram" }));

  await waitFor(() => expect(screen.queryByText(/Dhanmondi Thana/)).not.toBeInTheDocument());
  expect(screen.getByText(/Kotwali Thana/)).toBeInTheDocument();
});

test("paginates the station list once it exceeds the page size", async () => {
  const stations = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    name: `Station ${i + 1}`,
    division: "Dhaka",
    district: "Dhaka",
    thana: `Thana ${i + 1}`,
    code: `DHK-${i + 1}`,
  }));
  mockStationsApi(stations);

  renderWithAuth(<CreateStation />);
  await screen.findByText(/Station 1\b/);

  expect(screen.getByText(/Station 10\b/)).toBeInTheDocument();
  expect(screen.queryByText(/Station 11\b/)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /next page/i }));

  expect(await screen.findByText(/Station 11\b/)).toBeInTheDocument();
  expect(screen.queryByText(/Station 1\b/)).not.toBeInTheDocument();
});

test("only offers per-page options that make sense for the current result count", async () => {
  mockStationsApi([
    { id: 1, name: "Dhanmondi Thana", division: "Dhaka", district: "Dhaka", thana: "Dhanmondi", code: "DHK-01", criminal_count: 0 },
    { id: 2, name: "Gulshan Thana", division: "Dhaka", district: "Dhaka", thana: "Gulshan", code: "DHK-02", criminal_count: 0 },
  ]);

  renderWithAuth(<CreateStation />);
  await screen.findByText(/Dhanmondi Thana/);

  const perPageSelect = screen.getByRole("combobox", { name: /per page/i });
  const optionLabels = within(perPageSelect)
    .getAllByRole("option")
    .map((option) => option.textContent);

  // Only 2 stations exist, so a page size of "5" already fits everyone —
  // "10", "20" and "50" would be pointless choices.
  expect(optionLabels).toEqual(["5"]);
});

test("the create-station form is inside a modal, hidden until opened", async () => {
  mockStationsApi([]);

  renderWithAuth(<CreateStation />);
  await waitFor(() => expect(global.fetch).toHaveBeenCalled());

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /\+ create station/i }));

  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByLabelText("Thana")).toBeInTheDocument();
  expect(within(dialog).getByLabelText("Station name")).toBeInTheDocument();
});

test("submitting the modal form posts and appends the new station to the list", async () => {
  mockStationsApi([]);

  renderWithAuth(<CreateStation />);
  await waitFor(() => expect(global.fetch).toHaveBeenCalled());

  fireEvent.click(screen.getByRole("button", { name: /\+ create station/i }));
  const dialog = screen.getByRole("dialog");

  fireEvent.click(within(dialog).getByLabelText("Division"));
  fireEvent.mouseDown(within(dialog).getByRole("option", { name: "Dhaka" }));
  fireEvent.click(within(dialog).getByLabelText("District"));
  fireEvent.mouseDown(within(dialog).getByRole("option", { name: "Dhaka" }));
  fireEvent.click(within(dialog).getByLabelText("Thana"));
  fireEvent.mouseDown(within(dialog).getByRole("option", { name: "Gulshan" }));
  fireEvent.change(within(dialog).getByLabelText("Station name"), { target: { value: "Gulshan Thana" } });
  fireEvent.change(within(dialog).getByLabelText(/station code/i), { target: { value: "DHK-02" } });
  fireEvent.change(within(dialog).getByLabelText(/admin name/i), { target: { value: "Admin Two" } });
  fireEvent.change(within(dialog).getByLabelText(/admin username/i), { target: { value: "dhk02admin" } });
  fireEvent.change(within(dialog).getByLabelText(/admin password/i), { target: { value: "adminpass2" } });
  fireEvent.click(within(dialog).getByRole("button", { name: /^create station$/i }));

  expect(await screen.findByText(/Gulshan Thana/)).toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("shows an error message inside the modal when station creation fails", async () => {
  mockStationsApi([{ id: 1, name: "Existing Thana", division: "Dhaka", district: "Dhaka", thana: "Existing", code: "DHK-02", criminal_count: 0 }]);

  renderWithAuth(<CreateStation />);
  await waitFor(() => expect(global.fetch).toHaveBeenCalled());

  fireEvent.click(screen.getByRole("button", { name: /\+ create station/i }));
  const dialog = screen.getByRole("dialog");

  fireEvent.change(within(dialog).getByLabelText("Station name"), { target: { value: "Gulshan Thana" } });
  fireEvent.change(within(dialog).getByLabelText(/station code/i), { target: { value: "DHK-02" } });
  fireEvent.click(within(dialog).getByRole("button", { name: /^create station$/i }));

  expect(await within(dialog).findByRole("alert")).toBeInTheDocument();
});
