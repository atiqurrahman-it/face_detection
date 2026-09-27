import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Webcam from "react-webcam";
import { apiFetch, API_BASE_URL } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";
import { BD_DIVISIONS, districtsFor } from "../../../data/bd_geo";
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

const fileInputClasses =
  "block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-emerald-600 dark:text-slate-300";

function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

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
  const [filterDivision, setFilterDivision] = useState("");
  const [filterDistrict, setFilterDistrict] = useState("");
  const [filterStationLabel, setFilterStationLabel] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState("20");

  const [photoSearchResults, setPhotoSearchResults] = useState(null);
  const [photoSearchError, setPhotoSearchError] = useState(null);
  const [photoSearchLoading, setPhotoSearchLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const webcamRef = useRef(null);

  const stationLabel = useCallback((s) => `${s.name} (${s.code})`, []);
  const filterDistrictOptions = useMemo(() => districtsFor(filterDivision), [filterDivision]);
  const filterStationOptions = useMemo(
    () =>
      stations.filter(
        (s) => (!filterDivision || s.division === filterDivision) && (!filterDistrict || s.district === filterDistrict)
      ),
    [stations, filterDivision, filterDistrict]
  );
  const stationsByLabel = useMemo(
    () => Object.fromEntries(filterStationOptions.map((s) => [stationLabel(s), s.id])),
    [filterStationOptions, stationLabel]
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
      if (photoSearchResults !== null) {
        setPhotoSearchResults((prev) => prev.filter((c) => c.id !== id));
      } else {
        fetchCriminals();
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function searchByPhoto(blob) {
    setPhotoSearchError(null);
    setPhotoSearchLoading(true);
    try {
      const body = new FormData();
      body.append("photo", blob, "search.jpg");
      const results = await apiFetch("/criminals/search-by-photo", { method: "POST", body, token });
      setPhotoSearchResults(results);
    } catch (err) {
      setPhotoSearchError(err.message);
    } finally {
      setPhotoSearchLoading(false);
    }
  }

  function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (file) searchByPhoto(file);
  }

  function handleCapture() {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) return;
    searchByPhoto(dataUrlToBlob(imageSrc));
  }

  function clearPhotoSearch() {
    setPhotoSearchResults(null);
    setPhotoSearchError(null);
    setShowCamera(false);
    setFileInputKey((k) => k + 1);
  }

  const totalPages = Math.max(1, Math.ceil(listMeta.total / Number(listMeta.page_size || pageSize)));
  const isPhotoSearchActive = photoSearchResults !== null;
  const displayedCriminals = isPhotoSearchActive ? photoSearchResults : criminals;

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
    ...(isPhotoSearchActive
      ? [
          {
            key: "confidence",
            header: "Match",
            render: (row) => (
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                {row.confidence}%
              </span>
            ),
          },
        ]
      : []),
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
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Search by photo</h2>
          <div className="flex flex-wrap items-start gap-6">
            <div className="w-full max-w-xs">
              <FormField label="Upload a photo" htmlFor="photo_search_upload">
                <input
                  key={fileInputKey}
                  type="file"
                  id="photo_search_upload"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className={fileInputClasses}
                />
              </FormField>
            </div>
            <div className="space-y-2">
              <Button type="button" variant="secondary" onClick={() => setShowCamera((v) => !v)}>
                {showCamera ? "Close camera" : "Use live camera"}
              </Button>
              {showCamera && (
                <div className="space-y-2">
                  <Webcam
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    className="w-64 rounded-lg border border-slate-300 dark:border-slate-600"
                  />
                  <Button type="button" onClick={handleCapture} disabled={photoSearchLoading}>
                    Capture &amp; search
                  </Button>
                </div>
              )}
            </div>
          </div>

          {photoSearchLoading && <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Searching…</p>}
          {photoSearchError && (
            <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
              {photoSearchError}
            </p>
          )}
          {isPhotoSearchActive && (
            <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2 dark:bg-slate-800/60">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {photoSearchResults.length} match{photoSearchResults.length === 1 ? "" : "es"} found
              </p>
              <button
                type="button"
                onClick={clearPhotoSearch}
                className="text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
              >
                Clear photo search
              </button>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Filters</h2>
          <div className={`grid gap-4 sm:grid-cols-2 ${isSuperAdmin ? "lg:grid-cols-6" : "lg:grid-cols-3"}`}>
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
              <>
                <FormField label="Division" htmlFor="filter_division">
                  <SearchableSelect
                    id="filter_division"
                    options={BD_DIVISIONS.map((d) => d.name)}
                    value={filterDivision}
                    onChange={(e) => {
                      setFilterDivision(e.target.value);
                      setFilterDistrict("");
                      setFilterStationLabel("");
                      setCurrentPage(1);
                    }}
                    placeholder="All divisions"
                    className={inputClasses}
                  />
                </FormField>
                <FormField label="District" htmlFor="filter_district">
                  <SearchableSelect
                    id="filter_district"
                    options={filterDistrictOptions}
                    value={filterDistrict}
                    onChange={(e) => {
                      setFilterDistrict(e.target.value);
                      setFilterStationLabel("");
                      setCurrentPage(1);
                    }}
                    disabled={!filterDivision}
                    placeholder="All districts"
                    className={inputClasses}
                  />
                </FormField>
                <FormField label="Station" htmlFor="filter_station">
                  <SearchableSelect
                    id="filter_station"
                    options={filterStationOptions.map(stationLabel)}
                    value={filterStationLabel}
                    onChange={(e) => {
                      setFilterStationLabel(e.target.value);
                      setCurrentPage(1);
                    }}
                    disabled={!filterDistrict}
                    placeholder="All stations"
                    className={inputClasses}
                  />
                </FormField>
              </>
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
            rows={displayedCriminals}
            keyField="id"
            emptyMessage={isPhotoSearchActive ? "No matching criminals found for this photo." : "No criminals match this filter."}
          />

          {!isPhotoSearchActive && listMeta.total > 0 && (
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
