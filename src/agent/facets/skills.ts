/**
 * Skills computation for agents.
 *
 * Skills are derived competencies with experience tracking.
 * They depend on aptitudes, traits, latents, and career/role context.
 */

import type { Fixed, TierBand, Latents, AgentVocabV1 } from '../types';
import { makeRng, facetSeed, clampFixed01k, clampInt, type SecurityEnv01k } from '../utils';
import type { Aptitudes } from './aptitudes';
import type { PsychTraits } from './traits';

// ============================================================================
// Types
// ============================================================================

export type SkillEntry = {
  value: Fixed;
  xp: Fixed;
  lastUsedDay: number | null;
};

export type SkillBias = {
  skill: string;
  delta: number;
  reason: string;
};

export type SkillsContext = {
  seed: string;
  vocab: AgentVocabV1;
  aptitudes: Aptitudes;
  traits: PsychTraits;
  latents: Latents;
  roleSeedTags: readonly string[];
  tierBand: TierBand;
  careerTrackTag: string;
  voiceTag: string;
  securityEnv01k: SecurityEnv01k | null;
  travelScore: Fixed;
  /** Agent's age for experience multiplier */
  age: number;
};

export type SkillsResult = {
  skills: Record<string, SkillEntry>;
  voiceBiases: SkillBias[];
};

// ============================================================================
// Skills Computation
// ============================================================================

/**
 * Compute skills from aptitudes, traits, and context.
 *
 * @param ctx - Context with all dependencies
 * @returns Computed skills and voice biases
 */
export function computeSkills(ctx: SkillsContext): SkillsResult {
  const {
    seed, vocab, aptitudes, traits, latents, roleSeedTags,
    tierBand, careerTrackTag, voiceTag, securityEnv01k, travelScore, age,
  } = ctx;

  // Age-based experience multiplier: older agents have accumulated more XP
  // +1.5% per year over 25, capped at 60% bonus at age 65
  const ageExpMultiplier = 1 + Math.max(0, Math.min(0.60, (age - 25) * 0.015));

  const skillRng = makeRng(facetSeed(seed, 'skills'));

  if (!vocab.capabilities.skillKeys.length) {
    throw new Error('Agent vocab missing: capabilities.skillKeys');
  }

  // Security environment axes
  const securityAxis01k = (axis: 'conflict' | 'stateViolence' | 'militarization', fallback01k: Fixed) =>
    securityEnv01k ? securityEnv01k[axis] : fallback01k;

  const conflictEnv01k = securityAxis01k('conflict', 0);
  const stateViolenceEnv01k = securityAxis01k('stateViolence', 0);
  const militarizationEnv01k = securityAxis01k('militarization', 150);
  const securityPressure01k = clampFixed01k(
    0.45 * conflictEnv01k + 0.35 * stateViolenceEnv01k + 0.20 * militarizationEnv01k,
  );

  const skills: Record<string, SkillEntry> = {};

  for (const k of vocab.capabilities.skillKeys) {
    const noise = clampFixed01k(skillRng.int(0, 1000));

    // Career bonuses
    const careerBonus = computeCareerBonus(careerTrackTag, k);
    const tierBonus = tierBand === 'elite' ? 60 : tierBand === 'mass' ? -20 : 0;

    // Compute skill value based on skill type
    const value = computeSkillValue({
      k, noise, careerBonus, tierBonus,
      aptitudes, traits, latents, roleSeedTags, travelScore,
      conflictEnv01k, stateViolenceEnv01k, securityPressure01k,
    });

    // Compute XP based on value with age multiplier (older agents have more experience)
    const baseXp = Math.round((value / 1000) * 520) + skillRng.int(0, 180);
    const xp = clampFixed01k(clampInt(Math.round(baseXp * ageExpMultiplier), 0, 500));

    skills[k] = { value, xp, lastUsedDay: null };
  }

  // Deterministic Cap DC7: Low Impulse Control ↔ Tradecraft Cap
  // Operatives with poor impulse control make operational mistakes;
  // they cannot achieve high tradecraft
  if (latents.impulseControl < 350 && skills['tradecraft']) {
    skills['tradecraft'].value = Math.min(skills['tradecraft'].value, 500) as Fixed;
  }

  // ============================================================================
  // Skill Caps Based on Aptitudes/Latents (DC-SK correlates)
  // ============================================================================

  // DC-SK1: Low attentionControl caps surveillance skill
  // Surveillance requires sustained focus; low attention control means critical details get missed
  if (aptitudes.attentionControl < 300 && skills['surveillance']) {
    skills['surveillance'].value = Math.min(skills['surveillance'].value, 450) as Fixed;
  }

  // DC-SK2: Low workingMemory caps bureaucracy skill
  // Bureaucracy requires tracking many procedures, forms, and regulations simultaneously
  if (aptitudes.workingMemory < 350 && skills['bureaucracy']) {
    skills['bureaucracy'].value = Math.min(skills['bureaucracy'].value, 500) as Fixed;
  }

  // DC-SK3: Low reflexes cap driving skill
  // Safe high-performance driving requires quick reactions to hazards
  if (aptitudes.reflexes < 300 && skills['driving']) {
    skills['driving'].value = Math.min(skills['driving'].value, 550) as Fixed;
  }

  // DC-SK4: High stressReactivity caps shooting skill
  // Marksmanship requires calm under pressure; high stress reactivity causes flinching/rushing
  if (latents.stressReactivity > 700 && skills['shooting']) {
    skills['shooting'].value = Math.min(skills['shooting'].value, 550) as Fixed;
  }

  // DC-SK5: Low charisma caps mediaHandling skill
  // Media presence requires natural charisma; low charisma means poor on-camera performance
  if (aptitudes.charisma < 300 && skills['mediaHandling']) {
    skills['mediaHandling'].value = Math.min(skills['mediaHandling'].value, 450) as Fixed;
  }

  // DC-SK10: Low techFluency caps digitalHygiene skill
  // Digital hygiene requires understanding technology; low tech fluency means poor digital security practices
  if (latents.techFluency < 300 && skills['digitalHygiene']) {
    skills['digitalHygiene'].value = Math.min(skills['digitalHygiene'].value, 400) as Fixed;
  }

  // DC-SK6: Empathy → Negotiation Floor
  // High empathy helps negotiation; empathetic agents can read and respond to others' needs
  if (aptitudes.empathy > 700 && skills['negotiation']) {
    skills['negotiation'].value = Math.max(skills['negotiation'].value, 350) as Fixed;
  }

  // DC-SK7: Opsec → Surveillance Floor
  // Security awareness includes surveillance detection; operationally aware agents notice being watched
  if (latents.opsecDiscipline > 700 && skills['surveillance']) {
    skills['surveillance'].value = Math.max(skills['surveillance'].value, 300) as Fixed;
  }

  // DC-SK8: Stress → First Aid Cap
  // High stress impairs emergency response; panicking under pressure leads to medical mistakes
  if (latents.stressReactivity > 750 && skills['firstAid']) {
    skills['firstAid'].value = Math.min(skills['firstAid'].value, 550) as Fixed;
  }

  // DC-SK9: Dexterity → Lockpicking Floor
  // Manual dexterity enables lock manipulation; nimble fingers can work complex mechanisms
  if (aptitudes.dexterity > 700 && skills['lockpicking']) {
    skills['lockpicking'].value = Math.max(skills['lockpicking'].value, 300) as Fixed;
  }

  // DC-SK11: Charisma → Elicitation Floor
  // High charisma enables information extraction; charming agents get people to talk
  if (aptitudes.charisma > 700 && skills['elicitation']) {
    skills['elicitation'].value = Math.max(skills['elicitation'].value, 350) as Fixed;
  }

  // DC-SK12: Attention → Analysis Floor
  // Sustained attention enables deep analysis; focused agents can process complex information
  if (aptitudes.attentionControl > 750 && skills['analysis']) {
    skills['analysis'].value = Math.max(skills['analysis'].value, 350) as Fixed;
  }

  // DC-SK13: Reflexes → Driving Floor
  // Quick reflexes enhance driving; fast reaction times prevent accidents
  if (aptitudes.reflexes > 700 && skills['driving']) {
    skills['driving'].value = Math.max(skills['driving'].value, 400) as Fixed;
  }

  // DC-SK14: Memory → Languages Floor
  // Good memory aids language acquisition; multilingual agents with strong memory retain vocabulary
  // Only applies if agent has language skills (multilingual)
  if (aptitudes.workingMemory > 750) {
    for (const skillKey of Object.keys(skills)) {
      if (skillKey.startsWith('language_') || skillKey === 'languages') {
        skills[skillKey].value = Math.max(skills[skillKey].value, 350) as Fixed;
      }
    }
  }

  // DC-SK15: Stress → Combat Cap
  // Extreme stress impairs combat performance; highly reactive agents freeze or panic under fire
  if (latents.stressReactivity > 800) {
    const combatSkills = ['shooting', 'handToHand', 'combat', 'melee', 'unarmedCombat'];
    for (const skillKey of combatSkills) {
      if (skills[skillKey]) {
        skills[skillKey].value = Math.min(skills[skillKey].value, 500) as Fixed;
      }
    }
  }

  // DC-SK16: CogSpeed → Research Floor
  // Fast cognition aids research; quick thinkers can process and synthesize information rapidly
  if (aptitudes.cognitiveSpeed > 700 && skills['research']) {
    skills['research'].value = Math.max(skills['research'].value, 350) as Fixed;
  }

  // Apply role seed bumps from vocab
  applyRoleBumps(skills, roleSeedTags, vocab);

  // Voice-based skill biases
  const voiceBiases = applyVoiceBiases(skills, voiceTag, skillRng);

  return { skills, voiceBiases };
}

// ============================================================================
// Helper Functions
// ============================================================================

function computeCareerBonus(careerTrackTag: string, skillKey: string): number {
  return (
    (careerTrackTag === 'military' && ['shooting', 'tradecraft', 'surveillance', 'driving'].includes(skillKey) ? 120 : 0) +
    (careerTrackTag === 'intelligence' && ['tradecraft', 'surveillance', 'shooting', 'driving', 'legalOps'].includes(skillKey) ? 140 : 0) +
    (careerTrackTag === 'foreign-service' && ['negotiation', 'bureaucracy', 'mediaHandling', 'driving'].includes(skillKey) ? 120 : 0) +
    (careerTrackTag === 'journalism' && ['mediaHandling', 'surveillance', 'negotiation'].includes(skillKey) ? 120 : 0) +
    (careerTrackTag === 'law' && ['legalOps', 'bureaucracy', 'negotiation'].includes(skillKey) ? 140 : 0) +
    (careerTrackTag === 'public-health' && ['firstAid', 'bureaucracy', 'negotiation'].includes(skillKey) ? 120 : 0) +
    (careerTrackTag === 'finance' && ['financeOps', 'bureaucracy', 'negotiation'].includes(skillKey) ? 120 : 0) +
    (careerTrackTag === 'logistics' && ['driving', 'tradecraft', 'bureaucracy'].includes(skillKey) ? 120 : 0)
  );
}

type SkillValueParams = {
  k: string;
  noise: Fixed;
  careerBonus: number;
  tierBonus: number;
  aptitudes: Aptitudes;
  traits: PsychTraits;
  latents: Latents;
  roleSeedTags: readonly string[];
  travelScore: Fixed;
  conflictEnv01k: Fixed;
  stateViolenceEnv01k: Fixed;
  securityPressure01k: Fixed;
};

function computeSkillValue(p: SkillValueParams): Fixed {
  const { k, noise, careerBonus, tierBonus, aptitudes, traits, latents, roleSeedTags, travelScore } = p;
  const { conflictEnv01k, stateViolenceEnv01k, securityPressure01k } = p;

  let value: Fixed;
  switch (k) {
    case 'driving':
      value = clampFixed01k(
        0.22 * aptitudes.dexterity + 0.22 * aptitudes.handEyeCoordination +
        0.20 * aptitudes.attentionControl + 0.12 * traits.riskTolerance +
        0.12 * travelScore + 0.12 * noise + careerBonus + tierBonus
      );
      break;

    case 'shooting':
      value = clampFixed01k(
        0.26 * aptitudes.reflexes + 0.24 * aptitudes.handEyeCoordination +
        0.18 * aptitudes.attentionControl + 0.12 * latents.opsecDiscipline +
        0.08 * securityPressure01k + 0.20 * noise + careerBonus + tierBonus
      );
      break;

    case 'surveillance':
      // Correlate #9: Travel ↔ Skills - varied environments sharpen surveillance skills
      value = clampFixed01k(
        0.20 * aptitudes.cognitiveSpeed + 0.20 * aptitudes.attentionControl +
        0.16 * aptitudes.workingMemory + 0.16 * latents.opsecDiscipline +
        0.08 * latents.techFluency +
        0.06 * travelScore + // Diverse environments build surveillance adaptability
        0.06 * stateViolenceEnv01k + 0.16 * noise + careerBonus
      );
      break;

    case 'tradecraft':
      // Correlate #9: Travel ↔ Skills - operatives who travel more develop better tradecraft
      // Cosmopolitanism directly contributes: diverse cultural exposure builds operational adaptability
      // Strong weights needed to overcome noise and show measurable correlation
      value = clampFixed01k(
        0.16 * latents.opsecDiscipline + 0.12 * aptitudes.deceptionAptitude +
        0.06 * latents.riskAppetite + 0.10 * aptitudes.workingMemory +
        0.04 * latents.techFluency +
        0.22 * travelScore + // Travel experience builds operational skills (increased)
        0.20 * latents.cosmopolitanism + // Cosmopolitan agents develop tradecraft (increased)
        0.04 * conflictEnv01k + 0.10 * noise + careerBonus +
        (roleSeedTags.includes('operative') ? 90 : 0)
      );
      break;

    case 'firstAid':
      value = clampFixed01k(
        0.25 * aptitudes.workingMemory + 0.20 * aptitudes.attentionControl +
        0.25 * traits.conscientiousness + 0.06 * stateViolenceEnv01k +
        0.30 * noise + careerBonus + tierBonus
      );
      break;

    case 'negotiation': {
      // Correlate #9: Travel ↔ Skills - international exposure improves negotiation
      // Correlate #SK4: Adaptability ↔ Negotiation - flexible minds negotiate better
      const baseNegotiation = clampFixed01k(
        0.24 * aptitudes.charisma + 0.16 * aptitudes.empathy +
        0.14 * aptitudes.workingMemory + 0.08 * latents.publicness +
        0.12 * latents.adaptability + // #SK4: Adaptability helps find creative solutions
        0.10 * travelScore + // Travel exposure builds cross-cultural negotiation skills
        0.16 * noise + careerBonus + tierBonus
      );
      // PR1: Stress Reactivity ↔ Negotiation Skill (negative correlation)
      // High stress reactivity (> 650/1000) reduces negotiation effectiveness.
      // Agents who react poorly to stress struggle to maintain composure in negotiations.
      // Applied as a weighted multiplier: max 15% penalty at stress reactivity = 1000.
      const stressReactivityPenalty = latents.stressReactivity > 650
        ? 1 - 0.15 * ((latents.stressReactivity - 650) / 350) // Linear scale from 0% at 650 to 15% at 1000
        : 1;
      value = clampFixed01k(baseNegotiation * stressReactivityPenalty);
      break;
    }

    case 'mediaHandling':
      value = clampFixed01k(
        0.30 * latents.publicness + 0.20 * aptitudes.charisma +
        0.18 * aptitudes.attentionControl + 0.12 * (1000 - latents.opsecDiscipline) +
        0.06 * latents.techFluency +
        0.20 * noise + careerBonus + (roleSeedTags.includes('media') ? 90 : 0)
      );
      break;

    case 'bureaucracy':
      value = clampFixed01k(
        0.28 * latents.institutionalEmbeddedness + 0.22 * aptitudes.workingMemory +
        0.18 * traits.conscientiousness + 0.32 * noise + careerBonus + tierBonus
      );
      break;

    case 'financeOps':
      value = clampFixed01k(
        0.24 * aptitudes.workingMemory + 0.20 * aptitudes.cognitiveSpeed +
        0.18 * traits.conscientiousness + 0.38 * noise + careerBonus + tierBonus
      );
      break;

    case 'legalOps':
      value = clampFixed01k(
        0.24 * aptitudes.workingMemory + 0.20 * aptitudes.attentionControl +
        0.18 * latents.institutionalEmbeddedness + 0.38 * noise + careerBonus + tierBonus
      );
      break;

    default:
      // Generic skill: cognitive-weighted with high noise
      value = clampFixed01k(
        0.22 * aptitudes.cognitiveSpeed + 0.22 * aptitudes.attentionControl +
        0.18 * aptitudes.workingMemory + 0.38 * noise + careerBonus
      );
      break;
  }

  // Apply floor/ceiling for readability
  return clampFixed01k(clampInt(value, 90, 940));
}

function applyRoleBumps(
  skills: Record<string, SkillEntry>,
  roleSeedTags: readonly string[],
  vocab: AgentVocabV1,
): void {
  const bump = (key: string, delta: number) => {
    const entry = skills[key];
    if (!entry) return;
    entry.value = clampFixed01k(entry.value + delta);
  };

  for (const tag of roleSeedTags) {
    const bumps = vocab.capabilities.roleSkillBumps[tag];
    if (!bumps) continue;
    for (const [skillKey, delta] of Object.entries(bumps)) {
      bump(skillKey, delta);
    }
  }
}

type RngLike = { int: (min: number, max: number) => number };

function applyVoiceBiases(
  skills: Record<string, SkillEntry>,
  voiceTag: string,
  skillRng: RngLike,
): SkillBias[] {
  const biases: SkillBias[] = [];

  const bump = (skill: string, delta: number, reason: string) => {
    const entry = skills[skill];
    if (!entry) return;
    entry.value = clampFixed01k(entry.value + delta);
    biases.push({ skill, delta, reason });
  };

  if (voiceTag === 'commanding') {
    bump('negotiation', skillRng.int(10, 40), 'voice:commanding');
    bump('mediaHandling', skillRng.int(0, 20), 'voice:commanding');
  }
  if (voiceTag === 'warm') {
    bump('negotiation', skillRng.int(0, 20), 'voice:warm');
  }
  if (voiceTag === 'fast-talking') {
    bump('mediaHandling', skillRng.int(5, 30), 'voice:fast-talking');
  }

  return biases;
}
