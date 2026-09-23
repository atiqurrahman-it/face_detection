import { useEffect, useState } from "react";
import { apiFetch } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";

const emptyForm = {
  name: "",
  district: "",
  code: "",
  admin_name: "",
  admin_username: "",
  admin_password: "",
};

export default function SuperAdminDashboard() {
  const { token } = useAuth();
  const [stations, setStations] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch("/stations", { token }).then(setStations).catch((err) => setError(err.message));
  }, [token]);

  function updateField(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      const created = await apiFetch("/stations", { method: "POST", body: form, token });
      setStations((prev) => [...prev, created]);
      setForm(emptyForm);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Super Admin Dashboard</h1>

      <section>
        <h2 className="text-lg font-medium">Stations ({stations.length})</h2>
        <ul>
          {stations.map((s) => (
            <li key={s.id}>
              <span>{s.name}</span> — {s.district} ({s.code})
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-medium">Create station</h2>
        <form onSubmit={handleSubmit} className="space-y-2 max-w-sm">
          <div>
            <label htmlFor="name">Station name</label>
            <input id="name" value={form.name} onChange={updateField("name")} className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label htmlFor="district">District</label>
            <input id="district" value={form.district} onChange={updateField("district")} className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label htmlFor="code">Station code</label>
            <input id="code" value={form.code} onChange={updateField("code")} className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label htmlFor="admin_name">Admin name</label>
            <input id="admin_name" value={form.admin_name} onChange={updateField("admin_name")} className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label htmlFor="admin_username">Admin username</label>
            <input id="admin_username" value={form.admin_username} onChange={updateField("admin_username")} className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label htmlFor="admin_password">Admin password</label>
            <input id="admin_password" type="password" value={form.admin_password} onChange={updateField("admin_password")} className="w-full border rounded px-2 py-1" />
          </div>
          {error && <p role="alert">{error}</p>}
          <button type="submit" className="border rounded px-2 py-1">
            Create station
          </button>
        </form>
      </section>
    </div>
  );
}
