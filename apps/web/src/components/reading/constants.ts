/**
 * Reading Mode Constants
 */

// Number of sentences to load at a time for progressive loading
export const BATCH_SIZE = 20;

interface HighlightOption {
  label: string;
  value: string;
  range?: [number, number];
}

// Vocabulary highlighting options
export const HIGHLIGHT_OPTIONS: HighlightOption[] = [
  { label: "COCA Top 5000", value: "coca20000", range: [1, 5000] },
  { label: "COCA 5k-10k", value: "coca20000", range: [5001, 10000] },
  { label: "COCA 10k-11k", value: "coca20000", range: [10001, 11000] },
  { label: "COCA 11k-12k", value: "coca20000", range: [11001, 12000] },
  { label: "COCA 12k-13k", value: "coca20000", range: [12001, 13000] },
  { label: "COCA 13k-14k", value: "coca20000", range: [13001, 14000] },
  { label: "COCA 14k-15k", value: "coca20000", range: [14001, 15000] },
  { label: "COCA 15k-20k", value: "coca20000", range: [15001, 20000] },
  { label: "CET-4", value: "cet4" },
  { label: "CET-6", value: "cet6" },
];

/**
 * Maps calibration level (0-11) to HIGHLIGHT_OPTIONS index.
 * Used by ReadingMode to auto-select based on user's calibration result.
 */
export const mapLevelToOptionIndex = (level: number) => {
  // Level 0-1 -> Top 5000 (index 0)
  // Level 2-4 -> 5k-10k (index 1)
  // Level 5-7 -> 10k-15k (indexes 2-6)
  // Level 8-11 -> 15k-20k (index 7)
  const mapping = [0, 0, 1, 1, 1, 2, 3, 4, 5, 6, 7, 7];
  return mapping[Math.min(Math.max(level, 0), 11)];
};
