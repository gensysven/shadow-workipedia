---
artifact_type: onepager
distills: docs/brainstorms/2026-09-19-workipedia-comprehension-overhaul-brainstorm.md
---

# Workipedia Comprehension Overhaul

## Thesis

Shadow Workipedia cannot explain the issues it exists to explain, and the reason is upstream of
the interface. A scraper assembles the site from a legacy markdown catalog while the
authoritative YAML sits unused one directory away, so the published data disagrees with the
game's own source on 98% of issue↔system links and 9% of category sets, ships none of its
`tags`, and carries 129 self-contradicting relationship pairs — and four of the site's routes
crash the application outright. Fix the source, then make the graph legible on top of it.

## How It Works

`data/issues/*.yaml` becomes the single source, absorbing every field currently scattered across
`ISSUE-CATALOG.md`, the category sidecar and wiki frontmatter. A declared ontology — entity and
relation types with inverses, symmetry, domain and range — validates it, so the 129
contradictory edge pairs are ruled once and cannot regress. Each of the 353 issues is typed by
one of the 18 `issue_types` the engine actually simulates, closing the gap between the wiki and
`public/ontology.json`, which today describe the same game without referring to each other.
`extract-data` loads the corpus into an in-process graph to validate and derive; only static
JSON ships.

On that foundation the graph stays the front door and is made readable in place: seeded layout,
labels, legend, typed and directed edges, ego-focus, and a timeline once the catalog spans its
own 2025–2525 premise.

Week 0 lands the router crash fix and YAML precedence — hours of work that stop active
misinformation. Data and surface tracks then run in parallel on disjoint files.

## Lineage

Evaluation and review, 2026-09-19: `docs/research/2026-09-19-workipedia-evaluation.md`.
Reviewed by Fable 5.1 (`plan-review`) and GPT-6 Astra (medium), both of whom argued for
demoting the graph behind per-issue pages. That was considered and refused — see below.
Judgment work routes to Jev (`jev-latest`) using the techniques from the After Them room-casting
join: screen the category list first, rank by lift over a sampled baseline, add a grounding
guard.

## Refusals

- **No runtime graph database.** 769 nodes and 3,455 edges fit in a browser tab; a service would
  cost the static deploy to solve a problem that does not exist.
- **No RDF/OWL/SPARQL.** One author, one consumer, no federation, no external vocabulary to
  align to.
- **Not CanonGraph.** Wrong tenancy — that graph holds estate world-facts, not game content.
- **The graph is not demoted.** Both reviewers recommended per-issue pages as the spine; their
  evidence is an argument for repairing the structure, not for abandoning the surface.
- **`correlates` is not hidden.** Density gets solved by encoding, not subtraction.
- **Jev does not fix precedence bugs or write prose.**

## Top 3 Open Calls

1. **Does the engine's 18-type taxonomy fit 353 authored issues?** A flat distribution across
   types is a Rust-side finding, not a Jev failure — and possibly the most valuable output of
   the whole programme.
2. **Engine `cascade_edges` vs authored edges** — which is authoritative where they conflict?
3. **What supplies short summaries?** YAML descriptions are a median 766 characters; nothing
   currently produces a card-length line.

## Status

Brainstormed 2026-09-19, nine decisions ruled. Not yet planned. No bead — this repo has no
beads store; tracking belongs in the parent's.
