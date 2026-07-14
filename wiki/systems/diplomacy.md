---
id: diplomacy
title: Diplomacy
domain: Simulation
relatedSystems: [cascades, politics, military]
editedBy: Shadow Work Team
lastUpdated: 2026-07-14
---

# Diplomacy

## Overview

The Diplomacy pillar tracks bilateral relations between every pair of countries — sentiment, trade share, ideological distance — and derives alliances and sanctions from that state. It ticks weekly, is capped at a fixed maximum number of emitted events per tick (the shared `PILLAR_EVENT_CAP`, re-exported here as `K_CAP`), and its only downstream hook into the wider pressure system is a single `MilitaryTension` contribution derived from bilateral tension. Source: `crates/shadowbench-core/src/emergence/diplomacy/` (`mod.rs`, `types.rs`, `tests.rs`).

The module is intentionally thin: a single `DiplomacyPillar` struct holds all state (`relations`, `alliances`, `active_sanctions`, `active_events`), and one `tick()` method runs the entire weekly update in seven ordered steps — pair initialization, trade-share update, sentiment decay, sanction triggers, sanction expiry, alliance decay/dissolution, and alliance formation — before assembling output signals.

## What It Simulates

- **Bilateral relations** (`BilateralRelation`): for every country pair, a `sentiment` (-1.0 hostile to 1.0 allied), a `trade_share`, an `ideology_distance`, and a `cooldown_until` day gating alliance changes. Relations are keyed by a canonical pair (lexicographically sorted country codes) so `(a, b)` and `(b, a)` never split state. Pairs are lazy-initialized once for the full country set and never removed.
- **Sentiment decay**: every tick, sentiment drifts toward 0.0 by a fixed decay rate, clamped so it can't overshoot past zero.
- **Trade share update**: each pair's `trade_share` is recomputed each tick as a function of both countries' `trade_finance_availability` from Economy signals — a rough proxy, not a modeled trade flow.
- **Sanctions** (`Sanction`): triggered when a pair's tension (negative sentiment, floored at 0) crosses a threshold *and* one side's economy is stressed (low trade-finance availability). The economically weaker country becomes the sanction target; the other is the imposer. A circuit breaker caps concurrent sanctions per target, and trigger probability is dampened by the target's existing sanction load. Sanctions carry a hard lifetime and can also expire early (probabilistically) after a minimum duration.
- **Alliances** (`Alliance`): formed between a pair when cooldown has elapsed, the pair isn't already covered by an existing alliance, and either ideological compatibility or a trade bonus clears a gate. Formation is probabilistic (a logistic function of ideology compatibility, trade bonus, and sentiment, capped at 15%/week). Alliance type (`Defensive` vs `Economic`) is picked from whichever factor dominated. Successful formation sets a cooldown and gives sentiment a bump.
- **Alliance decay/dissolution**: alliances are not permanent. Each tick, an alliance's strength decays at a fixed rate, offset by "support" derived from its weakest member pair's current sentiment and trade share (support is capped so it can at most offset decay — passive membership never strengthens an alliance). An alliance dissolves once strength falls below a floor, at which point its member pairs get a cooldown so it can't instantly reform.
- **Diplomacy events**: alliance formed/dissolved, sanction imposed/lifted are recorded as `DiplomacyEvent`s, retained for 30 game days for observability, and capped by the same per-tick event budget as the triggering logic. Note that alliance dissolution itself is never throttled by the event cap — only the *logging* of a dissolution event is; the underlying strength decay and removal from `alliances` always run to completion each tick.
- **Output signals** (`DiplomacySignals`): built fresh each tick from current state — a per-country `sanctions_map` (aggregate trade reduction, summed across all sanctions targeting that country and capped below full embargo), a per-country `tension_by_country` (max tension across that country's relations, only recorded above a small floor), and a scalar `alliance_count`.

## How It Affects Gameplay

**Player Levers:**
- Nothing in this module reads player/policy input directly — relations, sanctions, and alliances all move from bilateral sentiment, trade-finance signals from Economy, and RNG draws scoped per pair per tick. Any player influence on diplomacy in the broader game arrives indirectly, by moving the Economy or Politics signals this pillar consumes.

**Warning Indicators:**
- Rising per-country tension in `DiplomacySignals.tension_by_country` (derived from the max negative sentiment across a country's relations) signals a pair sliding toward sanctions.
- An accumulating `sanctions_map` entry for a country means its trade-finance availability is being pushed down by Economy reading this signal back (with roughly a one-tick lag, by construction).
- `alliance_count` dropping over time reflects unsupported alliances decaying out rather than a scripted event.

**Win/Loss Conditions:**
- The module defines no win/loss conditions itself. Its only externally consequential output is the `MilitaryTension` pressure delta described below, which folds into whatever thresholds the Pressures system enforces elsewhere.

## System Interactions

### Feeds Into

- **Economy** — `DiplomacySignals.sanctions_map` gives Economy a per-country aggregate trade reduction (0.0–1.0, floored so sanctions can never zero out trade-finance availability entirely). Economy applies this against `trade_finance_availability` with roughly a one-week lag, since Diplomacy reads Economy's *previous* tick's signals when computing this tick's sanctions.
- **Pressures (`military_tension`)** — `collect_pressure_deltas` computes, for each country, the maximum tension across all its bilateral relations. If that max tension exceeds a threshold, it emits one `(country, PressureType::MilitaryTension, pressure)` delta, where `pressure` is the tension scaled down and capped at a small per-tick maximum. This is the pillar's sole write into the shared Pressures store.
- **cascades (neighbor propagation)** — Diplomacy does not implement cascade logic itself. The `MilitaryTension` delta it contributes lands in the same per-country pressure pool that the Pressures store's generic cross-country cascade step (`apply_cross_country_cascades` in `emergence/pressures/store/cascades.rs`) later propagates: once a country's *total* pressure for a given type exceeds the crisis threshold, a fixed fraction of the excess is split across that country's entries in the shared geopolitical/economic `NEIGHBOR_MAP` and applied to neighbors, scaled by each receiver's structural sensitivity. Diplomacy's contribution to `MilitaryTension` is just one input among others into that country-level total — it has no special-cased or diplomacy-specific propagation path.

### Receives From

- **Economy** (`EconomySignals`) — per-country `trade_finance_availability`, used both to update `trade_share` each tick and to decide sanction targets/thresholds.
- **Politics** (`PoliticsSignals`) — passed into `tick()` but not read anywhere in the current implementation; the parameter is accepted for interface symmetry with other pillars and is otherwise unused.

---

*Connected issues and related systems are automatically populated from the graph.*

**Contributors**: Shadow Work Team
**Last Updated**: 2026-07-14
**Edit on GitHub**: [Suggest changes](https://github.com/mistakeknot/shadow-workipedia/edit/main/wiki/systems/diplomacy.md)
