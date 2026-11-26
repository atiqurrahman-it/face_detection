import { faceLabel, sortFacesReadingOrder } from "./faceOrder";

const face = (x, y, emotion = "Happy", w = 100, h = 100) => ({ box: { x, y, w, h }, emotion });

test("sorts a 3x3 grid top-to-bottom, then left-to-right", () => {
  const grid = [
    face(600, 20), face(20, 300), face(300, 40),
    face(20, 10), face(600, 610), face(310, 600),
    face(590, 290), face(300, 320), face(10, 620),
  ];

  const sorted = sortFacesReadingOrder(grid).map((f) => [f.box.x, f.box.y]);

  expect(sorted).toEqual([
    [20, 10], [300, 40], [600, 20],
    [20, 300], [300, 320], [590, 290],
    [10, 620], [310, 600], [600, 610],
  ]);
});

test("does not mutate the input array", () => {
  const faces = [face(200, 0), face(0, 0)];
  sortFacesReadingOrder(faces);
  expect(faces[0].box.x).toBe(200);
});

test("handles empty and missing input", () => {
  expect(sortFacesReadingOrder([])).toEqual([]);
  expect(sortFacesReadingOrder(undefined)).toEqual([]);
});

test("faceLabel prefixes the face number when numbered", () => {
  expect(faceLabel(face(0, 0, "Angry"), 0, true)).toBe("1 · Angry");
  expect(faceLabel(face(0, 0, "Angry"), 4, true)).toBe("5 · Angry");
  expect(faceLabel(face(0, 0, "Angry"), 0, false)).toBe("Angry");
});
