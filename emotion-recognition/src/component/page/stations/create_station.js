import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";
import { BD_DIVISIONS, districtsFor, thanasFor } from "../../../data/bd_geo";
import AdminLayout from "../../layout/AdminLayout";
import Button from "../../common/Button";
import Card from "../../common/Card";
import FormField from "../../common/FormField";
import Modal from "../../common/Modal";
import Pagination from "../../common/Pagination";
import SearchableSelect from "../../common/SearchableSelect";
import StatCard from "../../common/StatCard";

const emptyForm = {
  name: "",
  division: "",
  district: "",
  thana: "",
  code: "",
  admin_name: "",
  admin_username: "",
  admin_password: "",
};

const inputClasses =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white";

export default function CreateStation() {
  const { token } = useAuth();
  const [stations, setStations] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [totalStationsCount, setTotalStationsCount] = useState(0);
  const [isModalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);

  const [filterDivision, setFilterDivision] = useState("");
  const [filterDistrict, setFilterDistrict] = useState("");
  const [filterThana, setFilterThana] = useState("");
  const [filterName, setFilterName] = useState("");
  const [filterCode, setFilterCode] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState("10");

  const fetchStations = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(currentPage));
    params.set("limit", pageSize);
    if (filterDivision) params.set("division", filterDivision);
    if (filterDistrict) params.set("district", filterDistrict);
    if (filterThana) params.set("thana", filterThana);
    if (filterName) params.set("name", filterName);
    if (filterCode) params.set("code", filterCode);

    return apiFetch(`/stations?${params.toString()}`, { token })
      .then((response) => {
        setStations(response.data);
        setPagination(response.pagination);
      })
      .catch((err) => setError(err.message));
  }, [token, currentPage, pageSize, filterDivision, filterDistrict, filterThana, filterName, filterCode]);

  useEffect(() => {
    fetchStations();
  }, [fetchStations]);

  useEffect(() => {
    apiFetch("/stations?limit=1", { token })
      .then((response) => setTotalStationsCount(response.pagination.total))
      .catch(() => {});
  }, [token]);

  const formDistrictOptions = useMemo(() => districtsFor(form.division), [form.division]);
  const formThanaOptions = useMemo(() => thanasFor(form.division, form.district), [form.division, form.district]);
  const filterDistrictOptions = useMemo(() => districtsFor(filterDivision), [filterDivision]);
  const filterThanaOptions = useMemo(() => thanasFor(filterDivision, filterDistrict), [filterDivision, filterDistrict]);

  function updateField(field) {
    return (e) => {
      const { value } = e.target;
      setForm((f) => ({
        ...f,
        [field]: value,
        ...(field === "division" ? { district: "", thana: "" } : {}),
        ...(field === "district" ? { thana: "" } : {}),
      }));
    };
  }

  function openModal() {
    setError(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await apiFetch("/stations", { method: "POST", body: form, token });
      setForm(emptyForm);
      setModalOpen(false);
      setTotalStationsCount((count) => count + 1);
      fetchStations();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <AdminLayout title="Create Station">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <StatCard label="Total Stations" value={totalStationsCount} />
          <Button type="button" onClick={openModal}>
            + Create Station
          </Button>
        </div>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Find stations</h2>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <FormField label="Division" htmlFor="filter_division">
              <SearchableSelect
                id="filter_division"
                options={BD_DIVISIONS.map((d) => d.name)}
                value={filterDivision}
                onChange={(e) => {
                  setFilterDivision(e.target.value);
                  setFilterDistrict("");
                  setFilterThana("");
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
                  setFilterThana("");
                  setCurrentPage(1);
                }}
                disabled={!filterDivision}
                placeholder="All districts"
                className={inputClasses}
              />
            </FormField>
            <FormField label="Thana" htmlFor="filter_thana">
              <SearchableSelect
                id="filter_thana"
                options={filterThanaOptions}
                value={filterThana}
                onChange={(e) => {
                  setFilterThana(e.target.value);
                  setCurrentPage(1);
                }}
                disabled={!filterDistrict}
                placeholder="All thanas"
                className={inputClasses}
              />
            </FormField>
            <FormField label="Station name" htmlFor="filter_name">
              <input
                id="filter_name"
                placeholder="Search station name"
                value={filterName}
                onChange={(e) => {
                  setFilterName(e.target.value);
                  setCurrentPage(1);
                }}
                className={inputClasses}
              />
            </FormField>
            <FormField label="Station code" htmlFor="filter_code">
              <input
                id="filter_code"
                placeholder="Search station code"
                value={filterCode}
                onChange={(e) => {
                  setFilterCode(e.target.value);
                  setCurrentPage(1);
                }}
                className={inputClasses}
              />
            </FormField>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Stations</h2>
          {error && (
            <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {stations.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4 py-2 text-sm text-slate-700 dark:text-slate-300">
                <Link to={`/stations/${s.id}`} className="hover:underline">
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">{s.name}</span> — {s.thana},{" "}
                  {s.district}, {s.division} ({s.code})
                </Link>
                <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                  {s.criminal_count} criminal{s.criminal_count === 1 ? "" : "s"}
                </span>
              </li>
            ))}
            {pagination.total === 0 && (
              <li className="py-2 text-sm text-slate-500 dark:text-slate-400">No stations match this filter.</li>
            )}
          </ul>

          {pagination.total > 0 && (
            <div className="mt-4">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={setCurrentPage}
                pageSize={pageSize}
                totalItems={pagination.total}
                onPageSizeChange={(value) => {
                  setPageSize(value);
                  setCurrentPage(1);
                }}
              />
            </div>
          )}
        </Card>
      </div>

      <Modal open={isModalOpen} onClose={() => setModalOpen(false)} title="Create Station">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <FormField label="Division" htmlFor="division">
            <SearchableSelect
              id="division"
              options={BD_DIVISIONS.map((d) => d.name)}
              value={form.division}
              onChange={updateField("division")}
              placeholder="Select division"
              className={inputClasses}
            />
          </FormField>
          <FormField label="District" htmlFor="district">
            <SearchableSelect
              id="district"
              options={formDistrictOptions}
              value={form.district}
              onChange={updateField("district")}
              disabled={!form.division}
              placeholder="Select district"
              className={inputClasses}
            />
          </FormField>
          <FormField label="Thana" htmlFor="thana">
            <SearchableSelect
              id="thana"
              options={formThanaOptions}
              value={form.thana}
              onChange={updateField("thana")}
              disabled={!form.district}
              placeholder="Select thana"
              className={inputClasses}
            />
          </FormField>
          <FormField label="Station name" htmlFor="name">
            <input id="name" value={form.name} onChange={updateField("name")} className={inputClasses} />
          </FormField>
          <FormField label="Station code" htmlFor="code">
            <input id="code" value={form.code} onChange={updateField("code")} className={inputClasses} />
          </FormField>
          <FormField label="Admin name" htmlFor="admin_name">
            <input id="admin_name" value={form.admin_name} onChange={updateField("admin_name")} className={inputClasses} />
          </FormField>
          <FormField label="Admin username" htmlFor="admin_username">
            <input
              id="admin_username"
              value={form.admin_username}
              onChange={updateField("admin_username")}
              className={inputClasses}
            />
          </FormField>
          <FormField label="Admin password" htmlFor="admin_password">
            <input
              id="admin_password"
              type="password"
              value={form.admin_password}
              onChange={updateField("admin_password")}
              className={inputClasses}
            />
          </FormField>
          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <Button type="submit">Create station</Button>
        </form>
      </Modal>
    </AdminLayout>
  );
}
