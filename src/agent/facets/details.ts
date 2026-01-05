import type {
  AgentGenerationTraceV1,
  AgentVocabV1,
  DetailCategory,
  DetailItem,
  Latents,
} from '../types';
import { clampInt, facetSeed, makeRng, traceFacet, traceSet, uniqueStrings, weightedPick } from '../utils';
import type { Aptitudes } from './aptitudes';
import type { PsychTraits } from './traits';

const DEFAULT_DETAIL_COUNT_RANGE: readonly [number, number] = [3, 5];

type DetailPool = {
  category: DetailCategory;
  items: string[];
  weight: number;
};

type WeightedDetail = {
  key: string;
  category: DetailCategory;
  item: string;
  weight: number;
};

function collectPool(primary?: string[], fallback?: string[]): string[] {
  return uniqueStrings([...(primary ?? []), ...(fallback ?? [])]);
}

function toWeightedPool(category: DetailCategory, items: string[], weight: number): DetailPool | null {
  if (!items.length) return null;
  return { category, items, weight };
}

export function computeDetails(
  seed: string,
  vocab: AgentVocabV1,
  latents: Latents,
  traits: PsychTraits,
  aptitudes: Aptitudes,
  trace?: AgentGenerationTraceV1,
): DetailItem[] {
  traceFacet(trace, seed, 'detailGeneration');
  const rng = makeRng(facetSeed(seed, 'detailGeneration'));

  const conscientious01 = traits.conscientiousness / 1000;
  const social01 = latents.socialBattery / 1000;
  const stress01 = latents.stressReactivity / 1000;
  const opsec01 = latents.opsecDiscipline / 1000;
  const empathy01 = aptitudes.empathy / 1000;

  const detailVocab = vocab.detailGeneration ?? {};

  const physicalItems = collectPool(detailVocab.physicalFeatures, [
    ...(detailVocab.bodyLanguage ?? []),
    ...(detailVocab.gait ?? []),
    ...(detailVocab.chronicConditions ?? []),
    ...(detailVocab.medicationDependencies ?? []),
  ]);

  const routineItems = collectPool(detailVocab.morningRituals, [
    ...(detailVocab.workHabits ?? []),
    ...(detailVocab.eveningRoutines ?? []),
  ]);

  const socialItems = collectPool(detailVocab.communicationPatterns, [
    ...(detailVocab.interactionStyles ?? []),
  ]);

  const foodItems = collectPool(detailVocab.eatingHabits, [
    ...(detailVocab.drinkingPreferences ?? []),
  ]);

  const psychologicalItems = collectPool(detailVocab.specificPhobias, [
    ...(detailVocab.abstractFears ?? []),
    ...(detailVocab.stressResponses ?? []),
    ...(detailVocab.selfSoothingBehaviors ?? []),
  ]);

  const historyItems = collectPool(detailVocab.keptObjects, [
    ...(detailVocab.lostObjects ?? []),
    ...(detailVocab.traumaMarkers ?? []),
    ...(detailVocab.joyMarkers ?? []),
  ]);

  const traditionItems = collectPool(detailVocab.familyRituals, [
    ...(detailVocab.culturalPractices ?? []),
    ...(detailVocab.personalSuperstitions ?? []),
    ...(detailVocab.acquiredSuperstitions ?? []),
  ]);

  const speechItems = collectPool(detailVocab.fillerPatterns, [
    ...(detailVocab.languageMixing ?? []),
    ...(detailVocab.catchphrasesOriginal ?? []),
    ...(detailVocab.catchphrasesInherited ?? []),
  ]);

  const environmentItems = collectPool(detailVocab.spacePreferences, [
    ...(detailVocab.territoryMarking ?? []),
    ...(detailVocab.weatherResponses ?? []),
  ]);

  const relationshipItems = collectPool(detailVocab.attachmentMethods, [
    ...(detailVocab.conflictPatterns ?? []),
  ]);

  const hiddenItems = collectPool(detailVocab.secretSkills, [
    ...(detailVocab.secretConnections ?? []),
  ]);

  const pools = [
    toWeightedPool('physical', physicalItems, 1.1 + 0.2 * (1 - stress01)),
    toWeightedPool('routine', routineItems, 0.9 + 0.5 * conscientious01),
    toWeightedPool('social', socialItems, 0.8 + 0.5 * social01 + 0.2 * empathy01),
    toWeightedPool('food', foodItems, 0.7 + 0.2 * (1 - conscientious01)),
    toWeightedPool('psychological', psychologicalItems, 0.8 + 0.6 * stress01),
    toWeightedPool('history', historyItems, 0.8 + 0.2 * empathy01),
    toWeightedPool('tradition', traditionItems, 0.75 + 0.2 * (1 - social01)),
    toWeightedPool('speech', speechItems, 0.7 + 0.3 * social01),
    toWeightedPool('environment', environmentItems, 0.7 + 0.2 * (1 - social01)),
    toWeightedPool('relationship', relationshipItems, 0.75 + 0.3 * empathy01),
    toWeightedPool('hidden', hiddenItems, 0.6 + 0.5 * opsec01),
  ].filter((pool): pool is DetailPool => Boolean(pool));

  const candidates: WeightedDetail[] = [];
  const seenItems = new Set<string>();
  for (const pool of pools) {
    for (const item of pool.items) {
      if (!item || seenItems.has(item)) continue;
      seenItems.add(item);
      candidates.push({
        key: `${pool.category}::${item}`,
        category: pool.category,
        item,
        weight: pool.weight,
      });
    }
  }

  const targetCount = clampInt(rng.int(DEFAULT_DETAIL_COUNT_RANGE[0], DEFAULT_DETAIL_COUNT_RANGE[1]), 3, 5);
  const picks: DetailItem[] = [];
  const usedItems = new Set<string>();
  const remaining = new Map<string, WeightedDetail>();
  for (const candidate of candidates) remaining.set(candidate.key, candidate);

  const pickFromCategory = (category: DetailCategory, items: string[]): void => {
    if (!items.length || picks.length >= targetCount) return;
    const available = items.filter((item) => !usedItems.has(item));
    if (!available.length) return;
    const item = rng.pick(available);
    usedItems.add(item);
    picks.push({ category, item });
    const key = `${category}::${item}`;
    remaining.delete(key);
    for (const [otherKey, detail] of remaining) {
      if (detail.item === item) remaining.delete(otherKey);
    }
  };

  pickFromCategory('physical', physicalItems);
  pickFromCategory('routine', routineItems);

  while (picks.length < targetCount && remaining.size > 0) {
    const options = [...remaining.values()].map((detail) => ({ item: detail.key, weight: detail.weight }));
    const key = weightedPick(rng, options);
    const detail = remaining.get(key);
    if (!detail) break;
    if (usedItems.has(detail.item)) {
      remaining.delete(key);
      continue;
    }
    usedItems.add(detail.item);
    picks.push({ category: detail.category, item: detail.item });
    remaining.delete(key);
  }

  const result = picks.slice(0, targetCount);
  traceSet(trace, 'detailGeneration', result, { method: 'weightedPick', dependsOn: { vocab: 'detailGeneration' } });
  return result;
}
