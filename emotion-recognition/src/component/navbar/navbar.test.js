import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeContext } from "../../context/ThemeContext";
import Nav from "./navbar";

function renderNav() {
  return render(
    <ThemeContext.Provider value={{ theme: "light", toggleTheme: jest.fn() }}>
      <MemoryRouter>
        <Nav />
      </MemoryRouter>
    </ThemeContext.Provider>
  );
}

test("renders the ArgusID wordmark", () => {
  renderNav();
  expect(screen.getByText("ArgusID")).toBeInTheDocument();
});
