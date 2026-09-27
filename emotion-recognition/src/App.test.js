import { render, screen } from "@testing-library/react";
import App from "./App";

jest.mock("./component/backgorund/backgorun", () => () => null);

test("redirects a removed or unknown route to the home page", () => {
  window.history.pushState({}, "", "/face-detection");
  render(<App />);
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("CrimTrace");
  expect(screen.getByRole("link", { name: /sign in to your station/i })).toBeInTheDocument();
});

test("bounces an unauthenticated visitor away from the Fun Game route to login", () => {
  window.history.pushState({}, "", "/fun-game");
  render(<App />);
  expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
  expect(screen.queryByText(/play with the detection engine/i)).not.toBeInTheDocument();
});
