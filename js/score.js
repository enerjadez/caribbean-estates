const PLACE_POINTS = [4, 3, 2, 1];

export function rankEntries(entries, higher) {
  const filled = entries.filter((entry) => entry.raw !== "" && entry.raw != null && !Number.isNaN(Number(entry.raw)));
  const sorted = [...filled].sort((a, b) => (higher ? Number(b.raw) - Number(a.raw) : Number(a.raw) - Number(b.raw)));
  const ranked = {};
  let index = 0;
  while (index < sorted.length) {
    let end = index;
    while (end + 1 < sorted.length && Number(sorted[end + 1].raw) === Number(sorted[index].raw)) end += 1;
    const slice = PLACE_POINTS.slice(index, end + 1);
    const share = slice.reduce((sum, points) => sum + points, 0) / slice.length;
    for (let cursor = index; cursor <= end; cursor += 1) {
      ranked[sorted[cursor].teamId] = { points: share, place: index + 1, tied: end > index };
    }
    index = end + 1;
  }
  return ranked;
}

export function formatPoints(value) {
  if (value == null || Number.isNaN(value)) return "0";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
