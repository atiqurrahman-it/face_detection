import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { ThemeContext } from "../../../context/ThemeContext";
import FunGame from "./fun_game";

jest.mock("../face_detection/face_detection", () => () => <div>webcam-panel</div>);
jest.mock("../image_input/image_input", () => () => <div>upload-panel</div>);

function renderFunGame() {
  return render(
    <AuthContext.Provider
      value={{ user: { id: 1, role: "user", username: "officer1", station_id: 1 }, token: "abc123", loading: false, logout: jest.fn() }}
    >
      <ThemeContext.Provider value={{ theme: "light", toggleTheme: jest.fn() }}>
        <MemoryRouter>
          <FunGame />
        </MemoryRouter>
      </ThemeContext.Provider>
    </AuthContext.Provider>
  );
}

test("shows the live webcam panel by default", () => {
  renderFunGame();
  expect(screen.getByText("webcam-panel")).toBeInTheDocument();
  expect(screen.queryByText("upload-panel")).not.toBeInTheDocument();
});

test("switches to the image upload panel on click, unmounting the webcam panel", () => {
  renderFunGame();
  fireEvent.click(screen.getByRole("button", { name: /image upload/i }));
  expect(screen.getByText("upload-panel")).toBeInTheDocument();
  expect(screen.queryByText("webcam-panel")).not.toBeInTheDocument();
});
