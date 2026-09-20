# Shadow Workipedia — UX/UI + data evaluation

Date: 2026-09-19 · Measured against `origin/main` (`public/data.json` generated 2026-09-01), cross-checked against the source of truth `/Users/sma/projects/shadow-work/data/issues/*.yaml`. UI behaviour observed on the running dev build.

Reviewed by: Fable 5.1 (plan-review role) and GPT-6 Astra (medium effort). Policy hash 81481511…

> Figures below are the corrected ones. The first pass ran at local HEAD `632e730`, three commits behind `origin/main`; commit `b0cb582` had already regenerated `data.json`. See *Provenance* at the end for what moved.

## Headline

The site is built by a scraper that reads a legacy markdown catalog while the authoritative structured YAML sits unused one directory away. Almost every comprehension failure on the surface is downstream of that: 98% of issue↔system links disagree with the source, no issue carries its `tags`, 129 relationship pairs contradict themselves, and the causal relations that make the dataset worth exploring never reach the screen. Urgency and descriptions currently agree with the source — but only because the last regeneration happened where its inputs resolved; the code that produced them still falls back to mock data, still reads descriptions from a `/tmp` path, and still derives urgency by substring-matching peak-year text. Meanwhile the four routes that would let anyone share an issue throw an uncaught error and abort the app.

## The pipeline (root cause)

`scripts/extract-data.ts` resolves `PARENT_REPO = join(process.cwd(), '..')` → `/Users/sma/projects`, but the parent repo is `/Users/sma/projects/shadow-work`. Every defect below is present in the code on `origin/main`. Where a column reads *latent*, the symptom is absent from today's shipped data only because the last regeneration ran somewhere its inputs resolved — the hazard is one regeneration away.

| # | Defect | Evidence |
|---|---|---|
| P1 | Running the documented `pnpm extract-data` today hits `ISSUE-CATALOG.md not found, using mock data` and would replace 353 issues with 5 mock ones. | `extract-data.ts:10,543-547`; `/Users/sma/projects/data/issues` does not exist |
| P2 | **Latent.** Urgency is invented by substring-matching free-text peak-year ranges — `includes('21')` → Latent, so anything peaking in the 2100s is demoted. Shipped urgency currently matches the YAML on all 353, but the heuristic is still the code path. | `extract-data.ts:580-584`; full ID-by-ID comparison |
| P3 | **32 of 353** category sets disagree with the source. | same comparison |
| P3b | **345 of 353** `affectedSystems` sets disagree — the entire 1,048-edge issue↔system layer. Global Shipping Corridor Disruptions is Climate/Economy/Food Systems/Security in the source and Military/Trade on the site. | same comparison |
| P4 | **Latent.** Descriptions are read from `/tmp/enhanced-descriptions-v3-remapped.json`, which does not exist on a fresh machine; the fallback substitutes the first crisis-example headline ("Social Media Addiction Crisis" → "TikTok challenge kills 12 in 48 hours"). Shipped descriptions are currently correct. All 353 YAMLs carry a real `description` (median 766 chars) the extractor never reads. | `extract-data.ts:498-503`; data comparison |
| P5 | **Resolved upstream.** `connectionCount` was 0 for 14 of 22 systems (rendering "Simulation system with 0 connections" and minimal node size); it is now populated for all 22. | data.json |
| P6 | The payload never carries `cascades` (346 issues), `warningSigns` (353) or `scope`/`tags` as structured fields; `events` (345 issues × 4–6 named events) is carried and rendered nowhere. | YAML vs data.json; zero references to `events`/`urgency`/`publicConcern` in `article.ts`/`main/wiki.ts` |

## Surface defects

**S1 — Non-root routes abort the app.** `#/wiki`, `#/wiki/<slug>`, `#/table`, `#/communities` throw `TypeError: renderWikiList is not a function` (`main.ts:99` ← `views.ts:70` ← router initial route at `main.ts:139`, while the renderers are assigned at `main.ts:469`). The exception escapes `main()`, so nothing after line 139 runs and the wiki stays dead for the whole session even after navigating in-app. `/`, `#/graph`, `#/agents`, `#/ontology` are fine. Every shareable link to an *issue* is broken; the agent generator's links work.

**S2 — The graph has no node labels.** The only `fillText` calls in the app are community hull labels (`graphUtils.ts:175`) and the Ontology view. 353 unlabeled rings; identity comes one node at a time on hover. The Ontology view — later work — has labels, a legend card with entity counts, and a Fit button. The flagship graph has none of them.

**S3 — Relation semantics are invisible.** 1,852 issue-issue edges carry `causes` (194), `exacerbates` (582), `correlates` (1,047), `mitigates` (22), `blocks` (7); 1,048 issue-system edges carry `affects`. Every one is stroked the same grey at the same width, arrowheads are drawn only for the 64 data-flow edges, there is no filter by relation, and the detail panel's connection list prints bare names. (118 system-system edges carry implementation status — `Planned (P0)`, `Partial (P0)` — which is developer metadata leaking into a public view.)

**S4 — The detail panel buries the facts.** Every issue has an article, so `renderDetailPanel` always takes the article branch: type badge, word count, "Open in Wiki", then the full article (median 813 words, max 2,609), then Related Content. The branch that renders urgency, categories, impacts, primitives, trigger conditions and evolution paths is unreachable for issues.

**S5 — Search reports nothing.** The visible field highlights matches with a blue ring somewhere in the hairball: no count, no list, no zoom-to-results, still no labels. A zero-match query dims every node to 10% while leaving every edge at full brightness, with no message. (The ⌘K palette *does* have "No matches", ranked results and keyboard selection — `palette.ts:518` — but nothing in the UI advertises it.)

**S6 — No orientation.** No legend for ring colour, ring count, node size, dashed ring or diamond; no counts; no intro; no entry points. "Fit" exists only bundled inside the red **Reset** button (`layoutControls.ts:77`).

**S7 — Colour is overloaded and partly indistinguishable.** 269 of 353 issues are multi-category and draw concentric rings per category. Existential `#dc2626` vs Political `#ef4444` differ by an RGB distance of 46; Social vs Infrastructure 42; Economic vs Infrastructure 49. Three chips fail WCAG AA on their own text (Existential 3.70:1, Infrastructure 4.00:1, Social 4.22:1). Category, community and primitive colourings share the same canvas and the same palette with three different meanings and no legend for any.

**S8 — Clusters are degenerate.** 108 of 353 issues carry no `communityId` at all, so "Show Clusters" groups 69% of the catalog and silently omits the rest. Membership is miscast where it does exist — Social Media Addiction Crisis (Technological) sits in "Political (democracy, civil-rights)". The hulls render `community.topCategory` (`graphUtils.ts:173`), not the stored "(tag, tag)" label, so the duplicated captions ("Economic" ×3, "Social" ×3) are by construction and better community names would not change them: 15+ convex hulls overlap across the whole canvas because the layout does not cluster by community.

**S9 — The table is wrong and thin.** 747 rows under a column headed "Issue", because the filter has clauses for `issue` and `system` but none for `principle`, so all 394 principle nodes pass through with empty categories and a "latent" badge. No description column, no default sort, connection counts recomputed by scanning all 3,455 edges per row.

**S10 — Half the library is unreachable from the graph.** 21 system articles have no node — including `cascades`, `pressures`, `shocks-and-forcing`, `jackpot`, `agents`, `simulation-architecture`, the explainers a newcomer most needs. Also unreachable as nodes: 39 mechanic articles, 14 primitive articles, 724 of 1,118 principle articles, and 14 case studies. The wiki sidebar does have collapsible sections, but Issues (353) is first and open, so everything else sits ~350 rows down.

**S11 — Payload.** `data.json` is 17 MB decoded / 2.5 MB gzipped; every article ships twice (`content` markdown + `html`, 5.76 MB of HTML alone) and includes 3,451 vocabItem, 264 vocabList, 221 country and 1,118 principle articles the graph never needs. `agent-priors.v1.json` (5 MB) is fetched on the graph tab because `initializeAgentsView` runs inside `main()`. `dist/` is 29 MB.

**S12 — Mobile at 390 px.** Tab nav clipped mid-word, view-mode row cut at "Da…", category chips run off-screen with no scroll affordance, Reset unreachable, canvas cut off. CLAUDE.md documents 768/480 stacking that does not happen.

**S13 — Accessibility.** The canvas has no `role`, no `aria-label`, no keyboard path. The fallback surfaces are no better: table rows are `<tr>` with click listeners and sort headers are `<th>` with click listeners (`table.ts:172`), wiki sidebar entries are clickable `<div>`s (`wiki.ts:177`) — no links, no buttons, no keyboard semantics. Search input unlabeled. Observed tab order reaches the nine chips, search and Reset before the tab navigation. `document.title` never changes per article. No `prefers-reduced-motion` rule anywhere in 3,813 lines of CSS, for a view that animates a force layout for seconds.

**S14 — No epistemic labelling.** Scenario fiction ("TikTok challenge kills 12 in 48 hours"), real-world explanation, speculative evolution paths ("Youth Extinction Movement") and implementation status ("Planned (P0)") are typographically identical. A newcomer cannot tell what is claimed about the world, what is a game scenario, and what is a build note.

## Signal quality

- Urgency carries little signal in the source itself: the YAML is High 189 / Critical 97 / Medium 62 / Low 5 — **81% High-or-Critical** — so urgency neither ranks nor filters usefully, independent of the extractor's heuristic.
- 1,047 of 1,852 issue-issue edges are `correlates` — the weakest relation supplies most of the hairball's density.
- `publicConcern`/`economicImpact`/`socialImpact` (plus `mediaAttention`, `politicalPriority` in YAML) appear in no sort, filter, encoding or chart.
- Only 10 of 353 issues have a `systemWalk`; 35 issue articles have no "Overview" heading.
- Docs drift: CLAUDE.md says 329 issues / 34 systems / single `category` / labels in the render order; reality is 353 / 22 / `categories[]` / no labels. `og:image` is an SVG most platforms will not render.
- Attention drift: 147 commits touch the agent generator vs 87 the graph/wiki; all 11 design docs in `docs/plans/` are about the agent generator; the issue data has not been regenerated since 2026-01-07.

## Review corrections (folded in)

Reviewed by Fable 5.1 (`plan-review`, policy hash 81481511…) and GPT-6 Astra (medium). Corrections to the first draft, all re-verified:

- The router defect is a **hard crash**, not a swallowed guard: `TypeError: renderWikiList is not a function` (`main.ts:99` ← `views.ts:70` ← initial route at `main.ts:139`) rejects `main()`, so nothing after line 139 runs. `/`, `#/graph`, `#/agents`, `#/ontology` survive; `#/wiki`, `#/wiki/<slug>`, `#/table`, `#/communities` do not.
- **Four sources of truth**, not two: `ISSUE-CATALOG.md` (identity, urgency, crisisExamples, peakYears, evolutionPaths, triggerConditions), `multi-category-all-issues.json` (categories, 263/353), wiki frontmatter (primitives, mechanics), YAML (everything else).
- `affects` (1,048 edges) is issue→system, not causal. Directional content is `causes` 194, `exacerbates` 582, `mitigates` 22, `blocks` 7.
- **129 of 260 reversed pairs carry contradictory labels** — correlates/exacerbates 72, causes/correlates 40, causes/exacerbates 9, correlates/mitigates 3, blocks/correlates 2, exacerbates/mitigates 1. All edges are `bidirectional: false`.
- Community hulls render `topCategory`, not the "(tag, tag)" labels; the real defect is that **108/353 issues have no community** and membership is miscast.
- Urgency skew measured on the wrong column: the source YAML is 81% High-or-Critical.
- Articles do show "Updated <date>"; dataset-level age is what is missing.
- The ⌘K palette already has "No matches", ranking and keyboard nav (`palette.ts:518`) — it is simply unadvertised.
- Chip contrast: 3 of 9 fail WCAG AA (Existential 3.70:1, Infrastructure 4.00:1, Social 4.22:1), not all.

## Additional findings from review

- `tags` exist on all 353 YAML issues and reach **zero** nodes; search matches label, description and category only (`handlers.ts:338`).
- Node positions are seeded with `Math.random()` (`graph.ts:52`), so **the layout differs on every load** — no spatial memory is possible.
- 118 system-system edges publish build metadata (`Planned (P0)`, `Partial (P0)`, `Live (P0) +5`) as if they were relationships.
- The "Game Mechanics" prose is untraceable to the engine: `shadowbench-core`'s issue registry consumes only `affectedSystems`.
- `affectedSystems` differs from source for **345/353** issues — the entire 1,048-edge issue↔system layer.
- Cascade prose names 1,805 bold targets; only **67** resolve to a real issue.
- Every article renders a duplicate H1 (`article.ts:701` plus the markdown body's own `# Title`).
- The `causes` + `exacerbates` subgraph contains **94 distinct reinforcing feedback loops** (30 of length 2, 18 of 3, out to length 6) — none surfaced, while "Feedback Loop" ships as a hand-applied tag on 135 issues.
- Two ontologies coexist unconnected: `public/ontology.json` (`schema_version 2.0.0-p12i8t18f31`, generated by the Rust emergence stack — 18 issue *types*, 24 cascade edges, 12 pressures, 8 institutions, 31 facets) and the 353-instance content catalog the engine does not read.
- `peakYears` covers 236/353; **149 of those start between 2000 and 2024**, 8 start before 2000 (one in 1925), and only 10 reach past 2100 against a stated 2025–2525 premise.

## Provenance — what the first pass got wrong, and where the site actually lives

The figures in this document are measured against `origin/main`. The first pass ran at local
HEAD `632e730`, **3 commits behind**; `b0cb582` had regenerated `public/data.json` (28,328
insertions / 32,436 deletions) and `955b492` had modified `scripts/extract-data.ts`. Recorded
here so the corrections are auditable.

**The site has two hosts, and only one of them matters.** Verified 2026-09-20:
`wiki.shdwwrk.com` is the canonical site, served by **Vercel** with git integration (`vercel.json`,
`buildCommand: pnpm build`), so it tracks `main` automatically — the `origin/main` column below is
what visitors actually get. A second host, the Cloudflare Pages project `shadow-workipedia`
(`shadow-workipedia.pages.dev`), has **no git integration** (`source: null`) and had drifted to
deployment `43f0c52c` — commit `632e730`, deployed 2026-07-14, `data.json` generated 2026-01-07,
which is coincidentally the same commit this evaluation's first pass measured. It was manually
redeployed to parity on 2026-09-20. Because Vercel builds only run `pnpm build` over the committed
`data.json` (a Vercel container has no access to the parent `shadow-work` repo, which
`extract-data.ts` reads), `public/data.json` must stay a committed artifact. See
`shadow-work-mt0n`.

| Claim | Stale HEAD (first pass) | origin/main = **live** |
|---|---|---|
| Descriptions that are crisis headlines | 222/353 | **0** — resolved |
| Systems with `connectionCount: 0` | 14/22 | **0** — resolved |
| Urgency mismatches vs source YAML | 156/353 | **0** — resolved |
| Category-set mismatches | 98 | **32** |
| `affectedSystems` mismatches | 345/353 | 345/353 |
| Reversed pairs / contradictory | 260 / 129 | 260 / 129 |
| Feedback loops (`causes`+`exacerbates`, ≤6) | 94 | 94 |
| Issue nodes carrying `tags` | 0 | 0 |
| `data.json` size | 18 MB | 17 MB |
| Edge labels | correlates 1047, exacerbates 582, causes 194, mitigates 22, blocks 7 | identical |

**The code defects are unchanged on `origin/main`.** `PARENT_REPO = join(process.cwd(), '..')`
(`extract-data.ts:11`), the `/tmp/enhanced-descriptions-v3-remapped.json` read (`:503`), the
`ISSUE-CATALOG.md not found, using mock data` fallback (`:498`) and the substring urgency
heuristic (`:580-584`) are all still present. The shipped data is currently correct because the
last regeneration ran where its inputs resolved — not because the pipeline is sound. The single-
source ruling stands; the week-0 precedence repair is smaller than first scoped, and the
mock-data hazard is the live part.

The router crash is unaffected: none of the three commits touch `src/`.

## Melange stress-test (2026-09-19)

`docs/research/flux-melange/workipedia-comprehension-overhaul/heat-ledger.jsonl` — 2 rounds,
8 slots, 19 findings, 15 upheld, 1 fusion producing an emergent finding. Halted on BUDGET; the
verify pass, manifest, synthesis and surfacing stages failed on a session limit, so no
`synthesis.md` was written. The ledger is intact and synthesis is regenerable from it.

Top finding (`f-017`): the `connections[]` schema represents a **verified reinforcing loop** and
an **unreconciled contradictory pair** with the identical two-line shape, so ruling 8's own
30-vs-129 disposition split cannot be recovered from the data once written back. Computed over
the source corpus: 520 reciprocal entries, 151 non-duplicate asymmetric pairs, splitting 30/121 —
matching the ruling's own split almost exactly.
