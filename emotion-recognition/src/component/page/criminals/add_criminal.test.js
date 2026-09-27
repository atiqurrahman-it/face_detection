import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { ThemeContext } from "../../../context/ThemeContext";
import AddCriminal from "./add_criminal";

function renderWithAuth(user, { initialEntry = "/station/criminals/new" } = {}) {
  return render(
    <AuthContext.Provider value={{ user, token: "abc123", loading: false, logout: jest.fn() }}>
      <ThemeContext.Provider value={{ theme: "light", toggleTheme: jest.fn() }}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/station/criminals/new" element={<AddCriminal />} />
            <Route path="/admin/criminals/new" element={<AddCriminal />} />
            <Route path="/station/criminals" element={<div>Criminal Search Page</div>} />
            <Route path="/admin/criminals" element={<div>Criminal Search Page</div>} />
            <Route path="/admin/stations/:stationId" element={<div>Station Detail Page</div>} />
          </Routes>
        </MemoryRouter>
      </ThemeContext.Provider>
    </AuthContext.Provider>
  );
}

function mockCriminalsApi({ stations = [], stationById = {}, createResult = null } = {}) {
  const requests = [];

  global.fetch.mockImplementation(async (url, options = {}) => {
    const method = options.method || "GET";
    const parsed = new URL(url, "http://localhost");
    requests.push({ url, method, body: options.body });

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

    const singleStationMatch = parsed.pathname.match(/^\/stations\/(\d+)$/);
    if (singleStationMatch) {
      const station = stationById[singleStationMatch[1]];
      if (!station) return { ok: false, json: async () => ({ detail: "Station not found" }) };
      return { ok: true, json: async () => station };
    }

    if (method === "POST" && parsed.pathname === "/criminals") {
      if (createResult && createResult.ok === false) {
        return { ok: false, json: async () => ({ detail: createResult.detail }) };
      }
      const payload = JSON.parse(options.body.get("payload"));
      return { ok: true, json: async () => ({ id: 1, criminal_code: "CR-000001", ...payload, photos: [] }) };
    }

    throw new Error(`Unhandled request: ${method} ${url}`);
  });

  return requests;
}

function pngFile(name = "front.jpg") {
  return new File(["fake-bytes"], name, { type: "image/jpeg" });
}

beforeEach(() => {
  global.fetch = jest.fn();
});

test("renders the sectioned form inside AdminLayout", async () => {
  mockCriminalsApi({});

  renderWithAuth({ role: "admin", username: "officer1", station_id: 1 });

  expect(screen.getByRole("heading", { name: "Add Criminal" })).toBeInTheDocument();
  expect(screen.getByText("This criminal will be added under your station.")).toBeInTheDocument();
  expect(screen.queryByLabelText("Station")).not.toBeInTheDocument();
});

test("super admin picks a station via cascading division and district selects", async () => {
  mockCriminalsApi({
    stations: [
      { id: 1, name: "Dhanmondi Thana", division: "Dhaka", district: "Dhaka", code: "DHK-01" },
      { id: 2, name: "Kotwali Thana", division: "Chattogram", district: "Chattogram", code: "CTG-01" },
    ],
  });

  renderWithAuth({ role: "super_admin", username: "root", station_id: null });

  expect(await screen.findByLabelText("Division")).toBeInTheDocument();
  const stationField = screen.getByLabelText("Station");
  expect(stationField).toBeDisabled();

  fireEvent.click(screen.getByLabelText("Division"));
  fireEvent.mouseDown(screen.getByRole("option", { name: "Chattogram" }));
  fireEvent.click(screen.getByLabelText("District"));
  fireEvent.mouseDown(screen.getByRole("option", { name: "Chattogram" }));

  expect(stationField).not.toBeDisabled();
  fireEvent.click(stationField);
  expect(screen.getByRole("option", { name: "Kotwali Thana (CTG-01)" })).toBeInTheDocument();
  expect(screen.queryByRole("option", { name: "Dhanmondi Thana (DHK-01)" })).not.toBeInTheDocument();
});

test("blocks submission without a front photo", async () => {
  mockCriminalsApi({});

  renderWithAuth({ role: "admin", username: "officer1", station_id: 1 });

  fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "John Doe" } });
  fireEvent.change(screen.getByLabelText("Gender"), { target: { value: "Male" } });
  fireEvent.change(screen.getByLabelText("Crime type"), { target: { value: "Theft" } });
  fireEvent.change(screen.getByLabelText("Status"), { target: { value: "Wanted" } });
  fireEvent.click(screen.getByRole("button", { name: /add criminal/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent(/front photo is required/i);
  expect(global.fetch).not.toHaveBeenCalled();
});

test("submits a multipart request with the criminal payload and photo, then navigates to the search page", async () => {
  const requests = mockCriminalsApi({});

  renderWithAuth({ role: "admin", username: "officer1", station_id: 7 });

  fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "John Doe" } });
  fireEvent.change(screen.getByLabelText("Gender"), { target: { value: "Male" } });
  fireEvent.change(screen.getByLabelText("Crime type"), { target: { value: "Theft" } });
  fireEvent.change(screen.getByLabelText("Status"), { target: { value: "Wanted" } });
  fireEvent.change(screen.getByLabelText("Front photo (required)"), { target: { files: [pngFile()] } });
  fireEvent.click(screen.getByRole("button", { name: /add criminal/i }));

  expect(await screen.findByText("Criminal Search Page")).toBeInTheDocument();

  const createRequest = requests.find((r) => r.method === "POST");
  const payload = JSON.parse(createRequest.body.get("payload"));
  expect(payload).toMatchObject({ full_name: "John Doe", gender: "Male", crime_type: "Theft", status: "Wanted", station_id: 7 });
  expect(createRequest.body.get("front_photo")).toBeTruthy();
});

test("skips division/district/station pickers and auto-assigns the station from ?station_id=, then navigates back to it", async () => {
  const requests = mockCriminalsApi({
    stationById: { 5: { id: 5, name: "Gulshan Thana", division: "Dhaka", district: "Dhaka", thana: "Gulshan", code: "DHK-GUL-01" } },
  });

  renderWithAuth(
    { role: "super_admin", username: "root", station_id: null },
    { initialEntry: "/admin/criminals/new?station_id=5" }
  );

  expect(await screen.findByText(/Gulshan Thana \(DHK-GUL-01\)/)).toBeInTheDocument();
  expect(screen.queryByLabelText("Division")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("District")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Station")).not.toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Jane Doe" } });
  fireEvent.change(screen.getByLabelText("Gender"), { target: { value: "Female" } });
  fireEvent.change(screen.getByLabelText("Crime type"), { target: { value: "Fraud" } });
  fireEvent.change(screen.getByLabelText("Status"), { target: { value: "Wanted" } });
  fireEvent.change(screen.getByLabelText("Front photo (required)"), { target: { files: [pngFile()] } });
  fireEvent.click(screen.getByRole("button", { name: /add criminal/i }));

  expect(await screen.findByText("Station Detail Page")).toBeInTheDocument();

  const createRequest = requests.find((r) => r.method === "POST");
  const payload = JSON.parse(createRequest.body.get("payload"));
  expect(payload.station_id).toBe(5);
});

test("shows an error message when the backend rejects the submission", async () => {
  mockCriminalsApi({ createResult: { ok: false, detail: "Station not found" } });

  renderWithAuth({ role: "admin", username: "officer1", station_id: 1 });

  fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "John Doe" } });
  fireEvent.change(screen.getByLabelText("Gender"), { target: { value: "Male" } });
  fireEvent.change(screen.getByLabelText("Crime type"), { target: { value: "Theft" } });
  fireEvent.change(screen.getByLabelText("Status"), { target: { value: "Wanted" } });
  fireEvent.change(screen.getByLabelText("Front photo (required)"), { target: { files: [pngFile()] } });
  fireEvent.click(screen.getByRole("button", { name: /add criminal/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Station not found");
});
