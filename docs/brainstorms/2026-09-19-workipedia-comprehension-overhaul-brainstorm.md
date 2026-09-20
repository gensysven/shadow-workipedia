---
artifact_type: brainstorm
bead: none
stage: discover
---

# Workipedia Comprehension Overhaul

Evidence base: [`docs/research/2026-09-19-workipedia-evaluation.md`](../research/2026-09-19-workipedia-evaluation.md).
Reviewed by Fable 5.1 (`plan-review`) and GPT-6 Astra (medium), 2026-09-19.

## What We're Building

Shadow Workipedia exists to let people understand the interconnected issues Shadow Work
simulates. Today it cannot, for reasons that are mostly upstream of the UI: the site is
assembled by a scraper reading a legacy markdown catalog while the authoritative YAML sits
unused. Measured against `origin/main`, 98% of issue↔system links and 9% of category sets
disagree with the source, no issue carries its `tags`, and 129 relationship pairs contradict
themselves. Urgency and descriptions currently agree with the source — but only because the
last regeneration happened where its inputs resolved: `extract-data.ts` still falls back to
mock data when it cannot find the catalog, still reads descriptions from a `/tmp` path, and
still derives urgency by substring-matching peak-year text. Four of the site's routes crash the
application outright.

The overhaul has two halves that meet in the middle.

**A single, typed source.** `data/issues/*.yaml` absorbs every field currently scattered across
`ISSUE-CATALOG.md`, `multi-category-all-issues.json` and wiki frontmatter, and is validated
against a declared ontology — entity types and relation types with inverses, symmetry, domain
and range. The 129 contradictory edge pairs are reconciled in the source before any typed edge
renders, and a validator keeps the 130th from being committed. Each of the 353 issues is then
typed by one of the 18 `issue_types` the engine actually simulates, so the wiki describes the
running game rather than a parallel fiction.

**A legible graph.** The force-directed graph remains the front door and is made readable in
place: a seeded layout so positions are stable across loads, node labels, a legend, typed and
directed edges, an ego-focus mode, and a timeline once the catalog spans its own premise.

Alongside both: the router crash, the 17 MB payload, the 747-row table, mobile, and the
keyboard and screen-reader paths.

## Why This Approach

Both reviewers independently argued that the per-issue page should become the spine and the
graph a supporting 1-hop lens, on the grounds that per-issue data is 100% covered while the
global graph's structure is 57% `correlates`, 31% uncommunitied and re-scrambled every load.
That was considered and **not taken**: the graph is the product's identity, and the reviewers'
evidence is an argument for fixing the structure, not for demoting the surface that depends on
it. The rulings below commit to fixing the structure instead.

Sequencing is unblock-then-parallel. The router crash and the YAML precedence fix are hours of
work that stop the site actively misinforming visitors and make every link shareable; they land
first. After that the data track (`scripts/`, `data/issues/`) and the surface track
(`src/main/`) touch disjoint files and run concurrently, rejoining where typed edges need
reconciled relations and where the timeline needs authored dates.

The ontology is a schema and a build-time graph, not a service. 769 nodes and 3,455 edges fit
in a browser tab; a runtime graph database would cost the static deploy and solve a problem
this dataset does not have. What a build-time graph does buy is derivation the site cannot
hand-author — including the 94 reinforcing feedback loops latent in the `causes` +
`exacerbates` subgraph, in a product whose own vocabulary ships "Feedback Loop" as a manual tag
on 135 issues.

## Key Decisions

1. **The graph stays home and gets made legible** — labels, seeded layout, legend, typed edges,
   ego-focus — rather than being demoted behind per-issue pages. Overrides both reviewers.
2. **Contradictions are reconciled at the source first.** The 129 disputed pairs are ruled in
   YAML, with a validator in `data:validate` so they cannot regress. Typed-edge rendering waits
   on this.
3. **One source of truth.** `ISSUE-CATALOG.md`, the category sidecar and wiki frontmatter are
   migrated into YAML — `peakYears`, `triggerConditions`, `crisisExamples`, `evolutionPaths`,
   `primitives` — then the scrapers and the `/tmp` description hack are deleted. Missing inputs
   become hard errors, never mock data.
4. **Unify with the engine ontology.** Every issue carries one of `ontology.json`'s 18
   `issue_types` plus its pressures; the 24 engine `cascade_edges` are reconciled against the
   authored 1,852.
5. **Mechanics prose is regenerated from what the engine consumes.** Claims that cannot be
   derived are dropped rather than asserted.
6. **`correlates` stays on by default.** Nothing is hidden and no issue appears unconnected;
   density is therefore solved by encoding — seeding, labels, relation styling, ego-focus —
   not by subtraction. This raises the stakes on the surface track.
7. **The catalog is authored forward.** 117 undated issues get dates, far-future issues are
   written so the corpus spans 2025–2525, and a timeline surface is built across it.
8. **Jev does the judgment work, not the plumbing.** Typed judgments for the 353 engine types,
   the 129 pair rulings and the 30 two-cycle checks — with the category list screened first,
   ranking by lift over a sampled baseline rather than raw probability, and a grounding guard
   because this corpus blends real-world explanation with scenario fiction. Dual-rater on
   low-lift rows. Jev is **not** used for precedence bugs (YAML simply wins) or for prose.
9. **Sequencing.** Week 0: router crash + YAML precedence. Then data and surface tracks in
   parallel, rejoining at typed edges and the timeline.

## Open Questions

- **Does the engine's taxonomy fit the content?** If a large share of the 353 issues type
  flatly across all 18 `issue_types`, that is evidence the engine needs more types — a
  Rust-side finding, and possibly the most valuable output of the typing pass. Who rules it,
  and what threshold triggers that conclusion?
- **Where the 24 engine `cascade_edges` and the 1,852 authored edges conflict, which wins?**
  The engine is authoritative for simulation, the catalog for narrative; no rule exists yet.
- **What supplies short summaries?** YAML descriptions are a median 766 characters — too long
  for a card, tooltip or search result — and Jev returns judgments, not prose. Needs a source.
- **Real paths or hash routes?** Ruling 1 settled the surface, not the URL scheme.
  `/issues/<slug>` would make issues crawlable and linkable; hash routes are what exists.
- **Is the timeline a view or a filter?** A third primary view, or a time axis layered over the
  graph home.
- **Who authors the far-future issues, and how many** are needed before 2025–2525 is honest?
- **Case studies and unreachable content:** 14 case studies, 21 system articles (including
  `cascades`, `pressures`, `jackpot`, `simulation-architecture`), 39 mechanics and 724
  principles have no graph presence. In or out of the ontology?

## In-tree prior art

None. No `docs/research/assess-*.md`, no overlapping epic in the parent repo's bead corpus, no
prior brainstorm. All 11 existing design docs in `docs/plans/` concern the agent generator.

## Amendments from the melange stress-test (2026-09-19)

Ledger: `docs/research/flux-melange/workipedia-comprehension-overhaul/heat-ledger.jsonl`
(2 rounds, 19 findings, 15 upheld, 1 emergent fusion; halted on BUDGET, synthesis stage lost to a
session limit — regenerable from the ledger). Fifteen prescriptions were returned; these amend the
rulings above.

**Amending ruling 2 (reconcile contradictions at source):**
- `f-017` (top finding, emergent fusion). The `connections[]` schema gives a *verified reinforcing
  loop* and an *unreconciled contradiction* the identical two-line shape, so the 30-vs-129
  disposition split is unrecoverable once written back. Acceptance must require a recorded
  disposition — `reconciled-winner` / `reconciled-superseded` / `verified-loop` — on all **151**
  non-duplicate reciprocal pairs, not merely that the 129 known ids stay resolved.
- `f-001`. The validator derives its pair check from a relation-axioms table
  (`data/issues/_relations.json`: symmetric / inverse / asymmetric per relation type), never from a
  hand-listed set of 129 offenders.
- `f-012`, `f-013`, `f-016`. Model reconciliation on the existing `RedirectIndex` / `mergedInto`
  precedent in `validate-issue-data.ts` — a `deprecatedEdges` set plus a `supersededBy` map, and an
  optional `supersededClaim {relationship, rationale, decidedBy}` — rather than inventing a new
  mechanism. Note the existing precedent carries no rationale field, so copying it alone is not enough.
- `f-011`. Add a deterministic computed edge id (canonical-order `source::relationship::target`) so a
  ruling can address an edge instead of an array position.

**Amending rulings 3 and 4 (single source, engine ontology):**
- `f-002`. The typing pass carries a mandatory low-confidence / no-fit flag, and the taxonomy-gap
  threshold is **pre-registered** before typing begins — not discovered after 353 issues are committed
  to types.
- `f-014`. Generate the `issue_type` enum in `_schema.json` from `ontology.json.issue_types` at
  validate time; never hand-copy it. Add an optional `issueTypeRationale`.
- `f-005`. Decide now whether an `ontology.json` `schema_version` bump triggers a full re-typing pass.

**Amending rulings 6 and 9 (correlates on; parallel tracks):**
- `f-006`. Ego-focus caps rendered edges independent of relation type (top-N by strength, plus a
  "+N more" affordance) for the ~15–20 issues above degree ~30. Relation-type dimming alone will not
  carry the correlates-on ruling at the high-degree tail.
- `f-007`. Seed the layout from something decoupled from live edge/type content — a hash of stable ids,
  or a checked-in coordinate snapshot regenerated only on an explicit relayout. A content-derived seed
  re-scrambles every time the data track commits, which is exactly what the parallel-track ruling
  guarantees will happen.

**Amending ruling 7 (author forward):**
- `f-008`. Gate the timeline's ship on a stated minimum coverage threshold across 2025–2525.
- `f-015`. Add a structured `peakYearRange {start, end}` alongside the free-text `peakYears`, so the
  timeline can sort and `data:validate` can assert that far-future issues carry a year past 2100.

**Evidence hygiene:**
- `f-004`. Recompute the feedback-loop count after ruling 2's reconciliation lands, before the figure
  is used in user-facing copy or success metrics. The 94 is measured pre-reconciliation.
- `f-018`. The evaluation was first measured at a checkout 3 commits behind `origin/main`; the counts
  above are the corrected ones. Re-measure before week 0 starts.

## Open Questions added by the stress-test

- **`f-009` — no ruling covers the accessible representation.** All nine decisions concern the visual
  canvas; none says what a screen-reader or keyboard user gets. Needs its own ruling (an off-canvas
  ARIA-live node/edge list synchronized to the same data the canvas renders) and a verification
  checkpoint at the track rejoin.
- **`f-010` — does ruling 1 hold at mobile width?** "Graph stays home" was ruled against a desktop
  mockup. Mobile may need a list-first home, which is a different decision, not an implementation
  detail.
- **`f-003` — the issue → `pressure_type` mapping is its own ruling**, and it must exist before the
  `cascade_edges` tie-break in Open Question 2 can operate on anything.
