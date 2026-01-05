# Agent Physical Details (Marketing) Design

## Summary
Add a lightweight Physical details snapshot for marketing. This is separate from numeric appearance (height/weight) and focuses on memorable, human descriptions (eyes, posture, scars). Surface as a Portrait tab card with 3–5 bullet items.

## Data Model
- Parent vocab: `physicalDetails` object in `data/agent-generation/v1/vocab.json` with category arrays:
  - faceStructure, eyeDetails, hairDetails, bodyBuild, postureMovement, bodyMods,
    scarsInjuries, sensoryLimits, fitnessMarkers.
- Generated agent: `physicalDetails: Array<{ category, item }>`.

## Generation
- New facet `computePhysicalDetails(seed, vocab, latents, aptitudes, age, roleSeedTags)`.
- Guarantee at least one face/eye/hair detail and one movement/build detail.
- Remaining picks (3–5 total) weighted by:
  - Age: older → scars/sensory limits.
  - Physical conditioning → fitness markers.
  - Security/operative roles → posture/scars.
- Ensure unique items.

## UI
- Portrait tab: add **Physical details** card under Decision style.
- Bulleted list, no new tabs.

## Testing
- Extend `scripts/test-personality-vocab.ts` to assert vocab presence and 3–5 generated items.
- Run `pnpm extract-data` and test harness.
