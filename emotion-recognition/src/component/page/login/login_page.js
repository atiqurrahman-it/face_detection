import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import Button from "../../common/Button";
import Card from "../../common/Card";
import FormField from "../../common/FormField";

const inputClasses =
  "w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500";
const validBorder =
  "border-slate-300 focus:border-emerald-500 focus:ring-emerald-500 dark:border-slate-600";
const invalidBorder =
  "border-red-500 focus:border-red-500 focus:ring-red-500 dark:border-red-500";

function fieldClasses(hasError) {
  return `${inputClasses} ${hasError ? invalidBorder : validBorder}`;
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const usernameRef = useRef(null);
  const passwordRef = useRef(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const errors = {};
    if (!username.trim()) errors.username = "Username is required";
    if (!password) errors.password = "Password is required";
    setFieldErrors(errors);
    if (errors.username || errors.password) {
      (errors.username ? usernameRef : passwordRef).current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const user = await login(username, password);
      navigate(user.role === "super_admin" ? "/admin" : "/station");
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
          <span>Crime Track</span>
        </div>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <FormField label="Username" htmlFor="username" error={fieldErrors.username}>
            <input
              id="username"
              ref={usernameRef}
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (fieldErrors.username) setFieldErrors((f) => ({ ...f, username: undefined }));
              }}
              placeholder="Enter your username"
              autoComplete="username"
              aria-invalid={Boolean(fieldErrors.username)}
              aria-describedby={fieldErrors.username ? "username-error" : undefined}
              className={fieldClasses(fieldErrors.username)}
            />
          </FormField>
          <FormField label="Password" htmlFor="password" error={fieldErrors.password}>
            <div className="relative">
              <input
                id="password"
                ref={passwordRef}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined }));
                }}
                placeholder="Enter your password"
                autoComplete="current-password"
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? "password-error" : undefined}
                className={`${fieldClasses(fieldErrors.password)} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.3 20.3 0 0 1 5.06-6.06M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a20.3 20.3 0 0 1-3.22 4.36M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
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
