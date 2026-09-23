import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AuthContext } from "../../../context/AuthContext";
import UserManagement from "./user_management";

function renderWithAuth(ui) {
  return render(
    <AuthContext.Provider value={{ user: { role: "admin", station_id: 1 }, token: "abc123", loading: false }}>
      {ui}
    </AuthContext.Provider>
  );
}

beforeEach(() => {
  global.fetch = jest.fn();
});

test("lists station users and can deactivate one", async () => {
  global.fetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 5, name: "Officer One", username: "officer1", role: "user", station_id: 1, is_active: true },
      ],
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 5, name: "Officer One", username: "officer1", role: "user", station_id: 1, is_active: false }),
    });

  renderWithAuth(<UserManagement />);

  expect(await screen.findByText("officer1")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /deactivate/i }));

  await waitFor(() => expect(screen.getByText(/inactive/i)).toBeInTheDocument());
});

test("creating a new station user appends it to the list", async () => {
  global.fetch
    .mockResolvedValueOnce({ ok: true, json: async () => [] })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 6, name: "Officer Two", username: "officer2", role: "user", station_id: 1, is_active: true }),
    });

  renderWithAuth(<UserManagement />);
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

  fireEvent.change(screen.getByLabelText(/^name/i), { target: { value: "Officer Two" } });
  fireEvent.change(screen.getByLabelText(/^username/i), { target: { value: "officer2" } });
  fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: "officerpass2" } });
  fireEvent.click(screen.getByRole("button", { name: /add user/i }));

  expect(await screen.findByText("officer2")).toBeInTheDocument();
});
