import { useNavigate, useSearchParams } from "react-router-dom";
import AdminLayout from "../../layout/AdminLayout";
import CriminalForm from "./CriminalForm";

export default function AddCriminal() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fixedStationId = searchParams.get("station_id");

  return (
    <AdminLayout title="Add Criminal">
      <CriminalForm
        lockedStationId={fixedStationId}
        onSuccess={() => navigate(fixedStationId ? `/stations/${fixedStationId}` : "/criminals")}
      />
    </AdminLayout>
  );
}
