import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, API_BASE_URL } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";
import { CRIMINAL_STATUSES } from "../../../data/criminal_status";
import AdminLayout from "../../layout/AdminLayout";
import Button from "../../common/Button";
import Card from "../../common/Card";
import DataTable from "../../common/DataTable";
import FormField from "../../common/FormField";
import Pagination from "../../common/Pagination";
import SearchableSelect from "../../common/SearchableSelect";
import StatusBadge from "../../common/StatusBadge";
import { TrashIcon, UserCircleIcon } from "../../common/icons";

const inputClasses =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white";

function Thumbnail({ criminal }) {
  const frontPhoto = criminal.photos.find((p) => p.angle === "front");
  if (!frontPhoto) {
    return <UserCircleIcon className="h-10 w-10 text-slate-300 dark:text-slate-600" />;
  }
  return (
    <img
      src={`${API_BASE_URL}${frontPhoto.url}`}
      alt=""
      className="h-10 w-10 rounded-full border border-slate-200 object-cover dark:border-slate-700"
    />
  );
}

export default function CriminalSearch() {
  const { token, user } = useAuth();
  const canDelete = user.role === "super_admin" || user.role === "admin";
  const isSuperAdmin = user.role === "super_admin";

  const [criminals, setCriminals] = useState([]);
  const [listMeta, setListMeta] = useState({ total: 0, page: 1, page_size: 20 });
  const [error, setError] = useState(null);

  const [stations, setStations] = useState([]);
  const [filterQ, setFilterQ] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCrimeType, setFilterCrimeType] = useState("");
  const [filterStationLabel, setFilterStationLabel] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState("20");

  const stationLabel = useCallback((s) => `${s.name} (${s.code})`, []);
  const stationsByLabel = useMemo(
    () => Object.fromEntries(stations.map((s) => [stationLabel(s), s.id])),
    [stations, stationLabel]
  );

  useEffect(() => {
    if (!isSuperAdmin) return;
    apiFetch("/stations?limit=100", { token })
      .then((response) => setStations(response.data))
      .catch(() => {});
  }, [token, isSuperAdmin]);

  const fetchCriminals = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(currentPage));
    params.set("page_size", pageSize);
    if (filterQ) params.set("q", filterQ);
    if (filterStatus) params.set("status", filterStatus);
    if (filterCrimeType) params.set("crime_type", filterCrimeType);

    if (isSuperAdmin) {
      const stationId = stationsByLabel[filterStationLabel];
      if (stationId) params.set("station_id", String(stationId));
    } else {
      params.set("station_id", String(user.station_id));
    }

    return apiFetch(`/criminals?${params.toString()}`, { token })
      .then((response) => {
        setCriminals(response.items);
        setListMeta({ total: response.total, page: response.page, page_size: response.page_size });
      })
      .catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentPage, pageSize, filterQ, filterStatus, filterCrimeType, filterStationLabel, isSuperAdmin]);

  useEffect(() => {
    fetchCriminals();
  }, [fetchCriminals]);

  async function handleDelete(id) {
    setError(null);
    try {
      await apiFetch(`/criminals/${id}`, { method: "DELETE", token });
      fetchCriminals();
    } catch (err) {
      setError(err.message);
    }
  }

  const totalPages = Math.max(1, Math.ceil(listMeta.total / Number(listMeta.page_size || pageSize)));

  const columns = [
    { key: "photo", header: "", render: (row) => <Thumbnail criminal={row} /> },
    {
      key: "name",
      header: "Name",
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900 dark:text-white">{row.full_name}</p>
          <p className="text-xs text-slate-400">{row.criminal_code}</p>
        </div>
      ),
    },
    { key: "crime_type", header: "Crime" },
    { key: "station", header: "Station", render: (row) => `${row.station.name} (${row.station.code})` },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    ...(canDelete
      ? [
          {
            key: "actions",
            header: "",
            render: (row) => (
              <button
                type="button"
                aria-label={`Delete ${row.full_name}`}
                onClick={() => handleDelete(row.id)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            ),
          },
        ]
      : []),
  ];

  return (
    <AdminLayout title="Criminal Search">
      <div className="space-y-6">
        <div className="flex items-center justify-end">
          <Link to="/criminals/new">
            <Button type="button">+ Add Criminal</Button>
          </Link>
        </div>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Filters</h2>
          <div className={`grid gap-4 sm:grid-cols-2 ${isSuperAdmin ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
            <FormField label="Search" htmlFor="filter_q">
              <input
                id="filter_q"
                placeholder="Name or NID"
                value={filterQ}
                onChange={(e) => {
                  setFilterQ(e.target.value);
                  setCurrentPage(1);
                }}
                className={inputClasses}
              />
            </FormField>
            <FormField label="Status" htmlFor="filter_status">
              <select
                id="filter_status"
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className={inputClasses}
              >
                <option value="">All statuses</option>
                {CRIMINAL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Crime type" htmlFor="filter_crime_type">
              <input
                id="filter_crime_type"
                placeholder="Search crime type"
                value={filterCrimeType}
                onChange={(e) => {
                  setFilterCrimeType(e.target.value);
                  setCurrentPage(1);
                }}
                className={inputClasses}
              />
            </FormField>
            {isSuperAdmin && (
              <FormField label="Station" htmlFor="filter_station">
                <SearchableSelect
                  id="filter_station"
                  options={stations.map(stationLabel)}
                  value={filterStationLabel}
                  onChange={(e) => {
                    setFilterStationLabel(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="All stations"
                  className={inputClasses}
                />
              </FormField>
            )}
          </div>
        </Card>

        <Card>
          {error && (
            <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <DataTable
            columns={columns}
            rows={criminals}
            keyField="id"
            emptyMessage="No criminals match this filter."
          />

          {listMeta.total > 0 && (
            <div className="mt-4">
              <Pagination
                currentPage={listMeta.page}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                pageSize={pageSize}
                totalItems={listMeta.total}
                onPageSizeChange={(value) => {
                  setPageSize(value);
                  setCurrentPage(1);
                }}
              />
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
