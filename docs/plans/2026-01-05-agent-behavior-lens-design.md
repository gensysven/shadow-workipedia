# Agent Behavior Lens (Marketing) Design

## Summary
Add a lightweight “Behavior lens” snapshot driven by the Agent Behavior catalog to make the marketing site feel alive. The lens summarizes how an agent interprets a deployment package, using a single archetype (Psychopath, Compassionate, Paranoid, Greedy, Incompetent, Methodical, Vengeful) and 3–5 short interpretive reads.

## Data Model
- Parent vocab: add `behaviorArchetypes` to `data/agent-generation/v1/vocab.json` with `archetypes[]` entries.
- Each archetype includes `situationReads`, `equipmentReads`, `pressureReads`, `objectiveFrames`, `teamDynamics`.
- Generated agent adds `behaviorLens: { archetype, reads[] }` where each read is `{ category, item }`.

## Generation
- New facet `computeBehaviorLens(seed, vocab, latents, traits, aptitudes, ethics)`.
- Archetype weighted by traits/latents:
  - Psychopath: low empathy/agreeableness, higher utilitarianism + risk.
  - Compassionate: high empathy/agreeableness, high harm aversion.
  - Paranoid: high stress reactivity + opsec.
  - Greedy: low frugality + publicness.
  - Incompetent: low conscientiousness + low planning/tech.
  - Methodical: high conscientiousness + planning/tech.
  - Vengeful: high authoritarianism + stress + low agreeableness.
- Picks 3–5 reads, prioritizing one each from situation/equipment/pressure/objective/team when possible.

## UI
- Portrait tab: add “Behavior lens” card with archetype and a small bullet list of reads.
- No new tabs, no system mechanics.

## Testing
- Extend `scripts/test-personality-vocab.ts` to assert `behaviorArchetypes` vocab presence and generated `behaviorLens` entries.
- Run `pnpm extract-data` and test harness.
