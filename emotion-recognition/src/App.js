import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import HomePage from "./component/page/home/home_page";
import RealFaceDetection from "./component/page/face_detection/face_detection";
import ImageInput from "./component/page/image_input/image_input";
import LoginPage from "./component/page/login/login_page";
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
                  <div>Super Admin Dashboard placeholder</div>
                </ProtectedRoute>
              }
            />
            <Route
              exact
              path="/dashboard"
              element={
                <ProtectedRoute roles={["admin", "user"]}>
                  <div>Station Dashboard placeholder</div>
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
