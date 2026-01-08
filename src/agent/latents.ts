/**
 * Agent latent trait computation.
 *
 * Latents are hidden psychological/behavioral attributes that shape how agents behave.
 * They are computed from:
 * 1. Random base values (seeded)
 * 2. Tier biases (elite/middle/mass) with individual mediators to break stereotypes
 * 3. Role biases (diplomat, media, operative, etc.)
 */

import type { TierBand, Fixed, Latents } from './types';
import { makeRng, facetSeed, clampFixed01k } from './utils';

// Re-export for convenience
export type { TierBand, Fixed, Latents };

export type LatentsResult = {
  values: Latents;
  raw: Record<keyof Latents, Fixed>;
  tierBias: Record<keyof Latents, number>;
  roleBias: Record<keyof Latents, number>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Main computation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute latent traits for an agent.
 *
 * Latents are computed in four layers:
 * 1. Random base values (0-1000) seeded from the agent seed
 * 2. Tier biases with individual mediators (elite/middle/mass stereotypes, attenuated per-agent)
 * 3. Role biases (diplomat, media, operative, etc.)
 * 4. Age biases (physical conditioning decline, stress accumulation)
 *
 * @param seed - Normalized agent seed string
 * @param tierBand - Agent's socioeconomic tier
 * @param roleSeedTags - Role tags that influence latent biases
 * @param age - Agent's age in years (for age-based correlates)
 * @returns Computed latent values with breakdown of raw, tier, role, and age contributions
 */
export function computeLatents(
  seed: string,
  tierBand: TierBand,
  roleSeedTags: readonly string[],
  age: number = 35,
): LatentsResult {
  const rng = makeRng(facetSeed(seed, 'latents'));

  // ─────────────────────────────────────────────────────────────────────────────
  // TIER STEREOTYPE MEDIATORS (Oracle/Claude P1 recommendation)
  // ─────────────────────────────────────────────────────────────────────────────
  // Add individual variation to tier biases to break stereotypes.
  // A "mediator" value of 0.5 applies full bias; values toward 0 or 1 attenuate it.
  // This creates variance: some elites aren't cosmopolitan; some mass are.
  const tierMediator = rng.next01(); // 0-1, centered around 0.5
  const tierBiasScale = 0.3 + 1.4 * tierMediator; // Range: 0.3 to 1.7 (some attenuation, some amplification)

  // Raw tier biases before mediation
  // S1: Tier ↔ Cosmopolitanism - elite have more travel, exposure, international connections
  const rawTierCosmoBias = tierBand === 'elite' ? 250 : tierBand === 'mass' ? -180 : 0;
  const rawTierPublicBias = tierBand === 'elite' ? 120 : tierBand === 'mass' ? -40 : 0;
  const rawTierInstBias = tierBand === 'elite' ? 120 : 0;
  const rawTierTechBias = tierBand === 'elite' ? 40 : tierBand === 'mass' ? -40 : 0;
  const rawTierExpressBias = tierBand === 'elite' ? 80 : tierBand === 'mass' ? -20 : 0;
  const rawTierFrugalBias = tierBand === 'elite' ? -120 : tierBand === 'mass' ? 120 : 0;
  const rawTierPlanBias = tierBand === 'elite' ? 60 : tierBand === 'mass' ? -20 : 0;
  const rawTierStressBias = tierBand === 'elite' ? -60 : tierBand === 'mass' ? 60 : 0;
  // Correlate #X1: Tier ↔ Risk Appetite (negative) - strengthened
  // Elites are more risk-averse (protecting status), mass tier higher (less to lose)
  const rawTierRiskBias = tierBand === 'elite' ? -200 : tierBand === 'mass' ? 80 : 0;

  // Apply mediator: some individuals conform to tier stereotypes, others don't
  const tierCosmoBias = Math.round(rawTierCosmoBias * tierBiasScale);
  const tierPublicBias = Math.round(rawTierPublicBias * tierBiasScale);
  const tierInstBias = Math.round(rawTierInstBias * tierBiasScale);
  const tierTechBias = Math.round(rawTierTechBias * tierBiasScale);
  const tierExpressBias = Math.round(rawTierExpressBias * tierBiasScale);
  const tierFrugalBias = Math.round(rawTierFrugalBias * tierBiasScale);
  const tierPlanBias = Math.round(rawTierPlanBias * tierBiasScale);
  const tierStressBias = Math.round(rawTierStressBias * tierBiasScale);
  const tierRiskBias = Math.round(rawTierRiskBias * tierBiasScale);

  const role = new Set(roleSeedTags);
  const cosmoRoleBias =
    (role.has('diplomat') ? 220 : 0) +
    (role.has('media') ? 80 : 0) +
    (role.has('operative') ? 140 : 0) +
    (role.has('technocrat') ? 60 : 0);
  const publicRoleBias =
    (role.has('media') ? 320 : 0) +
    (role.has('diplomat') ? 220 : 0) -
    (role.has('operative') ? 240 : 0) -
    (role.has('security') ? 120 : 0);
  const opsecRoleBias =
    (role.has('operative') ? 320 : 0) + (role.has('security') ? 220 : 0) - (role.has('media') ? 220 : 0);
  const instRoleBias =
    (role.has('technocrat') ? 200 : 0) +
    (role.has('diplomat') ? 160 : 0) +
    (role.has('analyst') ? 120 : 0) +
    (role.has('organizer') ? 80 : 0);
  const riskRoleBias =
    (role.has('operative') ? 180 : 0) +
    (role.has('security') ? 120 : 0) +
    (role.has('organizer') ? 80 : 0) -
    (role.has('diplomat') ? 40 : 0);
  const stressRoleBias =
    (role.has('operative') ? 100 : 0) +
    (role.has('security') ? 120 : 0) +
    (role.has('media') ? 80 : 0) +
    (role.has('diplomat') ? 40 : 0);
  const impulseRoleBias =
    (role.has('analyst') ? 120 : 0) +
    (role.has('technocrat') ? 80 : 0) -
    (role.has('media') ? 60 : 0) -
    (role.has('operative') ? 20 : 0);
  const techRoleBias =
    (role.has('technocrat') ? 220 : 0) +
    (role.has('analyst') ? 180 : 0) +
    (role.has('operative') ? 80 : 0) +
    (role.has('security') ? 60 : 0) +
    (role.has('media') ? 40 : 0);
  const socialBatteryRoleBias =
    (role.has('diplomat') ? 220 : 0) +
    (role.has('media') ? 200 : 0) +
    (role.has('organizer') ? 180 : 0) -
    (role.has('analyst') ? 140 : 0) -
    (role.has('technocrat') ? 60 : 0) -
    (role.has('operative') ? 40 : 0);
  const expressRoleBias =
    (role.has('media') ? 200 : 0) +
    (role.has('organizer') ? 80 : 0) +
    (role.has('diplomat') ? 60 : 0) -
    (role.has('security') ? 140 : 0) -
    (role.has('operative') ? 80 : 0) -
    (role.has('analyst') ? 20 : 0);
  const frugalRoleBias =
    (role.has('organizer') ? 60 : 0) + (role.has('analyst') ? 20 : 0) - (role.has('media') ? 20 : 0);
  const curiosityRoleBias =
    (role.has('analyst') ? 180 : 0) +
    (role.has('technocrat') ? 120 : 0) +
    (role.has('media') ? 100 : 0) +
    (role.has('diplomat') ? 60 : 0);
  const adaptabilityRoleBias =
    (role.has('diplomat') ? 200 : 0) +
    (role.has('operative') ? 160 : 0) +
    (role.has('organizer') ? 100 : 0) +
    (role.has('security') ? 80 : 0) -
    (role.has('analyst') ? 40 : 0);
  const planningRoleBias =
    (role.has('technocrat') ? 200 : 0) +
    (role.has('analyst') ? 180 : 0) +
    (role.has('organizer') ? 100 : 0) -
    (role.has('media') ? 80 : 0) -
    (role.has('operative') ? 20 : 0);
  const principledRoleBias =
    (role.has('organizer') ? 120 : 0) +
    (role.has('security') ? 120 : 0) +
    (role.has('diplomat') ? 40 : 0) -
    (role.has('operative') ? 40 : 0) -
    (role.has('media') ? 20 : 0);
  const conditioningRoleBias =
    (role.has('security') ? 220 : 0) +
    (role.has('operative') ? 120 : 0) -
    (role.has('media') ? 40 : 0) -
    (role.has('analyst') ? 60 : 0) -
    (role.has('technocrat') ? 20 : 0);

  // ─────────────────────────────────────────────────────────────────────────────
  // AGE BIASES (Correlate #1: Age ↔ Physical Conditioning)
  // ─────────────────────────────────────────────────────────────────────────────
  // Physical conditioning declines with age; stress accumulates
  // Peak conditioning: 25-35, decline accelerates after 50
  const ageConditioningBias = (() => {
    if (age < 25) return 50; // Young but not peak
    if (age < 35) return 0;  // Peak years
    if (age < 45) return -80; // Slight decline
    if (age < 55) return -180; // Noticeable decline
    if (age < 65) return -300; // Significant decline
    return -450; // Major decline for 65+
  })();
  // Stress accumulates with age and career length
  const ageStressBias = Math.max(0, (age - 30) * 3); // +3 per year after 30, capped by clamp
  // Tech fluency tends to decline with age (soft bias)
  const ageTechBias = (() => {
    if (age < 25) return 120;
    if (age < 35) return 60;
    if (age < 45) return 0;
    if (age < 55) return -80;
    if (age < 65) return -160;
    return -240;
  })();

  // Correlate #NEW12: Age ↔ Publicness (positive)
  // Older people have built more public presence/reputation over time
  const agePublicBias = (() => {
    if (age < 25) return -60; // Young: low public presence
    if (age < 35) return 0;   // Building presence
    if (age < 45) return 40;  // Established
    if (age < 55) return 80;  // Peak visibility
    return 60;                // Retirement reduces public role slightly
  })();

  const raw: Record<keyof Latents, Fixed> = {
    cosmopolitanism: clampFixed01k(rng.int(0, 1000)),
    publicness: clampFixed01k(rng.int(0, 1000)),
    opsecDiscipline: clampFixed01k(rng.int(0, 1000)),
    institutionalEmbeddedness: clampFixed01k(rng.int(0, 1000)),
    riskAppetite: clampFixed01k(rng.int(0, 1000)),
    stressReactivity: clampFixed01k(rng.int(0, 1000)),
    impulseControl: clampFixed01k(rng.int(0, 1000)),
    techFluency: clampFixed01k(rng.int(0, 1000)),
    socialBattery: clampFixed01k(rng.int(0, 1000)),
    aestheticExpressiveness: clampFixed01k(rng.int(0, 1000)),
    frugality: clampFixed01k(rng.int(0, 1000)),
    curiosityBandwidth: clampFixed01k(rng.int(0, 1000)),
    adaptability: clampFixed01k(rng.int(0, 1000)),
    planningHorizon: clampFixed01k(rng.int(0, 1000)),
    principledness: clampFixed01k(rng.int(0, 1000)),
    physicalConditioning: clampFixed01k(rng.int(0, 1000)),
  };

  const tierBias: Record<keyof Latents, number> = {
    cosmopolitanism: tierCosmoBias,
    publicness: tierPublicBias,
    opsecDiscipline: 0,
    institutionalEmbeddedness: tierInstBias,
    riskAppetite: tierRiskBias, // Correlate #X1: elite → risk-averse
    stressReactivity: tierStressBias + ageStressBias, // Age correlate: stress accumulates
    impulseControl: 0,
    techFluency: tierTechBias + ageTechBias,
    socialBattery: 0,
    aestheticExpressiveness: tierExpressBias,
    frugality: tierFrugalBias,
    curiosityBandwidth: tierTechBias,
    adaptability: 0,
    planningHorizon: tierPlanBias,
    principledness: 0,
    physicalConditioning: ageConditioningBias, // Age correlate: conditioning declines with age
  };

  const roleBias: Record<keyof Latents, number> = {
    cosmopolitanism: cosmoRoleBias,
    publicness: publicRoleBias,
    opsecDiscipline: opsecRoleBias,
    institutionalEmbeddedness: instRoleBias,
    riskAppetite: riskRoleBias,
    stressReactivity: stressRoleBias,
    impulseControl: impulseRoleBias,
    techFluency: techRoleBias,
    socialBattery: socialBatteryRoleBias,
    aestheticExpressiveness: expressRoleBias,
    frugality: frugalRoleBias,
    curiosityBandwidth: curiosityRoleBias,
    adaptability: adaptabilityRoleBias,
    planningHorizon: planningRoleBias,
    principledness: principledRoleBias,
    physicalConditioning: conditioningRoleBias,
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // CROSS-LATENT CORRELATIONS
  // ─────────────────────────────────────────────────────────────────────────────
  // Implausibility fix: High opsec + high publicness is contradictory
  // People who maintain strict operational security avoid public exposure
  // Apply negative correlation: high opsec reduces publicness, high publicness reduces opsec
  const baseOpsec = raw.opsecDiscipline + tierBias.opsecDiscipline + roleBias.opsecDiscipline;
  const basePublic = raw.publicness + tierBias.publicness + roleBias.publicness + agePublicBias; // #NEW12
  // Cross-suppression: each high value suppresses the other
  // Scale factor: 0.25 means if one is at 1000, it reduces the other by ~250
  const opsecSuppression = Math.round(0.25 * Math.max(0, basePublic - 500));
  const publicSuppression = Math.round(0.25 * Math.max(0, baseOpsec - 500));

  // Correlate #X2: Institutional Embeddedness ↔ Risk Appetite (negative)
  // High embeddedness = career protection = reduced risk-taking
  const embeddedness = raw.institutionalEmbeddedness + tierBias.institutionalEmbeddedness + roleBias.institutionalEmbeddedness;
  const embeddednessRiskPenalty = Math.round(-0.25 * Math.max(0, embeddedness - 350));

  // Correlate #X3: Curiosity ↔ Risk Appetite (positive) - strengthened
  // Curious people are more willing to take risks to explore and learn
  const curiosity = raw.curiosityBandwidth + tierBias.curiosityBandwidth + roleBias.curiosityBandwidth;
  const curiosityRiskBonus = Math.round(0.30 * (curiosity - 500));

  // Correlate #X4: Planning Horizon ↔ Impulse Control (positive)
  // Long-term planners have better impulse control (deferred gratification)
  const planningHorizon = raw.planningHorizon + tierBias.planningHorizon + roleBias.planningHorizon;
  const planningImpulseBonus = Math.round(0.28 * (planningHorizon - 500));

  // Correlate #HL3: Endurance ↔ Stress Reactivity (negative)
  // Physical fitness (via conditioning) helps manage stress - fit people handle stress better
  // Use physicalConditioning as proxy for endurance since aptitudes aren't computed yet
  const conditioning = raw.physicalConditioning + tierBias.physicalConditioning + roleBias.physicalConditioning;
  const conditioningStressReduction = Math.round(-0.18 * (conditioning - 500));

  const values: Latents = {
    cosmopolitanism: clampFixed01k(raw.cosmopolitanism + tierBias.cosmopolitanism + roleBias.cosmopolitanism),
    publicness: clampFixed01k(basePublic - publicSuppression),
    opsecDiscipline: clampFixed01k(baseOpsec - opsecSuppression),
    institutionalEmbeddedness: clampFixed01k(embeddedness),
    riskAppetite: clampFixed01k(
      raw.riskAppetite + tierBias.riskAppetite + roleBias.riskAppetite + embeddednessRiskPenalty + curiosityRiskBonus,
    ),
    stressReactivity: clampFixed01k(
      raw.stressReactivity + tierBias.stressReactivity + roleBias.stressReactivity + conditioningStressReduction,
    ),
    impulseControl: clampFixed01k(
      raw.impulseControl + tierBias.impulseControl + roleBias.impulseControl + planningImpulseBonus,
    ),
    techFluency: clampFixed01k(raw.techFluency + tierBias.techFluency + roleBias.techFluency),
    socialBattery: clampFixed01k(raw.socialBattery + tierBias.socialBattery + roleBias.socialBattery),
    aestheticExpressiveness: clampFixed01k(
      raw.aestheticExpressiveness + tierBias.aestheticExpressiveness + roleBias.aestheticExpressiveness,
    ),
    frugality: clampFixed01k(raw.frugality + tierBias.frugality + roleBias.frugality),
    curiosityBandwidth: clampFixed01k(
      raw.curiosityBandwidth + tierBias.curiosityBandwidth + roleBias.curiosityBandwidth,
    ),
    adaptability: clampFixed01k(raw.adaptability + tierBias.adaptability + roleBias.adaptability),
    planningHorizon: clampFixed01k(planningHorizon),
    principledness: clampFixed01k(raw.principledness + tierBias.principledness + roleBias.principledness),
    physicalConditioning: clampFixed01k(
      raw.physicalConditioning + tierBias.physicalConditioning + roleBias.physicalConditioning,
    ),
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // DETERMINISTIC CAPS (Post-hoc hard limits on implausible combinations)
  // ─────────────────────────────────────────────────────────────────────────────

  // Deterministic Cap DC1: Stress Reactivity ↔ Impulse Control (Negative)
  // High stress reactivity impairs self-regulation; cap impulse control when stressed
  if (values.stressReactivity > 700) {
    values.impulseControl = Math.min(values.impulseControl, 600) as Fixed;
  }

  // Deterministic Cap DC2: Risk Appetite ↔ Planning Horizon (Negative)
  // Risk-takers think short-term; long planners are conservative
  // If both are high, reduce planning horizon (risk-taking dominates)
  if (values.riskAppetite > 700 && values.planningHorizon > 700) {
    values.planningHorizon = 550 as Fixed;
  }

  // Deterministic Cap DC4: Publicness ↔ Impulse Control (Positive cap)
  // Public figures must maintain appearance of control; constant scandals from
  // low impulse control would destroy public reputation
  if (values.publicness > 700 && values.impulseControl < 400) {
    values.impulseControl = 450 as Fixed;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TRAIT COHERENCE CORRELATES (Latent-to-Latent)
  // ─────────────────────────────────────────────────────────────────────────────

  // DC3: High adaptability incompatible with high planningHorizon
  // Highly adaptive people react to circumstances; rigid long-term planners resist change
  if (values.adaptability > 750 && values.planningHorizon > 700) {
    values.planningHorizon = 550 as Fixed;
  }

  // DC5: High opsecDiscipline caps socialBattery
  // Maintaining strict operational security is exhausting and limits social interactions
  if (values.opsecDiscipline > 800) {
    values.socialBattery = Math.min(values.socialBattery, 650) as Fixed;
  }

  // DC6: High frugality caps aestheticExpressiveness
  // Frugal people don't spend on aesthetic expression; they prioritize function over form
  if (values.frugality > 800) {
    values.aestheticExpressiveness = Math.min(values.aestheticExpressiveness, 550) as Fixed;
  }

  // DC8: High stressReactivity caps opsecDiscipline
  // Stress impairs discipline; highly reactive people make operational security mistakes
  if (values.stressReactivity > 750) {
    values.opsecDiscipline = Math.min(values.opsecDiscipline, 600) as Fixed;
  }

  // DC9: Both very high curiosity and opsec → reduce opsec
  // Curious people want to explore/share; this clashes with strict operational security
  if (values.curiosityBandwidth > 800 && values.opsecDiscipline > 700) {
    values.opsecDiscipline = (values.opsecDiscipline - 150) as Fixed;
  }

  // DC11: High principledness caps adaptability
  // Principled people have firm convictions that limit their willingness to adapt/compromise
  if (values.principledness > 800) {
    values.adaptability = Math.min(values.adaptability, 600) as Fixed;
  }

  // DC12: Bidirectional cap between riskAppetite and frugality
  // Risk-takers spend freely; frugal people avoid risks. These traits are psychologically opposed
  if (values.riskAppetite > 800) {
    values.frugality = Math.min(values.frugality, 550) as Fixed;
  }
  if (values.frugality > 800) {
    values.riskAppetite = Math.min(values.riskAppetite, 550) as Fixed;
  }

  // DC13: Age > 50 → publicness floor of 200
  // Older people have established public presence/reputation built over decades
  if (age > 50 && values.publicness < 200) {
    values.publicness = 200 as Fixed;
  }

  // DC14: Very high opsecDiscipline → publicness cap at 400
  // Extreme operational security requires avoiding public exposure
  if (values.opsecDiscipline > 850) {
    values.publicness = Math.min(values.publicness, 400) as Fixed;
  }

  // DC15: Very high publicness → opsecDiscipline cap at 400
  // Public figures cannot maintain extreme secrecy; their lives are too exposed
  if (values.publicness > 850) {
    values.opsecDiscipline = Math.min(values.opsecDiscipline, 400) as Fixed;
  }

  // DC16: Role (as career proxy) → publicness adjustment
  // Public-facing roles (media, diplomat) require public presence
  // Covert roles (operative, security) require limiting exposure
  if (role.has('media') || role.has('diplomat')) {
    // Public-facing career: publicness floor of 400
    if (values.publicness < 400) {
      values.publicness = 400 as Fixed;
    }
  }
  if (role.has('operative') || role.has('security')) {
    // Covert career: publicness cap of 500
    values.publicness = Math.min(values.publicness, 500) as Fixed;
  }

  // DC17: Elite tier → publicness floor of 300
  // Elites have inherent visibility from wealth, influence, and social position
  if (tierBand === 'elite' && values.publicness < 300) {
    values.publicness = 300 as Fixed;
  }

  // DC18: Very high stressReactivity → planningHorizon cap at 500
  // High stress shortens planning focus; reactive people struggle with long-term thinking
  if (values.stressReactivity > 800) {
    values.planningHorizon = Math.min(values.planningHorizon, 500) as Fixed;
  }

  // DC19: Very high riskAppetite + low opsecDiscipline = high-risk profile
  // Risk-taking without security discipline is dangerous (documented for downstream use)
  // Note: This combination is flagged but not corrected - it represents a real personality type
  // const isHighRiskProfile = values.riskAppetite > 800 && values.opsecDiscipline < 300;

  return { values, raw, tierBias, roleBias };
}
