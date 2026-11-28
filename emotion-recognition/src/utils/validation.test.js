import { validateForm } from "./validation";

const rules = {
  name: { label: "Name", required: true },
  password: { label: "Password", required: true, minLength: 8 },
  note: { label: "Note" },
};

test("flags empty and whitespace-only required fields", () => {
  expect(validateForm({ name: "  ", password: "", note: "" }, rules)).toEqual({
    name: "Name is required",
    password: "Password is required",
  });
});

test("enforces minimum length", () => {
  expect(validateForm({ name: "A", password: "short" }, rules)).toEqual({
    password: "Password must be at least 8 characters",
  });
});

test("returns no errors for a valid form", () => {
  expect(validateForm({ name: "A", password: "longenough" }, rules)).toEqual({});
});
