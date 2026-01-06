# Agent Facets - AGENTS.md

Cross-agent policies for the agent generation facets system.

## Overview

This directory contains 14 modular facets that generate different aspects of agent profiles. Each facet follows a consistent pattern: **context in → deterministic computation → result out**, using seeded RNGs for reproducibility.

## Facet Dependencies

```
seed + vocab + country context
         ↓
    Geography Stage 1 (origin, citizenship, current)
         ↓
    Role Seed Tags
         ↓
    Latents (computed from seed + tier + roles)
         ↓
    Geography Stage 2 (culture blending with cosmo latent)
         ↓
    Identity (names, languages, gender, career tracks)
         ↓
    Appearance (height, build, hair, voice)
         ↓
    Capabilities (aptitudes → traits → skills)
         ↓
    Psychology (ethics, contradictions, visibility)
         ↓
    Preferences (food, media, fashion, routines)
         ↓
    Social (family, network, reputation)
         ↓
    Lifestyle (health, vices, spirituality)
         ↓
    Domestic (housing, legal, life skills)
         ↓
    Narrative (timeline, minority status)
         ↓
    Simulation (day-0 needs, mood, break risk)
```

## File Reference

| File | Purpose | Key Outputs |
|------|---------|-------------|
| `identity.ts` | Core identity | roleSeedTags, careerTrack, name, languages, gender |
| `geography.ts` | Origin and culture | homeCountry, citizenship, cultureEnvironment |
| `appearance.ts` | Physical attributes | heightBand, buildTag, hair, voiceTag |
| `aptitudes.ts` | Base abilities | strength, cognitiveSpeed, charisma (13 total) |
| `traits.ts` | Personality | riskTolerance, conscientiousness, authoritarianism |
| `capabilities.ts` | Orchestrator | Calls aptitudes → traits → skills |
| `skills.ts` | Competencies | driving, shooting, tradecraft, negotiation (10+) |
| `psychology.ts` | Deep psychology | ethics, contradictions, redLines, visibility |
| `preferences.ts` | Lifestyle choices | food, media, fashion, routines, environment, social, work, quirks |
| `lifestyle.ts` | Health/habits | vices, spirituality, background, memory/trauma |
| `social.ts` | Relationships | family, network role, reputation, communities |
| `domestic.ts` | Daily life | housing, thirdPlaces, legalStatus |
| `narrative.ts` | Life history | timeline events, minorityStatus |
| `simulation.ts` | Day-0 state | needs, mood, stress, breakRisk |

## Correlates System

Correlates are cross-facet relationships that ensure realistic agent generation. When modifying any facet, check for correlate impacts.

**See [CORRELATES.md](./CORRELATES.md) for the complete correlate catalog with:**
- Validation status and Pearson r values
- Implementation locations and code references
- Implausibility checks
- Instructions for adding new correlates

### Quick Reference (28 correlates)

| Category | Count | Key Examples |
|----------|-------|--------------|
| Tier-Based | 5 | Tier ↔ Health, Education, Housing |
| Age-Based | 7 | Age ↔ Conditioning, Network Role, Community Status |
| Latent-Based | 3 | Cosmopolitanism ↔ Abroad, Religiosity ↔ Vices |
| Trait-Based | 4 | Social Battery ↔ Third Places |
| Cross-Latent | 5 | Opsec ↔ Publicness (suppression) |
| Derivation | 3 | Opsec ↔ Conscientiousness |

### Running Correlation Audit

```bash
npx tsx scripts/audit-agents.ts --count 1000 --out /tmp/audit.json
```

### Country Priors & Indicators

The priors file includes `countries[*].buckets[*].indicators` (GDP, trade openness, air travel, UCDP conflict series, military spend, urbanization). These are wired in as **small, clamped nudges** (never hard constraints) to improve realism:

- `urbanPopulationPct` → `geography.urbanicity` weighting (social.ts)
- `gdpPerCapUsd` → education/housing stability nudges (identity.ts, domestic.ts)
- `exportsPctGdp` + `importsPctGdp` → openness nudges for career/mobility/citizenship (identity.ts, lifestyle.ts, generator.ts)
- `airPassengersPerCap` → abroad/mobility/travel nudges (identity.ts, lifestyle.ts, generator.ts)
- `militaryExpenditurePctGdp` → defense/intel institution/career nudges + militarization signal (identity.ts, generator.ts)
- `ucdp*` (conflict/deaths series) → blended security env + adversity weighting (generator.ts, lifestyle.ts)

## Implementation Patterns

### Adding a New Correlate

1. Identify the facets involved
2. Add required inputs to the facet's Context type
3. Apply correlation logic using normalized (0-1) values
4. Update the orchestrator (generator.ts) to pass the new inputs
5. Add comment with correlate number: `// Correlate #X: Name`
6. Document in this file

### Weighted Picking Pattern

```typescript
const weights = pool.map(item => {
  let w = 1;
  // Apply correlates
  if (condition1) w += factor1 * normalized_value;
  if (condition2) w *= Math.max(0.1, 1 - factor2 * value);
  return { item, weight: w };
});
const result = weightedPick(rng, weights);
```

### Value Scales

- **Fixed (0-1000)**: Primary scale for all attributes
- **Normalized (0-1)**: Use for weight calculations: `value / 1000`
- **Band5**: Categorical (low/med-low/medium/med-high/high)

## Testing

```bash
# Generate agents and check for grammar/consistency
pnpm test:narration -- --count 100

# Type check all facets
pnpm typecheck
```

## Common Mistakes

1. **Forgetting to normalize**: Always divide Fixed by 1000 before using in weight math
2. **Missing clamp**: Use `clampFixed01k()` after arithmetic to stay in range
3. **Circular dependencies**: Facets must not import from later-stage facets
4. **Unseeded randomness**: Never use `Math.random()`; always use `rng.int()` or `rng.float()`

---

**Last Updated**: 2026-01-05
