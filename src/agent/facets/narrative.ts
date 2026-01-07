/**
 * Narrative Facet - Agent timeline events and minority status
 *
 * Handles:
 * - Timeline events (upbringing, education, career milestones, crises, etc.)
 * - Minority status flags (local majority, visible/linguistic/religious minority)
 */

import type {
  TierBand,
  AgentVocabV1,
  AgentGenerationTraceV1,
  TimelineEventType,
  DiasporaStatus,
} from '../types';

import {
  makeRng,
  facetSeed,
  traceSet,
  traceFacet,
  Rng,
} from '../utils';

// ============================================================================
// Types
// ============================================================================

export type TimelineEvent = {
  yearOffset: number; // years from birth
  type: TimelineEventType;
  description: string;
  impact: 'positive' | 'negative' | 'neutral' | 'mixed';
};

export type MinorityStatus = {
  localMajority: boolean; // majority in their current location
  visibleMinority: boolean; // visually identifiable as different
  linguisticMinority: boolean; // primary language differs from locale
  religiousMinority: boolean; // faith differs from locale majority
};

export type NarrativeContext = {
  seed: string;
  vocab: AgentVocabV1;
  age: number;
  birthYear: number;
  homeCountryIso3: string;
  currentCountryIso3: string;
  tierBand: TierBand;
  originTierBand: TierBand;
  educationTrackTag: string;
  careerTrackTag: string;
  roleSeedTags: string[];
  homeCulture: string;
  languages: string[];
  spiritualityAffiliationTag: string;
  backgroundAdversityTags: string[];
  urbanicity: string;
  originRegion: string | null;
  diasporaStatus: DiasporaStatus;
  trace?: AgentGenerationTraceV1;
  // NAR-5: Security score for persecution events (0-1000, 0=insecure)
  securityScore01k?: number;
  // NAR-14/NAR-17: Family status for timeline correlates
  hasFamily?: boolean;
  // NAR-15: Conflict exposure from geography/background
  hasConflictExposure?: boolean;
  // NAR-18: Minority with adversity flags
  isMinority?: boolean;
};

export type NarrativeResult = {
  timeline: TimelineEvent[];
  minorityStatus: MinorityStatus;
  // NAR-11: Mental health marker added when multiple negative events occur
  mentalHealthMarker?: string;
  copingMechanism?: string;
};

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_EVENT_TYPES: TimelineEventType[] = [
  'upbringing', 'education-milestone', 'first-job', 'first-posting', 'promotion', 'career-break',
  'scandal', 'injury', 'burnout', 'family-crisis', 'mentorship', 'betrayal', 'moral-injury',
  'success', 'failure', 'recruitment', 'defection-attempt', 'security-incident', 'romantic', 'loss',
];

const POSITIVE_EVENTS = new Set<TimelineEventType>([
  'success', 'promotion', 'mentorship', 'recruitment', 'romantic',
]);

const NEGATIVE_EVENTS = new Set<TimelineEventType>([
  'scandal', 'injury', 'burnout', 'betrayal', 'moral-injury', 'failure', 'loss', 'security-incident',
]);

// NAR-6: Neutral/challenging events that can add realism to visible minorities
const NEUTRAL_CHALLENGING_EVENTS = new Set<TimelineEventType>([
  'career-break', 'family-crisis',
]);

const FOUNDATIONAL_EVENTS = new Set<TimelineEventType>([
  'upbringing', 'education-milestone', 'first-job', 'first-posting',
]);

// NAR-13: Events indicating traumatic history (for refugees)
const TRAUMATIC_EVENTS = new Set<TimelineEventType>([
  'loss', 'injury', 'moral-injury', 'betrayal', 'security-incident',
]);

// NAR-14: Achievement events (for young elites)
const ACHIEVEMENT_EVENTS = new Set<TimelineEventType>([
  'success', 'promotion', 'recruitment', 'mentorship',
]);

// NAR-17: Loss/grief events (for families)
const GRIEF_EVENTS = new Set<TimelineEventType>([
  'loss', 'family-crisis',
]);

// NAR-4: Career-restricted event types - only allowed for specific careers
const CAREER_RESTRICTED_EVENTS: Record<string, TimelineEventType[]> = {
  military: [], // combat events would be added here if they existed
  academia: [], // publication events would be added here if they existed
  intelligence: ['recruitment', 'defection-attempt', 'security-incident'],
  'foreign-service': ['recruitment', 'defection-attempt'],
};

// NAR-7/NAR-12: Events blocked by age constraints
// Partial because not all event types have age gates
const AGE_GATED_EVENTS: Partial<Record<TimelineEventType, { minAge: number }>> = {
  'promotion': { minAge: 25 }, // NAR-7: senior promotion requires maturity
  'career-break': { minAge: 25 },
  'romantic': { minAge: 18 }, // NAR-12: marriage/divorce age floor
  'loss': { minAge: 16 },
  'burnout': { minAge: 22 },
  'mentorship': { minAge: 20 },
  'betrayal': { minAge: 20 },
  'moral-injury': { minAge: 20 },
  'recruitment': { minAge: 22 },
  'defection-attempt': { minAge: 25 },
  'security-incident': { minAge: 22 },
};

type TimelineTemplate = {
  description: string;
  type: TimelineEventType;
  impact: 'positive' | 'negative' | 'neutral' | 'mixed';
};

const TEMPLATE_STAGE_RANGES: Record<'childhood' | 'youngAdult' | 'midAge' | 'laterLife', { min: number; max: number }> = {
  childhood: { min: 4, max: 16 },
  youngAdult: { min: 18, max: 30 },
  midAge: { min: 31, max: 55 },
  laterLife: { min: 56, max: 90 },
};

// ============================================================================
// Helpers
// ============================================================================

function getEventDescriptions(): Record<string, string[]> {
  return {
    promotion: ['Advanced to senior role', 'Recognized for exceptional work', 'Given increased responsibilities'],
    success: ['Key operation succeeded', 'Major analysis proved correct', 'Negotiation breakthrough'],
    mentorship: ['Found a guiding figure', 'Taken under experienced wing', 'Critical guidance received'],
    scandal: ['Narrowly avoided exposure', 'Implicated in internal affair', 'Reputation challenged'],
    injury: ['Sustained field injury', 'Operational accident', 'Health crisis'],
    burnout: ['Hit the wall professionally', 'Needed extended leave', 'Rebuilt from exhaustion'],
    betrayal: ['Trusted colleague turned', 'Discovered deception', 'Asset compromised'],
    'moral-injury': ['Crossed a personal line', 'Witnessed something unforgivable', 'Questioned everything'],
    failure: ['Operation went wrong', 'Analysis proved faulty', 'Missed critical signals'],
    loss: ['Lost someone close', 'Witnessed tragedy', 'Personal devastation'],
    romantic: ['Significant relationship began', 'Found unexpected connection', 'Personal life shifted'],
    'career-break': ['Took time away', 'Reassessed priorities', 'Stepped back temporarily'],
    'family-crisis': ['Family needed attention', 'Personal obligations intervened', 'Home front demanded focus'],
    recruitment: ['Brought into sensitive program', 'Selected for special assignment', 'Noticed by key figures'],
    'security-incident': ['Security breach occurred', 'Cover nearly blown', 'Operational security compromised'],
    'defection-attempt': ['Approached by other side', 'Loyalty tested', 'Turned away overture'],
  };
}

// NAR-16: Career-specific event descriptions
function getCareerEventDescriptions(): Record<string, Record<string, string[]>> {
  return {
    military: {
      deployment: ['Deployed to active zone', 'Served in peacekeeping mission', 'Combat tour completed'],
      success: ['Distinguished service recognized', 'Unit citation earned', 'Mission accomplished under fire'],
      injury: ['Wounded in action', 'Training accident', 'Combat injury sustained'],
    },
    intelligence: {
      recruitment: ['Recruited high-value asset', 'Turned key informant', 'Built critical network'],
      success: ['Operation yielded intelligence gold', 'Analysis prevented crisis', 'Cover operation succeeded'],
      betrayal: ['Asset turned double', 'Network compromised', 'Trust was misplaced'],
    },
    'foreign-service': {
      success: ['Treaty negotiation breakthrough', 'Crisis mediation succeeded', 'Diplomatic incident defused'],
      'career-break': ['Posted to hardship duty', 'Recall and reassignment', 'Medical evacuation'],
    },
    academia: {
      success: ['Major publication accepted', 'Research breakthrough', 'Tenure achieved'],
      failure: ['Grant rejected', 'Research disputed', 'Publication retracted'],
      mentorship: ['Found academic mentor', 'Joined research network', 'Thesis advisor guidance'],
    },
  };
}

function determineImpact(
  rng: Rng,
  eventType: TimelineEventType,
): 'positive' | 'negative' | 'neutral' | 'mixed' {
  if (POSITIVE_EVENTS.has(eventType)) return 'positive';
  if (NEGATIVE_EVENTS.has(eventType)) return 'negative';
  return rng.next01() < 0.3 ? 'mixed' : 'neutral';
}

function generateUpbringingEvent(
  ctx: NarrativeContext,
): TimelineEvent {
  const { urbanicity, originRegion, homeCountryIso3, backgroundAdversityTags } = ctx;
  return {
    yearOffset: 0,
    type: 'upbringing',
    description: `Grew up in ${urbanicity} ${originRegion ?? 'region'} of ${homeCountryIso3}`,
    impact: backgroundAdversityTags.length > 2 ? 'negative' : 'neutral',
  };
}

function generateEducationEvent(
  rng: Rng,
  ctx: NarrativeContext,
): TimelineEvent {
  // Cap education age at current age (can't complete education in the future)
  const maxEduAge = Math.max(18, Math.min(25, ctx.age));
  const eduAge = rng.int(18, maxEduAge);
  return {
    yearOffset: eduAge,
    type: 'education-milestone',
    description: `Completed ${ctx.educationTrackTag} education`,
    impact: 'positive',
  };
}

function generateFirstJobEvent(
  rng: Rng,
  ctx: NarrativeContext,
): TimelineEvent {
  // Cap first job age at current age (can't start job in the future)
  // For young agents (under 22), they may not have had a first job yet, but we still generate one at their current age
  const maxFirstJobAge = Math.max(18, Math.min(28, ctx.age));
  const firstJobAge = rng.int(Math.min(22, maxFirstJobAge), maxFirstJobAge);
  const isOperative = ctx.roleSeedTags.includes('operative');
  return {
    yearOffset: firstJobAge,
    type: isOperative ? 'first-posting' : 'first-job',
    description: `Entered ${ctx.careerTrackTag} career track`,
    impact: 'positive',
  };
}

// Events that can ONLY happen after starting career (require employment context)
const CAREER_DEPENDENT_EVENTS = new Set<TimelineEventType>([
  'promotion', 'burnout', 'mentorship', 'betrayal', 'moral-injury',
  'recruitment', 'defection-attempt', 'security-incident',
]);

function generateRandomEvent(
  rng: Rng,
  ctx: NarrativeContext,
  eventType: TimelineEventType,
): TimelineEvent {
  const descriptions = getEventDescriptions();
  const descOptions = descriptions[eventType] ?? ['Significant event occurred'];
  const description = descOptions[rng.int(0, descOptions.length - 1)]!;

  // Cap random events at current age (can't have events in the future)
  // For career-dependent events, minimum age is 22 (typical career start)
  // This ensures defection, recruitment, promotion etc. happen AFTER first job
  const careerStartAge = 22;
  const isCareerDependent = CAREER_DEPENDENT_EVENTS.has(eventType);
  const minEventAge = isCareerDependent ? Math.min(careerStartAge, ctx.age) : Math.min(18, ctx.age);
  const maxEventAge = ctx.age;
  const yearOffset = rng.int(minEventAge, Math.max(minEventAge + 1, maxEventAge));
  const impact = determineImpact(rng, eventType);

  return { yearOffset, type: eventType, description, impact };
}

function pickTemplateEvent(
  rng: Rng,
  ctx: NarrativeContext,
  stage: keyof typeof TEMPLATE_STAGE_RANGES,
  templates: TimelineTemplate[] | undefined,
): TimelineEvent | null {
  if (!templates?.length) return null;
  const range = TEMPLATE_STAGE_RANGES[stage];
  if (ctx.age < range.min) return null;
  const maxAge = Math.min(ctx.age, range.max);
  const minAge = Math.min(range.min, maxAge);
  const yearOffset = rng.int(minAge, Math.max(minAge, maxAge));
  const template = rng.pick(templates);
  return {
    yearOffset,
    type: template.type,
    description: template.description,
    impact: template.impact,
  };
}

// ============================================================================
// Main Computation
// ============================================================================

export function computeNarrative(ctx: NarrativeContext): NarrativeResult {
  const {
    seed,
    vocab,
    homeCountryIso3,
    currentCountryIso3,
    spiritualityAffiliationTag,
    diasporaStatus,
    tierBand,
    backgroundAdversityTags,
    careerTrackTag,
    trace,
  } = ctx;

  // ─────────────────────────────────────────────────────────────────────────────
  // TIMELINE (Oracle recommendation + NAR correlates)
  // ─────────────────────────────────────────────────────────────────────────────
  traceFacet(trace, seed, 'timeline');
  const timeRng = makeRng(facetSeed(seed, 'timeline'));
  const eventTypes = vocab.timeline?.eventTypes ?? DEFAULT_EVENT_TYPES;
  const templatePools = vocab.timelineTemplates;

  // NAR-1: Age determines minimum timeline event count
  // eventCount >= Math.floor(age / 15) (20yo = 1+, 45yo = 3+, 60yo = 4+)
  const minEventsByAge = Math.floor(ctx.age / 15);
  const baseEventCount = timeRng.int(6, 10);
  const eventCount = Math.max(baseEventCount, minEventsByAge + 3); // +3 for foundational events

  // NAR-2: Elite tier has fewer negative events (cap at 2 vs normal cap of 4)
  const negativeEventCap = tierBand === 'elite' ? 2 : 4;

  const timeline: TimelineEvent[] = [];

  // Always include foundational events
  timeline.push(generateUpbringingEvent(ctx));
  timeline.push(generateEducationEvent(timeRng, ctx));
  timeline.push(generateFirstJobEvent(timeRng, ctx));

  const templateEvents: TimelineEvent[] = [];
  const childhoodTemplate = pickTemplateEvent(timeRng, ctx, 'childhood', templatePools?.childhood);
  if (childhoodTemplate) templateEvents.push(childhoodTemplate);
  const youngAdultTemplate = pickTemplateEvent(timeRng, ctx, 'youngAdult', templatePools?.youngAdult);
  if (youngAdultTemplate) templateEvents.push(youngAdultTemplate);
  const midAgeTemplate = pickTemplateEvent(timeRng, ctx, 'midAge', templatePools?.midAge);
  if (midAgeTemplate) templateEvents.push(midAgeTemplate);
  const laterLifeTemplate = pickTemplateEvent(timeRng, ctx, 'laterLife', templatePools?.laterLife);
  if (laterLifeTemplate) templateEvents.push(laterLifeTemplate);
  if (templatePools?.anyAge?.length && ctx.age >= 18 && timeRng.next01() < 0.4) {
    const anyTemplate = timeRng.pick(templatePools.anyAge);
    templateEvents.push({
      yearOffset: timeRng.int(18, Math.max(18, ctx.age)),
      type: anyTemplate.type,
      description: anyTemplate.description,
      impact: anyTemplate.impact,
    });
  }

  timeline.push(...templateEvents);

  // NAR-4: Filter events based on career track restrictions
  // NAR-7/NAR-12: Filter events based on age constraints
  const careerAllowedEvents = CAREER_RESTRICTED_EVENTS[careerTrackTag];
  const filteredEventTypes = (eventTypes as TimelineEventType[]).filter(t => {
    // Skip foundational events (handled separately)
    if (FOUNDATIONAL_EVENTS.has(t)) return false;

    // NAR-4: Check if event is career-restricted
    // Events like 'recruitment', 'defection-attempt' only for intelligence/foreign-service
    const isRestrictedEvent = Object.values(CAREER_RESTRICTED_EVENTS).some(events => events.includes(t));
    if (isRestrictedEvent && (!careerAllowedEvents || !careerAllowedEvents.includes(t))) {
      return false;
    }

    // NAR-7/NAR-12: Check age constraints
    const ageGate = AGE_GATED_EVENTS[t];
    if (ageGate && ctx.age < ageGate.minAge) {
      return false;
    }

    return true;
  });

  const mutableAvailable = [...filteredEventTypes];

  // PR2: Diaspora Status ↔ Negative Timeline Events (positive correlation)
  // Non-native diaspora agents face increased probability of adversity/negative events
  const diasporaAdversityWeight = diasporaStatus === 'native' ? 0
    : diasporaStatus === 'internal-migrant' ? 0.05
    : diasporaStatus === 'expat' ? 0.10
    : diasporaStatus === 'diaspora-child' ? 0.15
    : diasporaStatus === 'refugee' ? 0.25
    : 0.10;

  // NAR-5: Religious minority in insecure area → weight persecution/discrimination events
  // securityScore01k < 400 (0.4) is considered insecure
  const securityScore01 = (ctx.securityScore01k ?? 500) / 1000;
  const isInsecureArea = securityScore01 < 0.4;

  // Track negative event count for NAR-2 cap
  let negativeEventCount = timeline.filter(e => e.impact === 'negative').length;

  // Fill remaining events
  const remainingCount = Math.max(0, eventCount - 3 - templateEvents.length);
  for (let i = 0; i < remainingCount && mutableAvailable.length > 0; i++) {
    let typeIdx: number;

    // NAR-2: Check if we've hit the negative event cap
    const atNegativeCap = negativeEventCount >= negativeEventCap;

    // Build weighted selection pool
    const availableWithWeights = mutableAvailable.map((t, idx) => {
      let weight = 1.0;
      const isNegative = NEGATIVE_EVENTS.has(t);

      // NAR-2: If at negative cap, exclude negative events
      if (atNegativeCap && isNegative) {
        return { idx, weight: 0 };
      }

      // PR2: Diaspora adversity weighting
      if (isNegative && diasporaAdversityWeight > 0) {
        weight += diasporaAdversityWeight * 3;
      }

      return { idx, weight };
    }).filter(w => w.weight > 0);

    if (availableWithWeights.length === 0) break;

    // Weighted random selection
    const totalWeight = availableWithWeights.reduce((sum, w) => sum + w.weight, 0);
    let roll = timeRng.next01() * totalWeight;
    typeIdx = availableWithWeights[0]!.idx;
    for (const w of availableWithWeights) {
      roll -= w.weight;
      if (roll <= 0) {
        typeIdx = w.idx;
        break;
      }
    }

    const eventType = mutableAvailable[typeIdx]!;
    mutableAvailable.splice(typeIdx, 1);

    const event = generateRandomEvent(timeRng, ctx, eventType);
    timeline.push(event);

    if (event.impact === 'negative') {
      negativeEventCount++;
    }
  }

  // NAR-3: Adversity tags require at least one negative event
  // If backgroundAdversityTags.length > 0 and no negative events, add one
  if (backgroundAdversityTags.length > 0 && negativeEventCount === 0) {
    const negativeTypes = filteredEventTypes.filter(t => NEGATIVE_EVENTS.has(t));
    if (negativeTypes.length > 0) {
      const adversityEvent = generateRandomEvent(timeRng, ctx, timeRng.pick(negativeTypes));
      timeline.push(adversityEvent);
      negativeEventCount++;
    }
  }

  // Sort by year
  timeline.sort((a, b) => a.yearOffset - b.yearOffset);

  traceSet(trace, 'timeline', {
    eventCount: timeline.length,
    templateCount: templateEvents.length,
    negativeEventCount,
    negativeEventCap,
  }, { method: 'generated' });

  // ─────────────────────────────────────────────────────────────────────────────
  // MINORITY STATUS (Oracle recommendation + NAR-9 correlate)
  // ─────────────────────────────────────────────────────────────────────────────
  traceFacet(trace, seed, 'minorityStatus');
  const minRng = makeRng(facetSeed(seed, 'minorityStatus'));

  // Local majority - are they part of the majority in their current location?
  // Native with high probability = majority; diaspora = likely minority
  const localMajority = diasporaStatus === 'native' && minRng.next01() > 0.15;

  // NAR-9: Diaspora status correlates with visible minority
  // Refugees/immigrants have higher probability of being visible minorities
  // Base rate depends on home vs current country, but diaspora status amplifies
  const diasporaVisibilityBoost = diasporaStatus === 'refugee' ? 0.35
    : diasporaStatus === 'diaspora-child' ? 0.25
    : diasporaStatus === 'expat' ? 0.15
    : diasporaStatus === 'internal-migrant' ? 0.05
    : 0;
  const baseVisibleMinorityProb = homeCountryIso3 !== currentCountryIso3 ? 0.6 : 0.1;
  const visibleMinorityProb = Math.min(0.95, baseVisibleMinorityProb + diasporaVisibilityBoost);
  const visibleMinority = minRng.next01() < visibleMinorityProb;

  // Linguistic minority - primary language differs from locale
  // Correlate #NEW10: Diaspora Status ↔ Linguistic Minority (DETERMINISTIC)
  const isNativeOrLocal = diasporaStatus === 'native' || diasporaStatus === 'internal-migrant';
  let linguisticMinority = !isNativeOrLocal
    ? minRng.next01() < 0.75
    : (homeCountryIso3 !== currentCountryIso3 || minRng.next01() < 0.08);

  // ═══════════════════════════════════════════════════════════════════════════
  // PLAUSIBILITY GATE NAR-8: Local majority cannot be linguistic minority
  // If you're part of the local majority, you speak the local language
  // ═══════════════════════════════════════════════════════════════════════════
  if (localMajority && linguisticMinority) {
    linguisticMinority = false;
    if (trace) {
      trace.derived = trace.derived ?? {};
      trace.derived.nar8LinguisticGate = {
        localMajority: true,
        originalLinguisticMinority: true,
        adjustedLinguisticMinority: false,
        reason: 'NAR-8: Local majority cannot be linguistic minority',
      };
    }
  }

  // Religious minority - faith differs from locale majority
  const religiousMinority = spiritualityAffiliationTag !== 'secular' && minRng.next01() < 0.25;

  const minorityStatus: MinorityStatus = {
    localMajority,
    visibleMinority,
    linguisticMinority,
    religiousMinority,
  };

  traceSet(trace, 'minorityStatus', minorityStatus, { method: 'derived' });

  // ─────────────────────────────────────────────────────────────────────────────
  // NAR-6: Visible minority cannot have all positive events
  // If visibleMinority and all non-foundational events are positive, add a neutral/challenging event
  // ─────────────────────────────────────────────────────────────────────────────
  const nonFoundationalEvents = timeline.filter(e => !FOUNDATIONAL_EVENTS.has(e.type));
  const allPositive = nonFoundationalEvents.length > 0 &&
    nonFoundationalEvents.every(e => e.impact === 'positive');

  if (visibleMinority && allPositive) {
    // Add a neutral or challenging event to make timeline more realistic
    const challengingTypes = filteredEventTypes.filter(t =>
      NEUTRAL_CHALLENGING_EVENTS.has(t) || NEGATIVE_EVENTS.has(t)
    );
    if (challengingTypes.length > 0) {
      const challengeEvent = generateRandomEvent(timeRng, ctx, timeRng.pick(challengingTypes));
      // Soften impact to 'mixed' or 'neutral' rather than fully negative for NAR-6
      if (challengeEvent.impact === 'negative') {
        challengeEvent.impact = 'mixed';
      }
      timeline.push(challengeEvent);
      timeline.sort((a, b) => a.yearOffset - b.yearOffset);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // NAR-5: Religious minority in insecure area → add persecution/discrimination event
  // ─────────────────────────────────────────────────────────────────────────────
  if (religiousMinority && isInsecureArea && minRng.next01() < 0.6) {
    // 60% chance of persecution event for religious minorities in insecure areas
    // We add this as a 'betrayal' or 'moral-injury' event with persecution description
    const persecutionEvent: TimelineEvent = {
      yearOffset: minRng.int(Math.max(10, ctx.age - 20), ctx.age),
      type: 'moral-injury',
      description: 'Faced religious persecution or discrimination',
      impact: 'negative',
    };
    timeline.push(persecutionEvent);
    timeline.sort((a, b) => a.yearOffset - b.yearOffset);
    negativeEventCount++;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // NAR-13: Refugee → Negative Event
  // If diasporaStatus == "refugee", ensure at least 1 negative/traumatic event
  // Rationale: Refugee status implies traumatic history
  // ─────────────────────────────────────────────────────────────────────────────
  if (diasporaStatus === 'refugee') {
    const hasTraumaticEvent = timeline.some(e => TRAUMATIC_EVENTS.has(e.type));
    if (!hasTraumaticEvent) {
      const traumaTypes: TimelineEventType[] = ['loss', 'injury', 'moral-injury'];
      const traumaDescriptions: Record<string, string[]> = {
        loss: ['Lost home and community to displacement', 'Family separated during flight', 'Witnessed tragedy during exodus'],
        injury: ['Injured during displacement', 'Health crisis during refugee journey', 'Trauma from dangerous crossing'],
        'moral-injury': ['Witnessed violence during displacement', 'Forced to make impossible choices', 'Experienced persecution firsthand'],
      };
      const traumaType = traumaTypes[minRng.int(0, traumaTypes.length - 1)]!;
      const descriptions = traumaDescriptions[traumaType] ?? ['Experienced trauma during displacement'];
      const refugeeEvent: TimelineEvent = {
        yearOffset: minRng.int(Math.max(5, ctx.age - 25), Math.max(6, ctx.age - 5)),
        type: traumaType,
        description: descriptions[minRng.int(0, descriptions.length - 1)]!,
        impact: 'negative',
      };
      timeline.push(refugeeEvent);
      negativeEventCount++;
      if (trace) {
        trace.derived = trace.derived ?? {};
        trace.derived.nar13RefugeeTrauma = { added: true, type: traumaType };
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // NAR-14: Elite + Young → Achievement Event
  // If tier == "elite" AND age < 35, ensure at least 1 achievement/success event
  // Rationale: Young elite achieved something to reach tier
  // ─────────────────────────────────────────────────────────────────────────────
  if (tierBand === 'elite' && ctx.age < 35) {
    const hasAchievement = timeline.some(e => ACHIEVEMENT_EVENTS.has(e.type));
    if (!hasAchievement) {
      const achievementDescriptions = [
        'Early recognition for exceptional talent',
        'Fast-tracked through the ranks',
        'Distinguished achievement at young age',
        'Noticed by key decision-makers',
      ];
      const achievementEvent: TimelineEvent = {
        yearOffset: minRng.int(Math.max(20, ctx.age - 10), ctx.age),
        type: 'success',
        description: achievementDescriptions[minRng.int(0, achievementDescriptions.length - 1)]!,
        impact: 'positive',
      };
      timeline.push(achievementEvent);
      if (trace) {
        trace.derived = trace.derived ?? {};
        trace.derived.nar14YoungEliteAchievement = { added: true };
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // NAR-15: Conflict Exposure → Timeline Event
  // If hasConflictExposure (from geography/background), add conflict-related event
  // Rationale: Conflict exposure appears in history
  // ─────────────────────────────────────────────────────────────────────────────
  const hasConflictExposure = ctx.hasConflictExposure ||
    backgroundAdversityTags.some(t => t.includes('conflict') || t.includes('war') || t.includes('displacement'));
  if (hasConflictExposure) {
    const hasConflictEvent = timeline.some(e =>
      e.description.toLowerCase().includes('conflict') ||
      e.description.toLowerCase().includes('war') ||
      e.description.toLowerCase().includes('displacement') ||
      e.description.toLowerCase().includes('violence')
    );
    if (!hasConflictEvent) {
      const conflictDescriptions = [
        'Lived through regional conflict',
        'Childhood shaped by nearby war',
        'Community affected by violence',
        'Witnessed effects of armed conflict',
      ];
      const conflictEvent: TimelineEvent = {
        yearOffset: minRng.int(Math.max(5, ctx.age - 30), Math.max(10, ctx.age - 5)),
        type: 'moral-injury',
        description: conflictDescriptions[minRng.int(0, conflictDescriptions.length - 1)]!,
        impact: 'negative',
      };
      timeline.push(conflictEvent);
      negativeEventCount++;
      if (trace) {
        trace.derived = trace.derived ?? {};
        trace.derived.nar15ConflictExposure = { added: true };
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // NAR-16: Career → Event Type Match
  // Career-specific events should match career (e.g., "military" career gets deployment events)
  // Rationale: Career shapes life events
  // ─────────────────────────────────────────────────────────────────────────────
  const careerDescriptions = getCareerEventDescriptions();
  const careerEventPool = careerDescriptions[careerTrackTag];
  if (careerEventPool && ctx.age >= 25) {
    // Check if we have any career-specific flavored events
    const careerEventTypes = Object.keys(careerEventPool) as TimelineEventType[];
    const hasCareerFlavoredEvent = timeline.some(e => {
      // Check if any existing event matches career flavor
      const careerDesc = careerEventPool[e.type];
      return careerDesc?.some(d => e.description.includes(d.split(' ')[0] ?? ''));
    });

    if (!hasCareerFlavoredEvent && careerEventTypes.length > 0) {
      // Add a career-flavored event
      const eventType = careerEventTypes[minRng.int(0, careerEventTypes.length - 1)]! as TimelineEventType;
      const descriptions = careerEventPool[eventType];
      if (descriptions && descriptions.length > 0) {
        const careerEvent: TimelineEvent = {
          yearOffset: minRng.int(Math.max(23, ctx.age - 15), ctx.age),
          type: eventType,
          description: descriptions[minRng.int(0, descriptions.length - 1)]!,
          impact: determineImpact(minRng, eventType),
        };
        timeline.push(careerEvent);
        if (careerEvent.impact === 'negative') negativeEventCount++;
        if (trace) {
          trace.derived = trace.derived ?? {};
          trace.derived.nar16CareerEvent = { added: true, career: careerTrackTag, type: eventType };
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // NAR-17: Family + Loss → Grief Event
  // If hasFamily AND age > 40, increase probability of loss/grief event
  // Rationale: Families experience losses over time
  // ─────────────────────────────────────────────────────────────────────────────
  if (ctx.hasFamily && ctx.age > 40) {
    const hasGriefEvent = timeline.some(e => GRIEF_EVENTS.has(e.type));
    // 40% chance of adding grief event if none exists (probability increases with age)
    const griefProbability = 0.3 + (ctx.age - 40) * 0.01; // 30% at 40, 50% at 60
    if (!hasGriefEvent && minRng.next01() < griefProbability) {
      const griefDescriptions = [
        'Lost a parent after long illness',
        'Mourned passing of elder family member',
        'Family crisis required extended leave',
        'Dealt with unexpected family loss',
      ];
      const griefEvent: TimelineEvent = {
        yearOffset: minRng.int(Math.max(30, ctx.age - 15), ctx.age),
        type: 'loss',
        description: griefDescriptions[minRng.int(0, griefDescriptions.length - 1)]!,
        impact: 'negative',
      };
      timeline.push(griefEvent);
      negativeEventCount++;
      if (trace) {
        trace.derived = trace.derived ?? {};
        trace.derived.nar17FamilyGrief = { added: true, probability: griefProbability };
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // NAR-18: Minority + Adversity → Discrimination Event
  // If isMinority AND hasAdversityTag, ensure at least 1 discrimination-related event
  // Rationale: Minorities with adversity face discrimination
  // ─────────────────────────────────────────────────────────────────────────────
  const isMinority = ctx.isMinority || visibleMinority || linguisticMinority || religiousMinority;
  const hasAdversityTag = backgroundAdversityTags.length > 0 &&
    !backgroundAdversityTags.every(t => t === 'stable-upbringing');
  if (isMinority && hasAdversityTag) {
    const hasDiscriminationEvent = timeline.some(e =>
      e.description.toLowerCase().includes('discrimination') ||
      e.description.toLowerCase().includes('persecution') ||
      e.description.toLowerCase().includes('prejudice') ||
      e.description.toLowerCase().includes('bias')
    );
    if (!hasDiscriminationEvent) {
      const discriminationDescriptions = [
        'Faced systemic barriers due to background',
        'Experienced professional discrimination',
        'Overcame prejudice in advancement',
        'Navigated bias in institutional setting',
      ];
      const discriminationEvent: TimelineEvent = {
        yearOffset: minRng.int(Math.max(18, ctx.age - 20), ctx.age),
        type: 'moral-injury',
        description: discriminationDescriptions[minRng.int(0, discriminationDescriptions.length - 1)]!,
        impact: 'negative',
      };
      timeline.push(discriminationEvent);
      negativeEventCount++;
      if (trace) {
        trace.derived = trace.derived ?? {};
        trace.derived.nar18MinorityDiscrimination = { added: true, isMinority, hasAdversityTag };
      }
    }
  }

  // Re-sort timeline after all additions
  timeline.sort((a, b) => a.yearOffset - b.yearOffset);

  // ─────────────────────────────────────────────────────────────────────────────
  // NAR-11: Multiple negative events add mental health marker
  // If negativeEventCount >= 3, add mentalHealthMarker or copingMechanism
  // ─────────────────────────────────────────────────────────────────────────────
  let mentalHealthMarker: string | undefined;
  let copingMechanism: string | undefined;

  // Recount after potential additions
  const finalNegativeCount = timeline.filter(e => e.impact === 'negative').length;

  if (finalNegativeCount >= 3) {
    // Select a mental health marker based on the types of negative events
    const mentalHealthMarkers = [
      'anxiety-prone', 'hypervigilant', 'trust-issues', 'emotional-guardedness',
      'resilience-through-adversity', 'survivor-guilt', 'chronic-stress',
    ];
    const copingMechanisms = [
      'compartmentalization', 'emotional-suppression', 'work-immersion',
      'social-withdrawal', 'humor-deflection', 'spiritual-faith',
      'physical-exercise', 'creative-outlet', 'therapy-engagement',
    ];

    mentalHealthMarker = mentalHealthMarkers[minRng.int(0, mentalHealthMarkers.length - 1)];
    copingMechanism = copingMechanisms[minRng.int(0, copingMechanisms.length - 1)];

    traceSet(trace, 'mentalHealthMarker', { marker: mentalHealthMarker, coping: copingMechanism, negativeEventCount: finalNegativeCount }, { method: 'NAR-11' });
  }

  return { timeline, minorityStatus, mentalHealthMarker, copingMechanism };
}
