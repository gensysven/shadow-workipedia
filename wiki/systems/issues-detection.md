---
id: issues-detection
title: Issue Detection
domain: Simulation
relatedSystems: [pressures, agents, events]
editedBy: Shadow Work Team
lastUpdated: 2026-07-14
---

# Issue Detection

## Overview

Issues are the named, player-visible crises that emerge when a country's pressures cross thresholds. They are the layer between raw pressure numbers and the game: a `PressureLevel` on its own is an internal simulation signal, but a `Recession` or a `Coup Risk` is a card the player sees, with causes attributed to specific agent actions and a severity that can escalate, de-escalate, resolve, or cascade into other issues. The `IssueStore` (`crates/shadowbench-core/src/emergence/issues/store/`) owns this detect → track → resolve lifecycle for every country each tick.

## What It Simulates

- **Threshold crossing as narrative event**: `IssueType` (`types/issue_type.rs`) defines 18 hardcoded issue variants across five categories (Economic, Social, Political, Resource, Technology — `IssueCategory`, `types/category.rs`). Each variant declares a `primary_pressure()`, a set of `secondary_pressures()`, and a `threshold_level()` (`types/mappings/pressures.rs`) — the minimum `PressureLevel` (Warning/Crisis/Catastrophe) the primary pressure must reach before the issue can appear.
- **Causal attribution**: when an issue is detected, `trace_causes_indexed` (`store/detection.rs`) scans recent `ActionResult`s for the country, weights actions that moved the primary pressure 2x and secondary pressures 1x, and keeps the top 5 contributing agents as `IssueCause` records (`types/cause.rs`) — agent id, month, action description, and a normalized contribution score. This is what lets the game answer "who caused this."
- **Severity as a three-rung ladder**: `IssueSeverity` (`types/severity.rs`) is `Emerging → Active → Critical`, driven by how far the primary/secondary pressures have moved past the issue's own escalation and de-escalation conditions (`Issue::should_escalate` / `should_deescalate` / `should_resolve` in `mod.rs`).

## How Pressure Levels Become Named Issues

Detection runs per country per tick via `IssueStore::detect_issues` / `detect_issues_indexed` (`store/detection.rs`):

1. A `PressureLevelCache` snapshots all 12 `PressureType` levels for the country once (avoids repeated HashMap lookups across the 18 issue types).
2. For each `IssueType` in `IssueType::ALL` not already active for that country, `pressures_meet_threshold_cached` checks:
   - the primary pressure's level is `>= issue_type.threshold_level()`, and
   - at least one secondary pressure clears a minimum level — `Normal` for Warning-tier issues, `Warning` for Crisis/Catastrophe-tier issues (stricter gating the more severe the issue).
3. If both hold, `trace_causes_indexed` builds the `IssueCause` list, `create_issue` allocates a new `Issue` at `IssueSeverity::Emerging`, and the issue is pushed into `self.issues` plus the country/active-issue indices. Its ID is added to `newly_emerged` (consumed by the event layer to notify the player) and `IssueStore.version` is bumped for cache invalidation.

An issue that already exists for that country (checked via `has_active_issue` / `has_active_issue_numeric`, an O(1) index lookup) is skipped — one active instance of a given `IssueType` per country at a time.

## Severity Tiers and the Escalation Ladder

Each `Issue` carries its own `IssueSeverity` and an `escalation_streak` counter. `IssueStore::update_severities` (`store/severity.rs`) runs the state machine per issue, per country, each check:

1. **Resolution is checked first** (`Issue::should_resolve`): Emerging/Active issues resolve when the primary pressure returns to `PressureLevel::Normal`; Critical issues resolve once the primary drops to `Warning` or below. Resolved issues are removed from the store immediately (`newly_resolved`), and indices are rebuilt.
2. **Escalation is hysteretic, not immediate.** `Issue::should_escalate` defines the *condition* (Emerging→Active requires the primary pressure at `Crisis`; Active→Critical requires the primary at `Catastrophe` **and** at least one secondary pressure at `Crisis`), but the severity only actually advances once that condition has held for `ESCALATION_SUSTAIN_CHECKS` (a constant in `mod.rs`) consecutive weekly checks in a row. Each check the condition holds increments `escalation_streak`; any check where it doesn't hold resets the streak to zero — a single momentary threshold crossing does not escalate an issue, and an interrupted streak must restart from scratch.
3. **De-escalation and resolution remain immediate** — no sustain requirement. `Issue::should_deescalate` drops Active back to Emerging when the primary pressure falls to `Warning`, and Critical back to Active when it falls to `Crisis`. This asymmetry is deliberate: relief responds fast, sustained deterioration is required to make things worse.
4. After resolving severity for the tick, the issue's `active_pressures` snapshot (primary + all secondaries, by current value) is refreshed regardless of whether severity changed, and `IssueStore.version` is incremented every call.

`Issue::category()` simply forwards to `issue_type.category()`; severity does not change an issue's category.

## Difficulty Multiplier

`IssueConfig` (`emergence/config/types.rs`) pairs an `IssueThresholds { warning, crisis, catastrophe }` block with a single `difficulty_multiplier: f32` (default `1.0`). `IssueConfig::effective_thresholds()` (`emergence/config/issues.rs`) derives adjusted thresholds by dividing each threshold by the multiplier (`inv_mult = 1.0 / difficulty_multiplier`) and clamping the result into a safe range — so a multiplier above 1.0 lowers the effective thresholds (issues at a given pressure level trigger "sooner"/at lower pressure), and a multiplier below 1.0 raises them. This is the single knob intended to scale overall issue pressure sensitivity without touching per-issue-type data.

As of this writing, `effective_thresholds()` is exercised by the config test suite (`emergence/config/tests.rs`) but has no other call site in the crate: the live detection path (`pressures_meet_threshold_cached` in `store/detection.rs`) compares against `issue_type.threshold_level()` via `CountryPressures::level()`, which calls `PressureLevel::from_value()` using its own fixed breakpoints — not `IssueConfig`. The difficulty-multiplier mechanism is therefore fully implemented and unit-tested but not yet wired into the runtime detection loop.

## Issue Lifecycle

The full lifecycle, as coded:

1. **Spawn** — `detect_issues_indexed` creates an `Issue` at `Emerging` severity the first tick a country clears an issue type's threshold conditions, with causes attributed via `trace_causes_indexed`.
2. **Escalate** — `update_severities` advances severity by one rung (`Emerging → Active → Critical`) once the relevant escalation condition has held for `ESCALATION_SUSTAIN_CHECKS` consecutive checks; `Critical` is a ceiling (`should_escalate` always returns `false` at `Critical`).
3. **De-escalate** — the same pass drops severity by one rung immediately whenever the de-escalation condition is met and the sustained-escalation condition is not; there is no streak requirement for stepping down.
4. **Cascade (issue-to-issue spawning)** — `IssueStore::process_cascades` (`store/cascades.rs`) runs separately from severity updates. Any issue at `Active` or `Critical` severity consults `issue_type.can_spawn()` (`types/mappings/cascades.rs`), a static table of `(spawned_issue_type, required_severity, probability)` triples per issue type. If the parent issue's severity meets the required threshold and the target issue type isn't already active in that country, a **deterministic hash-based roll** (`simple_hash` of country/month/issue-type/spawn-type/issue-id, taken mod 1000) decides whether the cascade fires — the same inputs always produce the same outcome, keeping simulation runs reproducible. Spawned issues start at `Emerging` with a synthetic `IssueCause` attributing them to `"cascade"` rather than an agent.
5. **Resolve** — checked before escalation each `update_severities` pass; a resolved issue is dropped from `self.issues`, its ID recorded in `newly_resolved`, and all store indices (`active_index`, `active_index_numeric`, `country_index`) are rebuilt.

Active issues also feed back into the pressure system: `IssueStore::collect_pressure_amplification` (`store/effects.rs`) walks every active issue and, for each `(PressureType, base_amount)` entry in `issue_type.pressure_amplification()` (`types/mappings/pressures.rs`), applies a severity multiplier (`Emerging` 0.5x, `Active` 1.0x, `Critical` 1.5x) to push that pressure further — the mechanism by which an unresolved issue sustains or worsens the conditions that spawned it.

## Relationship to the Issue Catalog

Shadow Workipedia's wiki catalogs several hundred narrative issue articles (generated from `data/issues/*.yaml` in the parent repo) covering specific real-world-flavored crises. The simulation runtime's `IssueType` enum is a separate, much smaller set: exactly 18 hardcoded variants (`IssueType::ALL`, `types/issue_type.rs`), each with a fixed `display_name()` and `card_title()` (`types/mappings/classification.rs`, `types/narrative.rs`) plus hand-written emergence/escalation/resolution narrative text keyed to a specific in-fiction scenario (the "Prometheus Crisis" AI-governance framing). There is no code-level lookup, slug-matching, or ID mapping in this module connecting a spawned `Issue` to an entry in the larger wiki catalog — the runtime's 18 types and the wiki's larger issue catalog are maintained as distinct artifacts, joined (if at all) by editorial/content convention rather than by any mechanism in `emergence/issues/`.

## System Interactions

### Feeds Into
- **[Events](#)** - `newly_emerged` / `newly_resolved` issue IDs each tick are the trigger surface for the event/notification layer to surface issue cards to the player.
- **[Agents](#)** - `policy_domain()` (`types/mappings/classification.rs`) maps each issue type to the `PolicyDomain` whose stance cards the player is offered in response.

### Receives From
- **[Pressures](#)** - Issue detection, escalation, de-escalation, and resolution are all driven by `PressureLevel` readings (`CountryPressures::level`) against each issue type's declared primary/secondary pressures and threshold.
- **[Agents](#)** - `ActionResult`s from recent agent actions are indexed (`ActionIndex`) and traced into `IssueCause` attribution when an issue spawns.

### Feeds Back Into
- **[Pressures](#)** - Active issues amplify their associated pressures every tick via `collect_pressure_amplification`, closing the loop between an issue and the conditions that produced it.

---

*Connected issues and related systems are automatically populated from the graph.*

**Contributors**: Shadow Work Team
**Last Updated**: 2026-07-14
**Edit on GitHub**: [Suggest changes](https://github.com/mistakeknot/shadow-workipedia/edit/main/wiki/systems/issues-detection.md)
