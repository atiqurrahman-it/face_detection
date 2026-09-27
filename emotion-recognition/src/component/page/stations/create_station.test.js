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

beforeEach(() => {
  global.fetch = jest.fn();
});

test("renders inside AdminLayout with its own page title", async () => {
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

  renderWithAuth(<CreateStation />);

  expect(screen.getByRole("heading", { name: "Create Station" })).toBeInTheDocument();
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
});

test("shows the total station count", async () => {
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => [
      { id: 1, name: "Dhanmondi Thana", division: "Dhaka", district: "Dhaka", code: "DHK-01" },
      { id: 2, name: "Gulshan Thana", division: "Dhaka", district: "Dhaka", code: "DHK-02" },
    ],
  });

  renderWithAuth(<CreateStation />);

  expect(await screen.findByText("2")).toBeInTheDocument();
});

test("lists existing stations on load", async () => {
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => [{ id: 1, name: "Dhanmondi Thana", division: "Dhaka", district: "Dhaka", code: "DHK-01" }],
  });

  renderWithAuth(<CreateStation />);

  expect(await screen.findByText(/Dhanmondi Thana/)).toBeInTheDocument();
});

test("filters the station list by division, district and thana", async () => {
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => [
      { id: 1, name: "Dhanmondi Thana", division: "Dhaka", district: "Dhaka", code: "DHK-01" },
      { id: 2, name: "Kotwali Thana", division: "Chattogram", district: "Chattogram", code: "CTG-01" },
    ],
  });

  renderWithAuth(<CreateStation />);
  await screen.findByText(/Dhanmondi Thana/);

  fireEvent.change(screen.getByLabelText("Division"), { target: { value: "Chattogram" } });

  expect(screen.queryByText(/Dhanmondi Thana/)).not.toBeInTheDocument();
  expect(screen.getByText(/Kotwali Thana/)).toBeInTheDocument();
});

test("the create-station form is inside a modal, hidden until opened", async () => {
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

  renderWithAuth(<CreateStation />);
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /\+ create station/i }));

  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByLabelText("Thana / Station name")).toBeInTheDocument();
});

test("submitting the modal form posts and appends the new station to the list", async () => {
  global.fetch
    .mockResolvedValueOnce({ ok: true, json: async () => [] })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 2, name: "Gulshan Thana", division: "Dhaka", district: "Dhaka", code: "DHK-02" }),
    });

  renderWithAuth(<CreateStation />);
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

  fireEvent.click(screen.getByRole("button", { name: /\+ create station/i }));
  const dialog = screen.getByRole("dialog");

  fireEvent.change(within(dialog).getByLabelText("Division"), { target: { value: "Dhaka" } });
  fireEvent.change(within(dialog).getByLabelText("District"), { target: { value: "Dhaka" } });
  fireEvent.change(within(dialog).getByLabelText("Thana / Station name"), { target: { value: "Gulshan Thana" } });
  fireEvent.change(within(dialog).getByLabelText(/station code/i), { target: { value: "DHK-02" } });
  fireEvent.change(within(dialog).getByLabelText(/admin name/i), { target: { value: "Admin Two" } });
  fireEvent.change(within(dialog).getByLabelText(/admin username/i), { target: { value: "dhk02admin" } });
  fireEvent.change(within(dialog).getByLabelText(/admin password/i), { target: { value: "adminpass2" } });
  fireEvent.click(within(dialog).getByRole("button", { name: /^create station$/i }));

  expect(await screen.findByText(/Gulshan Thana/)).toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("shows an error message inside the modal when station creation fails", async () => {
  global.fetch
    .mockResolvedValueOnce({ ok: true, json: async () => [] })
    .mockResolvedValueOnce({ ok: false, json: async () => ({ detail: "Station code already exists" }) });

  renderWithAuth(<CreateStation />);
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

  fireEvent.click(screen.getByRole("button", { name: /\+ create station/i }));
  const dialog = screen.getByRole("dialog");

  fireEvent.change(within(dialog).getByLabelText("Thana / Station name"), { target: { value: "Gulshan Thana" } });
  fireEvent.click(within(dialog).getByRole("button", { name: /^create station$/i }));

  expect(await within(dialog).findByRole("alert")).toBeInTheDocument();
});
