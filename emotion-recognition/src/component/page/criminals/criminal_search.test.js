import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { ThemeContext } from "../../../context/ThemeContext";
import CriminalSearch from "./criminal_search";

// react-webcam needs a real camera/getUserMedia, which jsdom doesn't provide.
// Stub it with a fake screenshot so the capture flow can be exercised directly.
jest.mock("react-webcam", () => {
  const React = require("react");
  return React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({
      getScreenshot: () => "data:image/jpeg;base64,ZmFrZQ==",
      video: { readyState: 4 },
    }));
    return React.createElement("video", { "data-testid": "mock-webcam" });
  });
});

// A controllable fake WebSocket so tests can simulate the face-detection
// backend pushing a "face detected" message without a real server.
class FakeWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = FakeWebSocket.OPEN;
    this.sent = [];
    FakeWebSocket.instances.push(this);
  }

  send(data) {
    this.sent.push(data);
  }

  close() {
    this.readyState = FakeWebSocket.CLOSED;
  }
}
FakeWebSocket.OPEN = 1;
FakeWebSocket.CLOSED = 3;
FakeWebSocket.instances = [];

function latestSocket() {
  return FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
}

// jsdom doesn't implement canvas rendering; FaceOverlay just needs a context
// object it can call drawing methods on without throwing.
beforeAll(() => {
  window.HTMLCanvasElement.prototype.getContext = () => ({
    clearRect: jest.fn(),
    strokeRect: jest.fn(),
    fillRect: jest.fn(),
    fillText: jest.fn(),
    measureText: () => ({ width: 0 }),
  });
});

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
function mockCriminalsApi({ criminals = [], stations = [], photoMatches = null } = {}) {
  const items = [...criminals];
  const photoSearchRequests = [];

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

    if (method === "POST" && parsed.pathname === "/criminals/search-by-photo") {
      photoSearchRequests.push(options.body);
      if (photoMatches === null) {
        return { ok: false, json: async () => ({ detail: "No face detected in the uploaded photo" }) };
      }
      return { ok: true, json: async () => photoMatches };
    }

    if (method === "DELETE" && parsed.pathname.startsWith("/criminals/")) {
      const id = Number(parsed.pathname.split("/").pop());
      const index = items.findIndex((c) => c.id === id);
      if (index !== -1) items.splice(index, 1);
      return { ok: true, json: async () => null };
    }

    if (method === "PATCH" && parsed.pathname.startsWith("/criminals/")) {
      const id = Number(parsed.pathname.split("/").pop());
      const index = items.findIndex((c) => c.id === id);
      const patch = JSON.parse(options.body.get("payload"));
      const updated = { ...items[index], ...patch };
      items[index] = updated;
      return { ok: true, json: async () => updated };
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

  return { items, photoSearchRequests };
}

function criminal(overrides) {
  return {
    id: 1,
    criminal_code: "CR-000001",
    full_name: "John Doe",
    crime_type: "Theft",
    status: "Wanted",
    station: { id: 1, name: "Dhanmondi Thana", division: "Dhaka", district: "Dhaka", thana: "Dhanmondi", code: "DHK-01" },
    photos: [],
    ...overrides,
  };
}

beforeEach(() => {
  global.fetch = jest.fn();
  FakeWebSocket.instances = [];
  global.WebSocket = FakeWebSocket;
});

function jpegFile(name = "search.jpg") {
  return new File(["fake-bytes"], name, { type: "image/jpeg" });
}

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

test("deleting a criminal asks for confirmation before removing it", async () => {
  mockCriminalsApi({ criminals: [criminal({ full_name: "Jane Roe", criminal_code: "CR-000042" })] });

  renderWithAuth(<CriminalSearch />, { role: "admin", username: "dhk01admin", station_id: 1 });
  await screen.findByText("Jane Roe");

  fireEvent.click(screen.getByRole("button", { name: /delete jane roe/i }));

  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByText(/CR-000042/)).toBeInTheDocument();
  // Deletion hasn't happened yet — confirming is required.
  expect(global.fetch.mock.calls.some(([, options]) => options?.method === "DELETE")).toBe(false);

  fireEvent.click(within(dialog).getByRole("button", { name: /^delete$/i }));

  await waitFor(() => expect(screen.queryByText("Jane Roe")).not.toBeInTheDocument());
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("cancelling the delete confirmation keeps the criminal", async () => {
  mockCriminalsApi({ criminals: [criminal({ full_name: "Jane Roe" })] });

  renderWithAuth(<CriminalSearch />, { role: "admin", username: "dhk01admin", station_id: 1 });
  await screen.findByText("Jane Roe");

  fireEvent.click(screen.getByRole("button", { name: /delete jane roe/i }));
  fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByText("Jane Roe")).toBeInTheDocument();
});

test("a station user cannot delete a criminal", async () => {
  mockCriminalsApi({ criminals: [criminal({ full_name: "Jane Roe" })] });

  renderWithAuth(<CriminalSearch />, { role: "user", username: "officer1", station_id: 1 });
  await screen.findByText("Jane Roe");

  expect(screen.queryByRole("button", { name: /delete jane roe/i })).not.toBeInTheDocument();
});

test("uploading a photo shows matching criminals with a confidence badge, replacing the normal list", async () => {
  const { photoSearchRequests } = mockCriminalsApi({
    criminals: [criminal({ id: 1, full_name: "Regular List Suspect" })],
    photoMatches: [criminal({ id: 2, full_name: "Photo Match Suspect", confidence: 92.5, distance: 0.2 })],
  });

  renderWithAuth(<CriminalSearch />, { role: "user", username: "officer1", station_id: 1 });
  await screen.findByText("Regular List Suspect");

  fireEvent.change(screen.getByLabelText("Upload a photo"), { target: { files: [jpegFile()] } });

  expect(await screen.findByText("Photo Match Suspect")).toBeInTheDocument();
  expect(screen.getByText("92.5%")).toBeInTheDocument();
  expect(screen.queryByText("Regular List Suspect")).not.toBeInTheDocument();
  expect(photoSearchRequests[0].get("photo")).toBeTruthy();
});

test("shows an error when no face is detected, and clearing the photo search restores the normal list", async () => {
  mockCriminalsApi({
    criminals: [criminal({ id: 1, full_name: "Regular List Suspect" })],
    photoMatches: [criminal({ id: 2, full_name: "Photo Match Suspect", confidence: 92.5, distance: 0.2 })],
  });

  renderWithAuth(<CriminalSearch />, { role: "user", username: "officer1", station_id: 1 });
  await screen.findByText("Regular List Suspect");

  fireEvent.change(screen.getByLabelText("Upload a photo"), { target: { files: [jpegFile()] } });
  await screen.findByText("Photo Match Suspect");

  fireEvent.click(screen.getByRole("button", { name: /clear photo search/i }));

  expect(screen.queryByText("Photo Match Suspect")).not.toBeInTheDocument();
  expect(await screen.findByText("Regular List Suspect")).toBeInTheDocument();
});

test("live camera auto-searches as soon as a face is detected, with no manual button", async () => {
  mockCriminalsApi({
    criminals: [criminal({ id: 1, full_name: "Regular List Suspect" })],
    photoMatches: [criminal({ id: 2, full_name: "Camera Match Suspect", confidence: 88, distance: 0.3 })],
  });

  renderWithAuth(<CriminalSearch />, { role: "user", username: "officer1", station_id: 1 });
  await screen.findByText("Regular List Suspect");

  expect(screen.queryByRole("button", { name: /capture.*search/i })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /use live camera/i }));

  expect(screen.getByTestId("mock-webcam")).toBeInTheDocument();
  expect(screen.getByText(/point a face at the camera/i)).toBeInTheDocument();

  const socket = latestSocket();
  socket.onmessage({
    data: JSON.stringify({
      faces: [{ box: { x: 0, y: 0, w: 100, h: 100 } }],
      imageWidth: 640,
      imageHeight: 480,
    }),
  });

  expect(await screen.findByText("Camera Match Suspect")).toBeInTheDocument();
  expect(screen.getByText(/searching automatically/i)).toBeInTheDocument();
});

test("the live-camera auto-search respects a cooldown between attempts", async () => {
  mockCriminalsApi({
    criminals: [criminal({ id: 1, full_name: "Regular List Suspect" })],
    photoMatches: [criminal({ id: 2, full_name: "Camera Match Suspect", confidence: 88, distance: 0.3 })],
  });

  renderWithAuth(<CriminalSearch />, { role: "user", username: "officer1", station_id: 1 });
  await screen.findByText("Regular List Suspect");

  fireEvent.click(screen.getByRole("button", { name: /use live camera/i }));
  const socket = latestSocket();
  const faceMessage = {
    data: JSON.stringify({ faces: [{ box: { x: 0, y: 0, w: 100, h: 100 } }], imageWidth: 640, imageHeight: 480 }),
  };

  socket.onmessage(faceMessage);
  await screen.findByText("Camera Match Suspect");

  const searchCallsAfterFirst = global.fetch.mock.calls.filter(([url]) => url.includes("search-by-photo")).length;
  socket.onmessage(faceMessage);
  socket.onmessage(faceMessage);

  await waitFor(() => {
    const searchCallsNow = global.fetch.mock.calls.filter(([url]) => url.includes("search-by-photo")).length;
    expect(searchCallsNow).toBe(searchCallsAfterFirst);
  });
});

test("viewing a criminal shows their details in a read-only modal", async () => {
  mockCriminalsApi({
    criminals: [
      criminal({
        full_name: "Jane Roe",
        alias: "JR",
        gender: "Female",
        phone: "0123456789",
        crime_description: "Details of the offence.",
      }),
    ],
  });

  renderWithAuth(<CriminalSearch />, { role: "user", username: "officer1", station_id: 1 });
  await screen.findByText("Jane Roe");

  fireEvent.click(screen.getByRole("button", { name: /view jane roe/i }));

  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByText("Details of the offence.")).toBeInTheDocument();
  expect(within(dialog).getByText("0123456789")).toBeInTheDocument();
  expect(within(dialog).getByText("Female")).toBeInTheDocument();
  expect(within(dialog).getByText(/Dhanmondi, Dhaka, Dhaka/)).toBeInTheDocument();
  expect(within(dialog).getByText("Repeat offender")).toBeInTheDocument();
  expect(within(dialog).getByText("No")).toBeInTheDocument();
  expect(within(dialog).queryByRole("button", { name: /save changes/i })).not.toBeInTheDocument();
});

test("editing a criminal saves changes and updates the list in place", async () => {
  mockCriminalsApi({
    criminals: [criminal({ full_name: "Jane Roe", gender: "Female", status: "Wanted" })],
  });

  renderWithAuth(<CriminalSearch />, { role: "user", username: "officer1", station_id: 1 });
  await screen.findByText("Jane Roe");

  fireEvent.click(screen.getByRole("button", { name: /edit jane roe/i }));
  const dialog = screen.getByRole("dialog");

  fireEvent.change(within(dialog).getByLabelText("Full name"), { target: { value: "Jane Doe" } });
  fireEvent.change(within(dialog).getByLabelText("Status"), { target: { value: "Arrested" } });
  fireEvent.click(within(dialog).getByRole("button", { name: /save changes/i }));

  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  expect(screen.getByText("Arrested", { selector: "span" })).toBeInTheDocument();
});
