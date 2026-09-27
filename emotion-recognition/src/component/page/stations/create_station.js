import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";
import { BD_DIVISIONS, districtsFor, thanasFor } from "../../../data/bd_geo";
import AdminLayout from "../../layout/AdminLayout";
import Button from "../../common/Button";
import Card from "../../common/Card";
import FormField from "../../common/FormField";
import Modal from "../../common/Modal";
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
  const [isModalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);

  const [filterDivision, setFilterDivision] = useState("");
  const [filterDistrict, setFilterDistrict] = useState("");
  const [filterThana, setFilterThana] = useState("");
  const [filterName, setFilterName] = useState("");
  const [filterCode, setFilterCode] = useState("");

  useEffect(() => {
    apiFetch("/stations", { token }).then(setStations).catch((err) => setError(err.message));
  }, [token]);

  const formDistrictOptions = useMemo(() => districtsFor(form.division), [form.division]);
  const formThanaOptions = useMemo(() => thanasFor(form.division, form.district), [form.division, form.district]);
  const filterDistrictOptions = useMemo(() => districtsFor(filterDivision), [filterDivision]);
  const filterThanaOptions = useMemo(() => thanasFor(filterDivision, filterDistrict), [filterDivision, filterDistrict]);

  const filteredStations = stations.filter(
    (s) =>
      (!filterDivision || s.division === filterDivision) &&
      (!filterDistrict || s.district === filterDistrict) &&
      (!filterThana || s.thana === filterThana) &&
      (!filterName || s.name.toLowerCase().includes(filterName.toLowerCase())) &&
      (!filterCode || s.code.toLowerCase().includes(filterCode.toLowerCase()))
  );

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
      const created = await apiFetch("/stations", { method: "POST", body: form, token });
      setStations((prev) => [...prev, created]);
      setForm(emptyForm);
      setModalOpen(false);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <AdminLayout title="Create Station">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <StatCard label="Total Stations" value={stations.length} />
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
                onChange={(e) => setFilterThana(e.target.value)}
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
                onChange={(e) => setFilterName(e.target.value)}
                className={inputClasses}
              />
            </FormField>
            <FormField label="Station code" htmlFor="filter_code">
              <input
                id="filter_code"
                placeholder="Search station code"
                value={filterCode}
                onChange={(e) => setFilterCode(e.target.value)}
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
            {filteredStations.map((s) => (
              <li key={s.id} className="py-2 text-sm text-slate-700 dark:text-slate-300">
                <span className="font-medium text-slate-900 dark:text-white">{s.name}</span> — {s.thana},{" "}
                {s.district}, {s.division} ({s.code})
              </li>
            ))}
            {filteredStations.length === 0 && (
              <li className="py-2 text-sm text-slate-500 dark:text-slate-400">No stations match this filter.</li>
            )}
          </ul>
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
