# Knowledge/Ignorance Catalog Integration (Scope A)

## Goal
Integrate the knowledge/ignorance catalog into agent generation as three minimal lists and surface them in the UI under a new **Cognitive** card.

## Scope (Phase A)
Add three vocab lists and generator outputs:
- `knowledgeStrengths`
- `knowledgeGaps`
- `falseBeliefs`

No scoring, decay, or learning mechanics yet.

## Data Source
Catalog: `/Users/sma/shadow-work/game-design-docs/catalogs/agent-knowledge-ignorance-catalog.md`

Parsing targets:
- **Strengths**: bullets under Professional, World, Personal, Cultural Knowledge sections.
- **Gaps**: bullets under Known Unknowns.
- **False beliefs**: bullets under False Knowledge.

All items are stored verbatim; no title-casing or rewriting.

## Vocab Changes (Parent Repo)
Add to `/Users/sma/shadow-work/data/agent-generation/v1/vocab.json`:

```json
"knowledgeIgnorance": {
  "knowledgeStrengths": ["..."],
  "knowledgeGaps": ["..."],
  "falseBeliefs": ["..."]
}
```

## Generator Changes (Shadow Workipedia)
- Extend `AgentVocabV1` and `GeneratedAgent` to include `knowledgeIgnorance`.
- In a facet (likely `src/agent/facets/psychology.ts`), pick 2–4 items from each list using seeded RNG + `pickK` and attach to the agent.

## UI Changes
Add a new card titled **Cognitive** in `src/agentsView.ts` with three sections:
- Strengths
- Gaps
- False beliefs

Each section shows up to 3–4 pills. Omit any empty section.

## Testing
- Add/extend a vocab test script to assert one known example exists in each list.
- Verify generated agents always include the three lists with 2–4 items.
- Run `pnpm extract-data` after vocab update.

## Non-Goals (Phase A)
- No knowledge scores, decay, or learning mechanics.
- No conflict resolution between knowledge sources.

## Future Expansion (Phase B)
- Add information sources and barriers.
- Add per-category depth scores and confidence signals.
- Add decay or learning modifiers if needed.
