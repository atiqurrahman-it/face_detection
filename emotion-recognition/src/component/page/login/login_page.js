import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import Button from "../../common/Button";
import Card from "../../common/Card";
import FormField from "../../common/FormField";

const inputClasses =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(username, password);
      navigate(user.role === "super_admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <Card className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-white">
          <span className="text-2xl">🛡️</span>
          <span>Criminal Records Portal</span>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Username" htmlFor="username">
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={inputClasses}
            />
          </FormField>
          <FormField label="Password" htmlFor="password">
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClasses}
            />
          </FormField>
          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <Button type="submit" disabled={submitting} className="w-full">
            Log in
          </Button>
        </form>
      </Card>
    </div>
  );
}
