import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { API_BASE_URL, apiFetch } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";
import AdminLayout from "../../layout/AdminLayout";
import Button from "../../common/Button";
import Card from "../../common/Card";
import DataTable from "../../common/DataTable";
import FormField from "../../common/FormField";
import Modal from "../../common/Modal";
import Pagination from "../../common/Pagination";
import StatusBadge from "../../common/StatusBadge";
import { EyeIcon, PencilIcon, TrashIcon, UserCircleIcon } from "../../common/icons";
import CriminalForm from "../criminals/CriminalForm";
import { EditCriminalModal, ViewCriminalModal } from "../criminals/criminal_modals";

const inputClasses =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white";

const emptyUserForm = { name: "", username: "", password: "", role: "user" };

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

export default function StationDetail() {
  const { stationId } = useParams();
  const { token, user: currentUser } = useAuth();
  const canDelete = currentUser.role === "super_admin" || currentUser.role === "admin";

  const [station, setStation] = useState(null);
  const [error, setError] = useState(null);

  const [criminals, setCriminals] = useState([]);
  const [listMeta, setListMeta] = useState({ total: 0, page: 1, page_size: 20 });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState("20");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [viewCriminal, setViewCriminal] = useState(null);
  const [editCriminal, setEditCriminal] = useState(null);
  const [isAddCriminalModalOpen, setAddCriminalModalOpen] = useState(false);

  const [users, setUsers] = useState([]);
  const [userPage, setUserPage] = useState(1);
  const [userPageSize, setUserPageSize] = useState("10");
  const [isUserModalOpen, setUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [userError, setUserError] = useState(null);
  const [creatingUser, setCreatingUser] = useState(false);
  const [pendingUserAction, setPendingUserAction] = useState(null);
  const [updatingUserStatus, setUpdatingUserStatus] = useState(false);

  useEffect(() => {
    apiFetch(`/stations/${stationId}`, { token })
      .then(setStation)
      .catch((err) => setError(err.message));
  }, [token, stationId]);

  const fetchCriminals = useCallback(() => {
    const params = new URLSearchParams();
    params.set("station_id", stationId);
    params.set("page", String(currentPage));
    params.set("page_size", pageSize);
    return apiFetch(`/criminals?${params.toString()}`, { token })
      .then((response) => {
        setCriminals(response.items);
        setListMeta({ total: response.total, page: response.page, page_size: response.page_size });
      })
      .catch((err) => setError(err.message));
  }, [token, stationId, currentPage, pageSize]);

  useEffect(() => {
    fetchCriminals();
  }, [fetchCriminals]);

  const fetchUsers = useCallback(() => {
    return apiFetch(`/stations/${stationId}/users`, { token })
      .then(setUsers)
      .catch((err) => setError(err.message));
  }, [token, stationId]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setError(null);
    setDeleting(true);
    try {
      await apiFetch(`/criminals/${pendingDelete.id}`, { method: "DELETE", token });
      setPendingDelete(null);
      fetchCriminals();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  function handleCriminalSaved(updated) {
    setCriminals((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setEditCriminal(null);
  }

  function openUserModal() {
    setUserError(null);
    setUserForm(emptyUserForm);
    setUserModalOpen(true);
  }

  function updateUserField(field) {
    return (e) => setUserForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    setUserError(null);
    setCreatingUser(true);
    try {
      await apiFetch(`/stations/${stationId}/users`, { method: "POST", body: userForm, token });
      setUserModalOpen(false);
      fetchUsers();
    } catch (err) {
      setUserError(err.message);
    } finally {
      setCreatingUser(false);
    }
  }

  async function confirmUserAction() {
    if (!pendingUserAction) return;
    setError(null);
    setUpdatingUserStatus(true);
    try {
      await apiFetch(`/users/${pendingUserAction.user.id}/${pendingUserAction.action}`, { method: "PATCH", token });
      setPendingUserAction(null);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingUserStatus(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(listMeta.total / Number(listMeta.page_size || pageSize)));

  const userTotalPages = Math.max(1, Math.ceil(users.length / Number(userPageSize)));
  const paginatedUsers = users.slice((userPage - 1) * Number(userPageSize), userPage * Number(userPageSize));

  const criminalColumns = [
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
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    {
      key: "actions",
      header: "Action",
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={`View ${row.full_name}`}
            onClick={() => setViewCriminal(row)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={`Edit ${row.full_name}`}
            onClick={() => setEditCriminal(row)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          {canDelete && (
            <button
              type="button"
              aria-label={`Delete ${row.full_name}`}
              onClick={() => setPendingDelete(row)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const userColumns = [
    { key: "name", header: "Name" },
    { key: "username", header: "Username" },
    { key: "role", header: "Role", render: (row) => <span className="capitalize">{row.role.replace("_", " ")}</span> },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            row.is_active
              ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
          }`}
        >
          {row.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Action",
      render: (row) =>
        row.id !== currentUser.id ? (
          <button
            type="button"
            onClick={() => setPendingUserAction({ user: row, action: row.is_active ? "deactivate" : "activate" })}
            className={
              row.is_active
                ? "text-sm font-medium text-red-600 hover:underline dark:text-red-400"
                : "text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
            }
          >
            {row.is_active ? "Deactivate" : "Activate"}
          </button>
        ) : null,
    },
  ];

  return (
    <AdminLayout title={station ? station.name : "Station"}>
      <div className="space-y-6">
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        {station && (
          <Card>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Division</p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-white">{station.division}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">District</p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-white">{station.district}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Thana</p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-white">{station.thana}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Station code</p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-white">{station.code}</p>
              </div>
            </div>
          </Card>
        )}

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Criminals</h2>
            <Button type="button" onClick={() => setAddCriminalModalOpen(true)}>
              + Add Criminal
            </Button>
          </div>
          <DataTable
            columns={criminalColumns}
            rows={criminals}
            keyField="id"
            emptyMessage="No criminals recorded for this station."
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

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Users</h2>
            <Button type="button" onClick={openUserModal}>
              + Add User
            </Button>
          </div>
          <DataTable
            columns={userColumns}
            rows={paginatedUsers}
            keyField="id"
            emptyMessage="No users for this station yet."
          />
          {users.length > 0 && (
            <div className="mt-4">
              <Pagination
                currentPage={userPage}
                totalPages={userTotalPages}
                onPageChange={setUserPage}
                pageSize={userPageSize}
                totalItems={users.length}
                onPageSizeChange={(value) => {
                  setUserPageSize(value);
                  setUserPage(1);
                }}
              />
            </div>
          )}
        </Card>
      </div>

      <Modal open={!!pendingDelete} onClose={() => setPendingDelete(null)} title="Delete criminal record">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Are you sure you want to delete{" "}
          <span className="font-medium text-slate-900 dark:text-white">{pendingDelete?.full_name}</span> (
          {pendingDelete?.criminal_code})? This cannot be undone.
        </p>
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => setPendingDelete(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={confirmDelete} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!pendingUserAction}
        onClose={() => setPendingUserAction(null)}
        title={pendingUserAction?.action === "deactivate" ? "Deactivate user" : "Activate user"}
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Are you sure you want to {pendingUserAction?.action}{" "}
          <span className="font-medium text-slate-900 dark:text-white">{pendingUserAction?.user.name}</span> (
          {pendingUserAction?.user.username})?
        </p>
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => setPendingUserAction(null)} disabled={updatingUserStatus}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={pendingUserAction?.action === "deactivate" ? "danger" : "primary"}
            onClick={confirmUserAction}
            disabled={updatingUserStatus}
          >
            {updatingUserStatus
              ? "Saving…"
              : pendingUserAction?.action === "deactivate"
              ? "Deactivate"
              : "Activate"}
          </Button>
        </div>
      </Modal>

      <ViewCriminalModal criminal={viewCriminal} onClose={() => setViewCriminal(null)} />

      {editCriminal && (
        <EditCriminalModal
          key={editCriminal.id}
          criminal={editCriminal}
          token={token}
          onClose={() => setEditCriminal(null)}
          onSaved={handleCriminalSaved}
        />
      )}

      <Modal open={isUserModalOpen} onClose={() => setUserModalOpen(false)} title="Add User">
        <form onSubmit={handleCreateUser} className="grid gap-4">
          <FormField label="Name" htmlFor="user_name">
            <input id="user_name" value={userForm.name} onChange={updateUserField("name")} className={inputClasses} />
          </FormField>
          <FormField label="Username" htmlFor="user_username">
            <input
              id="user_username"
              value={userForm.username}
              onChange={updateUserField("username")}
              className={inputClasses}
            />
          </FormField>
          <FormField label="Password" htmlFor="user_password">
            <input
              id="user_password"
              type="password"
              value={userForm.password}
              onChange={updateUserField("password")}
              className={inputClasses}
            />
          </FormField>
          <FormField label="Role" htmlFor="user_role">
            <select id="user_role" value={userForm.role} onChange={updateUserField("role")} className={inputClasses}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </FormField>
          {userError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {userError}
            </p>
          )}
          <Button type="submit" disabled={creatingUser}>
            {creatingUser ? "Adding…" : "Add user"}
          </Button>
        </form>
      </Modal>

      <Modal open={isAddCriminalModalOpen} onClose={() => setAddCriminalModalOpen(false)} title="Add Criminal" size="lg">
        <CriminalForm
          lockedStationId={Number(stationId)}
          onCancel={() => setAddCriminalModalOpen(false)}
          onSuccess={() => {
            setAddCriminalModalOpen(false);
            fetchCriminals();
          }}
        />
      </Modal>
    </AdminLayout>
  );
}
