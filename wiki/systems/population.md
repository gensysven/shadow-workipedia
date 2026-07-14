---
id: population
title: Population & Migration
domain: Simulation
relatedSystems: [structural-profiles, pressures, cascades]
editedBy: Shadow Work Team
lastUpdated: 2026-07-14
---

# Population & Migration

## Overview

Population & Migration tracks each country's demographic structure — population, age balance, urbanization, growth, and labor-market shape — and the slower-moving cross-border flows of people driven by that structure and by governance conditions. Demographics set *equilibrium targets* for pressure levels rather than pushing pressures directly; migration reads those pressures back out as push/pull scores and feeds absorption stress and integration quality into both origin and destination countries.

## What It Simulates

- **Demographic snapshot (`Demographics`)**: per-country state — population (millions), median age, elderly % (65+), youth % (under 15), urbanization %, annual growth rate %, net migration per 1,000, labor force participation %, and unemployment %. Derived fields: `working_age_pct` (100 − elderly% − youth%), `dependency_ratio` ((youth% + elderly%) / working-age%), and boolean checks `is_aging` (median age > 40) / `is_young` (median age < 25).
- **Demographics baseline (`DemographicsStore`)**: loads from `data/generated/demographics-baseline.json` (World Bank-derived, ISO3-keyed, 3-letter-uppercase codes only — aggregate regions are filtered out). Falls back to continent-based defaults (via `country_map`, keyed on Shadow Work's fictionalized continent names) when the baseline file is missing or a country isn't in it. A hardcoded 10-country "vertical slice" baseline (USA, CHN, RUS, DEU, JPN, BRA, IND, SAU, NGA, IDN) exists for demo/testing.
- **Demographic pressure targets**: each tick, `DemographicsStore::calculate_demographic_targets` converts demographic structure into equilibrium *targets* (not additive flows) for three pressure types: `SocialUnrest` (youth bulge + unemployment, combined), `EconomicStrain` (aging burden), and `DemographicPressure` (rapid population growth).
- **Migration pillar (`MigrationPillar`, D2)**: weekly-cadence push/pull migration model. Per-country seeds (`MigrationCountrySeed`) are derived from country archetype records (fragility, GDP per capita, democracy index, governance composite) and drift toward pressure- and governance-adjusted targets over time.

## Demographic State and Targets

`Demographics` is the atomic per-country record; `DemographicsStore` is a `HashMap<String, Demographics>` keyed by ISO3 country ID. Loading order is: try the World Bank baseline JSON → fall back to continent defaults → (test-only) vertical-slice hardcoded baseline.

`calculate_demographic_targets` returns `(country_id, pressure_type_name, target_level)` tuples — these are targets the caller relaxes existing pressure toward, not per-tick additions. This distinguishes the current model from an earlier unconditional-flow version that let any country above a threshold climb pressure indefinitely. Three factor families, each capped individually and combined-capped to keep demographics from single-handedly pushing a country past Crisis into Catastrophe:

- **Youth bulge + unemployment → `SocialUnrest` target**: contributions from youth% over 30 and unemployment% over 10, summed and capped.
- **Aging → `EconomicStrain` target**: contribution from elderly% over 20.
- **Rapid growth → `DemographicPressure` target**: contribution from growth rate% over 2.0/year.

(Per-percentage-point coefficients and caps are under active calibration — B5.)

## Migration Mechanism

`MigrationSignals` (per-country, HashMap-keyed) carries: `net_migration_rate` [-1,1], `brain_drain_rate` [0,1], `refugee_inflow_rate` [0,1], `absorption_stress` [0,1], `integration_index` [0,1], `push_score` [0,1], `pull_score` [0,1]. Missing-country lookups default to 0.5 for push/pull, 0.0 for absorption stress.

**Seeding.** `MigrationCountrySeed::from_record` derives four baselines from a country's archetype record (FSI fragility score normalized to /120, GDP per capita normalized to /80,000, democracy index, WGI composite governance):
- `push_baseline`: weighted combination of fragility, low GDP, and low democracy (people want to leave).
- `pull_baseline`: weighted combination of high GDP, high democracy, and strong governance (people want to come).
- `brain_drain_baseline`: weighted combination of fragility and low GDP.
- `integration_baseline`: weighted combination of governance, democracy, and low fragility.

All four are clamped to [0,1]. `init_countries` seeds all signal channels from these baselines; initial `net_migration_rate` is set to `(pull − push) × 0.1`.

**Tick (weekly cadence, two passes over the country list).** All signals move toward a computed target via `drift_toward`, which steps by a fixed `DRIFT_RATE` per tick (slow — under active calibration — B5) rather than snapping.

Pass 1 — push scores for every country (needed before refugee calc, since refugee inflow depends on *other* countries' push):
- Target push = seed push baseline + weighted contributions from `EconomicStrain`, `SocialUnrest`, and `PoliticalInstability` pressures (read from the pressure store; missing values default to 0).

Pass 2 — everything else, per country:
- **Pull**: target = seed pull baseline scaled by governance `state_capacity` (weak states can't sustain their pull appeal).
- **Net migration rate**: target = `(pull − push) × 0.1`, drifted and clamped to [-1,1].
- **Brain drain**: target = `push × 0.5 × (1 − rule_of_law)` — brain drain rises with push pressure and weak rule of law.
- **Refugee inflow**: target = average of *other* countries' push scores × 0.1 × this country's own pull — i.e. a country absorbs refugee pressure generated by push elsewhere in proportion to how attractive it is as a destination.
- **Absorption stress**: target = `refugee_inflow × 0.5 + max(0, net_migration) × 0.3` — stress accumulates on destinations from both refugee inflow and net positive migration.
- **Integration index**: target = weighted combination of `state_capacity`, `rule_of_law_index`, `social_cohesion` (from public opinion signals) and `(1 − absorption_stress)` — high absorption stress erodes integration quality even when governance is strong.

**Effects on origin vs. destination.** Push/brain-drain accrue to the *origin* (sending) country; pull/absorption-stress/integration accrue to the *destination* (receiving) country. A single country can be both simultaneously (it has both a push score and a pull score every tick).

**Feedback into pressures (`collect_pressure_deltas`, weekly-scaled deltas):**
- `DemographicPressure` added to a country when its own `absorption_stress > 0.3` (destination effect).
- `EconomicStrain` added to a country when its own `brain_drain_rate > 0.3` (origin effect — loss of skilled workers).
- `SocialUnrest` added to a country when `absorption_stress > 0.5` AND `integration_index < 0.3` simultaneously (destination effect — high inflow poorly integrated).

Delta magnitudes scale with the triggering signal (e.g. `0.003 × absorption` for demographic pressure) except the social-unrest case, which is a flat delta once both thresholds are crossed. (Exact coefficients under active calibration — B5.)

**Determinism.** The pillar takes a `ScopedRng` parameter but the current implementation does not consume randomness in the tick — outputs are deterministic given identical inputs and country ordering (values are summed from an `FxHashMap`, so insertion/iteration order must stay run-to-run stable for chronicle reproducibility).

## How It Affects Gameplay

**Player Levers:**
- Policies that raise `state_capacity` or `rule_of_law_index` strengthen pull appeal and integration quality, reducing the social-unrest feedback loop from poorly-absorbed migration.
- Reducing unemployment or youth-bulge conditions lowers the `SocialUnrest` demographic target directly.
- Reducing economic strain and political instability in a country lowers its own push score, which — because refugee inflow to *other* countries is driven by the *average push of everyone else* — reduces migration pressure globally, not just locally.

**Warning Indicators:**
- Rising `absorption_stress` in a destination country with `integration_index` trending below 0.3 signals an imminent `SocialUnrest` feedback delta.
- `brain_drain_rate` climbing past 0.3 in a fragile, low-rule-of-law origin country signals a growing `EconomicStrain` feedback delta on that same country.
- A country simultaneously flagged `is_aging` (median age > 40) and carrying a nonzero `EconomicStrain` demographic target is compounding aging-burden pressure from two sources.

**Win/Loss Conditions:**
- Demographic and migration pressure contributions are deliberately equilibrium-capped (`FACTOR_TARGET_CAP`, `COMBINED_TARGET_CAP`) so this system alone can hold a country in Crisis but cannot escalate it into Catastrophe — that requires shocks, cascades, or agent effects layered on top.

## System Interactions

### Feeds Into
- **[Pressures](pressures.md)** — demographic targets (`SocialUnrest`, `EconomicStrain`, `DemographicPressure`) and migration pressure deltas (same three types, via absorption stress, brain drain, and integration failure) are both written into the shared pressure store.
- **[Cascades](cascades.md)** — pressure levels shaped by demographic/migration feedback can participate in downstream cascade triggers once they cross cascade-relevant thresholds.

### Receives From
- **[Structural Profiles](structural-profiles.md)** — country archetype records (fragility/FSI, GDP per capita, democracy index, WGI governance composite) seed `MigrationCountrySeed` baselines.
- **[Pressures](pressures.md)** — `EconomicStrain`, `SocialUnrest`, and `PoliticalInstability` levels feed back into the push-score calculation each tick.
- Governance signals (`state_capacity`, `rule_of_law_index`) and public-opinion signals (`social_cohesion`) shape pull, brain drain, and integration calculations.

---

*Connected issues and related systems are automatically populated from the graph.*

**Contributors**: Shadow Work Team
**Last Updated**: 2026-07-14
**Edit on GitHub**: [Suggest changes](https://github.com/mistakeknot/shadow-workipedia/edit/main/wiki/systems/population.md)
