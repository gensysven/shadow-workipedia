# Agent Detail Generation (Marketing) Design

## Summary
Add a lightweight “detail markers” snapshot to generated agents using the Agent Detail Generation catalog. The goal is to make agents feel vividly human on the marketing site without introducing simulation mechanics. We will pick 3–5 memorable details per agent (e.g., body language, daily rituals, phobias, keepsakes, secret skills) and surface them as a compact card in the Portrait tab.

## Data Model
- Parent vocab: add `detailGeneration` pools to `data/agent-generation/v1/vocab.json` (physical features, routines, communication patterns, fears, coping, artifacts, traditions, speech, environment, relationships, hidden skills/connections).
- Types: add `DetailCategory`, `DetailItem`, and `details: DetailItem[]` to `GeneratedAgent` plus `detailGeneration` to `AgentVocabV1`.

## Generation
- Implement `computeDetails(seed, vocab, latents, traits, aptitudes, ethics, selfConcept)` in a new facet file.
- Build category pools by combining related vocab arrays into buckets (physical, routine, social, food, psychological, history, tradition, speech, environment, relationship, hidden).
- Select 3–5 unique items with weighted picks; ensure at least one physical or routine detail when available.
- Slightly bias category weights by traits/latents (e.g., high stress → psychological; high social battery → social; high conscientiousness → routines).

## UI
- Add a “Detail markers” card to the Portrait tab (first impression). Display items as bullets or muted pills. No new tabs.
- Keep full text as authored in vocab to preserve flavor.

## Testing
- Extend `scripts/test-personality-vocab.ts` to assert vocab presence and that generated agents include 3–5 `details` entries with category + item.
- Run `pnpm extract-data` and the test harness.
