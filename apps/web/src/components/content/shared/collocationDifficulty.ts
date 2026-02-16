export type CollocationDisplayLevel = "basic" | "core" | "full";

export function resolveDifficulty(item: { difficulty?: 1 | 2 | 3 }): 1 | 2 | 3 {
  const d = item.difficulty;
  if (d === 1 || d === 2 || d === 3) {
    return d;
  }
  return 2;
}

export function filterCollocationsByLevel<T extends { difficulty?: 1 | 2 | 3 }>(
  collocations: T[],
  level: CollocationDisplayLevel,
): T[] {
  if (!collocations.length) return collocations;

  // Density-oriented behavior for UX:
  // - basic: fewer tags (hard items only)
  // - core: medium density
  // - full: all detected tags
  const minDifficulty = level === "basic" ? 3 : level === "core" ? 2 : 1;
  return collocations.filter(
    (item) => resolveDifficulty(item) >= minDifficulty,
  );
}
