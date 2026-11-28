import { useEffect, useState } from "react";
import { apiFetch } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";
import { focusFirstError, hasErrors, validateForm } from "../../../utils/validation";
import FormField from "../../common/FormField";

const USER_RULES = {
  name: { label: "Name", required: true },
  username: { label: "Username", required: true },
  password: { label: "Password", required: true, minLength: 8 },
};

const inputClasses = "w-full border rounded px-2 py-1";

const emptyForm = { name: "", username: "", password: "" };

export default function UserManagement() {
  const { token, user } = useAuth();
  const stationId = user.station_id;
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    apiFetch(`/stations/${stationId}/users`, { token }).then(setUsers).catch((err) => setError(err.message));
  }, [token, stationId]);

  function updateField(field) {
    return (e) => {
      setFieldErrors((errs) => (errs[field] ? { ...errs, [field]: undefined } : errs));
      setForm((f) => ({ ...f, [field]: e.target.value }));
    };
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    const errors = validateForm(form, USER_RULES);
    setFieldErrors(errors);
    if (hasErrors(errors)) {
      focusFirstError(errors);
      return;
    }
    try {
      const created = await apiFetch(`/stations/${stationId}/users`, {
        method: "POST",
        body: { ...form, role: "user" },
        token,
      });
      setUsers((prev) => [...prev, created]);
      setForm(emptyForm);
    } catch (err) {
      if (err.fieldErrors) setFieldErrors(err.fieldErrors);
      else setError(err.message);
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

      <form onSubmit={handleCreate} noValidate className="space-y-2 max-w-sm">
        <FormField label="Name" htmlFor="name" required error={fieldErrors.name}>
          <input id="name" value={form.name} onChange={updateField("name")} className={inputClasses} />
        </FormField>
        <FormField label="Username" htmlFor="username" required error={fieldErrors.username}>
          <input id="username" autoComplete="off" value={form.username} onChange={updateField("username")} className={inputClasses} />
        </FormField>
        <FormField label="Password" htmlFor="password" required error={fieldErrors.password}>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={updateField("password")}
            className={inputClasses}
          />
        </FormField>
        {error && (
          <p role="alert" className="whitespace-pre-line text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <button type="submit" className="border rounded px-2 py-1">
          Add user
        </button>
      </form>
    </div>
  );
}
