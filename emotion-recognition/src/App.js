import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import HomePage from "./component/page/home/home_page";
import FunGame from "./component/page/fun_game/fun_game";
import LoginPage from "./component/page/login/login_page";
import SuperAdminDashboard from "./component/page/dashboard/super_admin_dashboard";
import CreateStation from "./component/page/stations/create_station";
import StationDetail from "./component/page/stations/station_detail";
import CriminalSearch from "./component/page/criminals/criminal_search";
import AddCriminal from "./component/page/criminals/add_criminal";
import StationDashboard from "./component/page/dashboard/station_dashboard";
import UserManagement from "./component/page/users/user_management";
import ProtectedRoute from "./component/routing/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route exact path="/" element={<HomePage />} />
            <Route exact path="/login" element={<LoginPage />} />
            <Route
              exact
              path="/fun-game"
              element={
                <ProtectedRoute roles={["super_admin", "admin", "user"]}>
                  <FunGame />
                </ProtectedRoute>
              }
            />

            {/* Admin portal — super_admin only */}
            <Route
              exact
              path="/admin"
              element={
                <ProtectedRoute roles={["super_admin"]}>
                  <SuperAdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              exact
              path="/admin/stations/new"
              element={
                <ProtectedRoute roles={["super_admin"]}>
                  <CreateStation />
                </ProtectedRoute>
              }
            />
            <Route
              exact
              path="/admin/stations/:stationId"
              element={
                <ProtectedRoute roles={["super_admin"]}>
                  <StationDetail />
                </ProtectedRoute>
              }
            />
            <Route
              exact
              path="/admin/criminals"
              element={
                <ProtectedRoute roles={["super_admin"]}>
                  <CriminalSearch />
                </ProtectedRoute>
              }
            />
            <Route
              exact
              path="/admin/criminals/new"
              element={
                <ProtectedRoute roles={["super_admin"]}>
                  <AddCriminal />
                </ProtectedRoute>
              }
            />

            {/* Station portal — station admin/user only */}
            <Route
              exact
              path="/station"
              element={
                <ProtectedRoute roles={["admin", "user"]}>
                  <StationDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              exact
              path="/station/criminals"
              element={
                <ProtectedRoute roles={["admin", "user"]}>
                  <CriminalSearch />
                </ProtectedRoute>
              }
            />
            <Route
              exact
              path="/station/criminals/new"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AddCriminal />
                </ProtectedRoute>
              }
            />
            <Route
              exact
              path="/station/users"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
