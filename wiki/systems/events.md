---
id: events
title: Events & Emergence Log
domain: Simulation
relatedSystems: [pressures, issues-detection, shocks-and-forcing]
editedBy: Shadow Work Team
lastUpdated: 2026-07-14
---

# Events & Emergence Log

## Overview

The emergence event log (`EmergenceEventLog`, in `crates/shadowbench-core/src/emergence/events/`) is the simulation's narrative record: a typed, timestamped stream of everything worth telling the player or a developer happened during a run. Every subsystem that changes the world state — agent actions, issue detection, cascades, exogenous shocks, recruitment, personality shifts — appends to this single log instead of maintaining its own history. Because the log's on-disk form is a deterministic JSONL stream, it also does double duty as the project's mechanism for verifying that code changes don't silently alter simulation dynamics.

## What It Simulates

The log itself simulates nothing; it *records*. Its job is to capture, in one ordered stream, the events that other systems already decided should happen:

- **`AgentAction`** — an agent institution took an action this tick (`state/ticking/events.rs::record_agent_actions`); one event per `ActionResult`, described via the action's own `describe()` text and tagged with the acting agent's ID.
- **`IssueEmerged` / `IssueEscalated` / `IssueResolved`** — the issues-detection pipeline (`state/ticking/issues.rs::detect_and_record_issues`) turns pressure-threshold crossings into issue lifecycle events each tick: new issues get `IssueEmerged` with `issue_type`, `severity`, and `category` details; severity transitions from `Emerging→Active`, `Emerging→Critical`, or `Active→Critical` get `IssueEscalated`; issues the store marks `newly_resolved` get `IssueResolved` with the `previous_severity` they held.
- **Cascades** — `process_issue_cascades` asks the issue store for cascade rules (Active/Critical issues spawning related issues) and records each spawned issue as another `IssueEmerged`, but with `source: "cascade"` in its details and a description noting the chain reaction — so cascade-spawned issues are visible in the same stream as directly-detected ones, distinguishable only by that detail field.
- **`PressureCrisis`** — exogenous shocks (`state/events/shocks.rs::generate_external_shocks`) roll a per-(event, country, month) probability from the run's scoped RNG; a hit records `PressureCrisis` with `pressure_type` and `magnitude` details before the shock's pressure is actually applied to the country (or globally). This is the same event type used for both config-defined shocks and the hardcoded fallback event table — shocks are not a separate `EmergenceEventType`, they're `PressureCrisis` with shock provenance folded into the description/source string.
- **`PersonalityEvolution`** — detected action/inter-agent/calm-period personality events (`personality::detect_action_events`, `detect_calm_event`, and inter-agent detection in `state/ticking/events.rs`) get applied to agent state unconditionally, but only narrated into the log for recruited agents whose facets actually shifted, and only when a per-agent rate limiter (`evolution_rate_limiter`) allows it that month.
- **`LaborMarket`**, **`PolicyEffect`**, **`PolicyCardGenerated`**, **`RecruitmentStarted`/`Succeeded`/`Failed`**, **`LeadHired`** — narrower, single-purpose events recorded at their point of origin (labor-market shifts in `state/integration.rs`, delayed policy effects in `state/ticking/policies.rs`, generated policy cards in `state/ticking/cards.rs`, recruitment funnel transitions in `emergence/recruitment/mod.rs` and `state/ticking/daily.rs`).
- The `EmergenceEventType` enum (`events/types.rs`) also declares types for coalition betrayal, worldview deviation, interaction effects, intel-gathering/vetting outcomes, and `PolicyApplied` as part of the same taxonomy. Not every declared variant has an active emitter at any given time — `PolicyApplied`, for instance, is read by the narrative-salience table, the daily digest's highlight list, and telemetry severity mapping, but currently has no live `.record()` call site in the simulation code (delayed policy effects are instead recorded as `PolicyEffect`). Check current call sites rather than assuming every variant fires every tick.

Each `EmergenceEvent` carries `id` (monotonic per session), `event_type`, `month`, `timestamp_ms`, `country_id`, an optional `agent_id`, a human-readable `description`, and a `details: BTreeMap<String, serde_json::Value>` — a `BTreeMap`, specifically, so the serialized key order is sorted rather than HashMap-random, which is what makes the on-disk JSONL byte-comparable across runs.

## How It Affects Gameplay

**Player Levers:**
- Players don't write to the log directly — it's a read surface. Player-issued policies and deployments create the underlying state changes (issue resolution, pressure shifts, agent actions) that other subsystems then narrate into the log.

**Warning Indicators:**
- A run's `IssueEmerged`/`IssueEscalated` density is the most direct signal of how much is going wrong; cascade-tagged emergences (`details.source == "cascade"`) indicate chain reactions rather than independently-triggered problems.
- `PressureCrisis` entries mark exogenous shocks landing on top of whatever endogenous pressure already exists — the same event type covers both a scripted crisis event and a random shock roll succeeding.

**Win/Loss Conditions:**
- The log does not itself gate win/loss; it is the audit trail explaining *why* the pressures, issues, and cascades that do gate outcomes moved the way they did.

## System Interactions

### Feeds Into
- **UI / narrative surfaces** — `EmergenceEventLog::get_events`, `get_events_for_country`, `get_events_by_type`, and `get_events_since_id` (in `events/log/queries.rs`) serve the event feed to the frontend and to `sw-agent events`. `daily_digest` (`events/log/digest.rs`) rolls events into per-day summaries with highlighted descriptions for `IssueEmerged`, `IssueEscalated`, `PolicyApplied`, `PressureCrisis`, `RecruitmentSucceeded`/`Failed`, `LeadHired`, and `PolicyCardGenerated`.
- **Determinism verification** — this is the log's second job, and the reason its schema is disciplined enough to be diffed at all:
  - `crates/shadowbench-core/tests/turbo_determinism.rs` drives two identical scripted runs (same seed, same scenario) through the real `shadowbench` subprocess — one at the default tick pacing, one at `--tick-ms 0` ("turbo") — and asserts their emergence-event JSONL streams carry identical deterministic content, proving that removing wall-clock pacing changes only how fast a run completes, never its outcomes. The comparison normalizes known non-semantic noise (unstable `HashMap`-iteration ordering in a few trace builders, hash-chain fields computed over pre-normalization bytes, and wall-clock timestamp fields) and explicitly nulls out only that noise — every other field, including event ordering and ids, must match within float tolerance.
  - `crates/shadowbench-core/tests/inline_equivalence.rs` runs the same seed through two different execution *paths* instead of two pacings — the HTTP-orchestrated `shadowbench-runner` vs. the in-process `--inline-strategy` — and parses both runs' emergence-events JSONL down to `(id, event_type, month, country_id)` tuples, asserting the streams are identical element-by-element and diagnosing whether a mismatch is an early divergence (a real dynamics change) or an identical-prefix-then-length-mismatch (a shutdown/truncation artifact).
  - In both cases the principle is the same: if the emergence-event stream from two runs is byte/tuple-identical, the underlying dynamics did not move, no matter how much the code around them changed. That makes the log the project's referee for "did this refactor actually change simulation behavior" — a question unit tests on individual formulas can't answer on their own.

### Receives From
- **Pressures** — threshold crossings and shock rolls are the source of `PressureCrisis` and (via issue detection) `IssueEmerged`.
- **Issues Detection** — the issue store's severity transitions and cascade rules are the direct source of the `IssueEmerged`/`IssueEscalated`/`IssueResolved` family.
- **Shocks and Forcing** — exogenous event generation (`state/events/shocks.rs`, `state/events/catalog.rs`) is the source of every `PressureCrisis` entry; the per-(event, country, month) RNG scope means paired policy/null runs at the same world seed see identical shock draws, which is part of what makes the event stream a valid determinism oracle in the first place.

### Persistence Notes
- Events are persisted to disk as append-only JSONL (`events/log/persistence.rs`) with buffered writes, periodic flush, and size-based rotation to `.bak-<timestamp>` files; in-memory retention is bounded (`MAX_IN_MEMORY_EVENTS`) independent of the on-disk history, so full-run analysis (including the determinism test) reads the file, not the in-memory `VecDeque`.

---

*Connected issues and related systems are automatically populated from the graph.*

**Contributors**: Shadow Work Team
**Last Updated**: 2026-07-14
**Edit on GitHub**: [Suggest changes](https://github.com/mistakeknot/shadow-workipedia/edit/main/wiki/systems/events.md)
