import { useState } from "react";
import { API_BASE_URL, apiFetch } from "../../../api/client";
import { CRIMINAL_STATUSES } from "../../../data/criminal_status";
import Button from "../../common/Button";
import FormField from "../../common/FormField";
import Modal from "../../common/Modal";
import StatusBadge from "../../common/StatusBadge";

const GENDER_OPTIONS = ["Male", "Female", "Other"];

const inputClasses =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white";

const fileInputClasses =
  "block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-emerald-600 dark:text-slate-300";

const DETAIL_FIELDS = [
  ["Gender", "gender"],
  ["Alias", "alias"],
  ["Father's name", "father_name"],
  ["Mother's name", "mother_name"],
  ["Date of birth", "date_of_birth"],
  ["NID / Birth certificate", "nid_or_birth_cert"],
  ["Blood group", "blood_group"],
  ["Phone", "phone"],
  ["Occupation", "occupation"],
  ["Height", "height"],
  ["Identifying marks", "identifying_marks"],
  ["FIR case number", "fir_case_number"],
  ["Penal code sections", "penal_code_sections"],
  ["Incident date", "incident_date"],
  ["Arrest date", "arrest_date"],
  ["Arresting officer", "arresting_officer"],
  ["Present address", "present_address"],
  ["Permanent address", "permanent_address"],
];

function formatDateTime(value) {
  if (!value) return null;
  return new Date(value).toLocaleString();
}

export function ViewCriminalModal({ criminal, onClose }) {
  return (
    <Modal open={!!criminal} onClose={onClose} title={criminal ? `${criminal.full_name} (${criminal.criminal_code})` : ""}>
      {criminal && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {["front", "left_profile", "right_profile"].map((angle) => {
              const photo = criminal.photos.find((p) => p.angle === angle);
              return photo ? (
                <img
                  key={angle}
                  src={`${API_BASE_URL}${photo.url}`}
                  alt={angle}
                  className="h-24 w-24 rounded-lg border border-slate-200 object-cover dark:border-slate-700"
                />
              ) : null;
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={criminal.status} />
            <span className="text-sm text-slate-600 dark:text-slate-300">{criminal.crime_type}</span>
            {criminal.repeat_offender && (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                Repeat offender
              </span>
            )}
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300">
            Station: {criminal.station.name} ({criminal.station.code}) — {criminal.station.thana},{" "}
            {criminal.station.district}, {criminal.station.division}
          </p>

          {criminal.crime_description && (
            <p className="text-sm text-slate-600 dark:text-slate-300">{criminal.crime_description}</p>
          )}

          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Repeat offender</dt>
              <dd className="text-sm text-slate-800 dark:text-slate-200">{criminal.repeat_offender ? "Yes" : "No"}</dd>
            </div>
            {DETAIL_FIELDS.filter(([, key]) => criminal[key]).map(([label, key]) => (
              <div key={key}>
                <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
                <dd className="text-sm text-slate-800 dark:text-slate-200">{criminal[key]}</dd>
              </div>
            ))}
          </dl>

          <div className="border-t border-slate-200 pt-3 text-xs text-slate-400 dark:border-slate-700">
            <p>Added {formatDateTime(criminal.created_at)}</p>
            {criminal.updated_at !== criminal.created_at && <p>Last updated {formatDateTime(criminal.updated_at)}</p>}
          </div>
        </div>
      )}
    </Modal>
  );
}

export function EditCriminalModal({ criminal, token, onClose, onSaved }) {
  const [form, setForm] = useState(() => toForm(criminal));
  const [photos, setPhotos] = useState({ front: null, left: null, right: null });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function updateField(field) {
    return (e) => {
      const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
      setForm((f) => ({ ...f, [field]: value }));
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const payload = {
      full_name: form.full_name,
      gender: form.gender,
      crime_type: form.crime_type,
      status: form.status,
      repeat_offender: form.repeat_offender,
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
    };

    const body = new FormData();
    body.append("payload", JSON.stringify(payload));
    if (photos.front) body.append("front_photo", photos.front);
    if (photos.left) body.append("left_photo", photos.left);
    if (photos.right) body.append("right_photo", photos.right);

    setSubmitting(true);
    try {
      const updated = await apiFetch(`/criminals/${criminal.id}`, { method: "PATCH", body, token });
      onSaved(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={!!criminal} onClose={onClose} title={criminal ? `Edit ${criminal.full_name}` : ""}>
      {criminal && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Full name" htmlFor="edit_full_name">
              <input id="edit_full_name" value={form.full_name} onChange={updateField("full_name")} className={inputClasses} />
            </FormField>
            <FormField label="Alias" htmlFor="edit_alias">
              <input id="edit_alias" value={form.alias} onChange={updateField("alias")} className={inputClasses} />
            </FormField>
            <FormField label="Gender" htmlFor="edit_gender">
              <select id="edit_gender" value={form.gender} onChange={updateField("gender")} className={inputClasses}>
                {GENDER_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Status" htmlFor="edit_status">
              <select id="edit_status" value={form.status} onChange={updateField("status")} className={inputClasses}>
                {CRIMINAL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Crime type" htmlFor="edit_crime_type">
              <input id="edit_crime_type" value={form.crime_type} onChange={updateField("crime_type")} className={inputClasses} />
            </FormField>
            <FormField label="FIR case number" htmlFor="edit_fir_case_number">
              <input
                id="edit_fir_case_number"
                value={form.fir_case_number}
                onChange={updateField("fir_case_number")}
                className={inputClasses}
              />
            </FormField>
            <FormField label="Father's name" htmlFor="edit_father_name">
              <input id="edit_father_name" value={form.father_name} onChange={updateField("father_name")} className={inputClasses} />
            </FormField>
            <FormField label="Mother's name" htmlFor="edit_mother_name">
              <input id="edit_mother_name" value={form.mother_name} onChange={updateField("mother_name")} className={inputClasses} />
            </FormField>
            <FormField label="Date of birth" htmlFor="edit_date_of_birth">
              <input
                type="date"
                id="edit_date_of_birth"
                value={form.date_of_birth}
                onChange={updateField("date_of_birth")}
                className={inputClasses}
              />
            </FormField>
            <FormField label="NID / Birth certificate" htmlFor="edit_nid_or_birth_cert">
              <input
                id="edit_nid_or_birth_cert"
                value={form.nid_or_birth_cert}
                onChange={updateField("nid_or_birth_cert")}
                className={inputClasses}
              />
            </FormField>
            <FormField label="Blood group" htmlFor="edit_blood_group">
              <input id="edit_blood_group" value={form.blood_group} onChange={updateField("blood_group")} className={inputClasses} />
            </FormField>
            <FormField label="Phone" htmlFor="edit_phone">
              <input id="edit_phone" value={form.phone} onChange={updateField("phone")} className={inputClasses} />
            </FormField>
            <FormField label="Occupation" htmlFor="edit_occupation">
              <input id="edit_occupation" value={form.occupation} onChange={updateField("occupation")} className={inputClasses} />
            </FormField>
            <FormField label="Height" htmlFor="edit_height">
              <input id="edit_height" value={form.height} onChange={updateField("height")} className={inputClasses} />
            </FormField>
            <FormField label="Identifying marks" htmlFor="edit_identifying_marks">
              <input
                id="edit_identifying_marks"
                value={form.identifying_marks}
                onChange={updateField("identifying_marks")}
                className={inputClasses}
              />
            </FormField>
            <FormField label="Incident date" htmlFor="edit_incident_date">
              <input
                type="date"
                id="edit_incident_date"
                value={form.incident_date}
                onChange={updateField("incident_date")}
                className={inputClasses}
              />
            </FormField>
            <FormField label="Arrest date" htmlFor="edit_arrest_date">
              <input
                type="date"
                id="edit_arrest_date"
                value={form.arrest_date}
                onChange={updateField("arrest_date")}
                className={inputClasses}
              />
            </FormField>
            <FormField label="Arresting officer" htmlFor="edit_arresting_officer">
              <input
                id="edit_arresting_officer"
                value={form.arresting_officer}
                onChange={updateField("arresting_officer")}
                className={inputClasses}
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
            <FormField label="Present address" htmlFor="edit_present_address">
              <textarea
                id="edit_present_address"
                rows={2}
                value={form.present_address}
                onChange={updateField("present_address")}
                className={inputClasses}
              />
            </FormField>
            <FormField label="Permanent address" htmlFor="edit_permanent_address">
              <textarea
                id="edit_permanent_address"
                rows={2}
                value={form.permanent_address}
                onChange={updateField("permanent_address")}
                className={inputClasses}
              />
            </FormField>
            <FormField label="Crime description" htmlFor="edit_crime_description">
              <textarea
                id="edit_crime_description"
                rows={3}
                value={form.crime_description}
                onChange={updateField("crime_description")}
                className={`${inputClasses} sm:col-span-2`}
              />
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Replace front photo" htmlFor="edit_front_photo">
              <input
                type="file"
                id="edit_front_photo"
                accept="image/*"
                onChange={(e) => setPhotos((p) => ({ ...p, front: e.target.files[0] || null }))}
                className={fileInputClasses}
              />
            </FormField>
            <FormField label="Replace left profile photo" htmlFor="edit_left_photo">
              <input
                type="file"
                id="edit_left_photo"
                accept="image/*"
                onChange={(e) => setPhotos((p) => ({ ...p, left: e.target.files[0] || null }))}
                className={fileInputClasses}
              />
            </FormField>
            <FormField label="Replace right profile photo" htmlFor="edit_right_photo">
              <input
                type="file"
                id="edit_right_photo"
                accept="image/*"
                onChange={(e) => setPhotos((p) => ({ ...p, right: e.target.files[0] || null }))}
                className={fileInputClasses}
              />
            </FormField>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function toForm(criminal) {
  return {
    full_name: criminal?.full_name || "",
    alias: criminal?.alias || "",
    father_name: criminal?.father_name || "",
    mother_name: criminal?.mother_name || "",
    date_of_birth: criminal?.date_of_birth || "",
    gender: criminal?.gender || "",
    nid_or_birth_cert: criminal?.nid_or_birth_cert || "",
    blood_group: criminal?.blood_group || "",
    phone: criminal?.phone || "",
    occupation: criminal?.occupation || "",
    present_address: criminal?.present_address || "",
    permanent_address: criminal?.permanent_address || "",
    height: criminal?.height || "",
    identifying_marks: criminal?.identifying_marks || "",
    fir_case_number: criminal?.fir_case_number || "",
    crime_type: criminal?.crime_type || "",
    penal_code_sections: criminal?.penal_code_sections || "",
    crime_description: criminal?.crime_description || "",
    incident_date: criminal?.incident_date || "",
    arrest_date: criminal?.arrest_date || "",
    status: criminal?.status || "",
    arresting_officer: criminal?.arresting_officer || "",
    repeat_offender: !!criminal?.repeat_offender,
  };
}
