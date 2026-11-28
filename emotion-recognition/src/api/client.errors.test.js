import { fieldErrorsFromDetail, formatErrorDetail } from "./client";

test("returns string details unchanged", () => {
  expect(formatErrorDetail("Station code already exists")).toBe("Station code already exists");
});

test("formats FastAPI validation errors as readable lines", () => {
  const detail = [
    { loc: ["body", "name"], msg: "String should have at least 1 character", type: "string_too_short" },
    { loc: ["body", "admin_username"], msg: "Field required", type: "missing" },
    { loc: ["body", "admin_password"], msg: "Value error, Password too short", type: "value_error" },
  ];
  expect(formatErrorDetail(detail)).toBe(
    "Name: This field is required\nAdmin username: This field is required\nAdmin password: Password too short"
  );
});

test("returns null when there is no detail", () => {
  expect(formatErrorDetail(undefined)).toBeNull();
});

test("maps pydantic validation errors to per-field messages", () => {
  const detail = [
    { loc: ["body", "admin_password"], msg: "ensure this value has at least 8 characters" },
    { loc: ["full_name"], msg: "field required" },
  ];
  expect(fieldErrorsFromDetail(detail)).toEqual({
    admin_password: "Must be at least 8 characters",
    full_name: "This field is required",
  });
  expect(fieldErrorsFromDetail("Station code already exists")).toBeNull();
});
