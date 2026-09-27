import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import AdminLayout from "../../layout/AdminLayout";
import CriminalForm from "./CriminalForm";

export default function AddCriminal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fixedStationId = searchParams.get("station_id");

  function handleSuccess() {
    if (fixedStationId) {
      navigate(`/admin/stations/${fixedStationId}`);
    } else {
      navigate(user.role === "super_admin" ? "/admin/criminals" : "/station/criminals");
    }
  }

  return (
    <AdminLayout title="Add Criminal">
      <CriminalForm lockedStationId={fixedStationId} onSuccess={handleSuccess} />
    </AdminLayout>
  );
}
