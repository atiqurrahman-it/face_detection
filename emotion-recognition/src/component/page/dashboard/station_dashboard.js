import { Link } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";

export default function StationDashboard() {
  const { user } = useAuth();

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Station Dashboard</h1>
      <p>Welcome, {user.name || user.username}.</p>
      {user.role === "admin" && (
        <Link to="/users" className="underline">
          Manage station users
        </Link>
      )}
    </div>
  );
}
