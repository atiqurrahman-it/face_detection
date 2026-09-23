import { useAuth } from "../../../context/AuthContext";
import AdminLayout from "../../layout/AdminLayout";

export default function StationDashboard() {
  const { user } = useAuth();

  return (
    <AdminLayout title="Station Dashboard">
      <p className="text-slate-700 dark:text-slate-300">Welcome, {user.name || user.username}.</p>
    </AdminLayout>
  );
}
