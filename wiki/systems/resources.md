---
id: resources
title: Food & Resources
domain: Simulation
relatedSystems: [economy, climate, shocks-and-forcing]
editedBy: Shadow Work Team
lastUpdated: 2026-07-14
---

# Food & Resources

## Overview

Food & Resources tracks two coupled things: the **Food pillar** (`shadowbench-core::emergence::food`), which simulates 7 staple commodities and food-security-by-tier for every country, and the **ResourceScarcity pressure** (one of the 13 `PressureType` families), which represents oil/gas/mineral shortages and receives inflow from food, climate, economy, shocks, and scenario forcing. Food security and resource scarcity are read by Politics, Institutions, Economy, and the issue-detection layer to drive unrest, legitimacy loss, and named crises like Oil Shock and Resource Depletion.

## What It Simulates

- **7 food staples** — Wheat, Rice, Corn, Soybeans, Palm Oil, Sugar, Fertilizer (`FoodStaple`), each with a baseline USD price and a `climate_sensitivity` coefficient (Rice 0.8 highest, Fertilizer 0.2 lowest — industrial, less climate-dependent).
- **Food security per country** — a single `food_security` scalar (0.0 famine → 1.0 abundant), degraded by climate `yield_pressure` and `water_stress`, and by economy `trade_finance_availability` and `currency_stress` (low trade finance and currency stress both raise import cost).
- **Crisis levels** — `CrisisLevel::{Stable, Shortage, Crisis, Famine}` derived directly from the security scalar: ≥0.8 Stable, ≥0.5 Shortage, ≥0.2 Crisis, else Famine.
- **Tier affordability** — `TierAffordability{elite, middle, mass}` splits the same security value three ways: elite gets `security × 1.3` (mostly protected), middle tracks security 1:1, mass gets `security × 0.7` (most exposed to price spikes).
- **Food shocks** — per-country, per-staple supply disruptions (`FoodShock`) with a random supply multiplier (0.5–1.0) and duration (3–17 days), rolled per staple per country each tick.
- **ResourceScarcity pressure** — the shared pressure family (oil, gas, mineral shortages) that Food, Climate, Economy, agent actions, policies, cross-country cascades, and scenario forcing all feed into.

## Mechanism

### Food pillar tick (`FoodPillar::tick`, daily cadence)

For each country, every tick:
1. **Initialize** signals at a 0.8 baseline security if new.
2. **Apply climate + economy inputs** (`FoodSignals::apply_inputs`): security -= `yield_pressure × 0.5`, -= `water_stress × 0.3`, -= `(1 − trade_finance_availability) × 0.2`, -= `currency_stress × 0.15`. Result clamped to [0, 1].
3. **Roll new shocks** per staple, using a scoped RNG stream (`"food", country, day, "shocks"`) so shocks are seed-derived and reproducible. Shock probability rises from a small base with climate yield pressure, weighted by how climate-sensitive that staple is (coefficients under active calibration — B5). New shocks are capped at the pillar's shared `PILLAR_EVENT_CAP` (K-cap).
4. **Apply active + new shocks** (`FoodSignals::apply_shock`): each shock with `supply_multiplier < 1.0` reduces security by `(1 − supply_multiplier) × 0.3`, then recomputes crisis level and tier affordability.
5. **Update prices**: for each staple, average the `supply_multiplier` of all active shocks on it, invert (`price = baseline / avg_supply`, floored), and mean-revert the current price toward that target — food reverts faster than other markets (rates under active calibration — B5).

Old shocks expire when `start_day + duration_days ≤ current_day`.

### Food → pressure deltas (`FoodPillar::collect_pressure_deltas`)

Per country, using the tick's resulting `food_security`:
- **ResourceScarcity**: if `security < 0.6`, delta = `(0.6 − security) × PRESSURE_CAP_PER_TICK`.
- **DemographicPressure**: if `security < 0.5` (Shortage or worse), delta = `(0.5 − security) × PRESSURE_CAP_PER_TICK × 0.7` — food insecurity below shortage level also drives migration/population stress.

Both deltas are scaled by `DAILY_SCALE` and applied via `add_external_pressure(..., "pillar:food")` in the causal chain (`state/ticking/pillars.rs`): **Climate → Food → Economy → Compute → Politics → Diplomacy → Institutions**. Food runs after Climate (consuming its `yield_pressure`/`water_stress`) and before Economy in this ordering.

### Resource scarcity: intrinsic + shock + forcing inflow

ResourceScarcity is one of 13 `PressureType` families (`pressures/types.rs`) with:
- **A small intrinsic monthly growth rate** (`INTRINSIC_GROWTH_RATES`, under active calibration — B5), applied daily via `MONTHLY_TO_DAILY` — structural drift alone equilibrates well below crisis.
- **A monthly base decay** (`decay_rate()`, under active calibration — B5).
- **Feeds into**: EconomicStrain, MilitaryTension, SocialUnrest (scarcity-driven riots), DemographicPressure (resource-driven migration), PoliticalInstability.
- **Fed by**: EconomicStrain (austerity cuts to supply-chain investment), PoliticalInstability (failed planning), DemographicPressure (population pressure on finite resources), EnvironmentalStress, IdeologicalPolarization (polarized governance fails at resource planning).

**Shock inflow — the "Oil price shock" event** (`config/defaults/shocks.rs`): a global, all-country shock — rare per month but sizable when it lands (probability and magnitude under active calibration — B5) — against `PressureType::ResourceScarcity`. Like all configured shocks, it rolls a seed-scoped uniform draw per (event, country, month) and, on a hit, applies `magnitude × capacity` where `capacity = (1 − current_value)` — the same capacity-mediated, attributed pattern (`add_attributed`, source `"shock:Oil price shock"`) used everywhere pressure is added, so a country already near saturation absorbs less. This is also the pressure target of the `OilShock` issue type (`IssueType::OilShock → PressureType::ResourceScarcity`, secondary: EconomicStrain, MilitaryTension).

**Forcing inflow — the "resource-tightening" curve** (`config::century_v0_forcing`): an externally-anchored `ForcingCurve` targeting `resource_scarcity`, ramping linearly over decades (months 300–900) up to its peak additive input (under active calibration — B5), applied daily and capacity-mediated identically to shocks (source `forcing:resource-tightening`). It's designed to lag the `climate-ramp` curve (environmental_stress, months 180–900), modeling resource pressure trailing climate stress on a century timescale. Forcing curves are opt-in scenario identity — the default config ships an empty `forcing: Vec::new()`, byte-identical to pre-forcing behavior until a scenario selects a named set (e.g. via `SHADOWBENCH_FORCING_SET=century-v0`).

**Other inflow to ResourceScarcity**:
- **Climate pillar**: water stress above 0.3 contributes `(water − 0.3) × vulnerability × CLIMATE_PRESSURE_CAP_PER_TICK`.
- **Economy pillar**: countries with import dependency > 0.5 *and* active supply shocks contribute `import_dependency × shock_intensity × ECONOMY_PRESSURE_CAP_PER_TICK`.
- **Agent actions**: `Action::CutProduction` adds a scaled fraction of its magnitude to ResourceScarcity (plus EconomicStrain).
- **Cross-country cascades**: countries above the 0.5 crisis threshold export 20% of their excess (split across neighbors, 5%/month effective budget), scaled by the receiving country's structural sensitivity.
- **Policies**: `RenewableInvestment` reduces ResourceScarcity on a delayed schedule; `FossilFuelExpansion` gives immediate relief but a delayed increase; `StrategicReserveRelease` gives strong immediate relief with a later rebound; `ResourceRationing` relieves scarcity immediately but raises SocialUnrest and EconomicStrain (all magnitudes under active calibration — B5).

All positive inflow to any pressure family is **capacity-mediated** (`(1 − current_value)` multiplier) and **attributed** to a named source string (`intrinsic`, `shock:<name>`, `forcing:<name>`, `pillar:food`, `pillar:climate`, `xcountry`, agent/policy sources) — the multiplex attribution ledger these sources feed is what lets calibration trace which channel is driving any country's ResourceScarcity value.

## How It Affects Gameplay

**Player Levers:**
- Policies: `RenewableInvestment`, `FossilFuelExpansion`, `StrategicReserveRelease`, `ResourceRationing` each trade off immediate vs. delayed ResourceScarcity relief against side effects (EnvironmentalStress, EconomicStrain, SocialUnrest).
- Agent action `MobilizeResources` and `CutProduction` push resource-adjacent pressures in opposite directions.

**Warning Indicators:**
- Food `crisis_level` reaching Shortage (security < 0.5) starts adding DemographicPressure in addition to ResourceScarcity.
- Active food shocks stacking on high-import-dependency countries compound through both the Food pillar directly and the Economy pillar's import-dependency channel.
- ResourceScarcity crossing the 0.5 crisis threshold triggers cross-country cascade export to neighbors.

**Win/Loss Conditions:**
- Famine-level food security (< 0.2) represents the most severe food-insecurity state tracked.
- ResourceScarcity at `PressureLevel::Catastrophe` (≥0.7) is a named trigger condition (`Condition::ResourceScarcityAbove`) used elsewhere in the tick/issue logic to gate severe events.

*(under active calibration — B5)*

## System Interactions

### Feeds Into
- **[Economy](economy.md)** — food price shocks and import-dependency interact with trade finance and currency stress; ResourceScarcity feeds EconomicStrain.
- **[Politics](#)** and **Institutions** — consume Food signals (crisis level, tier affordability) and ResourceScarcity in the causal chain, downstream of Food/Economy.
- **[Shocks & Forcing](shocks-and-forcing.md)** — the Oil price shock event and resource-tightening forcing curve are both externally-anchored ResourceScarcity inputs defined in this layer.

### Receives From
- **[Climate](climate.md)** — `yield_pressure` and `water_stress` degrade food security and add ResourceScarcity directly.
- **[Economy](economy.md)** — `trade_finance_availability` and `currency_stress` degrade food security; import dependency modulates ResourceScarcity under active shocks.
- **[Shocks & Forcing](shocks-and-forcing.md)** — global "Oil price shock" events and the "resource-tightening" century forcing curve add directly to ResourceScarcity.

---

*Connected issues and related systems are automatically populated from the graph.*

**Contributors**: Shadow Work Team
**Last Updated**: 2026-07-14
**Edit on GitHub**: [Suggest changes](https://github.com/mistakeknot/shadow-workipedia/edit/main/wiki/systems/resources.md)
