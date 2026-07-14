---
id: simulation-architecture
title: Simulation Architecture
domain: Simulation
relatedSystems: [pressures, cascades, events]
editedBy: Shadow Work Team
lastUpdated: 2026-07-14
---

# Simulation Architecture

## Overview

Shadow Work's world simulation is a Rust engine (`crates/shadowbench-core`, `emergence` module) that advances **221 countries** through an hourly tick loop, layering daily, weekly, and monthly cadences on top for calibration reasons. State is shared across dozens of subsystem "pillars" (climate, economy, food, politics, institutions, migration, and more) through a compact "blackboard" pattern, and every random draw in the sim is derived from a single seeded RNG so a run can be replayed and audited. This architecture is the load-bearing successor to an earlier TypeScript/WASM prototype, rewritten in Rust for throughput and determinism.

## What It Simulates

- **Tick cadence**: The base unit of simulated time is one hour. A full simulated year is `8766` ticks (`8766.0 / 12.0` ticks per month, per `runner_bench.rs`). Hourly ticks drive lightweight reactive agent behavior; daily, weekly, and monthly cadences layer heavier passes (pressure decay, cascades, issue detection, recruitment, policy effects) on top of the same hourly clock rather than running a separate loop.
- **Blackboard shared state**: `CountryBlackboard` (`emergence/blackboard.rs`) is a small, per-country struct (fiscal stress, unemployment/inflation trend, unrest, legitimacy, narrative sentiment/coherence, state capacity) that subsystems read and write incrementally instead of recomputing from scratch every tick. It's explicitly documented as "compact, laggy summaries derived from local actions and economy signals."
- **Deterministic seeded randomness**: All simulation randomness flows through `ScopedRng`/`MasterSeed` (`crates/shadowbench-core/src/shared/scoped_rng.rs`), never `rand::random()`. Same seed replays the same world — this is the technical foundation of the project's referee/audit discipline (alignment-eval traces, paired-arm comparisons, calibration baselines).
- **221 countries**: The country roster is loaded from an embedded table (`country_map.rs`, backed by `country-shadow-map.json`) and is fixed after bootstrap — confirmed directly by tests (`state/tests.rs`: "Should have 221 countries"), the archetype system (`archetypes/mod.rs`: "7 archetypes + 15 indicators for 221 countries"), and cold-start test comments citing "221 countries + 663 institutions."
- **Rust rewrite lineage**: The simulation engine was migrated off a TypeScript + React + WASM stack onto a native Rust backend (Tauri), explicitly to escape browser performance/distribution limits. A dedicated headless benchmark harness (`shadowbench` / `shadowbench-runner` binaries) exists purely for calibration, timing, and determinism verification — no UI required.

## Tick Cadence In Detail

The hourly tick is the simulation's true clock; everything else is scheduled off it:

- **Hourly** (`tick_hourly` / `hourly_agent_tick`): reactive, lightweight actions only — "Dwarf Fortress style" immediate reactions to events (`PublicStatement`, `DoNothing`). Runs every simulated hour, every real tick.
- **Daily** (`daily_tick`, `daily_agent_tick`): intrinsic pressure growth, demographic pressures, scenario forcing curves, issue pressure amplification, pressure decay/cascades, recruitment lead expiry and resolution, vetting maturation. Rates documented "per month" are scaled down via `MONTHLY_TO_DAILY = 1.0 / 30.0` so a monthly-calibrated rate doesn't run 30× too fast when applied daily — a units bug the codebase's own comments flag as having previously caused a "month-6 collapse" (fixed in the "B2 units fix," bead shadow-work-v5qp).
- **Monthly/legacy full tick** (`EmergenceState::tick()` in `state/ticking/full_tick.rs`): the original heavyweight pass — intrinsic pressure growth, external shock generation, the full agent tick (`tick_simulation`), blackboard updates, demographic pressures, cross-country pressure cascades, issue detection/cascades/amplification, policy effect processing, and memory/ideology/relationship decay. The code comments recommend the newer tiered (hourly/daily/weekly) ticks for performance and keep this path mainly for compatibility.
- **Weekly-calibrated rates** get their own scale constant (`DAILY_SCALE = 4.0 / 30.0`) when applied at daily granularity, distinct from monthly-calibrated rates — the distinction between `DAILY_SCALE` and `MONTHLY_TO_DAILY` is deliberate and load-bearing; conflating them is exactly the bug class the B2 fix addressed.

`crates/shadowbench-core/src/emergence/tick/mod.rs` implements the per-agent evaluation core: agents evaluate `Condition`s and take `Action`s that mutate pressures and world state, parallelized with Rayon ("800+ agents benefit significantly from parallelization"). The module also carries its own `DAILY_SCALE = 1.0 / 30.0` for a legacy `tick_simulation` path, with a comment cross-referencing the same B2 units correction applied to the production daily integrator.

## The Blackboard Pattern

`CountryBlackboard` is deliberately minimal — a handful of `f32` fields plus `last_updated_tick` — and is updated incrementally rather than recomputed:

```rust
pub struct CountryBlackboard {
    pub fiscal_stress: f32,
    pub unemployment_trend: f32,
    pub inflation_trend: f32,
    pub unrest_index: f32,
    pub legitimacy_index: f32,
    pub narrative_sentiment: f32,
    pub state_capacity: f32,
    pub narrative_coherence: f32,
    pub last_updated_tick: u64,
}
```

Deltas are applied and clamped to `[0.0, 1.0]` via `apply_unrest_delta`, `apply_legitimacy_delta`, `apply_fiscal_delta`. `EmergenceState` holds one blackboard per country (`HashMap<String, CountryBlackboard>`, `blackboards` field), plus a parallel numeric-indexed vector (`blackboards_numeric`) for hot-path lookups keyed by `CountryIdU16` instead of hashing strings every tick. The pattern exists so that subsystems (pillars) don't each maintain their own private view of "how is this country doing" — they read and nudge a shared, laggy summary instead of triggering full recomputation, which is what makes cross-pillar consistency tractable across 221 countries and a dozen-plus pillars every tick.

`EmergenceState` (`state/mod.rs`) is the container that owns this shared state alongside everything else: agents, institutions, demographics, pressures, structural profiles, issues, policies, recruitment, world snapshot, event log, and the pillar executors/signals for climate, economy, food, politics, institutions, compute, diplomacy, governance, information/narrative, intelligence, public opinion, internal security, cultural evolution, and migration. Several fields are `#[serde(skip)]` runtime-only caches — `sorted_country_ids_cache`, `macro_leader_ids`, per-cadence due-queues — rebuilt on load via `rebuild_runtime_indexes()` rather than persisted, because they're derived from the fixed 221-country/institution set rather than independent state.

## Deterministic Seeded Randomness

`ScopedRng` (`crates/shadowbench-core/src/shared/scoped_rng.rs`) replaces ad-hoc `rand::random()` calls, which the module doc calls out by name as unusable for this project because they "cannot be replayed deterministically," "vary between runs," "break save/load parity," and "make debugging impossible."

The mechanism:
- A single `MasterSeed(u64)` per run (default `0x5348_4144_4F57_574B`, i.e. "SHADOWWK" in hex; or `MasterSeed::from_timestamp()` for a fresh random seed on new games).
- Every random draw is requested through a **scope**: `system` name (e.g. `"climate"`), `country_id` (or `"_global"`), the current `tick`, and a `key` describing the specific value (e.g. `"temperature_variance"`).
- The scope is hashed with SHA-256 (`compute_scope_seed`) into a 32-byte seed, which seeds a `ChaCha8Rng` stream (`ScopedRngStream`) for that one call site.
- Because the seed is a pure function of `(master_seed, system, country_id, tick, key)`, no RNG state needs to be stored or serialized between saves — `ScopedRng` itself is just the master seed, and streams are recreated on demand. The crate's own test suite (`scoped_rng.rs` unit tests) directly asserts: same scope → same values; different country/tick/master-seed → different values; and serialize/deserialize round-trips reproduce identical streams.

This is the underpinning of the project's **referee discipline**: paired-arm comparisons (e.g. a policy arm vs. a null-player arm) and calibration baselines depend on being able to hold the seed fixed and vary only the thing under test, then trust that any observed divergence came from that variable and not from RNG noise. `apply_bench_deployment_effects` explicitly leans on this — "the null-player arm never deploys, so this is a proven no-op there; only policy arms diverge."

**Caveat found directly in the codebase**: "same seed = same world" is not unconditionally byte-for-byte in every artifact the sim produces. `tests/turbo_determinism.rs` (bead mk-307) documents three *known* nondeterminism sources orthogonal to the RNG itself: (1) unstable `HashMap`-iteration-order sorts in some trace builders (being fixed incrementally, e.g. adding country-id tiebreaks), (2) hash-chained trace fields computed pre-fix so old and new orderings hash differently, and (3) genuine float non-associativity from Rayon's parallel-reduction order in the agent tick, which compounds over ticks and can eventually flip a threshold-gated boolean (observed crossing an action-availability threshold by ~tick 1037 in testing). The scoped-RNG scheme itself is exactly reproducible; end-to-end trace-level bitwise reproducibility is a work-in-progress property the team actively tests for and bounds (their determinism test runs a fixed 720-tick / 30-sim-day window specifically to stay under the observed noise-compounding threshold).

## 221 Countries

The country roster — 221 entries — is the simulation's fixed unit of geographic simulation, loaded from an embedded table (`country_map.rs`) backed by `country-shadow-map.json` and confirmed stable after bootstrap (`EmergenceState::sorted_country_ids()` caches the sorted id list precisely because "the set is fixed after bootstrap"). Per-country structures built on top of this roster include:
- `PressureStore` — pressure levels per country (13 interconnected pressure types per the original vertical-slice design doc in `emergence/mod.rs`; cross-country cascades applied via `pressures.apply_cross_country_cascades`).
- `CountryArchetype` — 7 archetypes classified across 15 indicators per country (`archetypes/mod.rs`).
- `StructuralProfile` — per-country exposure/sensitivity/adaptive-capacity, which replaced an earlier "genotype-as-static-multiplier" scheme that the code notes had given 213 of 221 countries an identical modifier (a calibration bug fixed in Batch 3, bead shadow-work-end1).
- `CountryBlackboard` — one per country, described above.
- Institutions — 663 institutions across the roster (cited directly in cold-start test comments), i.e. not a uniform "8 types × 221 countries" grid; institution presence varies by country.

Note: `emergence/mod.rs`'s module-level architecture comment ("Institutions (80 total): 8 types × 10 countries... Agents (80 total): 1 per institution") describes the original vertical-slice prototype scope, not the current scale. The 221-country, 663-institution figures are what the current test suite and runtime code confirm.

## Rust Rewrite Lineage

Shadow Work's simulation was originally TypeScript + React, with a `simulation-engine` package that was already Rust compiled to WASM (per `docs/plans/2025-11-05-tauri-migration-design.md`). The Tauri migration (starting ~Nov 2025) moved the entire simulation and persistence layer natively into Rust — `Arc<RwLock<GameState>>` in-process rather than round-tripping through WASM/JS boundaries — explicitly "to keep hot data resident in Rust memory while React consumes lightweight updates." The stated motivations were performance, distribution, platform integration, and UX constraints that WASM-in-browser could not solve. `packages/core` (TypeScript domain logic) is retained but explicitly marked legacy/deprecated in favor of the Rust `src-tauri`/`shadowbench-core` code; `emergence/mod.rs` also explicitly rejects re-adding "the 100+ parameter 'force calculation' middleware from the TypeScript prototype," favoring emergence from "simple rules × many actors × deep connectivity × persistent memory" instead.

A **headless benchmark harness** exists specifically for calibration and verification, independent of the Tauri UI: the `shadowbench` and `shadowbench-runner` binaries (`crates/shadowbench-core/src/bin/`, declared as explicit `[[bin]]` targets in `Cargo.toml` so `shadowbench-runner` keeps its hyphenated name). This harness:
- Drives the simulation via a scripted or MCP-driven decision loop (see `plugins/shadowbench-eval-mcp`) for alignment-style evaluation, independent of any UI.
- Supports a `--tick-ms 0` "turbo" mode that removes wall-clock pacing between ticks — proven pacing-independent (same outcomes as `--tick-ms 42`) by the `turbo_determinism` test, modulo the known nondeterminism sources above.
- Is the vehicle for the project's calibration baselines (e.g. `docs/baselines/month6-collapse-v0.md`) and paired-arm bakeoffs (e.g. `design/2026-07-13-b4-bakeoff-verdict.md`, run across "3 seeds × 221 countries × 3 families").

## System Interactions

### Feeds Into
- **[Pressures](#)** - Blackboard unrest/legitimacy/fiscal-stress indices and per-tick intrinsic pressure growth feed the 221-country pressure store that issue detection reads.
- **[Cascades](#)** - Cross-country pressure cascades and issue-to-issue cascades run every monthly/full tick, reading the same shared blackboard and pressure state the tick loop just updated.
- **[Events](#)** - Hourly reactive agent actions and monthly agent-tick action results are recorded into the event log and drive `EmergenceEvent`/`SimEvent` generation.

### Receives From
- **[Pressures](#)** - Pressure levels and structural profiles are read back into blackboard deltas (`apply_unrest_delta`, `apply_fiscal_delta`) each tick.
- **[Events](#)** - Agent action results and external shocks are the primary inputs the tick loop consumes to decide what state to mutate next.
- **[Cascades](#)** - Cascade-driven issue emergence/escalation feeds back into pressure amplification on the following tick.

---

*Connected issues and related systems are automatically populated from the graph.*

**Contributors**: Shadow Work Team
**Last Updated**: 2026-07-14
**Edit on GitHub**: [Suggest changes](https://github.com/mistakeknot/shadow-workipedia/edit/main/wiki/systems/simulation-architecture.md)
