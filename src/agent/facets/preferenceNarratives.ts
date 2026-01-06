import type { TierBand } from '../types';
import type { Rng } from '../utils';
import { uniqueStrings, weightedPickKUnique } from '../utils';
import type { PreferencesResult } from './preferences';
import type { HomeResult } from './domestic';

type NarrativeCandidate = { item: string; weight: number };

const DEFAULT_BEAT_COUNT = 2;
const MAX_BEAT_COUNT = 3;
const IGNORE_VALUE = new Set(['none', 'n/a', 'unknown', 'unspecified', 'neutral']);

const hasValue = (value?: string | null): value is string => (
  !!value && !IGNORE_VALUE.has(value.trim().toLowerCase())
);

const firstOrNull = (items?: string[]): string | null => (
  items && items.length ? items[0] : null
);

const buildList = (items?: string[], limit = 2): string | null => (
  items && items.length ? items.slice(0, limit).join(', ') : null
);

const pushCandidate = (list: NarrativeCandidate[], item: string | null, weight: number) => {
  if (!item) return;
  const trimmed = item.trim();
  if (!trimmed) return;
  list.push({ item: trimmed, weight });
};

const sentenceCase = (value: string | null): string | null => (
  value ? value.replace(/^\w/, (c) => c.toUpperCase()) : null
);

const pickNarrativeBeats = (rng: Rng, candidates: NarrativeCandidate[], count: number): string[] => {
  if (!candidates.length) return [];
  const safeCount = Math.max(1, Math.min(count, candidates.length, MAX_BEAT_COUNT));
  const weighted = candidates.map((c) => ({ item: c.item, weight: Math.max(0.15, c.weight) }));
  return uniqueStrings(weightedPickKUnique(rng, weighted, safeCount));
};

export function buildPreferenceNarrativeBeats(
  rng: Rng,
  preferences: PreferencesResult,
  roleSeedTags: readonly string[],
  tierBand: TierBand,
): string[] {
  const candidates: NarrativeCandidate[] = [];

  pushCandidate(candidates, sentenceCase(firstOrNull(preferences.food.cuisineFavorites)), 2.2);
  pushCandidate(candidates, sentenceCase(firstOrNull(preferences.food.comfortFoods)), 1.6);

  if (hasValue(preferences.food.ritualDrink)) {
    pushCandidate(candidates, `Keeps ${preferences.food.ritualDrink} close.`, 1.4);
  }
  if (hasValue(preferences.food.caffeineHabit)) {
    pushCandidate(candidates, `Runs on ${preferences.food.caffeineHabit}.`, 1.1);
  }
  if (hasValue(preferences.food.alcoholPreference) && preferences.food.alcoholPreference.toLowerCase() !== 'none') {
    pushCandidate(candidates, `Reaches for ${preferences.food.alcoholPreference} to unwind.`, 1.0);
  }

  pushCandidate(candidates, sentenceCase(firstOrNull(preferences.media.genreTopK)), 1.2);
  pushCandidate(candidates, firstOrNull(preferences.fashion.styleTags) ? `Defaults to ${preferences.fashion.styleTags[0]} looks.` : null, 1.2);
  pushCandidate(candidates, hasValue(preferences.environment.temperature) ? `Prefers ${preferences.environment.temperature} climates.` : null, 1.0);
  pushCandidate(candidates, hasValue(preferences.aesthetics.colorPalette) ? `Drawn to ${preferences.aesthetics.colorPalette} palettes.` : null, 1.0);
  pushCandidate(candidates, firstOrNull(preferences.artistic.mediums) ? `Expresses through ${preferences.artistic.mediums[0]}.` : null, 1.0);

  if (hasValue(preferences.social.groupStyle)) {
    pushCandidate(candidates, `Prefers ${preferences.social.groupStyle} company.`, 1.0);
  }
  if (hasValue(preferences.social.communicationMethod)) {
    pushCandidate(candidates, `Communicates via ${preferences.social.communicationMethod}.`, 0.9);
  }

  pushCandidate(candidates, firstOrNull(preferences.work.preferredOperations)
    ? `Leans toward ${preferences.work.preferredOperations[0]} operations.` : null, 1.1);
  pushCandidate(candidates, firstOrNull(preferences.work.avoidedOperations)
    ? `Avoids ${preferences.work.avoidedOperations[0]} work when possible.` : null, 0.9);

  if (hasValue(preferences.equipment.weaponPreference)) {
    pushCandidate(candidates, `Trusts ${preferences.equipment.weaponPreference}.`, 0.8);
  }

  if (hasValue(preferences.quirks.luckyItem)) {
    pushCandidate(candidates, `Never without ${preferences.quirks.luckyItem}.`, 0.8);
  }

  if (hasValue(preferences.time.planningStyle)) {
    pushCandidate(candidates, `Plans with a ${preferences.time.planningStyle} cadence.`, 0.7);
  }

  // Weight operational roles toward security/discipline beats
  if (roleSeedTags.includes('operative') || roleSeedTags.includes('security')) {
    candidates.forEach((c) => {
      if (c.item.toLowerCase().includes('avoid') || c.item.toLowerCase().includes('security')) {
        c.weight += 0.4;
      }
    });
  }

  if (tierBand === 'mass') {
    candidates.forEach((c) => {
      if (c.item.toLowerCase().includes('comfort') || c.item.toLowerCase().includes('climates')) {
        c.weight += 0.3;
      }
    });
  }

  const beatCount = rng.int(DEFAULT_BEAT_COUNT, MAX_BEAT_COUNT + 1);
  return pickNarrativeBeats(rng, candidates, beatCount);
}

export function buildLivingSpaceNarrativeBeats(
  rng: Rng,
  preferences: PreferencesResult,
  home: HomeResult,
  roleSeedTags: readonly string[],
): string[] {
  const candidates: NarrativeCandidate[] = [];
  const spaceType = preferences.livingSpace.spaceType;
  const decorStyle = preferences.livingSpace.decorStyle;
  const comfortItems = buildList(preferences.livingSpace.comfortItems, 2);

  pushCandidate(
    candidates,
    hasValue(spaceType) ? `Keeps a ${spaceType} setup.` : null,
    1.4,
  );
  pushCandidate(
    candidates,
    hasValue(decorStyle) ? `Leans ${decorStyle} in decor choices.` : null,
    1.2,
  );
  pushCandidate(
    candidates,
    comfortItems ? `Comfort anchors: ${comfortItems}.` : null,
    1.2,
  );
  pushCandidate(
    candidates,
    hasValue(preferences.livingSpace.securityHabit) ? `Runs ${preferences.livingSpace.securityHabit} checks.` : null,
    1.3,
  );
  pushCandidate(
    candidates,
    hasValue(preferences.livingSpace.visitorPolicy) ? `Visitor policy stays ${preferences.livingSpace.visitorPolicy}.` : null,
    1.0,
  );
  pushCandidate(
    candidates,
    hasValue(preferences.livingSpace.lightPreference) ? `Prefers ${preferences.livingSpace.lightPreference} lighting.` : null,
    0.9,
  );
  pushCandidate(
    candidates,
    hasValue(preferences.livingSpace.organizationStyle) ? `Keeps things ${preferences.livingSpace.organizationStyle}.` : null,
    0.9,
  );

  pushCandidate(
    candidates,
    home.housingStability ? `Home life feels ${home.housingStability}.` : null,
    1.1,
  );
  pushCandidate(
    candidates,
    home.householdComposition ? `Shares space in a ${home.householdComposition} household.` : null,
    1.0,
  );
  pushCandidate(
    candidates,
    home.privacyLevel ? `Protects a ${home.privacyLevel} level of privacy.` : null,
    1.0,
  );
  pushCandidate(
    candidates,
    home.neighborhoodType ? `Neighborhood vibe: ${home.neighborhoodType}.` : null,
    0.8,
  );

  if (roleSeedTags.includes('operative') || roleSeedTags.includes('security')) {
    candidates.forEach((c) => {
      if (c.item.toLowerCase().includes('security') || c.item.toLowerCase().includes('privacy')) {
        c.weight += 0.5;
      }
    });
  }

  const beatCount = rng.int(DEFAULT_BEAT_COUNT, MAX_BEAT_COUNT + 1);
  return pickNarrativeBeats(rng, candidates, beatCount);
}
