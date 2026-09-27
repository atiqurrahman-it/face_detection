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

test("does not render Face Detection or Image Input links", () => {
  renderNav();
  expect(screen.queryByRole("link", { name: /face detection/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /image input/i })).not.toBeInTheDocument();
});

test("renders a Sign In link to /login", () => {
  renderNav();
  const link = screen.getByRole("link", { name: /sign in/i });
  expect(link).toHaveAttribute("href", "/login");
});
