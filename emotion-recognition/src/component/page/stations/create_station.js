import { useEffect, useState } from "react";
import { apiFetch } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";
import AdminLayout from "../../layout/AdminLayout";
import Button from "../../common/Button";
import Card from "../../common/Card";
import FormField from "../../common/FormField";

const emptyForm = {
  name: "",
  district: "",
  code: "",
  admin_name: "",
  admin_username: "",
  admin_password: "",
};

const inputClasses =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white";

export default function CreateStation() {
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
    <AdminLayout title="Create Station">
      <div className="space-y-6">
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Create station</h2>
          <form onSubmit={handleSubmit} className="grid max-w-lg gap-4">
            <FormField label="Station name" htmlFor="name">
              <input id="name" value={form.name} onChange={updateField("name")} className={inputClasses} />
            </FormField>
            <FormField label="District" htmlFor="district">
              <input id="district" value={form.district} onChange={updateField("district")} className={inputClasses} />
            </FormField>
            <FormField label="Station code" htmlFor="code">
              <input id="code" value={form.code} onChange={updateField("code")} className={inputClasses} />
            </FormField>
            <FormField label="Admin name" htmlFor="admin_name">
              <input id="admin_name" value={form.admin_name} onChange={updateField("admin_name")} className={inputClasses} />
            </FormField>
            <FormField label="Admin username" htmlFor="admin_username">
              <input
                id="admin_username"
                value={form.admin_username}
                onChange={updateField("admin_username")}
                className={inputClasses}
              />
            </FormField>
            <FormField label="Admin password" htmlFor="admin_password">
              <input
                id="admin_password"
                type="password"
                value={form.admin_password}
                onChange={updateField("admin_password")}
                className={inputClasses}
              />
            </FormField>
            {error && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
            <Button type="submit">Create station</Button>
          </form>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Stations</h2>
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {stations.map((s) => (
              <li key={s.id} className="py-2 text-sm text-slate-700 dark:text-slate-300">
                <span className="font-medium text-slate-900 dark:text-white">{s.name}</span> — {s.district} ({s.code})
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </AdminLayout>
  );
}
