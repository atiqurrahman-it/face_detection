import { useEffect, useState } from "react";
import { apiFetch } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";
import AdminLayout from "../../layout/AdminLayout";
import BarChart from "../../common/BarChart";
import Card from "../../common/Card";
import StatCard from "../../common/StatCard";
import IconStatCard from "../../common/IconStatCard";
import { BuildingOfficeIcon, UsersIcon } from "../../common/icons";

const STATION_SERIES = { key: "stations", label: "Stations", light: "#2a78d6", dark: "#3987e5" };
const CRIMINAL_SERIES = { key: "criminals", label: "Criminals", light: "#eb6834", dark: "#d95926" };
const TREND_SERIES = { key: "count", label: "Criminals added", light: "#2a78d6", dark: "#3987e5" };

function formatMonth(period) {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  return `${date.toLocaleString("en", { month: "short", timeZone: "UTC" })} '${String(year).slice(2)}`;
}

export default function SuperAdminDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch("/dashboard/stats", { token })
      .then(setStats)
      .catch((err) => setError(err.message));
  }, [token]);

  const byDivision = stats?.by_division.map((row) => ({ label: row.division, values: row })) ?? [];
  const trend = stats?.criminal_trend.map((row) => ({ label: formatMonth(row.period), values: row })) ?? [];

  return (
    <AdminLayout title="Super Admin Dashboard">
      <div className="space-y-6">
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard label="Total Stations" value={stats?.total_stations ?? 0} />
          <StatCard label="Total Criminals" value={stats?.total_criminals ?? 0} />
        </div>

        {byDivision.length > 0 && (
          <div>
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Division-wise</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {stats.by_division.flatMap((row) => [
                <IconStatCard
                  key={`${row.division}-stations`}
                  icon={BuildingOfficeIcon}
                  label={`${row.division} · Stations`}
                  value={row.stations}
                  tint="blue"
                />,
                <IconStatCard
                  key={`${row.division}-criminals`}
                  icon={UsersIcon}
                  label={`${row.division} · Criminals`}
                  value={row.criminals}
                  tint="orange"
                />,
              ])}
            </div>
          </div>
        )}

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Stations &amp; criminals by division</h2>
          {byDivision.length > 0 ? (
            <BarChart data={byDivision} series={[STATION_SERIES, CRIMINAL_SERIES]} />
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">No stations yet.</p>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Criminals added (last 6 months)</h2>
          <BarChart data={trend} series={[TREND_SERIES]} />
        </Card>
      </div>
    </AdminLayout>
  );
}
