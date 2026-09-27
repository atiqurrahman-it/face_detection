import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { ThemeContext } from "../../../context/ThemeContext";
import StationDetail from "./station_detail";

function renderWithAuth(user) {
  return render(
    <AuthContext.Provider value={{ user, token: "abc123", loading: false, logout: jest.fn() }}>
      <ThemeContext.Provider value={{ theme: "light", toggleTheme: jest.fn() }}>
        <MemoryRouter initialEntries={["/admin/stations/5"]}>
          <Routes>
            <Route path="/admin/stations/:stationId" element={<StationDetail />} />
            <Route path="/admin/criminals/new" element={<div>Add Criminal Page</div>} />
          </Routes>
        </MemoryRouter>
      </ThemeContext.Provider>
    </AuthContext.Provider>
  );
}

const station = {
  id: 5,
  name: "Gulshan Thana",
  division: "Dhaka",
  district: "Dhaka",
  thana: "Gulshan",
  code: "DHK-GUL-01",
  criminal_count: 1,
};

function mockStationApi({ criminals = [], users = [], createUserResult = null } = {}) {
  const requests = [];

  global.fetch.mockImplementation(async (url, options = {}) => {
    const method = options.method || "GET";
    const parsed = new URL(url, "http://localhost");
    requests.push({ url, method, body: options.body });

    if (method === "GET" && parsed.pathname === "/stations/5") {
      return { ok: true, json: async () => station };
    }
    if (method === "GET" && parsed.pathname === "/criminals") {
      return { ok: true, json: async () => ({ items: criminals, total: criminals.length, page: 1, page_size: 20 }) };
    }
    if (method === "GET" && parsed.pathname === "/stations/5/users") {
      return { ok: true, json: async () => users };
    }
    if (method === "POST" && parsed.pathname === "/stations/5/users") {
      if (createUserResult && createUserResult.ok === false) {
        return { ok: false, json: async () => ({ detail: createUserResult.detail }) };
      }
      const payload = JSON.parse(options.body);
      return { ok: true, json: async () => ({ id: 99, is_active: true, station_id: 5, ...payload }) };
    }
    if (method === "PATCH" && parsed.pathname.match(/^\/users\/\d+\/deactivate$/)) {
      return { ok: true, json: async () => ({ ...users[0], is_active: false }) };
    }
    if (method === "PATCH" && parsed.pathname.match(/^\/users\/\d+\/activate$/)) {
      return { ok: true, json: async () => ({ ...users[0], is_active: true }) };
    }

    throw new Error(`Unhandled request: ${method} ${url}`);
  });

  return requests;
}

beforeEach(() => {
  global.fetch = jest.fn();
});

test("shows the station's info, criminals and users", async () => {
  mockStationApi({
    criminals: [
      {
        id: 1,
        full_name: "John Doe",
        criminal_code: "CR-000001",
        crime_type: "Theft",
        status: "Wanted",
        photos: [],
      },
    ],
    users: [{ id: 2, name: "Station Admin", username: "gulshan_admin", role: "admin", is_active: true }],
  });

  renderWithAuth({ role: "super_admin", username: "root", station_id: null });

  expect(await screen.findByRole("heading", { name: "Gulshan Thana" })).toBeInTheDocument();
  expect(screen.getAllByText("Dhaka")).toHaveLength(2);
  expect(screen.getByText("Gulshan")).toBeInTheDocument();
  expect(screen.getByText("DHK-GUL-01")).toBeInTheDocument();

  expect(await screen.findByText("John Doe")).toBeInTheDocument();
  expect(screen.getByText("CR-000001")).toBeInTheDocument();

  expect(await screen.findByText("gulshan_admin")).toBeInTheDocument();
  expect(screen.getByText("Station Admin")).toBeInTheDocument();
});

test("Add Criminal opens a modal with the form locked to this station, skipping location pickers", async () => {
  mockStationApi({});

  renderWithAuth({ role: "super_admin", username: "root", station_id: null });

  fireEvent.click(await screen.findByRole("button", { name: /\+ add criminal/i }));
  const dialog = screen.getByRole("dialog", { name: "Add Criminal" });

  expect(await within(dialog).findByText(/Gulshan Thana \(DHK-GUL-01\)/)).toBeInTheDocument();
  expect(within(dialog).queryByLabelText("Division")).not.toBeInTheDocument();
  expect(within(dialog).queryByLabelText("Station")).not.toBeInTheDocument();
});

test("adding a user posts to this station and refreshes the list", async () => {
  const requests = mockStationApi({ users: [] });

  renderWithAuth({ role: "super_admin", username: "root", station_id: null });

  fireEvent.click(await screen.findByRole("button", { name: /\+ add user/i }));
  const dialog = screen.getByRole("dialog");

  fireEvent.change(within(dialog).getByLabelText("Name"), { target: { value: "New Officer" } });
  fireEvent.change(within(dialog).getByLabelText("Username"), { target: { value: "new_officer" } });
  fireEvent.change(within(dialog).getByLabelText("Password"), { target: { value: "officerpass1" } });
  fireEvent.click(within(dialog).getByRole("button", { name: /^add user$/i }));

  await waitFor(() => expect(requests.some((r) => r.method === "POST")).toBe(true));

  const postRequest = requests.find((r) => r.method === "POST");
  expect(postRequest).toBeTruthy();
  expect(JSON.parse(postRequest.body)).toMatchObject({
    name: "New Officer",
    username: "new_officer",
    password: "officerpass1",
    role: "user",
  });
});

test("deactivating a user requires confirmation before calling the endpoint", async () => {
  const requests = mockStationApi({
    users: [{ id: 2, name: "Station Admin", username: "gulshan_admin", role: "admin", is_active: true }],
  });

  renderWithAuth({ role: "super_admin", username: "root", station_id: null });

  fireEvent.click(await screen.findByRole("button", { name: /^deactivate$/i }));

  const dialog = await screen.findByRole("dialog", { name: /deactivate user/i });
  expect(within(dialog).getByText(/Station Admin/)).toBeInTheDocument();
  expect(requests.some((r) => r.method === "PATCH")).toBe(false);

  fireEvent.click(within(dialog).getByRole("button", { name: /^deactivate$/i }));

  await waitFor(() => expect(requests.some((r) => r.method === "PATCH")).toBe(true));
  const patchRequest = requests.find((r) => r.method === "PATCH");
  expect(patchRequest.url).toContain("/users/2/deactivate");
});

test("cancelling the confirmation does not call the endpoint", async () => {
  const requests = mockStationApi({
    users: [{ id: 2, name: "Station Admin", username: "gulshan_admin", role: "admin", is_active: true }],
  });

  renderWithAuth({ role: "super_admin", username: "root", station_id: null });

  fireEvent.click(await screen.findByRole("button", { name: /^deactivate$/i }));
  const dialog = await screen.findByRole("dialog", { name: /deactivate user/i });
  fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

  expect(screen.queryByRole("dialog", { name: /deactivate user/i })).not.toBeInTheDocument();
  expect(requests.some((r) => r.method === "PATCH")).toBe(false);
});

test("an inactive user shows an Activate action that calls the activate endpoint after confirming", async () => {
  const requests = mockStationApi({
    users: [{ id: 2, name: "Station Admin", username: "gulshan_admin", role: "admin", is_active: false }],
  });

  renderWithAuth({ role: "super_admin", username: "root", station_id: null });

  fireEvent.click(await screen.findByRole("button", { name: /^activate$/i }));
  const dialog = await screen.findByRole("dialog", { name: /activate user/i });
  fireEvent.click(within(dialog).getByRole("button", { name: /^activate$/i }));

  await waitFor(() => expect(requests.some((r) => r.method === "PATCH")).toBe(true));
  const patchRequest = requests.find((r) => r.method === "PATCH");
  expect(patchRequest.url).toContain("/users/2/activate");
});

test("the users list is paginated", async () => {
  const manyUsers = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    name: `Officer ${i + 1}`,
    username: `officer${i + 1}`,
    role: "user",
    is_active: true,
  }));
  mockStationApi({ users: manyUsers });

  renderWithAuth({ role: "super_admin", username: "root", station_id: null });

  expect(await screen.findByText("Officer 1")).toBeInTheDocument();
  expect(screen.getByText("Officer 10")).toBeInTheDocument();
  expect(screen.queryByText("Officer 11")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /next page/i }));

  expect(await screen.findByText("Officer 11")).toBeInTheDocument();
  expect(screen.getByText("Officer 12")).toBeInTheDocument();
  expect(screen.queryByText("Officer 1")).not.toBeInTheDocument();
});
