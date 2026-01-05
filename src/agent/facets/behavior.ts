import type {
  AgentGenerationTraceV1,
  AgentVocabV1,
  BehaviorLensResult,
  BehaviorReadCategory,
  BehaviorRead,
  Latents,
  Fixed,
} from '../types';
import { facetSeed, makeRng, traceFacet, traceSet, uniqueStrings, weightedPick, clampInt } from '../utils';
import type { Aptitudes } from './aptitudes';
import type { PsychTraits } from './traits';

type BehaviorArchetype = {
  name: string;
  situationReads: string[];
  equipmentReads: string[];
  pressureReads: string[];
  objectiveFrames: string[];
  teamDynamics: string[];
};

type Ethics = {
  harmAversion: Fixed;
  missionUtilitarianism: Fixed;
};

type BehaviorPool = {
  category: BehaviorReadCategory;
  items: string[];
};

function normalizeArchetype(entry: BehaviorArchetype): BehaviorArchetype {
  return {
    name: entry.name,
    situationReads: uniqueStrings(entry.situationReads ?? []),
    equipmentReads: uniqueStrings(entry.equipmentReads ?? []),
    pressureReads: uniqueStrings(entry.pressureReads ?? []),
    objectiveFrames: uniqueStrings(entry.objectiveFrames ?? []),
    teamDynamics: uniqueStrings(entry.teamDynamics ?? []),
  };
}

const DEFAULT_READ_COUNT_RANGE: readonly [number, number] = [3, 5];

export function computeBehaviorLens(
  seed: string,
  vocab: AgentVocabV1,
  latents: Latents,
  traits: PsychTraits,
  aptitudes: Aptitudes,
  ethics: Ethics,
  trace?: AgentGenerationTraceV1,
): BehaviorLensResult {
  traceFacet(trace, seed, 'behaviorLens');
  const rng = makeRng(facetSeed(seed, 'behaviorLens'));

  const fallbackArchetypes: BehaviorArchetype[] = [
    {
      name: 'Psychopath',
      situationReads: ['Crisis equals control through fear', 'Scandal is leverage for domination'],
      equipmentReads: ['Medical kit becomes poison lab', 'Cash funds permanent solutions'],
      pressureReads: ['Threats increase violence'],
      objectiveFrames: ['Stabilize means eliminate unstable elements'],
      teamDynamics: ['Terrifies compassionate allies'],
    },
    {
      name: 'Compassionate',
      situationReads: ['Crisis means people need help', 'Uprising equals grievances to heal'],
      equipmentReads: ['Medical kit treats everyone', 'Cash goes to first sad story'],
      pressureReads: ['Threats trigger protective instincts'],
      objectiveFrames: ['Protect assets means protect people'],
      teamDynamics: ['Beloved but exhausting'],
    },
  ];

  const archetypes = (vocab.behaviorArchetypes?.archetypes ?? fallbackArchetypes)
    .filter((entry) => entry && entry.name)
    .map((entry) => normalizeArchetype(entry));

  const empathy01 = aptitudes.empathy / 1000;
  const agree01 = traits.agreeableness / 1000;
  const cons01 = traits.conscientiousness / 1000;
  const risk01 = traits.riskTolerance / 1000;
  const auth01 = traits.authoritarianism / 1000;
  const stress01 = latents.stressReactivity / 1000;
  const opsec01 = latents.opsecDiscipline / 1000;
  const frugal01 = latents.frugality / 1000;
  const plan01 = latents.planningHorizon / 1000;
  const tech01 = latents.techFluency / 1000;
  const social01 = latents.socialBattery / 1000;
  const public01 = latents.publicness / 1000;
  const harm01 = ethics.harmAversion / 1000;
  const util01 = ethics.missionUtilitarianism / 1000;

  const weights = archetypes.map((entry) => {
    const lower = entry.name.toLowerCase();
    let w = 1;
    if (lower.includes('psychopath')) {
      w += 1.2 * (1 - empathy01) + 0.9 * (1 - agree01) + 0.6 * util01 + 0.4 * risk01;
    }
    if (lower.includes('compassionate')) {
      w += 1.3 * empathy01 + 1.0 * agree01 + 0.6 * harm01;
    }
    if (lower.includes('paranoid')) {
      w += 1.0 * stress01 + 0.8 * opsec01 + 0.5 * (1 - agree01) + 0.3 * (1 - social01);
    }
    if (lower.includes('greedy')) {
      w += 1.1 * (1 - frugal01) + 0.5 * public01 + 0.3 * util01;
    }
    if (lower.includes('incompetent')) {
      w += 1.1 * (1 - cons01) + 0.8 * (1 - plan01) + 0.4 * (1 - tech01);
    }
    if (lower.includes('methodical')) {
      w += 1.2 * cons01 + 0.9 * plan01 + 0.4 * tech01;
    }
    if (lower.includes('vengeful')) {
      w += 1.0 * auth01 + 0.8 * stress01 + 0.7 * (1 - agree01) + 0.3 * risk01;
    }
    return { item: entry.name, weight: Math.max(0.15, w) };
  });

  const selectedName = weightedPick(rng, weights);
  const selected = archetypes.find((entry) => entry.name === selectedName) ?? archetypes[0];

  const pools: BehaviorPool[] = [
    { category: 'situation', items: selected.situationReads },
    { category: 'equipment', items: selected.equipmentReads },
    { category: 'pressure', items: selected.pressureReads },
    { category: 'objective', items: selected.objectiveFrames },
    { category: 'team', items: selected.teamDynamics },
  ];

  const targetCount = clampInt(rng.int(DEFAULT_READ_COUNT_RANGE[0], DEFAULT_READ_COUNT_RANGE[1]), 3, 5);
  const reads: BehaviorRead[] = [];
  const usedItems = new Set<string>();

  for (const pool of pools) {
    if (reads.length >= targetCount) break;
    if (!pool.items.length) continue;
    const available = pool.items.filter((item) => !usedItems.has(item));
    if (!available.length) continue;
    const item = rng.pick(available);
    usedItems.add(item);
    reads.push({ category: pool.category, item });
  }

  if (reads.length < targetCount) {
    const remaining: BehaviorRead[] = [];
    for (const pool of pools) {
      for (const item of pool.items) {
        if (!item || usedItems.has(item)) continue;
        remaining.push({ category: pool.category, item });
      }
    }
    while (reads.length < targetCount && remaining.length) {
      const idx = rng.int(0, remaining.length - 1);
      const [entry] = remaining.splice(idx, 1);
      if (!entry || usedItems.has(entry.item)) continue;
      usedItems.add(entry.item);
      reads.push(entry);
    }
  }

  const result: BehaviorLensResult = {
    archetype: selected.name,
    reads,
  };

  traceSet(trace, 'behaviorLens', result, { method: 'weightedPick', dependsOn: { vocab: 'behaviorArchetypes' } });
  return result;
}
