export type CollocationDisplayLevel = "basic" | "core" | "full";

export interface CollocationLike {
  difficulty?: 1 | 2 | 3;
}

export function resolveDifficulty(item: CollocationLike): 1 | 2 | 3 {
  const value = item?.difficulty;
  if (value === 1 || value === 2 || value === 3) return value;
  return 2;
}

export function filterCollocationsByLevel<T extends CollocationLike>(
  collocations: T[],
  level: CollocationDisplayLevel,
): T[] {
  if (!collocations?.length) return collocations;
  const minDifficulty = level === "basic" ? 3 : level === "core" ? 2 : 1;
  return collocations.filter(
    (item) => resolveDifficulty(item) >= minDifficulty,
  );
}

export function normalizePhrase(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[^a-zA-Z']+|[^a-zA-Z']+$/g, "");
}

export interface NormalizedStudyHighlights {
  studyWordSet: Set<string>;
  studyPhraseSet: Set<string>;
  studyHighlightMap: Record<string, boolean>;
}

export function normalizeStudyHighlights(
  rawHighlights?: unknown,
): NormalizedStudyHighlights {
  const studyWordSet = new Set<string>();
  const studyPhraseSet = new Set<string>();
  const studyHighlightMap: Record<string, boolean> = {};

  const pushValue = (value: string) => {
    const normalized = normalizePhrase(value);
    if (!normalized) return;
    studyHighlightMap[normalized] = true;
    if (normalized.includes(" ")) {
      studyPhraseSet.add(normalized);
    } else {
      studyWordSet.add(normalized);
    }
  };

  if (Array.isArray(rawHighlights)) {
    rawHighlights.forEach((value) => {
      if (typeof value === "string") pushValue(value);
    });
  } else if (rawHighlights && typeof rawHighlights === "object") {
    Object.entries(rawHighlights as Record<string, unknown>).forEach(
      ([key, enabled]) => {
        if (enabled) pushValue(key);
      },
    );
  }

  return { studyWordSet, studyPhraseSet, studyHighlightMap };
}
