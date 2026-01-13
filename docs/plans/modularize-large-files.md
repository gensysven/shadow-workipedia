# Plan: Modularize Large Files in shadow-workipedia

## Overview

Several files significantly exceed the 400-line limit. This plan breaks them into manageable modules while preserving functionality.

**Files to modularize (by priority):**

| File | Lines | Priority | Reason |
|------|-------|----------|--------|
| `public/agent-vocab.v1.json` | 14,577 | P0 | Data file, hard to review/edit |
| `src/agent/types.ts` | 1,756 | P1 | Foundational, enables other refactors |
| `src/agent/generator.ts` | 2,887 | P2 | Core orchestration, complex |
| `src/agentNarration.ts` | 2,345 | P3 | Self-contained, clear splits |
| `src/agent/facets/preferences.ts` | 2,191 | P4 | Clear domain boundaries |
| `src/agent/facets/lifestyle.ts` | 1,897 | P5 | Clear domain boundaries |
| `src/agent/facets/social.ts` | 1,587 | P6 | Clear domain boundaries |

---

## Phase 1: Modularize agent-vocab.v1.json (P0)

### Current Structure
```
public/agent-vocab.v1.json (14,577 lines, 328KB)
├── version, identity (~4KB)
├── appearance (~1KB)
├── capabilities, psych, visibility, health, covers, mobility
├── preferences (~14KB) - food, media, fashion, hobbies, environment, livingSpace
├── routines, vices, deepSimPreview, logistics
├── cultureProfiles (~6KB) - 7 macro cultures
├── microCultureProfiles (~75KB) - 56 micro cultures
├── everydayLife, personality, affect, selfConcept, thoughtsEmotions
├── memoryTrauma, civicLife, culturalDynamics, needsRelationships
├── psychologyTypes, skillsEvolution, existenceCrises
├── behaviorArchetypes, decisionTemplates, physicalDetails
├── detailGeneration (~7KB)
├── timelineTemplates (~23KB) - childhood, youngAdult, midAge, laterLife
├── knowledgeIgnorance, dreamsGoals, dreamsNightmares, economicMobility
```

### Target Structure
```
public/
├── agent-vocab.v1.json              # Index file with $refs or inline merge
└── agent-vocab/
    ├── identity.json                # firstNames, lastNames, maleFirstNames, femaleFirstNames, etc.
    ├── appearance.json              # height, build, hair, eyes, voice, distinguishingMarks
    ├── capabilities.json            # skills, psych, visibility
    ├── health.json                  # conditions, allergies, injuries, fitness
    ├── preferences/
    │   ├── food.json                # comfortFoods, cuisines, restrictions, drinks
    │   ├── media.json               # genres, platforms
    │   ├── fashion.json             # styleTags
    │   ├── hobbies.json             # physical, creative, intellectual, etc.
    │   └── environment.json         # temperature, weather, livingSpace
    ├── cultures/
    │   ├── macros.json              # 7 macro culture profiles
    │   └── micros.json              # 56 micro culture profiles (or split further)
    ├── psychology/
    │   ├── personality.json         # affect, selfConcept, thoughtsEmotions
    │   ├── archetypes.json          # behaviorArchetypes, decisionTemplates
    │   └── types.json               # psychologyTypes, existenceCrises
    ├── narrative/
    │   ├── timeline.json            # childhood, youngAdult, midAge, laterLife templates
    │   ├── dreams.json              # dreamsGoals, dreamsNightmares
    │   └── details.json             # detailGeneration templates
    └── social/
        ├── civicLife.json
        ├── relationships.json       # needsRelationships, culturalDynamics
        └── economicMobility.json
```

### Implementation Steps

1. **Create extraction script** `scripts/split-vocab.ts`:
   ```typescript
   // Read agent-vocab.v1.json
   // Split into domain files
   // Write to public/agent-vocab/
   // Update agent-vocab.v1.json to merge from modules
   ```

2. **Create merge script** `scripts/merge-vocab.ts`:
   ```typescript
   // Read all module files from public/agent-vocab/
   // Deep merge into single object
   // Write to public/agent-vocab.v1.json
   // Run as part of build: pnpm build:vocab
   ```

3. **Update loading logic** in `src/agent/index.ts`:
   - Option A: Load merged file (no code changes, merge at build time)
   - Option B: Load modules and merge at runtime (more flexibility)
   - **Recommend Option A** for simplicity

4. **Add npm scripts**:
   ```json
   {
     "vocab:split": "tsx scripts/split-vocab.ts",
     "vocab:merge": "tsx scripts/merge-vocab.ts",
     "prebuild": "pnpm vocab:merge"
   }
   ```

5. **Verification**:
   - Run `pnpm extract-data`
   - Generate 100 agents, compare output to baseline
   - Run `pnpm typecheck`

---

## Phase 2: Modularize types.ts (P1)

### Current Structure
```
src/agent/types.ts (1,756 lines)
├── Version and metadata types
├── Vocab types (AgentVocabV1, identity, appearance, etc.)
├── Priors types (AgentPriorsV1, buckets, countries)
├── Culture profile types
├── Latent types
├── Generated agent types (all the output facets)
├── Context types (generation inputs)
└── Trace types
```

### Target Structure
```
src/agent/types/
├── index.ts                    # Re-exports all types
├── vocab.ts                    # AgentVocabV1 and related (~400 lines)
├── priors.ts                   # AgentPriorsV1, buckets, countries (~200 lines)
├── cultures.ts                 # CultureProfileV1, MicroCultureProfile (~200 lines)
├── latents.ts                  # Latents, Band5, Fixed (~100 lines)
├── agent.ts                    # GeneratedAgentV1 output types (~500 lines)
├── context.ts                  # Generation context types (~150 lines)
└── trace.ts                    # AgentGenerationTraceV1 (~100 lines)
```

### Implementation Steps

1. **Create directory**: `mkdir -p src/agent/types`

2. **Extract types by domain** (use AST tools, NOT sed):
   ```bash
   # Use ts-morph or manual extraction
   # Each file gets related types + imports
   ```

3. **Create index.ts** with re-exports:
   ```typescript
   export * from './vocab';
   export * from './priors';
   export * from './cultures';
   export * from './latents';
   export * from './agent';
   export * from './context';
   export * from './trace';
   ```

4. **Update imports** across codebase:
   - Most imports from `'../types'` should still work via index
   - Verify with `pnpm typecheck`

5. **Verification**:
   - `pnpm typecheck` passes
   - `pnpm build` succeeds
   - Generate agents, verify output unchanged

---

## Phase 3: Modularize generator.ts (P2)

### Current Structure
```
src/agent/generator.ts (2,887 lines)
├── Imports and type definitions
├── Helper functions (RNG, validation, etc.)
├── Culture/geography resolution
├── Facet orchestration (calls identity, appearance, etc.)
├── Deep sim preview generation
├── Output assembly
└── Export
```

### Target Structure
```
src/agent/generator/
├── index.ts                    # Main generateAgent export (~200 lines)
├── context.ts                  # Context building, validation (~300 lines)
├── cultures.ts                 # Culture/geography resolution (~400 lines)
├── orchestrator.ts             # Facet calling sequence (~400 lines)
├── assembly.ts                 # Output object assembly (~300 lines)
├── deepSim.ts                  # Deep sim preview generation (~400 lines)
└── helpers.ts                  # Shared utilities (~200 lines)
```

### Implementation Steps

1. **Identify logical boundaries** in current file:
   - Lines 1-100: Imports, types
   - Lines 100-400: Context building
   - Lines 400-800: Culture resolution
   - Lines 800-1500: Facet orchestration
   - Lines 1500-2200: Output assembly
   - Lines 2200-2887: Deep sim + helpers

2. **Extract bottom-up** (helpers first, then higher-level):
   - Start with pure functions that have no dependencies
   - Move up to functions that depend on extracted ones

3. **Preserve the public API**:
   ```typescript
   // src/agent/generator/index.ts
   export { generateAgent } from './orchestrator';
   export type { GenerateAgentOptions } from './context';
   ```

4. **Update imports** in facet files and main entry

5. **Verification**: Same as above

---

## Phase 4: Modularize agentNarration.ts (P3)

### Current Structure
```
src/agentNarration.ts (2,345 lines)
├── Imports and types
├── Conjugation tables and helpers
├── Template rendering
├── Section generators (identity, appearance, psychology, etc.)
├── Main narrative assembly
└── Export
```

### Target Structure
```
src/agentNarration/
├── index.ts                    # Main export, narrative assembly (~200 lines)
├── conjugation.ts              # Verb conjugation, grammar helpers (~300 lines)
├── templates.ts                # Template rendering utilities (~200 lines)
├── sections/
│   ├── identity.ts             # Identity narrative section (~200 lines)
│   ├── appearance.ts           # Appearance narrative section (~200 lines)
│   ├── psychology.ts           # Psychology narrative section (~300 lines)
│   ├── social.ts               # Social/relationships section (~200 lines)
│   ├── lifestyle.ts            # Lifestyle narrative section (~200 lines)
│   ├── background.ts           # Background/history section (~200 lines)
│   └── details.ts              # Miscellaneous details (~200 lines)
└── types.ts                    # Narration-specific types (~100 lines)
```

### Implementation Steps

1. **Extract conjugation utilities first** (no dependencies)

2. **Extract template rendering** (depends on conjugation)

3. **Extract section generators one by one**:
   - Each section is relatively independent
   - Move with its helper functions

4. **Update index.ts** to orchestrate sections

5. **Verification**: Generate narratives, compare output

---

## Phase 5: Modularize Facet Files (P4-P6)

### preferences.ts (2,191 lines)

Split by preference category:
```
src/agent/facets/preferences/
├── index.ts           # Main export, orchestration
├── food.ts            # Food preferences (~400 lines)
├── media.ts           # Media preferences (~200 lines)
├── fashion.ts         # Fashion preferences (~200 lines)
├── hobbies.ts         # Hobbies (~300 lines)
├── environment.ts     # Environment prefs (~200 lines)
├── livingSpace.ts     # Living space prefs (~200 lines)
└── types.ts           # Preference types (~100 lines)
```

### lifestyle.ts (1,897 lines)

Split by lifestyle domain:
```
src/agent/facets/lifestyle/
├── index.ts           # Main export
├── health.ts          # Health, fitness, conditions (~400 lines)
├── routines.ts        # Daily routines, rituals (~300 lines)
├── vices.ts           # Vices, dependencies (~300 lines)
├── mobility.ts        # Travel, passports (~200 lines)
├── logistics.ts       # Living situation, admin (~200 lines)
└── types.ts           # Lifestyle types (~100 lines)
```

### social.ts (1,587 lines)

Split by social domain:
```
src/agent/facets/social/
├── index.ts           # Main export
├── family.ts          # Family structure (~300 lines)
├── relationships.ts   # Romantic, friendships (~300 lines)
├── community.ts       # Community memberships (~300 lines)
├── reputation.ts      # Status, reputation (~200 lines)
├── network.ts         # Professional network (~200 lines)
└── types.ts           # Social types (~100 lines)
```

---

## Execution Order

1. **Phase 1 (vocab JSON)** - 2-3 hours
   - Enables easier data review
   - No code changes to generator logic
   - Low risk

2. **Phase 2 (types.ts)** - 1-2 hours
   - Foundational for other refactors
   - Pure type extraction, no logic changes
   - Low risk

3. **Phase 3 (generator.ts)** - 3-4 hours
   - Core file, needs careful testing
   - Medium risk

4. **Phase 4 (agentNarration.ts)** - 2-3 hours
   - Self-contained, clear boundaries
   - Low-medium risk

5. **Phases 5 (facets)** - 2 hours each
   - Can be done incrementally
   - Each facet is independent

---

## Verification Checklist

After each phase:

- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` succeeds
- [ ] `pnpm lint:max-lines` passes (all files ≤400 lines)
- [ ] Generate 100 agents with fixed seeds
- [ ] Compare output to baseline (should be identical)
- [ ] Run any existing tests
- [ ] Manual spot-check in UI

---

## Tools to Use

**DO use:**
- `ts-morph` for AST-based refactoring
- `jscodeshift` for large-scale transforms
- Manual extraction with careful import management

**DO NOT use:**
- `sed` for TypeScript (CATASTROPHIC RISK per AGENTS.md)
- `awk` for code transforms
- Regex-based find/replace on code

---

## Notes

- Each phase should be a separate PR/commit
- Preserve git history with `git mv` where possible
- Update any CLAUDE.md or AGENTS.md references
- The vocab JSON split can use a simple Node.js script (not AST tools) since it's JSON, not TypeScript
