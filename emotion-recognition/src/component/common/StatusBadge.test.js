import { render, screen } from "@testing-library/react";
import StatusBadge from "./StatusBadge";

test("renders the correct color class for each known status", () => {
  const cases = [
    ["Wanted", "bg-red-100"],
    ["Under trial", "bg-orange-100"],
    ["Convicted", "bg-purple-100"],
    ["Released", "bg-green-100"],
    ["Arrested", "bg-amber-100"],
    ["Absconding", "bg-slate-100"],
  ];

  for (const [status, expectedClass] of cases) {
    const { unmount } = render(<StatusBadge status={status} />);
    expect(screen.getByText(status).className).toEqual(expect.stringContaining(expectedClass));
    unmount();
  }
});

test("falls back to a visible style for an unrecognized status instead of crashing", () => {
  render(<StatusBadge status="Some Future Status" />);

  const badge = screen.getByText("Some Future Status");
  expect(badge).toBeInTheDocument();
  expect(badge.className).toEqual(expect.stringContaining("bg-slate-100"));
});
