import { useEffect, useState } from "react";
import { apiFetch } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";

const emptyForm = { name: "", username: "", password: "" };

export default function UserManagement() {
  const { token, user } = useAuth();
  const stationId = user.station_id;
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch(`/stations/${stationId}/users`, { token }).then(setUsers).catch((err) => setError(err.message));
  }, [token, stationId]);

  function updateField(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    try {
      const created = await apiFetch(`/stations/${stationId}/users`, {
        method: "POST",
        body: { ...form, role: "user" },
        token,
      });
      setUsers((prev) => [...prev, created]);
      setForm(emptyForm);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeactivate(userId) {
    setError(null);
    try {
      const updated = await apiFetch(`/users/${userId}/deactivate`, { method: "PATCH", token });
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">User Management</h1>

      <ul>
        {users.map((u) => (
          <li key={u.id}>
            <span>{u.username}</span> — <span>{u.is_active ? "active" : "inactive"}</span>{" "}
            {u.is_active && u.id !== user.id && (
              <button onClick={() => handleDeactivate(u.id)}>Deactivate</button>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={handleCreate} className="space-y-2 max-w-sm">
        <div>
          <label htmlFor="name">Name</label>
          <input id="name" value={form.name} onChange={updateField("name")} className="w-full border rounded px-2 py-1" />
        </div>
        <div>
          <label htmlFor="username">Username</label>
          <input id="username" value={form.username} onChange={updateField("username")} className="w-full border rounded px-2 py-1" />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={form.password} onChange={updateField("password")} className="w-full border rounded px-2 py-1" />
        </div>
        {error && <p role="alert">{error}</p>}
        <button type="submit" className="border rounded px-2 py-1">
          Add user
        </button>
      </form>
    </div>
  );
}
