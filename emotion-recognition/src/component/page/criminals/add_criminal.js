import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";
import { BD_DIVISIONS, districtsFor } from "../../../data/bd_geo";
import { CRIMINAL_STATUSES } from "../../../data/criminal_status";
import Button from "../../common/Button";
import Card from "../../common/Card";
import FormField from "../../common/FormField";
import SearchableSelect from "../../common/SearchableSelect";
import AdminLayout from "../../layout/AdminLayout";

const GENDER_OPTIONS = ["Male", "Female", "Other"];

const emptyForm = {
  full_name: "",
  alias: "",
  father_name: "",
  mother_name: "",
  date_of_birth: "",
  gender: "",
  nid_or_birth_cert: "",
  blood_group: "",
  phone: "",
  occupation: "",
  present_address: "",
  permanent_address: "",
  height: "",
  identifying_marks: "",
  fir_case_number: "",
  crime_type: "",
  penal_code_sections: "",
  crime_description: "",
  incident_date: "",
  arrest_date: "",
  status: "",
  arresting_officer: "",
  repeat_offender: false,
  division: "",
  district: "",
  stationLabel: "",
};

const inputClasses =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white";

const fileInputClasses =
  "block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-emerald-600 dark:text-slate-300";

export default function AddCriminal() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const isSuperAdmin = user.role === "super_admin";

  const [stations, setStations] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [frontPhoto, setFrontPhoto] = useState(null);
  const [leftPhoto, setLeftPhoto] = useState(null);
  const [rightPhoto, setRightPhoto] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const stationLabel = (s) => `${s.name} (${s.code})`;
  const districtOptions = useMemo(() => districtsFor(form.division), [form.division]);
  const stationOptions = useMemo(
    () =>
      stations.filter(
        (s) => (!form.division || s.division === form.division) && (!form.district || s.district === form.district)
      ),
    [stations, form.division, form.district]
  );
  const stationsByLabel = useMemo(
    () => Object.fromEntries(stationOptions.map((s) => [stationLabel(s), s.id])),
    [stationOptions]
  );

  useEffect(() => {
    if (!isSuperAdmin) return;
    apiFetch("/stations?limit=100", { token })
      .then((response) => setStations(response.data))
      .catch(() => {});
  }, [token, isSuperAdmin]);

  function updateField(field) {
    return (e) => {
      const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
      setForm((f) => ({
        ...f,
        [field]: value,
        ...(field === "division" ? { district: "", stationLabel: "" } : {}),
        ...(field === "district" ? { stationLabel: "" } : {}),
      }));
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!frontPhoto) {
      setError("Front photo is required");
      return;
    }
    const stationId = isSuperAdmin ? stationsByLabel[form.stationLabel] : user.station_id;
    if (!stationId) {
      setError("Please select a station");
      return;
    }

    const payload = {
      full_name: form.full_name,
      gender: form.gender,
      crime_type: form.crime_type,
      status: form.status,
      station_id: stationId,
      alias: form.alias || null,
      father_name: form.father_name || null,
      mother_name: form.mother_name || null,
      date_of_birth: form.date_of_birth || null,
      nid_or_birth_cert: form.nid_or_birth_cert || null,
      blood_group: form.blood_group || null,
      phone: form.phone || null,
      occupation: form.occupation || null,
      present_address: form.present_address || null,
      permanent_address: form.permanent_address || null,
      height: form.height || null,
      identifying_marks: form.identifying_marks || null,
      fir_case_number: form.fir_case_number || null,
      penal_code_sections: form.penal_code_sections || null,
      crime_description: form.crime_description || null,
      incident_date: form.incident_date || null,
      arrest_date: form.arrest_date || null,
      arresting_officer: form.arresting_officer || null,
      repeat_offender: form.repeat_offender,
    };

    const body = new FormData();
    body.append("payload", JSON.stringify(payload));
    body.append("front_photo", frontPhoto);
    if (leftPhoto) body.append("left_photo", leftPhoto);
    if (rightPhoto) body.append("right_photo", rightPhoto);

    setSubmitting(true);
    try {
      await apiFetch("/criminals", { method: "POST", body, token });
      navigate("/criminals");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminLayout title="Add Criminal">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Station &amp; case</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {isSuperAdmin ? (
              <>
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
                    options={districtOptions}
                    value={form.district}
                    onChange={updateField("district")}
                    disabled={!form.division}
                    placeholder="Select district"
                    className={inputClasses}
                  />
                </FormField>
                <FormField label="Station" htmlFor="station">
                  <SearchableSelect
                    id="station"
                    options={stationOptions.map(stationLabel)}
                    value={form.stationLabel}
                    onChange={updateField("stationLabel")}
                    disabled={!form.district}
                    placeholder="Select station"
                    className={inputClasses}
                  />
                </FormField>
              </>
            ) : (
              <p className="self-end text-sm text-slate-500 dark:text-slate-400 sm:col-span-2 lg:col-span-3">
                This criminal will be added under your station.
              </p>
            )}
            <FormField label="Status" htmlFor="status">
              <select id="status" value={form.status} onChange={updateField("status")} className={inputClasses}>
                <option value="">Select status</option>
                {CRIMINAL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Crime type" htmlFor="crime_type">
              <input id="crime_type" value={form.crime_type} onChange={updateField("crime_type")} className={inputClasses} />
            </FormField>
            <FormField label="FIR case number" htmlFor="fir_case_number">
              <input id="fir_case_number" value={form.fir_case_number} onChange={updateField("fir_case_number")} className={inputClasses} />
            </FormField>
            <FormField label="Penal code sections" htmlFor="penal_code_sections">
              <input
                id="penal_code_sections"
                value={form.penal_code_sections}
                onChange={updateField("penal_code_sections")}
                className={inputClasses}
              />
            </FormField>
            <FormField label="Incident date" htmlFor="incident_date">
              <input type="date" id="incident_date" value={form.incident_date} onChange={updateField("incident_date")} className={inputClasses} />
            </FormField>
            <FormField label="Arrest date" htmlFor="arrest_date">
              <input type="date" id="arrest_date" value={form.arrest_date} onChange={updateField("arrest_date")} className={inputClasses} />
            </FormField>
            <FormField label="Arresting officer" htmlFor="arresting_officer">
              <input id="arresting_officer" value={form.arresting_officer} onChange={updateField("arresting_officer")} className={inputClasses} />
            </FormField>
            <FormField label="Crime description" htmlFor="crime_description">
              <textarea
                id="crime_description"
                rows={3}
                value={form.crime_description}
                onChange={updateField("crime_description")}
                className={`${inputClasses} sm:col-span-2 lg:col-span-3`}
              />
            </FormField>
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={form.repeat_offender}
                onChange={updateField("repeat_offender")}
                className="h-4 w-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
              />
              Repeat offender
            </label>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Personal information</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Full name" htmlFor="full_name">
              <input id="full_name" value={form.full_name} onChange={updateField("full_name")} className={inputClasses} />
            </FormField>
            <FormField label="Alias" htmlFor="alias">
              <input id="alias" value={form.alias} onChange={updateField("alias")} className={inputClasses} />
            </FormField>
            <FormField label="Gender" htmlFor="gender">
              <select id="gender" value={form.gender} onChange={updateField("gender")} className={inputClasses}>
                <option value="">Select gender</option>
                {GENDER_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Father's name" htmlFor="father_name">
              <input id="father_name" value={form.father_name} onChange={updateField("father_name")} className={inputClasses} />
            </FormField>
            <FormField label="Mother's name" htmlFor="mother_name">
              <input id="mother_name" value={form.mother_name} onChange={updateField("mother_name")} className={inputClasses} />
            </FormField>
            <FormField label="Date of birth" htmlFor="date_of_birth">
              <input type="date" id="date_of_birth" value={form.date_of_birth} onChange={updateField("date_of_birth")} className={inputClasses} />
            </FormField>
            <FormField label="NID / Birth certificate" htmlFor="nid_or_birth_cert">
              <input id="nid_or_birth_cert" value={form.nid_or_birth_cert} onChange={updateField("nid_or_birth_cert")} className={inputClasses} />
            </FormField>
            <FormField label="Blood group" htmlFor="blood_group">
              <input id="blood_group" value={form.blood_group} onChange={updateField("blood_group")} className={inputClasses} />
            </FormField>
            <FormField label="Phone" htmlFor="phone">
              <input id="phone" value={form.phone} onChange={updateField("phone")} className={inputClasses} />
            </FormField>
            <FormField label="Occupation" htmlFor="occupation">
              <input id="occupation" value={form.occupation} onChange={updateField("occupation")} className={inputClasses} />
            </FormField>
            <FormField label="Height" htmlFor="height">
              <input id="height" value={form.height} onChange={updateField("height")} className={inputClasses} />
            </FormField>
            <FormField label="Identifying marks" htmlFor="identifying_marks">
              <input id="identifying_marks" value={form.identifying_marks} onChange={updateField("identifying_marks")} className={inputClasses} />
            </FormField>
            <FormField label="Present address" htmlFor="present_address">
              <textarea
                id="present_address"
                rows={2}
                value={form.present_address}
                onChange={updateField("present_address")}
                className={inputClasses}
              />
            </FormField>
            <FormField label="Permanent address" htmlFor="permanent_address">
              <textarea
                id="permanent_address"
                rows={2}
                value={form.permanent_address}
                onChange={updateField("permanent_address")}
                className={inputClasses}
              />
            </FormField>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Photos</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Front photo (required)" htmlFor="front_photo">
              <input
                type="file"
                id="front_photo"
                accept="image/*"
                onChange={(e) => setFrontPhoto(e.target.files[0] || null)}
                className={fileInputClasses}
              />
            </FormField>
            <FormField label="Left profile photo" htmlFor="left_photo">
              <input
                type="file"
                id="left_photo"
                accept="image/*"
                onChange={(e) => setLeftPhoto(e.target.files[0] || null)}
                className={fileInputClasses}
              />
            </FormField>
            <FormField label="Right profile photo" htmlFor="right_photo">
              <input
                type="file"
                id="right_photo"
                accept="image/*"
                onChange={(e) => setRightPhoto(e.target.files[0] || null)}
                className={fileInputClasses}
              />
            </FormField>
          </div>
        </Card>

        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Add Criminal"}
        </Button>
      </form>
    </AdminLayout>
  );
}
