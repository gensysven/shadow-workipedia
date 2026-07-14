---
id: climate
title: Climate
domain: Simulation
relatedSystems: [pressures, shocks-and-forcing, cascades]
editedBy: Shadow Work Team
lastUpdated: 2026-07-14
---

# Climate

## Overview

The Climate pillar (`shadowbench-core::emergence::climate`) is one of the causal-chain pillars in the Rust simulation (`Climate → Food → Economy → Compute → Politics → Diplomacy → Institutions`). Each scheduled tick it generates per-country climate events, detects compound events when two events overlap in the same country, converts active events into three downstream signals, ticks three long-run climate-forcing feedback loops, and pushes pressure deltas into the shared pressure store. The pillar is deterministic: given the same seed and country list, it reproduces identical events and signals (`test_deterministic_with_same_seed`).

## Cadence

The module's own doc comment describes Climate as running on a monthly cadence ("every 30 game days"). The pillar-scheduling code that drives it, however, labels Climate a daily pillar ("weather events") and calls `ClimatePillar::tick()` with the current in-game day rather than a month counter — the event-expiry math (`start_month + duration_months`) still runs against whatever time unit it's called with. Treat "month" in this article as "whatever tick unit the scheduler currently passes in" rather than a guaranteed calendar month; this is a real ambiguity in the source, not a simplification made for this article.

## What It Simulates

- **Discrete climate events**: Seven event types, each with a fixed base per-tick probability (under active calibration — B5), a randomized severity in the range 0.2–0.8, and a randomized duration of 1–4 ticks. Events are rolled per country per event type using a country/tick-scoped RNG stream, so results are seed-reproducible:

  | Event | Notes on downstream effect |
  |---|---|
  | Drought | Strongest driver of `water_stress`; also raises `yield_pressure` |
  | Heatwave | Raises `yield_pressure` and `infrastructure_strain` |
  | Flood | Strongest single driver of `infrastructure_strain` among non-hurricane events; also raises `yield_pressure` |
  | Hurricane | Broadest effect — raises all three signals, heaviest on `infrastructure_strain` |
  | Earthquake | `infrastructure_strain` only — the single largest per-severity contribution of any event type |
  | ColdSnap | Raises `yield_pressure` and `infrastructure_strain` |
  | Wildfire | Raises `yield_pressure` and `infrastructure_strain`; is also the only event type wired into the century-scale feedback loops (see below) |
- **K-cap event limiting**: New events generated in a single tick are capped at `PILLAR_EVENT_CAP` (shared across pillars) to prevent cascade overload; the cap is enforced while events are still being drawn per country, not after the fact.
- **Event expiry**: Active events are retained only while `start_month + duration_months > current_month`; once that window passes, the event drops out of `active_events` on the next tick.
- **Compound events**: If a country has two or more active event types at once, the pillar builds a `CompoundEvent` from the first two types found and assigns a severity multiplier — pairs like Drought+Heatwave, Drought+Wildfire, Heatwave+Wildfire, and Flood+Hurricane get elevated multipliers (under active calibration — B5); all other pairings get a smaller default multiplier. Compound events apply both a primary and a secondary synthetic event (secondary scaled down) on top of the base event signals.
- **Downstream signals (`ClimateSignals`)**: Every active event feeds three per-country signal maps, each clamped to [0.0, 1.0]:
  - `yield_pressure` — pressure on agricultural yields; produced by Drought, Heatwave, Flood, Hurricane, ColdSnap, and Wildfire in different proportions.
  - `water_stress` — water scarcity; produced mainly by Drought and, to a lesser degree, Hurricane.
  - `infrastructure_strain` — climate damage to infrastructure; produced most heavily by Earthquake and Hurricane, with contributions from Heatwave, Flood, ColdSnap, and Wildfire.
- **Century-scale climate forcing (`ClimateFeedbackState`)**: Three feedback loops tick every pillar cycle regardless of active events, tracking global (not per-country) state:
  1. **Wildfire–Carbon loop** — active wildfire severity across all countries releases stored carbon into a running `wildfire_carbon_released` total, which adds to `temperature_anomaly`; the loop returns a wildfire-probability multiplier that grows with how far `temperature_anomaly` sits above the 1.45°C baseline.
  2. **Ocean Heat Lag loop** — always ticks. A fraction of current `temperature_anomaly` is absorbed into `ocean_heat_content` each tick; a fraction of `committed_warming` is released into `temperature_anomaly` each tick (modeling multi-decadal thermal inertia), while new commitment accrues from the growing ocean heat content.
  3. **Aerosol Masking Withdrawal loop** — takes a `decarbonization_rate` input (currently hardcoded to 0.0 — no policy linkage yet), reduces `fossil_fuel_intensity` accordingly, and moves `aerosol_forcing` toward a target proportional to that intensity. As aerosol cooling weakens, the "unmasked" warming is added to `temperature_anomaly`.
  
  `ClimateFeedbackState` starts from documented real-world baselines: `temperature_anomaly` 1.45°C (2024 observed), `ocean_heat_content` 0.91 W/m² (Cheng et al. 2024), `committed_warming` 0.4°C, `aerosol_forcing` -0.9 W/m² (IPCC AR6), `fossil_fuel_intensity` 1.0. The per-tick transfer rates between these quantities are simplified placeholders (under active calibration — B5), not fitted climate-model coefficients.
- **Per-country climate vulnerability**: A fixed lookup table (`climate_vulnerability`) scales how much a given event severity translates into pressure for that country — e.g. Bangladesh and Pakistan are weighted high (flood/heat exposure, low resilience), Germany/UK/Singapore low (temperate or wealthy with strong adaptation capacity), with an unlisted-country default. This is what makes an identical drought produce different downstream pressure in, say, India versus Germany.

## Testing and Guarantees

The module's test suite (`emergence/climate/tests.rs`) pins down the following as intentional, verified behavior rather than incidental implementation detail:

- **Determinism**: identical seed + country list reproduces byte-identical `yield_pressure`, `water_stress`, and `infrastructure_strain` maps.
- **K-cap holds under load**: even with 50 copies of the same country in one tick, the number of newly generated events never exceeds `PILLAR_EVENT_CAP`.
- **Compound detection fires** when two events are active in the same country in the same tick, and the Drought+Heatwave pairing is verified to produce a multiplier greater than 1.5.
- **Signal clamping holds under repeated severe events**: ten consecutive severity-1.0 droughts applied to the same country still leave `yield_pressure` and `water_stress` at or below 1.0.
- **Events expire on schedule**: a 2-tick-duration event started at tick 0 is confirmed still active at tick 1 and confirmed expired by tick 3.
- **All three feedback loops are exercised inside `ClimatePillar::tick()`**, not just as standalone functions — a 12-tick run with an active wildfire event is confirmed to change `temperature_anomaly` and grow `ocean_heat_content` from their defaults.

## How It Affects Gameplay

**Player Levers:**
- No direct in-pillar player lever exists yet. The `tick_aerosol_masking` decarbonization-rate input is architecturally the hook for a future policy connection, but it is currently called with a hardcoded `0.0` ("status quo") inside `ClimatePillar::tick` — decarbonization policy does not yet move this loop.
- Indirectly, anything that changes a country's resilience to the resulting pressures (economic, infrastructure, political responses elsewhere in the sim) shapes how climate pressure compounds, even though climate event generation itself is not currently player-steerable.

**Warning Indicators:**
- Rising `temperature_anomaly` in `ClimateFeedbackState` — the shared global driver behind wildfire probability and unmasked aerosol warming.
- Multiple simultaneous active events in one country (visible via `active_events` / `compound_event_count`) — this is what triggers compound-event multipliers.
- Elevated `water_stress` (above 0.3) or `infrastructure_strain` (above 0.4) per country — these are the thresholds at which climate signals start contributing additional pressure types beyond `EnvironmentalStress` (see below).

**Win/Loss Conditions:**
- The Climate pillar does not itself define win/loss thresholds; it is an upstream driver. Sustained high `environmental_stress`, `resource_scarcity`, or `demographic_pressure` for a country — fed in part by this pillar — are the levers that matter for downstream systems' thresholds and tipping points.

## System Interactions

### Feeds Into
- **[Pressures](pressures.md)** — `collect_pressure_deltas()` converts active event severity (scaled by country vulnerability) into `EnvironmentalStress` deltas; compound-event severity multipliers add a further `EnvironmentalStress` boost; water stress above 0.3 adds `ResourceScarcity`; infrastructure strain above 0.4 adds `DemographicPressure` (people displaced by damaged infrastructure). All deltas are capped per tick (under active calibration — B5) and scaled by the shared daily-tick scale factor before being applied via `add_external_pressure(..., "pillar:climate")`.
- **[Shocks and Forcing](shocks-and-forcing.md)** — the century-scale feedback state (temperature anomaly, committed warming, aerosol forcing) is the pillar's contribution to long-run forcing that isn't tied to any single event.
- The Climate pillar is first in the documented pillar causal chain and its output (`ClimateSignals`) is passed directly into the Food pillar's tick call.

### Receives From
- **[Cascades](cascades.md)** — `EnvironmentalStress` is itself a node in the pressure cascade graph: it both feeds into and receives from `DemographicPressure` and `ResourceScarcity` in the shared pressure-propagation model, so climate-driven pressure can be amplified by cascades originating elsewhere, not only by this pillar's own events.
- A country/tick-scoped RNG stream (scope key `"climate"`) from the shared RNG service, which determines event rolls deterministically per seed.

---

*Connected issues and related systems are automatically populated from the graph.*

**Contributors**: Shadow Work Team
**Last Updated**: 2026-07-14
**Edit on GitHub**: [Suggest changes](https://github.com/mistakeknot/shadow-workipedia/edit/main/wiki/systems/climate.md)
