import { useEffect, useState } from "react";
import { apiFetch } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";
import AdminLayout from "../../layout/AdminLayout";
import StatCard from "../../common/StatCard";

export default function SuperAdminDashboard() {
  const { token } = useAuth();
  const [stationCount, setStationCount] = useState(0);

  useEffect(() => {
    apiFetch("/stations", { token })
      .then((stations) => setStationCount(stations.length))
      .catch(() => {});
  }, [token]);

  return (
    <AdminLayout title="Super Admin Dashboard">
      <div className="space-y-6">
        <StatCard label="Stations" value={stationCount} />
      </div>
    </AdminLayout>
  );
}
