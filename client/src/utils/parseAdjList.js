
export function parseAdjList(text) {
  const map = {};
  const lines = text.split("\n");
  for (let raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const parts = line.split(":");
    if (parts.length < 2) continue;
    const node = parts[0].trim();
    const neighbors = parts[1]
      .split(/[ ,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    map[node] = [...new Set(neighbors)];
  }
  // ensure isolated nodes are included if referenced as neighbor
  Object.values(map)
    .flat()
    .forEach((n) => {
      if (!map[n]) map[n] = [];
    });
  return map;
}

export default parseAdjList;