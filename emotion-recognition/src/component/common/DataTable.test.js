import { render, screen } from "@testing-library/react";
import DataTable from "./DataTable";

const columns = [
  { key: "photo", header: "", render: () => <span>PHOTO</span> },
  { key: "name", header: "Name" },
  { key: "crime", header: "Crime" },
  { key: "actions", header: "Action", render: (row) => <button type="button">Edit {row.name}</button> },
];
const rows = [
  { id: 1, name: "Rahim", crime: "Theft" },
  { id: 2, name: "Karim", crime: "Fraud" },
];

function mockScreen(isPhone) {
  window.matchMedia = jest.fn().mockImplementation(() => ({
    matches: isPhone,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));
}

afterEach(() => {
  delete window.matchMedia;
});

test("renders a table on wide screens", () => {
  mockScreen(false);
  render(<DataTable columns={columns} rows={rows} keyField="id" />);
  expect(screen.getByRole("table")).toBeInTheDocument();
  expect(screen.getAllByRole("columnheader")).toHaveLength(4);
});

test("renders one card per row on phones, with labels and actions", () => {
  mockScreen(true);
  render(<DataTable columns={columns} rows={rows} keyField="id" />);
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  expect(screen.getAllByText("PHOTO")).toHaveLength(2);
  expect(screen.getByText("Rahim")).toBeInTheDocument();
  expect(screen.getAllByText("Crime")).toHaveLength(2);
  expect(screen.getByText("Fraud")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Edit Karim" })).toBeInTheDocument();
  // "Name" is shown as the card title, not as a label
  expect(screen.queryByText("Name")).not.toBeInTheDocument();
});

test("falls back to a table when matchMedia is unavailable", () => {
  render(<DataTable columns={columns} rows={rows} keyField="id" />);
  expect(screen.getByRole("table")).toBeInTheDocument();
});
