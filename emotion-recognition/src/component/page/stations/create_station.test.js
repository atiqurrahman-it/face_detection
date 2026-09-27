import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

test("lists existing stations on load", async () => {
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => [{ id: 1, name: "Dhanmondi Thana", district: "Dhaka", code: "DHK-01" }],
  });

  renderWithAuth(<CreateStation />);

  expect(await screen.findByText("Dhanmondi Thana")).toBeInTheDocument();
});

test("submitting the create-station form posts and appends the new station to the list", async () => {
  global.fetch
    .mockResolvedValueOnce({ ok: true, json: async () => [] })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 2, name: "Gulshan Thana", district: "Dhaka", code: "DHK-02" }),
    });

  renderWithAuth(<CreateStation />);
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

  fireEvent.change(screen.getByLabelText(/station name/i), { target: { value: "Gulshan Thana" } });
  fireEvent.change(screen.getByLabelText(/district/i), { target: { value: "Dhaka" } });
  fireEvent.change(screen.getByLabelText(/station code/i), { target: { value: "DHK-02" } });
  fireEvent.change(screen.getByLabelText(/admin name/i), { target: { value: "Admin Two" } });
  fireEvent.change(screen.getByLabelText(/admin username/i), { target: { value: "dhk02admin" } });
  fireEvent.change(screen.getByLabelText(/admin password/i), { target: { value: "adminpass2" } });
  fireEvent.click(screen.getByRole("button", { name: /create station/i }));

  expect(await screen.findByText("Gulshan Thana")).toBeInTheDocument();
});

test("shows an error message when station creation fails", async () => {
  global.fetch
    .mockResolvedValueOnce({ ok: true, json: async () => [] })
    .mockResolvedValueOnce({ ok: false, json: async () => ({ message: "Station code already exists" }) });

  renderWithAuth(<CreateStation />);
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

  fireEvent.change(screen.getByLabelText(/station name/i), { target: { value: "Gulshan Thana" } });
  fireEvent.click(screen.getByRole("button", { name: /create station/i }));

  expect(await screen.findByRole("alert")).toBeInTheDocument();
});
