import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import HomePage from "./component/page/home/home_page";
import RealFaceDetection from "./component/page/face_detection/face_detection";
import ImageInput from "./component/page/image_input/image_input";
import { ThemeProvider } from "./context/ThemeContext";

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route exact path="/" element={<HomePage />} />
          <Route exact path="/face-detection" element={<RealFaceDetection/>} />
          <Route exact path="/input-image" element={<ImageInput/>} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
