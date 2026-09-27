import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import HomePage from "./component/page/home/home_page";
import RealFaceDetection from "./component/page/face_detection/face_detection";
import ImageInput from "./component/page/image_input/image_input";
import LoginPage from "./component/page/login/login_page";
import SuperAdminDashboard from "./component/page/dashboard/super_admin_dashboard";
import CreateStation from "./component/page/stations/create_station";
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
            <Route exact path="/face-detection" element={<RealFaceDetection />} />
            <Route exact path="/input-image" element={<ImageInput />} />
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
              path="/stations/new"
              element={
                <ProtectedRoute roles={["super_admin"]}>
                  <CreateStation />
                </ProtectedRoute>
              }
            />
            <Route
              exact
              path="/criminals"
              element={
                <ProtectedRoute roles={["super_admin", "admin", "user"]}>
                  <CriminalSearch />
                </ProtectedRoute>
              }
            />
            <Route
              exact
              path="/criminals/new"
              element={
                <ProtectedRoute roles={["super_admin", "admin", "user"]}>
                  <AddCriminal />
                </ProtectedRoute>
              }
            />
            <Route
              exact
              path="/dashboard"
              element={
                <ProtectedRoute roles={["admin", "user"]}>
                  <StationDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              exact
              path="/users"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
