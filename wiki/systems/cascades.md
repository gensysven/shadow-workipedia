---
id: cascades
title: Cascades
domain: Simulation
relatedSystems: [pressures, diplomacy, trade, jackpot]
editedBy: Shadow Work Team
lastUpdated: 2026-07-14
---

# Cascades

## Overview

Cascades are the propagation layer that turns isolated pressure spikes into
regional and multi-causal collapses. The simulation implements two distinct
mechanisms: **cross-country** cascades, which spread a country's excess
pressure to its geopolitical neighbors, and **cross-family** cascades,
which let a single pressure (e.g. Economic Strain) generate pressure in
other families in the same country (e.g. Social Unrest, Technological
Disruption). A third, issue-level cascade lets active crises spawn related
crises directly. Together these produce the game's emergent,
hard-to-attribute "everything is collapsing at once" moments.

## What It Simulates

- **Cross-country contagion**: A country whose pressure crosses the crisis
  threshold exports a share of its excess to geopolitically/economically
  connected countries — trade-partner recessions, allied political
  instability, unrest that inspires movements elsewhere.
- **Cross-family coupling**: Each of the 13 `PressureType` families (Economic
  Strain, Social Unrest, Political Instability, Demographic Pressure,
  Resource Scarcity, Technological Disruption, Legitimacy Crisis, Elite
  Fracture, Environmental Stress, Ideological Polarization, Imperial
  Overstretch, Military Tension, Compute Supply Stress) defines a
  `feeds_into()` list of others it stresses when hot — the source of
  multi-causal collapses.
- **Issue-to-issue spawning**: Active/Critical issues can spawn related
  issue types (e.g. `Recession` → `MassUnemployment` →
  `SovereignDebtCrisis`) via a deterministic, seeded probability roll.

## Mechanism

### Cross-country propagation (`apply_cross_country_cascades`)

Implemented in `PressureStore::apply_cross_country_cascades`
(`emergence/pressures/store/cascades.rs`), called once per monthly tick
(`emergence/state/ticking/full_tick.rs`). For each country, for each of the
13 pressure families: if the country's level exceeds the **crisis
threshold**, the amount above threshold is its excess. A **propagation
rate** fraction of that excess is the country's total outbound cascade
budget for that pressure this tick, split evenly across all neighbors — so a
highly-connected country does not export more total pressure than a
sparsely-connected one. Each neighbor's inflow is then scaled by the
**receiver's structural sensitivity** (from its `StructuralProfile`): small
or already-stressed systems feel contagion harder than large, buffered
ones; countries absent from the profile map get neutral sensitivity (1.0).
The received amount is **capacity-mediated** — multiplied by the receiver's
remaining headroom `(1 − current_level)`, so cascades cannot pile onto an
already-saturated pressure — and the final amount is applied as attributed
pressure tagged `"xcountry"`, distinguishing it from decay, cross-family
cascade, or external-shock inputs in attribution traces. Both the crisis
threshold and propagation rate used here are hardcoded constants inside
`apply_cross_country_cascades`, not read from `CascadeConfig` (under active
calibration — B5); `CascadeConfig`'s `crisis_threshold` /
`propagation_rate` / `level_multipliers` exist and are exercised only by
config tests today.

### The three neighbor graphs

Live propagation neighbors come from a static `NEIGHBOR_MAP`
(`emergence/pressures/neighbors.rs`): a flat `country → Vec<neighbor>` table
for the ten major countries (USA, CHN, RUS, DEU, JPN, BRA, IND, SAU, NGA,
IDN), mixing economic rivalry, alliance ties, and regional influence into one
undifferentiated list — not literal geographic adjacency. Separately,
`CascadeConfig::neighbors` (`config/types.rs`) defines a typed, three-graph
`NeighborConfig` per country with distinct `trade`, `alliance`, and `border`
vectors, with defaults for the same ten countries in
`config/defaults/cascades.rs`. This is the intended richer model — letting a
trade-driven cascade travel a different edge set than a
border/military-tension one — but the live path consumes only the flat
`NEIGHBOR_MAP`, not the trade/alliance/border split (under active
calibration — B5).

### Level multipliers (concept) and cross-family coupling (`apply_cascades_scaled`)

`PressureLevel` (Normal / Warning / Crisis / Catastrophe) exposes a
`cascade_multiplier()`: the higher a pressure's severity level, the larger
the multiplier applied to its outbound cascade amount, so a pressure at
Catastrophe pushes harder into what it feeds than one at Warning. This is
the multiplier actually used by the cross-family mechanism below.
`CascadeConfig::level_multipliers` mirrors the same four values but, like
the rest of `CascadeConfig`, is not yet read by the live tick path.

Implemented on `CountryPressures` (`emergence/pressures/country/tick.rs`),
run every tick via `CountryPressures::tick` / `tick_scaled`. This is the
within-country mechanism and the heart of the game's emergent multi-causal
collapses: pressure in one family generates pressure in others. For each of
the 13 families, in canonical order: if the family's value exceeds a cascade
threshold (Warning-band), the amount above threshold is its excess, scaled
by that family's `PressureLevel::cascade_multiplier()` and by a cascade rate
constant (under active calibration — B5). For every target family in the
source's `feeds_into()` list, the result is capacity-mediated by the
target's remaining headroom `(1 − target_value)`, then applied as attributed
pressure on the target, tagged with a per-source `"cascade:<PressureType>"`
string (e.g. `cascade:TechnologicalDisruption`, `cascade:EconomicStrain`) —
this is how attribution traces show, for a Social Unrest spike, how much
came from cascading Economic Strain vs. Political Instability vs. intrinsic
growth or external shocks.

The `feeds_into()` graph is dense, asymmetric, and cyclic — most families
feed 2-9 others. Representative edges: `EconomicStrain` feeds Social Unrest,
Political Instability, Imperial Overstretch, Resource Scarcity, Demographic
Pressure, and Technological Disruption; `TechnologicalDisruption` feeds back
into Economic Strain, Demographic Pressure, Ideological Polarization,
Military Tension, Legitimacy Crisis, and Environmental Stress —
Economic Strain → Technological Disruption → Economic Strain is one such
cycle. Given headroom in its neighbors, a sustained spike in one family can
ratchet several others upward in the same run, producing collapses that
trace back to more than one root cause.

### Issue-level cascades (`process_cascades`)

A separate, coarser cascade operates on issues rather than raw pressure
values: `IssueStore::process_cascades` (`emergence/issues/store/cascades.rs`),
called each tick via `process_issue_cascades`
(`emergence/state/ticking/issues.rs`). Each `IssueType` declares a static
`can_spawn()` list of `(spawned_type, required_severity, probability)`
(`emergence/issues/types/mappings/cascades.rs`) — e.g. `Recession` can spawn
`MassUnemployment` at Active severity or `SovereignDebtCrisis` at Critical.
Only Active/Critical issues are eligible; a deterministic hash of country,
month, issue types, and issue ID produces a reproducible probability roll,
and a country cannot receive a duplicate active instance of the same
spawned type. Spawned issues record `IssueCause { agent_id: "cascade" }` for
traceable provenance.

## How It Affects Gameplay

**Player Levers:**
- Reducing a country's own pressure keeps it below the crisis threshold,
  capping both its cross-country exports and internal cross-family feeds.
- Diplomacy/trade/alliance choices shape which countries are cascade
  neighbors, so foreign policy affects contagion exposure as much as
  domestic policy; because inflow is always capacity-mediated, building
  headroom in vulnerable families blunts incoming cascades from any source.

**Warning Indicators:**
- A country above the crisis threshold on any pressure actively exports
  cascade pressure to its neighbors every month; attribution tags
  `"xcountry"` or `"cascade:<Family>"` reveal which country or family drives
  a given pressure's rise.
- Multiple families climbing together in one country signals cross-family
  coupling, not independent shocks.

**Win/Loss Conditions:**
- Because cross-family cascades cycle, sustained neglect of one high
  pressure can drag several others toward Crisis/Catastrophe in the same
  country, and cross-country cascades can export that collapse to
  neighboring partners — a primary path to simulation-wide crisis states.

## System Interactions

### Feeds Into
- **[Pressures](pressures.md)** — cross-country cascade writes attributed
  inflow to neighbor countries' pressures; cross-family cascade writes
  attributed inflow to other families within the same country.
- **[Diplomacy](diplomacy.md)** / **[Trade](trade.md)** — the neighbor
  graph's alliance and trade edges are the intended channels for allied
  instability and economic contagion respectively; the typed `trade` /
  `alliance` graphs exist in `CascadeConfig` but are not yet the live
  propagation source (under active calibration — B5).
- **[Jackpot](jackpot.md)** — cascading, multi-family, multi-country
  collapse is a core contributor to catastrophic end-states.

### Receives From
- **[Pressures](pressures.md)** — both mechanisms trigger off pressure
  levels crossing thresholds; intrinsic growth, shocks, and issue-driven
  amplification feed the values cascades act on.
- **[Diplomacy](diplomacy.md)** / **[Trade](trade.md)** — supply the
  relationship data (alliance, trade, border) defining cascade neighbors.

---

*Connected issues and related systems are automatically populated from the graph.*

**Contributors**: Shadow Work Team
**Last Updated**: 2026-07-14
**Edit on GitHub**: [Suggest changes](https://github.com/mistakeknot/shadow-workipedia/edit/main/wiki/systems/cascades.md)
