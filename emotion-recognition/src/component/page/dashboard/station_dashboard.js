import { Link } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";

export default function StationDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Station Dashboard</h1>
        <button onClick={logout} className="border rounded px-2 py-1">
          Log out
        </button>
      </div>
      <p>Welcome, {user.name || user.username}.</p>
      {user.role === "admin" && (
        <Link to="/users" className="underline">
          Manage station users
        </Link>
      )}
    </div>
  );
}
