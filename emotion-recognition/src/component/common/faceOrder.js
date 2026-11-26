// Reading order for detected faces: top-to-bottom rows, then left-to-right in each row.
// Two faces share a row when their vertical centres are within half the typical face
// height, so slightly uneven heads in a grid photo still land in the same row.
export function sortFacesReadingOrder(faces = []) {
  if (!faces || faces.length === 0) return [];

  const centreY = (f) => f.box.y + f.box.h / 2;
  const heights = faces.map((f) => f.box.h).sort((a, b) => a - b);
  const rowTolerance = heights[Math.floor(heights.length / 2)] / 2;

  const byY = [...faces].sort((a, b) => centreY(a) - centreY(b));
  const rows = [];
  byY.forEach((f) => {
    const row = rows[rows.length - 1];
    if (row && Math.abs(centreY(f) - row.anchorY) <= rowTolerance) {
      row.items.push(f);
    } else {
      rows.push({ anchorY: centreY(f), items: [f] });
    }
  });

  return rows.flatMap((row) => row.items.sort((a, b) => a.box.x - b.box.x));
}

export function faceLabel(face, index, numbered) {
  return numbered ? `${index + 1} · ${face.emotion}` : face.emotion;
}
