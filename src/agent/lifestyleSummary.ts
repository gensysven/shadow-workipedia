export type EverydayLifeSummaryInput = {
  thirdPlaces: string[];
  commuteModes: string[];
  weeklyAnchors: string[];
  pettyHabits: string[];
  caregivingObligations: string[];
};

export type EverydayLifeSummary = {
  thirdPlaces: string;
  commuteModes: string;
  weeklyAnchors: string;
  pettyHabits: string;
  caregivingObligations: string;
};

export type MemoryTraumaSummaryInput = {
  memoryTags: string[];
  traumaTags: string[];
  triggerPatterns: string[];
  responsePatterns: string[];
};

export type MemoryTraumaSummary = {
  memoryTags: string;
  traumaTags: string;
  triggerPatterns: string;
  responsePatterns: string;
};

const DEFAULT_EMPTY = '—';

function joinOrPlaceholder(values: string[], format: (value: string) => string): string {
  if (!values.length) return DEFAULT_EMPTY;
  return values.map(format).join(', ');
}

export function buildEverydayLifeSummary(
  everyday: EverydayLifeSummaryInput,
  format: (value: string) => string = (value) => value,
): EverydayLifeSummary {
  return {
    thirdPlaces: joinOrPlaceholder(everyday.thirdPlaces, format),
    commuteModes: joinOrPlaceholder(everyday.commuteModes, format),
    weeklyAnchors: joinOrPlaceholder(everyday.weeklyAnchors, format),
    pettyHabits: joinOrPlaceholder(everyday.pettyHabits, format),
    caregivingObligations: joinOrPlaceholder(everyday.caregivingObligations, format),
  };
}

export function buildMemoryTraumaSummary(
  memory: MemoryTraumaSummaryInput,
  format: (value: string) => string = (value) => value,
): MemoryTraumaSummary {
  return {
    memoryTags: joinOrPlaceholder(memory.memoryTags, format),
    traumaTags: joinOrPlaceholder(memory.traumaTags, format),
    triggerPatterns: joinOrPlaceholder(memory.triggerPatterns, format),
    responsePatterns: joinOrPlaceholder(memory.responsePatterns, format),
  };
}
