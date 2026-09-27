import { useEffect, useState } from "react";
import { apiFetch } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";
import AdminLayout from "../../layout/AdminLayout";
import BarChart from "../../common/BarChart";
import Card from "../../common/Card";
import { BuildingOfficeIcon, UsersIcon } from "../../common/icons";
import { BD_DIVISIONS } from "../../../data/bd_geo";

const STATION_SERIES = { key: "stations", label: "Stations", light: "#2a78d6", dark: "#3987e5" };
const CRIMINAL_SERIES = { key: "criminals", label: "Criminals", light: "#eb6834", dark: "#d95926" };
const TREND_SERIES = { key: "count", label: "Criminals added", light: "#2a78d6", dark: "#3987e5" };

function formatMonth(period) {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  return `${date.toLocaleString("en", { month: "short", timeZone: "UTC" })} '${String(year).slice(2)}`;
}

function MiniStat({ icon: Icon, tint, label, value }) {
  const tints = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    orange: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
  };
  return (
    <div className="flex items-center gap-3">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tints[tint]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-xl font-bold text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function DivisionStatCard({ division, stations, criminals }) {
  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">{division}</h3>
      <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-800">
        <div className="pr-4">
          <MiniStat icon={BuildingOfficeIcon} tint="blue" label="Stations" value={stations} />
        </div>
        <div className="pl-4">
          <MiniStat icon={UsersIcon} tint="orange" label="Criminals" value={criminals} />
        </div>
      </div>
    </Card>
  );
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

  const statsByDivisionName = new Map((stats?.by_division ?? []).map((row) => [row.division, row]));
  const allDivisions = BD_DIVISIONS.map(
    (d) => statsByDivisionName.get(d.name) ?? { division: d.name, stations: 0, criminals: 0 }
  );

  return (
    <AdminLayout title="Super Admin Dashboard">
      <div className="space-y-6">
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <Card>
          <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-800">
            <div className="pr-4">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Stations</p>
              <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">{stats?.total_stations ?? 0}</p>
            </div>
            <div className="pl-4">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Criminals</p>
              <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">{stats?.total_criminals ?? 0}</p>
            </div>
          </div>
        </Card>

        <div>
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Division-wise</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {allDivisions.map((row) => (
              <DivisionStatCard
                key={row.division}
                division={row.division}
                stations={row.stations}
                criminals={row.criminals}
              />
            ))}
          </div>
        </div>

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
