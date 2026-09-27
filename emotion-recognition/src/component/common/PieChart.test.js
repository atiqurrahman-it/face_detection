import { render, screen, fireEvent, within } from "@testing-library/react";
import { ThemeContext } from "../../context/ThemeContext";
import PieChart from "./PieChart";

function renderWithTheme(ui) {
  return render(<ThemeContext.Provider value={{ theme: "light", toggleTheme: jest.fn() }}>{ui}</ThemeContext.Provider>);
}

test("renders a full ring (not a degenerate arc) when a single slice is 100%", () => {
  renderWithTheme(<PieChart slices={[{ key: "dhaka", label: "Dhaka", value: 5, light: "#2a78d6", dark: "#3987e5" }]} />);

  const paths = document.querySelectorAll("path");
  expect(paths).toHaveLength(1);
  // A degenerate arc collapses to a near-empty path; the full-ring fallback has two subpaths (outer + inner circle).
  expect(paths[0].getAttribute("d").match(/M/g)).toHaveLength(2);
  expect(screen.getByRole("img", { name: /Dhaka: 5 \(100%\)/i })).toBeInTheDocument();
});

test("renders one slice per non-zero entry and skips zero-value slices", () => {
  renderWithTheme(
    <PieChart
      slices={[
        { key: "dhaka", label: "Dhaka", value: 5, light: "#2a78d6", dark: "#3987e5" },
        { key: "ctg", label: "Chattogram", value: 3, light: "#eb6834", dark: "#d95926" },
        { key: "sylhet", label: "Sylhet", value: 0, light: "#008300", dark: "#008300" },
      ]}
    />
  );

  expect(screen.getByRole("img", { name: /Dhaka: 5/i })).toBeInTheDocument();
  expect(screen.getByRole("img", { name: /Chattogram: 3/i })).toBeInTheDocument();
  expect(screen.queryByText("Sylhet")).not.toBeInTheDocument();
  expect(document.querySelectorAll("path").length).toBe(2);
});

test("defaults the donut's center to the largest slice, and switches on hover", () => {
  const { container } = renderWithTheme(
    <PieChart
      slices={[
        { key: "dhaka", label: "Dhaka", value: 5, light: "#2a78d6", dark: "#3987e5" },
        { key: "ctg", label: "Chattogram", value: 3, light: "#eb6834", dark: "#d95926" },
      ]}
    />
  );

  const center = container.querySelector(".pointer-events-none");
  expect(within(center).getByText("Dhaka")).toBeInTheDocument();
  expect(within(center).getByText("5")).toBeInTheDocument();
  expect(within(center).getByText("63%")).toBeInTheDocument();

  const ctgSlice = screen.getByRole("img", { name: /Chattogram: 3/i });
  fireEvent.mouseEnter(ctgSlice);

  expect(within(center).getByText("Chattogram")).toBeInTheDocument();
  expect(within(center).getByText("3")).toBeInTheDocument();
  expect(within(center).getByText("38%")).toBeInTheDocument();

  fireEvent.mouseLeave(ctgSlice);
  expect(within(center).getByText("Dhaka")).toBeInTheDocument();
});

test("shows a fallback message when every slice is zero", () => {
  renderWithTheme(<PieChart slices={[{ key: "dhaka", label: "Dhaka", value: 0, light: "#2a78d6", dark: "#3987e5" }]} />);

  expect(screen.getByText(/no data yet/i)).toBeInTheDocument();
});
