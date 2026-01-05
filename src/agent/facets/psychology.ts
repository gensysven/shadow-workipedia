/**
 * Psychology Facet
 *
 * Computes psychological attributes for agents including:
 * - Big Five-inspired traits (riskTolerance, conscientiousness, noveltySeeking, agreeableness, authoritarianism)
 * - Ethics decomposition (ruleAdherence, harmAversion, missionUtilitarianism, loyaltyScope)
 * - Contradiction pairs (narrative-driving internal tensions)
 * - Red lines (hard limits the agent won't cross)
 * - Visibility profile (publicVisibility, paperTrail, digitalHygiene)
 * - Cover aptitude tags (plausible cover identities)
 */

import type {
  Fixed,
  Latents,
  AgentVocabV1,
  AgentGenerationTraceV1,
  ContradictionPair,
  HeightBand,
  BaselineAffect,
  RegulationStyle,
  StressTell,
  RepairStyle,
  SelfStory,
  SocialMask,
  KnowledgeAccuracy,
  KnowledgeItem,
  ThoughtEntry,
  EmotionEntry,
  CopingEntry,
  ThoughtsEmotionsSnapshot,
  ThoughtValence,
} from '../types';
import {
  makeRng,
  facetSeed,
  clampFixed01k,
  clampSigned01k,
  clampInt,
  weightedPick,
  weightedPickKUnique,
  uniqueStrings,
  pickKHybrid,
  traceSet,
  traceFacet,
} from '../utils';
import type { Aptitudes } from './aptitudes';
import type { PsychTraits } from './traits';

// ============================================================================
// Types
// ============================================================================

/** Input context for psychology computation */
export type PsychologyContext = {
  seed: string;
  vocab: AgentVocabV1;
  latents: Latents;
  aptitudes: Aptitudes;
  traits: PsychTraits;
  tierBand: 'elite' | 'middle' | 'mass';
  roleSeedTags: readonly string[];
  careerTrackTag: string;
  heightBand: HeightBand;
  trace?: AgentGenerationTraceV1;
};

export type LoyaltyScope = 'institution' | 'people' | 'ideals' | 'self';

/** Ethics decomposition - nuanced breakdown of principled behavior */
export type Ethics = {
  ruleAdherence: Fixed; // follows rules vs bends them
  harmAversion: Fixed; // cares about harm to others
  missionUtilitarianism: Fixed; // does dirty work if needed
  loyaltyScope: LoyaltyScope; // what they're loyal to
};

/** Visibility profile - how observable the agent is */
export type Visibility = {
  publicVisibility: Fixed;
  paperTrail: Fixed;
  digitalHygiene: Fixed;
};

/** Affect - emotional regulation and expression */
export type Affect = {
  baseline: BaselineAffect;
  regulationStyle: RegulationStyle;
  stressTells: StressTell[];
  repairStyle: RepairStyle;
};

/** Self-concept - internal narrative and social presentation */
export type SelfConceptResult = {
  selfStory: SelfStory;
  impostorRisk: Fixed;
  socialMask: SocialMask;
};

/** Knowledge & ignorance - what they know, miss, or misbelieve */
export type KnowledgeIgnoranceResult = {
  knowledgeStrengths: string[];
  knowledgeGaps: string[];
  falseBeliefs: string[];
  informationSources: string[];
  informationBarriers: string[];
  depths01k: {
    strengths: Fixed;
    gaps: Fixed;
    falseBeliefs: Fixed;
    sources: Fixed;
    barriers: Fixed;
  };
  items: {
    strengths: KnowledgeItem[];
    gaps: KnowledgeItem[];
    falseBeliefs: KnowledgeItem[];
    sources: KnowledgeItem[];
    barriers: KnowledgeItem[];
  };
};

/** Output result from psychology computation */
export type PsychologyResult = {
  ethics: Ethics;
  contradictions: ContradictionPair[];
  redLines: string[];
  visibility: Visibility;
  coverAptitudeTags: string[];
  affect: Affect;
  selfConcept: SelfConceptResult;
  thoughtsEmotions: ThoughtsEmotionsSnapshot;
  knowledgeIgnorance: KnowledgeIgnoranceResult;
};

// ============================================================================
// Career-Based Cover Mappings
// ============================================================================

const COVER_BY_CAREER: Record<string, string[]> = {
  'foreign-service': ['diplomatic-staff', 'trade-delegate', 'consultant'],
  intelligence: ['consultant', 'freelancer', 'business-development'],
  military: ['logistics-contractor', 'consultant', 'trade-delegate'],
  journalism: ['journalist', 'freelancer', 'consultant'],
  engineering: ['engineer', 'consultant', 'business-development'],
  academia: ['academic', 'consultant', 'freelancer'],
  ngo: ['ngo-worker', 'aid-worker', 'freelancer'],
  'public-health': ['aid-worker', 'ngo-worker', 'consultant'],
  logistics: ['logistics-contractor', 'business-development', 'consultant'],
  politics: ['consultant', 'business-development', 'trade-delegate'],
  law: ['consultant', 'trade-delegate', 'business-development'],
  'corporate-ops': ['business-development', 'consultant', 'freelancer'],
  'organized-labor': ['ngo-worker', 'consultant', 'freelancer'],
  'civil-service': ['consultant', 'trade-delegate', 'diplomatic-staff'],
  finance: ['business-development', 'consultant', 'freelancer'],
};

// ============================================================================
// Helper Functions
// ============================================================================

function computeEthics(
  seed: string,
  latents: Latents,
  traits: PsychTraits,
  aptitudes: Aptitudes,
  trace?: AgentGenerationTraceV1,
): Ethics {
  const ethicsRng = makeRng(facetSeed(seed, 'ethics'));
  const principledness01 = latents.principledness / 1000;

  const ruleAdherence = clampFixed01k(
    0.45 * latents.principledness +
    0.30 * latents.institutionalEmbeddedness +
    0.15 * traits.conscientiousness +
    0.10 * ethicsRng.int(0, 1000),
  );

  const harmAversion = clampFixed01k(
    0.50 * aptitudes.empathy +
    0.25 * latents.principledness +
    0.15 * (1000 - latents.riskAppetite) +
    0.10 * ethicsRng.int(0, 1000),
  );

  const missionUtilitarianism = clampFixed01k(
    0.40 * latents.riskAppetite +
    0.25 * (1000 - latents.principledness) +
    0.20 * latents.opsecDiscipline +
    0.15 * ethicsRng.int(0, 1000),
  );

  const loyaltyScope = (() => {
    const scopeWeights: Array<{ item: LoyaltyScope; weight: number }> = [
      { item: 'institution', weight: 1 + 2.0 * (latents.institutionalEmbeddedness / 1000) },
      { item: 'people', weight: 1 + 2.0 * (aptitudes.empathy / 1000) },
      { item: 'ideals', weight: 1 + 2.0 * principledness01 },
      { item: 'self', weight: 1 + 1.5 * (1 - principledness01) + 0.8 * (latents.riskAppetite / 1000) },
    ];
    return weightedPick(ethicsRng, scopeWeights.map(s => ({ item: s.item, weight: s.weight }))) as LoyaltyScope;
  })();

  const ethics = { ruleAdherence, harmAversion, missionUtilitarianism, loyaltyScope };
  traceSet(trace, 'psych.ethics', ethics, {
    method: 'formula',
    dependsOn: { facet: 'ethics', latents: 'latentModel.values', aptitudes: 'aptitudes' },
  });

  return ethics;
}

function computeContradictions(
  latents: Latents,
  aptitudes: Aptitudes,
  ethics: Ethics,
  roleSeedTags: readonly string[],
  trace?: AgentGenerationTraceV1,
): ContradictionPair[] {
  const contradictions: ContradictionPair[] = [];

  const contradictionCandidates: Array<{
    trait1: string;
    trait2: string;
    tension: string;
    narrativeHook: string;
    condition: boolean;
  }> = [
    {
      trait1: 'harmAversion',
      trait2: 'missionUtilitarianism',
      tension: 'moral-injury-risk',
      narrativeHook: 'Cares about people but can rationalize harm for mission success',
      condition: ethics.harmAversion > 550 && ethics.missionUtilitarianism > 550,
    },
    {
      trait1: 'ruleAdherence',
      trait2: 'riskAppetite',
      tension: 'maverick-institutionalist',
      narrativeHook: 'Respects the system but constantly pushes its boundaries',
      condition: ethics.ruleAdherence > 550 && latents.riskAppetite > 550,
    },
    {
      trait1: 'publicness',
      trait2: 'opsecDiscipline',
      tension: 'spotlight-shadow',
      narrativeHook: 'Craves attention but knows discretion is survival',
      condition: latents.publicness > 550 && latents.opsecDiscipline > 550,
    },
    {
      trait1: 'empathy',
      trait2: 'deceptionAptitude',
      tension: 'compassionate-manipulator',
      narrativeHook: 'Genuinely understands people and uses that for leverage',
      condition: aptitudes.empathy > 550 && aptitudes.deceptionAptitude > 550,
    },
    {
      trait1: 'frugality',
      trait2: 'aestheticExpressiveness',
      tension: 'ascetic-aesthete',
      narrativeHook: 'Values simplicity but has expensive taste',
      condition: latents.frugality > 550 && latents.aestheticExpressiveness > 550,
    },
    {
      trait1: 'institutionalEmbeddedness',
      trait2: 'adaptability',
      tension: 'loyal-chameleon',
      narrativeHook: 'Devoted to the organization but could thrive anywhere',
      condition: latents.institutionalEmbeddedness > 550 && latents.adaptability > 550,
    },
    {
      trait1: 'socialBattery',
      trait2: 'opsecDiscipline',
      tension: 'social-introvert',
      narrativeHook: 'Excels at schmoozing but finds it exhausting',
      condition: latents.socialBattery > 550 && latents.opsecDiscipline > 550 && roleSeedTags.includes('operative'),
    },
  ];

  // First pass: collect all matching contradictions
  for (const candidate of contradictionCandidates) {
    if (candidate.condition) {
      contradictions.push({
        trait1: candidate.trait1,
        trait2: candidate.trait2,
        tension: candidate.tension,
        narrativeHook: candidate.narrativeHook,
      });
    }
  }

  // Guarantee at least 1-2 contradictions - everyone has internal tensions
  // If none matched strict criteria, use relaxed criteria or pick from universal tensions
  if (contradictions.length === 0) {
    // Universal contradictions that apply to most people
    const universalContradictions: ContradictionPair[] = [
      {
        trait1: 'security',
        trait2: 'freedom',
        tension: 'safety-adventure',
        narrativeHook: 'Craves stability but feels trapped by routine',
      },
      {
        trait1: 'authenticity',
        trait2: 'belonging',
        tension: 'self-vs-group',
        narrativeHook: 'Wants to be accepted but fears losing themselves',
      },
      {
        trait1: 'ambition',
        trait2: 'contentment',
        tension: 'striving-settling',
        narrativeHook: 'Driven to achieve more but unsure what "enough" looks like',
      },
      {
        trait1: 'independence',
        trait2: 'connection',
        tension: 'autonomy-intimacy',
        narrativeHook: 'Values self-reliance but needs close relationships',
      },
      {
        trait1: 'principle',
        trait2: 'pragmatism',
        tension: 'idealist-realist',
        narrativeHook: 'Holds strong values but knows the world requires compromise',
      },
    ];

    // Pick 1-2 based on a deterministic hash from latents
    const pickIndex = (latents.socialBattery + latents.riskAppetite) % universalContradictions.length;
    contradictions.push(universalContradictions[pickIndex]!);

    // 50% chance of a second contradiction
    if (latents.adaptability > 500) {
      const secondIndex = (pickIndex + 1 + (latents.frugality % 3)) % universalContradictions.length;
      if (secondIndex !== pickIndex) {
        contradictions.push(universalContradictions[secondIndex]!);
      }
    }
  }

  // Cap at 3 contradictions to avoid overwhelming
  const finalContradictions = contradictions.slice(0, 3);

  traceSet(trace, 'psych.contradictions', finalContradictions, {
    method: 'conditionalPairs',
    dependsOn: { facet: 'ethics', count: finalContradictions.length },
  });

  return finalContradictions;
}

function computeRedLines(
  seed: string,
  vocab: AgentVocabV1,
  latents: Latents,
  traits: PsychTraits,
  roleSeedTags: readonly string[],
  trace?: AgentGenerationTraceV1,
): string[] {
  const redLinePool = uniqueStrings(vocab.psych?.redLines ?? []);
  const roleRedLinePool = roleSeedTags.flatMap(r => vocab.psych?.redLineByRole?.[r] ?? []);

  traceFacet(trace, seed, 'red_lines');
  const redLineRng = makeRng(facetSeed(seed, 'red_lines'));

  const redLineCount = clampInt(
    1 + Math.round((traits.agreeableness + traits.conscientiousness + 0.60 * latents.principledness) / 1000),
    1,
    3,
  );

  const redLines = redLinePool.length
    ? pickKHybrid(redLineRng, uniqueStrings(roleRedLinePool), redLinePool, redLineCount, Math.min(redLineCount, 2))
    : redLineRng.pickK(['harm-to-civilians', 'torture', 'personal-corruption'] as const, redLineCount);

  traceSet(trace, 'identity.redLines', redLines, {
    method: 'hybridPickK',
    dependsOn: {
      facet: 'red_lines',
      redLineCount,
      rolePoolSize: roleRedLinePool.length,
      globalPoolSize: redLinePool.length,
    },
  });

  return redLines;
}

function computeVisibility(
  seed: string,
  latents: Latents,
  aptitudes: Aptitudes,
  heightBand: HeightBand,
  careerTrackTag: string,
  trace?: AgentGenerationTraceV1,
): Visibility {
  traceFacet(trace, seed, 'visibility');
  const visRng = makeRng(facetSeed(seed, 'visibility'));

  const heightVisibilityBias =
    heightBand === 'very_tall' ? 45 : heightBand === 'tall' ? 25 : heightBand === 'very_short' ? -20 : 0;
  const expressVisibilityBias = Math.round((latents.aestheticExpressiveness / 1000 - 0.5) * 40);

  const publicVisibility = clampFixed01k(
    0.64 * latents.publicness + 0.30 * visRng.int(0, 1000) + heightVisibilityBias + expressVisibilityBias,
  );

  const paperTrail = clampFixed01k(
    0.65 * latents.institutionalEmbeddedness +
    0.22 * latents.planningHorizon +
    0.13 * visRng.int(0, 1000) +
    (careerTrackTag === 'civil-service' || careerTrackTag === 'law' ? 80 : 0),
  );

  const digitalHygiene = clampFixed01k(
    0.50 * aptitudes.attentionControl +
    0.22 * latents.opsecDiscipline +
    0.18 * latents.techFluency +
    0.10 * latents.impulseControl +
    0.20 * visRng.int(0, 1000),
  );

  const visibility = { publicVisibility, paperTrail, digitalHygiene };
  traceSet(trace, 'visibility', visibility, {
    method: 'formula',
    dependsOn: { facet: 'visibility', latents: 'latentModel.values', aptitudes: 'aptitudes', careerTrackTag },
  });

  return visibility;
}

function computeCovers(
  seed: string,
  vocab: AgentVocabV1,
  latents: Latents,
  careerTrackTag: string,
  trace?: AgentGenerationTraceV1,
): string[] {
  traceFacet(trace, seed, 'covers');
  const coverRng = makeRng(facetSeed(seed, 'covers'));
  const coverPool = uniqueStrings(vocab.covers?.coverAptitudeTags ?? []);

  const public01 = latents.publicness / 1000;
  const opsec01 = latents.opsecDiscipline / 1000;

  const coverForced: string[] = [];
  const addCover = (tag: string) => {
    if (!coverPool.includes(tag)) return;
    if (coverForced.includes(tag)) return;
    coverForced.push(tag);
  };

  for (const tag of COVER_BY_CAREER[careerTrackTag] ?? []) addCover(tag);
  if (public01 > 0.7) addCover('journalist');
  if (opsec01 > 0.7) addCover('consultant');

  const coverAptitudeTags = coverPool.length
    ? uniqueStrings([
        ...coverForced.slice(0, 2),
        ...coverRng.pickK(coverPool.filter(x => !coverForced.includes(x)), Math.max(0, 3 - coverForced.slice(0, 2).length)),
      ]).slice(0, 3)
    : coverRng.pickK(['consultant', 'ngo-worker', 'tourist'] as const, 3);

  traceSet(trace, 'covers.coverAptitudeTags', coverAptitudeTags, {
    method: 'forcedPlusPickK',
    dependsOn: { facet: 'covers', careerTrackTag, forced: coverForced.slice(0, 2), poolSize: coverPool.length },
  });

  return coverAptitudeTags;
}

function computeAffect(
  seed: string,
  vocab: AgentVocabV1,
  latents: Latents,
  aptitudes: Aptitudes,
  trace?: AgentGenerationTraceV1,
): Affect {
  traceFacet(trace, seed, 'affect');
  const affectRng = makeRng(facetSeed(seed, 'affect'));

  // Baseline affect - influenced by social battery and empathy
  const baselinePool = vocab.affect?.baselineAffects ?? [
    'warm', 'flat', 'intense', 'guarded', 'mercurial', 'melancholic', 'anxious', 'cheerful',
  ];
  const baselineWeights = baselinePool.map(b => {
    let w = 1;
    if (b === 'warm' && aptitudes.empathy > 600) w += 2;
    if (b === 'flat' && latents.opsecDiscipline > 650) w += 2;
    if (b === 'intense' && latents.riskAppetite > 600) w += 2;
    if (b === 'guarded' && latents.opsecDiscipline > 550) w += 1.5;
    if (b === 'anxious' && latents.impulseControl < 400) w += 2;
    if (b === 'cheerful' && latents.socialBattery > 650) w += 2;
    if (b === 'mercurial' && latents.adaptability > 600 && latents.impulseControl < 500) w += 2;
    if (b === 'melancholic' && latents.socialBattery < 400) w += 1.5;
    if (b === 'numb' && latents.opsecDiscipline > 700 && latents.stressReactivity > 600) w += 2;
    if (b === 'irritable' && latents.stressReactivity > 650) w += 2;
    if (b === 'hopeful' && latents.principledness > 650) w += 2;
    if (b === 'restless' && latents.impulseControl < 450) w += 2;
    return { item: b as BaselineAffect, weight: w };
  });
  const baseline = weightedPick(affectRng, baselineWeights) as BaselineAffect;

  // Regulation style - how they handle emotions
  const regPool = vocab.affect?.regulationStyles ?? [
    'ruminates', 'suppresses', 'externalizes', 'reframes', 'compartmentalizes', 'avoids', 'seeks-support',
  ];
  const regWeights = regPool.map(r => {
    let w = 1;
    if (r === 'suppresses' && latents.opsecDiscipline > 600) w += 2;
    if (r === 'compartmentalizes' && aptitudes.attentionControl > 600) w += 2;
    if (r === 'seeks-support' && latents.socialBattery > 600) w += 2;
    if (r === 'ruminates' && latents.planningHorizon > 600) w += 1.5;
    if (r === 'externalizes' && latents.impulseControl < 400) w += 2;
    if (r === 'reframes' && latents.adaptability > 600) w += 2;
    if (r === 'avoids' && latents.riskAppetite < 400) w += 1.5;
    if (r === 'meditates' && latents.impulseControl > 600) w += 2;
    if (r === 'exercises' && latents.physicalConditioning > 600) w += 2;
    if (r === 'isolates' && latents.socialBattery < 400) w += 2;
    if (r === 'distracts' && latents.impulseControl < 400) w += 2;
    return { item: r as RegulationStyle, weight: w };
  });
  const regulationStyle = weightedPick(affectRng, regWeights) as RegulationStyle;

  // Stress tells - 1-3 observable stress indicators
  const tellPool = uniqueStrings(vocab.affect?.stressTells ?? [
    'overexplains', 'goes-quiet', 'snaps', 'jokes-deflect', 'micromanages',
    'withdraws', 'overeats', 'insomnia', 'hyperactive', 'cries-easily',
  ]);
  const forcedTells: StressTell[] = [];
  const addForcedTell = (tag: StressTell) => {
    if (!tellPool.includes(tag)) return;
    if (forcedTells.includes(tag)) return;
    forcedTells.push(tag);
  };
  if (latents.stressReactivity > 700) addForcedTell('insomnia');
  if (latents.opsecDiscipline > 700) addForcedTell('goes-quiet');
  if (latents.impulseControl < 350) addForcedTell('snaps');

  const tellWeights = tellPool.map(t => {
    let w = 1;
    if (t === 'jaw-clench' && latents.opsecDiscipline > 600) w += 1.5;
    if (t === 'pacing' && latents.stressReactivity > 600) w += 1.5;
    if (t === 'fidgeting' && latents.impulseControl < 450) w += 1.5;
    if (t === 'tunnel-vision' && latents.stressReactivity > 700) w += 1.5;
    if (t === 'cold-sweat' && latents.stressReactivity > 650) w += 1.5;
    return { item: t as StressTell, weight: w };
  });

  const tellCount = clampInt(1 + affectRng.int(0, 2), 1, 3);
  const finalCount = Math.max(tellCount, forcedTells.length);
  const remaining = tellWeights.filter(t => !forcedTells.includes(t.item));
  const remainingCount = Math.max(0, Math.min(remaining.length, finalCount - forcedTells.length));
  const stressTells = uniqueStrings([
    ...forcedTells,
    ...weightedPickKUnique(affectRng, remaining, remainingCount),
  ]).slice(0, finalCount) as StressTell[];

  // Repair style - how they fix relationships after conflict
  const repairPool = vocab.affect?.repairStyles ?? [
    'apologizes-fast', 'stonewalls', 'buys-gifts', 'explains-endlessly',
    'pretends-nothing-happened', 'seeks-mediation', 'writes-letters',
  ];
  const repairWeights = repairPool.map(r => {
    let w = 1;
    if (r === 'apologizes-fast' && aptitudes.empathy > 600) w += 2;
    if (r === 'stonewalls' && latents.opsecDiscipline > 650) w += 2;
    if (r === 'explains-endlessly' && latents.planningHorizon > 600) w += 1.5;
    if (r === 'pretends-nothing-happened' && latents.adaptability > 600) w += 1.5;
    if (r === 'seeks-mediation' && latents.institutionalEmbeddedness > 600) w += 2;
    if (r === 'gives-space' && latents.opsecDiscipline > 600) w += 1.5;
    if (r === 'humor' && latents.socialBattery > 600) w += 1.5;
    if (r === 'acts-of-service' && latents.institutionalEmbeddedness > 600) w += 1.5;
    return { item: r as RepairStyle, weight: w };
  });
  const repairStyle = weightedPick(affectRng, repairWeights) as RepairStyle;

  const affect = { baseline, regulationStyle, stressTells, repairStyle };
  traceSet(trace, 'psych.affect', affect, { method: 'weightedPick', dependsOn: { facet: 'affect' } });
  return affect;
}

function computeSelfConcept(
  seed: string,
  vocab: AgentVocabV1,
  latents: Latents,
  tierBand: 'elite' | 'middle' | 'mass',
  roleSeedTags: readonly string[],
  trace?: AgentGenerationTraceV1,
): SelfConceptResult {
  traceFacet(trace, seed, 'selfConcept');
  const selfRng = makeRng(facetSeed(seed, 'selfConcept'));

  // Self-story - the narrative they tell themselves about who they are
  const storyPool = vocab.selfConcept?.selfStories ?? [
    'self-made', 'wronged', 'caretaker', 'chosen', 'survivor', 'reformer',
    'outsider', 'loyalist', 'pragmatist', 'idealist',
  ];
  const storyWeights = storyPool.map(s => {
    let w = 1;
    if (s === 'self-made' && tierBand === 'elite' && latents.riskAppetite > 500) w += 2;
    if (s === 'survivor' && tierBand === 'mass') w += 2;
    if (s === 'loyalist' && latents.institutionalEmbeddedness > 650) w += 2;
    if (s === 'reformer' && latents.principledness > 650) w += 2;
    if (s === 'outsider' && latents.socialBattery < 400) w += 2;
    if (s === 'caretaker' && roleSeedTags.includes('organizer')) w += 2;
    if (s === 'pragmatist' && latents.adaptability > 600) w += 1.5;
    if (s === 'idealist' && latents.principledness > 600) w += 1.5;
    return { item: s as SelfStory, weight: w };
  });
  const selfStory = weightedPick(selfRng, storyWeights) as SelfStory;

  // Impostor risk - higher for elite with mass origins, lower for confident types
  let impostorBase = 400;
  if (tierBand === 'elite') impostorBase += 150;
  if (latents.socialBattery < 450) impostorBase += 100;
  if (latents.principledness > 600) impostorBase -= 80;
  if (roleSeedTags.includes('analyst')) impostorBase += 50;
  const impostorRisk = clampFixed01k(impostorBase + selfRng.int(-150, 150));

  // Social mask - the persona they present to the world
  const maskPool = vocab.selfConcept?.socialMasks ?? [
    'bureaucrat', 'charmer', 'patriot', 'cynic', 'true-believer', 'everyman',
    'intellectual', 'tough-guy', 'helper', 'rebel',
  ];
  const maskWeights = maskPool.map(m => {
    let w = 1;
    if (m === 'bureaucrat' && latents.institutionalEmbeddedness > 600) w += 2;
    if (m === 'charmer' && latents.socialBattery > 650) w += 2;
    if (m === 'intellectual' && roleSeedTags.includes('analyst')) w += 2;
    if (m === 'tough-guy' && roleSeedTags.includes('security')) w += 2;
    if (m === 'helper' && roleSeedTags.includes('organizer')) w += 2;
    if (m === 'rebel' && latents.riskAppetite > 650) w += 1.5;
    if (m === 'cynic' && latents.principledness < 400) w += 2;
    if (m === 'true-believer' && latents.principledness > 700) w += 2;
    if (m === 'everyman' && tierBand === 'mass') w += 1.5;
    if (m === 'patriot' && latents.institutionalEmbeddedness > 650) w += 1.5;
    return { item: m as SocialMask, weight: w };
  });
  const socialMask = weightedPick(selfRng, maskWeights) as SocialMask;

  const selfConcept = { selfStory, impostorRisk, socialMask };
  traceSet(trace, 'psych.selfConcept', selfConcept, { method: 'weightedPick', dependsOn: { facet: 'selfConcept' } });
  return selfConcept;
}

// ============================================================================
// Thoughts & Emotions Snapshot
// ============================================================================

const POSITIVE_HINTS = ['joy', 'love', 'pride', 'hope', 'relief', 'warm', 'comfort', 'trust', 'safe', 'grateful'];
const NEGATIVE_HINTS = ['sad', 'anger', 'fear', 'guilt', 'despair', 'paranoia', 'betray', 'pain', 'worry', 'trauma'];

function inferValence(item: string): ThoughtValence {
  const lower = item.toLowerCase();
  if (POSITIVE_HINTS.some(h => lower.includes(h))) return 'positive';
  if (NEGATIVE_HINTS.some(h => lower.includes(h))) return 'negative';
  return 'neutral';
}

function buildThoughtEntries(
  rng: ReturnType<typeof makeRng>,
  pool: string[],
  count: number,
  intensityBase: number,
  intensityJitter: number,
  recencyMax: number,
  stress01: number,
): ThoughtEntry[] {
  if (!pool.length) return [];
  const picked = rng.pickK(pool, count);
  return picked.map((item) => {
    const valence = inferValence(item);
    const stressBoost = Math.round(stress01 * 220);
    const valenceBoost = valence === 'negative' ? 140 : valence === 'positive' ? -40 : 0;
    const intensity01k = clampFixed01k(intensityBase + rng.int(-intensityJitter, intensityJitter) + stressBoost + valenceBoost);
    const recencyDays = clampInt(rng.int(1, recencyMax), 1, 365);
    return { item, valence, intensity01k, recencyDays };
  });
}

function buildEmotionEntries(
  rng: ReturnType<typeof makeRng>,
  pool: string[],
  count: number,
  intensityBase: number,
  intensityJitter: number,
  durationMax: number,
  stress01: number,
): EmotionEntry[] {
  if (!pool.length) return [];
  const picked = rng.pickK(pool, count);
  return picked.map((item) => {
    const valence = inferValence(item);
    const intensity01k = clampFixed01k(intensityBase + rng.int(-intensityJitter, intensityJitter) + Math.round(stress01 * 200));
    const durationHours = clampInt(rng.int(1, durationMax), 1, 72);
    const moodBase = 140 + rng.int(0, 260);
    const moodImpact01k = clampSigned01k((valence === 'negative' ? -1 : 1) * moodBase);
    const behaviorTilt = (() => {
      if (valence === 'positive') {
        return rng.pick(['open', 'engaged', 'protective', 'focused']);
      }
      if (valence === 'negative') {
        return rng.pick(['withdrawn', 'avoidant', 'agitated', 'hypervigilant']);
      }
      return rng.pick(['reflective', 'guarded', 'steady']);
    })();
    return { item, intensity01k, durationHours, moodImpact01k, behaviorTilt, valence };
  });
}

function buildCopingEntries(
  rng: ReturnType<typeof makeRng>,
  pool: string[],
  count: number,
  effectivenessBase: number,
  effectivenessJitter: number,
  recencyMax: number,
  stress01: number,
): CopingEntry[] {
  if (!pool.length) return [];
  const picked = rng.pickK(pool, count);
  return picked.map((item) => {
    const stressPenalty = Math.round(stress01 * 180);
    const effectiveness01k = clampFixed01k(effectivenessBase + rng.int(-effectivenessJitter, effectivenessJitter) - stressPenalty);
    const recencyDays = clampInt(rng.int(1, recencyMax), 1, 365);
    return { item, effectiveness01k, recencyDays };
  });
}

function computeThoughtsEmotions(
  seed: string,
  vocab: AgentVocabV1,
  latents: Latents,
  trace?: AgentGenerationTraceV1,
): ThoughtsEmotionsSnapshot {
  traceFacet(trace, seed, 'thoughtsEmotions');
  const rng = makeRng(facetSeed(seed, 'thoughtsEmotions'));
  const stress01 = latents.stressReactivity / 1000;

  const thoughts = vocab.thoughtsEmotions?.thoughts ?? {};
  const emotions = vocab.thoughtsEmotions?.emotions ?? {};
  const coping = vocab.thoughtsEmotions?.coping ?? {};

  const thoughtsResult = {
    immediateObservations: buildThoughtEntries(
      rng,
      uniqueStrings(thoughts.immediateObservations ?? []),
      clampInt(1 + rng.int(0, 2), 1, 4),
      420,
      180,
      10,
      stress01,
    ),
    reflections: buildThoughtEntries(
      rng,
      uniqueStrings(thoughts.reflections ?? []),
      clampInt(1 + rng.int(0, 2), 1, 4),
      460,
      220,
      18,
      stress01,
    ),
    memories: buildThoughtEntries(
      rng,
      uniqueStrings(thoughts.memories ?? []),
      clampInt(1 + rng.int(0, 2), 1, 4),
      520,
      240,
      40,
      stress01,
    ),
    worries: buildThoughtEntries(
      rng,
      uniqueStrings(thoughts.worries ?? []),
      clampInt(1 + rng.int(0, 2) + (stress01 > 0.6 ? 1 : 0), 1, 4),
      620,
      240,
      14,
      stress01,
    ),
    desires: buildThoughtEntries(
      rng,
      uniqueStrings(thoughts.desires ?? []),
      clampInt(1 + rng.int(0, 2), 1, 4),
      480,
      220,
      30,
      stress01,
    ),
    socialThoughts: buildThoughtEntries(
      rng,
      uniqueStrings(thoughts.socialThoughts ?? []),
      clampInt(1 + rng.int(0, 2), 1, 4),
      440,
      200,
      21,
      stress01,
    ),
  };

  const emotionsResult = {
    primary: buildEmotionEntries(
      rng,
      uniqueStrings(emotions.primary ?? []),
      clampInt(1 + rng.int(0, 2), 1, 4),
      520,
      220,
      12,
      stress01,
    ),
    complex: buildEmotionEntries(
      rng,
      uniqueStrings(emotions.complex ?? []),
      clampInt(1 + rng.int(0, 1), 1, 4),
      620,
      240,
      24,
      stress01,
    ),
  };

  const copingResult = {
    healthy: buildCopingEntries(
      rng,
      uniqueStrings(coping.healthy ?? []),
      clampInt(1 + rng.int(0, 2), 1, 4),
      720,
      160,
      45,
      stress01,
    ),
    unhealthy: buildCopingEntries(
      rng,
      uniqueStrings(coping.unhealthy ?? []),
      clampInt(1 + rng.int(0, 1), 1, 4),
      520,
      200,
      30,
      stress01,
    ),
  };

  const snapshot: ThoughtsEmotionsSnapshot = {
    thoughts: thoughtsResult,
    emotions: emotionsResult,
    coping: copingResult,
  };

  traceSet(trace, 'psych.thoughtsEmotions', snapshot, {
    method: 'pickK',
    dependsOn: { vocab: 'thoughtsEmotions' },
  });
  return snapshot;
}

function computeKnowledgeIgnorance(
  seed: string,
  vocab: AgentVocabV1,
  latents: Latents,
  roleSeedTags: readonly string[],
  tierBand: 'elite' | 'middle' | 'mass',
  trace?: AgentGenerationTraceV1,
): KnowledgeIgnoranceResult {
  const rng = makeRng(facetSeed(seed, 'knowledge-ignorance'));
  const strengthsPool = vocab.knowledgeIgnorance?.knowledgeStrengths ?? [];
  const gapsPool = vocab.knowledgeIgnorance?.knowledgeGaps ?? [];
  const falseBeliefsPool = vocab.knowledgeIgnorance?.falseBeliefs ?? [];
  const sourcesPool = vocab.knowledgeIgnorance?.informationSources ?? [];
  const barriersPool = vocab.knowledgeIgnorance?.informationBarriers ?? [];

  const cosmo01 = latents.cosmopolitanism / 1000;
  const inst01 = latents.institutionalEmbeddedness / 1000;
  const tech01 = latents.techFluency / 1000;
  const social01 = latents.socialBattery / 1000;
  const adapt01 = latents.adaptability / 1000;
  const curio01 = latents.curiosityBandwidth / 1000;

  const baseConfidence: Record<'strengths' | 'gaps' | 'falseBeliefs' | 'sources' | 'barriers', number> = {
    strengths: 650,
    gaps: 350,
    falseBeliefs: 700,
    sources: 550,
    barriers: 450,
  };
  const baseDecay: Record<'strengths' | 'gaps' | 'falseBeliefs' | 'sources' | 'barriers', number> = {
    strengths: 320,
    gaps: 180,
    falseBeliefs: 240,
    sources: 280,
    barriers: 210,
  };

  const calcConfidence = (category: keyof typeof baseConfidence): Fixed => {
    let value = baseConfidence[category];
    if (category === 'strengths' || category === 'sources') value += 80 * curio01;
    if (category === 'gaps') value -= 60 * curio01;
    if (category === 'falseBeliefs') value -= 60 * curio01 + 40 * adapt01;
    if (category === 'falseBeliefs' && latents.publicness > 600) value += 60;
    if (category === 'barriers' && latents.opsecDiscipline > 600) value += 60;
    if (tierBand === 'elite' && category === 'sources') value += 40;
    return clampFixed01k(value + rng.int(-120, 120));
  };

  const calcDecay = (category: keyof typeof baseDecay): Fixed => {
    let value = baseDecay[category];
    value -= 90 * curio01;
    value -= 60 * adapt01;
    value -= 50 * (latents.planningHorizon / 1000);
    if (category === 'strengths' && latents.techFluency < 400) value += 80;
    return clampFixed01k(value + rng.int(-80, 80));
  };

  const calcLastUsedDays = (category: keyof typeof baseDecay, itemLower: string): number => {
    const ranges: Record<keyof typeof baseDecay, [number, number]> = {
      strengths: [10, 180],
      gaps: [120, 360],
      falseBeliefs: [90, 300],
      sources: [30, 200],
      barriers: [60, 260],
    };
    let [min, max] = ranges[category];
    let value = rng.int(min, max);
    if (itemLower.includes('tradecraft') || itemLower.includes('surveillance')) {
      if (roleSeedTags.includes('operative')) value -= 40;
    }
    if (itemLower.includes('analysis')) {
      if (roleSeedTags.includes('analyst')) value -= 30;
    }
    if (itemLower.includes('language') && cosmo01 > 0.6) value -= 30;
    if ((itemLower.includes('technology') || itemLower.includes('cyber')) && tech01 > 0.6) value -= 30;
    return clampInt(value, 0, 365);
  };

  const calcAccuracy = (
    category: keyof typeof baseDecay,
    itemLower: string,
    lastUsedDays: number,
    decayRate01k: Fixed,
  ): KnowledgeAccuracy => {
    if (category === 'gaps' || category === 'barriers') return 'unknown';
    if (category === 'falseBeliefs') return 'wrong';
    if (category === 'sources') {
      if (itemLower.includes('gossip') || itemLower.includes('embellished') || itemLower.includes('rabbit')) {
        return 'partial';
      }
      if (itemLower.includes('self-serving') || itemLower.includes('partially')) return 'partial';
      return 'correct';
    }
    if (decayRate01k > 650 && lastUsedDays > 180) return 'partial';
    return 'correct';
  };

  const makeItem = (category: keyof typeof baseDecay, item: string): KnowledgeItem => {
    const itemLower = item.toLowerCase();
    const lastUsedDays = calcLastUsedDays(category, itemLower);
    const decayRate01k = calcDecay(category);
    const accuracy = calcAccuracy(category, itemLower, lastUsedDays, decayRate01k);
    const confidence01k = calcConfidence(category);
    return { item, accuracy, confidence01k, lastUsedDays, decayRate01k };
  };

  const weightStrength = (item: string): number => {
    const lower = item.toLowerCase();
    let w = 1;
    if ((lower.includes('tradecraft') || lower.includes('surveillance')) && roleSeedTags.includes('operative')) w += 2;
    if (lower.includes('analysis') && roleSeedTags.includes('analyst')) w += 2;
    if (lower.includes('language') && cosmo01 > 0.6) w += 1.5;
    if (lower.includes('geopolitical') && roleSeedTags.includes('diplomat')) w += 2;
    if ((lower.includes('technology') || lower.includes('security')) && tech01 > 0.6) w += 1.5;
    return w;
  };

  const weightGap = (item: string): number => {
    const lower = item.toLowerCase();
    let w = 1;
    if ((lower.includes('cyber') || lower.includes('technology')) && tech01 < 0.4) w += 2;
    if (lower.includes('cultural') && cosmo01 < 0.4) w += 1.5;
    if (lower.includes('language') && cosmo01 < 0.4) w += 1.5;
    return w;
  };

  const weightFalseBelief = (item: string): number => {
    const lower = item.toLowerCase();
    let w = 1;
    if (lower.includes('outdated') || lower.includes('myths') || lower.includes('hollywood')) w += 1;
    return w;
  };

  const weightSource = (item: string): number => {
    const lower = item.toLowerCase();
    let w = 1;
    if (lower.includes('official') || lower.includes('briefings') || lower.includes('classified') || lower.includes('training') || lower.includes('databases')) {
      w += 1.5 * inst01 + (tierBand === 'elite' ? 0.5 : 0);
    }
    if (lower.includes('colleague') || lower.includes('gossip') || lower.includes('veteran')) w += 1.0 * social01;
    if (lower.includes('criminal')) w += roleSeedTags.includes('operative') ? 1.5 : 0.5;
    if (lower.includes('online') || lower.includes('research')) w += 1.2 * tech01;
    if (lower.includes('family')) w += 0.6 * social01;
    if (lower.includes('experience') || lower.includes('observation')) w += 0.6 * adapt01;
    return w;
  };

  const weightBarrier = (item: string): number => {
    const lower = item.toLowerCase();
    let w = 1;
    if (lower.includes('need-to-know') || lower.includes('compartmentalization')) w += 1.5 * inst01;
    if (lower.includes('language') || lower.includes('context')) w += 1.2 * (1 - cosmo01);
    if (lower.includes('trauma')) w += 1.2 * (latents.stressReactivity / 1000);
    if (lower.includes('pride') || lower.includes('fear')) w += 0.8 * (latents.opsecDiscipline / 1000);
    if (lower.includes('confirmation') || lower.includes('cognitive')) w += 0.8 * (1 - adapt01);
    return w;
  };

  const pickItems = (category: keyof typeof baseDecay, pool: string[], weightFn: (item: string) => number): KnowledgeItem[] => {
    if (!pool.length) return [];
    const count = rng.int(2, 4);
    const picked = weightedPickKUnique(
      rng,
      pool.map(item => ({ item, weight: weightFn(item) })),
      count,
    ) as string[];
    return picked.map(item => makeItem(category, item));
  };

  const items = {
    strengths: pickItems('strengths', strengthsPool, weightStrength),
    gaps: pickItems('gaps', gapsPool, weightGap),
    falseBeliefs: pickItems('falseBeliefs', falseBeliefsPool, weightFalseBelief),
    sources: pickItems('sources', sourcesPool, weightSource),
    barriers: pickItems('barriers', barriersPool, weightBarrier),
  };

  const knowledgeStrengths = items.strengths.map(entry => entry.item);
  const knowledgeGaps = items.gaps.map(entry => entry.item);
  const falseBeliefs = items.falseBeliefs.map(entry => entry.item);
  const informationSources = items.sources.map(entry => entry.item);
  const informationBarriers = items.barriers.map(entry => entry.item);

  const depths01k = {
    strengths: clampFixed01k(
      0.4 * latents.curiosityBandwidth +
      0.25 * latents.adaptability +
      0.2 * latents.techFluency +
      0.15 * latents.planningHorizon +
      rng.int(-120, 120),
    ),
    gaps: clampFixed01k(
      0.45 * (1000 - latents.curiosityBandwidth) +
      0.25 * (1000 - latents.techFluency) +
      0.2 * (1000 - latents.cosmopolitanism) +
      0.1 * (1000 - latents.adaptability) +
      rng.int(-120, 120),
    ),
    falseBeliefs: clampFixed01k(
      0.4 * (1000 - latents.curiosityBandwidth) +
      0.3 * (1000 - latents.adaptability) +
      0.3 * (1000 - latents.planningHorizon) +
      rng.int(-120, 120),
    ),
    sources: clampFixed01k(
      0.35 * latents.curiosityBandwidth +
      0.3 * latents.institutionalEmbeddedness +
      0.2 * latents.socialBattery +
      0.15 * latents.opsecDiscipline +
      rng.int(-120, 120),
    ),
    barriers: clampFixed01k(
      0.45 * latents.opsecDiscipline +
      0.3 * latents.institutionalEmbeddedness +
      0.15 * (1000 - latents.publicness) +
      0.1 * (1000 - latents.cosmopolitanism) +
      rng.int(-120, 120),
    ),
  };

  const result = {
    knowledgeStrengths,
    knowledgeGaps,
    falseBeliefs,
    informationSources,
    informationBarriers,
    depths01k,
    items,
  };
  traceSet(trace, 'psych.knowledgeIgnorance', result, {
    method: 'weightedPickKUnique',
    dependsOn: { vocab: 'knowledgeIgnorance' },
  });
  return result;
}

// ============================================================================
// Main Computation
// ============================================================================

/**
 * Compute psychology attributes for an agent.
 *
 * This facet computes:
 * - Ethics: decomposed principled behavior (rule adherence, harm aversion, mission utilitarianism, loyalty scope)
 * - Contradictions: narrative-driving internal tensions from trait conflicts
 * - Red lines: hard limits the agent won't cross (role-influenced)
 * - Visibility: how observable the agent is (public visibility, paper trail, digital hygiene)
 * - Covers: plausible cover identities based on career and traits
 * - Affect: emotional baseline, regulation style, stress tells, repair style
 * - Self-concept: self-story, impostor risk, social mask
 */
export function computePsychology(ctx: PsychologyContext): PsychologyResult {
  const {
    seed,
    vocab,
    latents,
    aptitudes,
    traits,
    tierBand,
    roleSeedTags,
    careerTrackTag,
    heightBand,
    trace,
  } = ctx;

  // Ethics decomposition
  const ethics = computeEthics(seed, latents, traits, aptitudes, trace);

  // Contradiction pairs for story potential
  const contradictions = computeContradictions(latents, aptitudes, ethics, roleSeedTags, trace);

  // Red lines (hard limits)
  const redLines = computeRedLines(seed, vocab, latents, traits, roleSeedTags, trace);

  // Visibility profile
  const visibility = computeVisibility(seed, latents, aptitudes, heightBand, careerTrackTag, trace);

  // Cover aptitudes
  const coverAptitudeTags = computeCovers(seed, vocab, latents, careerTrackTag, trace);

  // Affect - emotional regulation and expression
  const affect = computeAffect(seed, vocab, latents, aptitudes, trace);

  // Self-concept - internal narrative and social presentation
  const selfConcept = computeSelfConcept(seed, vocab, latents, tierBand, roleSeedTags, trace);

  // Thoughts & emotions - inner snapshot
  const thoughtsEmotions = computeThoughtsEmotions(seed, vocab, latents, trace);

  // Knowledge & ignorance - what they know, miss, or misbelieve
  const knowledgeIgnorance = computeKnowledgeIgnorance(seed, vocab, latents, roleSeedTags, tierBand, trace);

  return {
    ethics,
    contradictions,
    redLines,
    visibility,
    coverAptitudeTags,
    affect,
    selfConcept,
    thoughtsEmotions,
    knowledgeIgnorance,
  };
}
