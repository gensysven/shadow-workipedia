# Agent Generator - AGENTS.md

Cross-agent policies for the agent generation system.

## Architecture

The agent generator uses a **faceted architecture** where each facet handles a specific domain of agent attributes. The main orchestrator (`generator.ts`) coordinates facets in dependency order.

```
src/agent/
├── generator.ts      # Main orchestrator - coordinates all facets
├── latents.ts        # Hidden psychological attributes (0-1000 scale)
├── types.ts          # TypeScript interfaces for GeneratedAgent
├── utils.ts          # Seeded RNG, weighted picking, culture blending
├── index.ts          # Public exports
└── facets/           # 14 domain-specific generation modules
    └── AGENTS.md     # Facet-specific documentation
```

## Key Concepts

### Seeded Determinism

All agent generation is deterministic given a seed:

```typescript
const rng = makeRng(facetSeed(seed, 'facetName'));
const value = rng.int(0, 1000);  // Always same for same seed
```

### Fixed Scale (0-1000)

All continuous attributes use a 0-1000 integer scale called `Fixed`:
- Avoids floating point issues
- Easy percentile interpretation (500 = median)
- Use `clampFixed01k()` after arithmetic

### Latents

Hidden psychological attributes computed early, influencing many facets:
- `cosmopolitanism`, `institutionalEmbeddedness`, `riskAppetite`
- `opsecDiscipline`, `publicness`, `socialBattery`
- `principledness`, `techFluency`, `aestheticExpressiveness`

### Weighted Picking

Major decisions use probabilistic selection:

```typescript
const result = weightedPick(rng, [
  { item: 'optionA', weight: baseWeight * correlate1 },
  { item: 'optionB', weight: baseWeight * correlate2 },
]);
```

## Generation Flow

1. **Base Setup**: Parse seed, determine birth year, tier band
2. **Geography Stage 1**: Origin country, citizenship, current location
3. **Role Seed Tags**: 2-4 tags (operative, diplomat, analyst, etc.)
4. **Latents**: Compute hidden psychological attributes
5. **Geography Stage 2**: Culture blending using cosmopolitanism
6. **Identity**: Names, languages, gender, career track
7. **Appearance**: Height, build, hair, voice
8. **Capabilities**: Aptitudes → Traits → Skills (cascaded)
9. **Psychology**: Ethics, contradictions, visibility
10. **Preferences**: Food, media, fashion, routines
11. **Social**: Family, network position, reputation
12. **Lifestyle**: Health, vices, spirituality
13. **Domestic**: Housing, legal status, life skills
14. **Narrative**: Timeline events, minority status
15. **Simulation**: Day-0 preview (needs, mood, break risk)

## Correlates

Cross-facet relationships ensure realistic agents. See `facets/AGENTS.md` for the complete correlate list.

**Key correlates:**
- Tier affects education, health, housing
- Age affects family structure, network position, community status
- Latents (cosmo, religiosity, risk) cascade through many facets
- Traits (conscientiousness, authoritarianism) affect lifestyle choices

## Modifying the Generator

### Adding a New Attribute

1. Add type to `types.ts`
2. Add computation to appropriate facet in `facets/`
3. Wire up in `generator.ts` orchestrator
4. Ensure any correlates are documented

### Adding a New Correlate

1. Identify source and target facets
2. Pass required data through Context types
3. Apply correlation in target facet with comment: `// Correlate #X`
4. Document in `facets/AGENTS.md`

### Testing

```bash
# Generate agents and validate narration
pnpm test:narration -- --count 100

# Type check
pnpm typecheck
```

## Type Safety

- `HeightBand`: Uses underscores (`very_tall`), not hyphens
- `TierBand`: `'elite' | 'middle' | 'mass'`
- `Fixed`: 0-1000 integer (use type, not raw number)
- Pronouns: Match realistic distributions (~95%+ cis-matching)

---

**Last Updated**: 2025-12-29
