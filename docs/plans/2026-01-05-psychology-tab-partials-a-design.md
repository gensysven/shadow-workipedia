# Psychology Tab (Thoughts/Emotions + Dependencies + Facets)

## Goal
Finish the remaining **partial** catalog integrations for scope A by:
1) Surfacing thoughts/emotions as a new **Psychology** tab.
2) Adding dependency stage snapshots to Lifestyle.
3) Displaying personality facets in the Psychology tab.

## Scope
### A1 — Thoughts & Emotions (Psychology tab)
- **UI**: New tab, two-column grid of small cards:
  - Thoughts: Immediate Observations, Reflections, Memories, Worries, Desires, Social Thoughts.
  - Emotions: Primary Emotions, Complex Emotions.
  - Coping: Healthy vs. Unhealthy.
- **Data**: Snapshot lists with 2–5 items per card. “Show details” reveals metadata (intensity %, recency days, valence, mood impact, duration, behavior tilt).
- **Generator**: Add `thoughtsEmotions` output in `src/agent/facets/psychology.ts` using new vocab buckets and latents (stress reactivity, trauma, empathy, paranoia, age, role).

### A2 — Substance Dependency Stages (Lifestyle tab)
- **UI**: Lifestyle → Dependencies card group. One compact card per dependency (1–3), showing `Substance · Stage · Pattern` plus ritual + withdrawal tags and an op/health/relationship risk chip.
- **Data**: New `dependencyProfiles` derived from existing vices + new vocab. Stage snapshots only (no simulation loop).
- **Generator**: Extend `src/agent/facets/lifestyle.ts` to produce profiles using new `vices` vocab buckets.

### A3 — Personality Facets (Psychology tab)
- **UI**: “Facets” panel inside Psychology tab.
  - Row 1: Highlights (top/bottom 4–6 facets).
  - Row 2: Category cards (Courage, Social, Intellectual, Moral, Work Ethic, Emotional Regulation) with 3 sample facets.
  - “Show details” expands to full lists per category.
- **Data**: Use existing facet scores from `personalityFacets` (no new scoring).

## Data Sources
- Thoughts/emotions: `/Users/sma/shadow-work/game-design-docs/catalogs/agent-thoughts-emotions-catalog.md`
- Dependencies: `/Users/sma/shadow-work/game-design-docs/catalogs/agent-substance-dependency-catalog.md`
- Facets: `/Users/sma/shadow-work/game-design-docs/catalogs/agent-personality-facets-catalog.md`

## Vocab Changes (Parent Repo)
Add to `/Users/sma/shadow-work/data/agent-generation/v1/vocab.json`:
- `thoughtsEmotions.thoughts.*` (6 categories)
- `thoughtsEmotions.emotions.primary`, `thoughtsEmotions.emotions.complex`
- `thoughtsEmotions.coping.healthy`, `thoughtsEmotions.coping.unhealthy`
- `vices.dependencyStages`, `vices.dependencyPatterns`, `vices.withdrawalTells`, `vices.rituals`, `vices.riskFlags`

## Generator Changes (Shadow Workipedia)
- `src/agent/facets/psychology.ts`
  - Add `thoughtsEmotions` output using new vocab buckets.
  - Weighted picks influenced by latents: stress reactivity, trauma, empathy, paranoia, age, role tags.
- `src/agent/facets/lifestyle.ts`
  - Add `dependencyProfiles` derived from vices + new vocab buckets.
- `src/agent/types.ts`
  - Extend types for `thoughtsEmotions` and `dependencyProfiles`.

## UI Changes
- `src/agentsView.ts`
  - Add **Psychology** tab with Thoughts/Emotions/Coping cards and Facets panel.
  - Add **Dependencies** card group under Lifestyle.
- `src/style.css`
  - Reuse existing small-card styles from Cognitive; add facet bar style and detail toggle.

## Testing / Verification
- Add/extend vocab test scripts to assert a few known entries per new bucket.
- Generate 10 agents and verify:
  - Thoughts/emotions lists populate and respect detail toggle.
  - Dependencies show stage + pattern + ritual/withdrawal.
  - Facets show top/bottom and category breakdown.

## Non-Goals (Phase A)
- No full thought stream simulation or decay.
- No dependency progression over time.
- No facet evolution or personality change mechanics.

## Future Expansion (Phase B)
- Thought/emotion chains and arcs.
- Dependency recovery arcs and relapse mechanics.
- Facet evolution tied to events and stress.
