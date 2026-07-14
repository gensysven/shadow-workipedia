---
id: economy
title: Economy
domain: Simulation
relatedSystems: [pressures, trade, cascades]
editedBy: Shadow Work Team
lastUpdated: 2026-07-14
---

# Economy

## Overview

The Economy system is the Rust simulation's macro-financial layer: per-country GDP growth, trade balances, commodity prices, currency/credit stress, and labor-market unemployment. It sits alongside a separate **physical supply-chain layer** that tracks real inventories and production for a basket of strategic goods, constraining what the macro numbers are allowed to say. Together they are the primary feed for the `economic_strain` pressure family and, through it, for cascades into social and political pressures.

The system was rewritten from the old TypeScript economy domain into native Rust (`crates/shadowbench-core/src/economy/` and `src/emergence/economy/` + `src/emergence/labor/`); the code below is the current source of truth.

## What It Simulates

- **GDP growth (`economy/gdp_dynamics.rs`)**: A decomposed multi-factor annual growth rate per country — `base_growth` (convergence: poorer countries grow faster, referenced against a GDP/capita "frontier"), `investment_effect`, `trade_effect` (balance + openness against global growth), `resource_effect` (oil-exporter vs. importer response to price change), `monetary_effect` (distance from a neutral policy rate), and `shock_effect` (crisis severity). The six factors sum and clamp to a fixed annual growth band; each factor is independently inspectable, and the module also reports the single dominant factor for narrative/debugging use.
- **Trade (`economy/trade_system.rs`)**: Gravity-model bilateral flows. Per-country trade state (`CountryTradeState`) tracks total exports/imports in USD, GDP, trade openness, balance-as-%-of-GDP, terms of trade, and a map of bilateral flow values by partner. Aggregated into a `GlobalTradeState` with world trade volume and an average tariff rate.
- **Commodity markets (`economy/commodity_market.rs`, `economy/supply_demand.rs`)**: Per-commodity market state (price, price history, supply/demand quantities) resolved through supply/demand equilibrium math, with derived food and energy price indices and convenience accessors (oil price, gold price) used elsewhere in the pressure wiring.
- **Monetary system (`economy/monetary_system.rs`)**: Per-country central-bank state — policy rate (Taylor-Rule-style), inflation rate vs. inflation target, money-supply growth, and a credit-conditions scalar (0 = frozen, 1 = abundant) that gates investment and growth.
- **Market events (`economy/market_events.rs`)**: Discrete shock types — oil supply/demand shocks, banking crises, currency crises, sovereign debt crises — tracked in a `GlobalEventState` with a `global_crisis_level` and per-country crisis membership/impact.
- **Physical supply chains (`economy/supply_chain_physical/`)**: See below — a distinct, quantity-first layer that the macro numbers above must remain consistent with.
- **Labor / unemployment (`emergence/labor/`)**: Okun's-Law-driven unemployment dynamics per country, separate from GDP-in-USD bookkeeping (see below).
- **Economy pillar micro-signals (`emergence/economy/`)**: A lighter, hourly-cadence layer tracking 7 "strategic goods" price indices and shocks, converted into `trade_finance_availability`, `currency_stress`, and `import_dependency` signals per country.

## Economic State Per Country (as coded)

`economy::integration::WorldEconomy` is the top-level struct. It does **not** hold a single flat "country economy" record; state is spread across sub-maps, all keyed by country ID:

- `markets: GlobalMarketState` — global commodity prices/indices (not per-country).
- `trade: GlobalTradeState` — `countries: HashMap<String, CountryTradeState>` holds GDP, exports/imports, openness, balance %, terms of trade per country.
- `events: GlobalEventState` — active market events and derived `global_crisis_level`; queried per-country via `is_country_in_crisis` / `country_crisis_impact` (total GDP impact from active events touching that country).
- `supply_chain: SupplyChainPhysicalEconomy` — the physical layer (see below), country- and commodity-indexed.
- `country_modifiers: HashMap<String, CountryModifiers>` — accumulated per-tick modifiers pushed in from the emergence/agent layer (via `EconomicEffectType`: GDP growth, productivity, investment, and three supply-chain-specific levers — import multiplier, priority multiplier, capacity multiplier — all addressable per commodity).
- `country_inflation_signal_pct`, `country_financing_factor`, `country_credit_strain`, `country_tech_index` — simple per-country scalar maps (financing factor tightens under deficit/inflation stress; credit strain is derived as `1 - financing_factor`).
- `country_financing_factor_shadow` / `country_tech_index_shadow` — shadow copies used for slower-moving/deterministic derivations (e.g. credit-strain pressure).

There is no single "country economy" snapshot type exposed to the rest of the sim; downstream code reads whichever sub-map it needs (trade state for GDP, events for crisis impact, financing factor for credit strain, etc.).

## Labor Dynamics (as coded)

`emergence/labor/` is a small, focused module — not the fuller "labor union / skill supply-demand" model sketched in its own docs, which is aspirational and not implemented. The actual code:

- **Unemployment change (`unemployment.rs`)**: Okun's Law with hysteresis. Raw change is `-gdp_growth_rate * OKUN_COEFFICIENT`; the resulting change is scaled by a rise-speed if positive (unemployment increasing) or a slower fall-speed if negative (hiring lags firing), then a small drift term pulls the rate toward each country's natural unemployment rate. Result is clamped to a fixed min/max unemployment band. All named constants (Okun coefficient, rise/fall speed, drift rate, min/max) are (under active calibration — B5).
- **Natural rate (`natural.rs`)**: A per-country structural/frictional baseline unemployment rate, hardcoded for a short list of major economies (USA, DEU, JPN, CHN, IND, BRA, RUS, SAU, NGA, IDN) with a global-average default for everyone else.
- **Pressure effects (`pressures.rs`)**: Unemployment above a threshold generates `SocialUnrest`; unemployment above a higher threshold also generates `PoliticalInstability`; a crisis-level threshold compounds both. All thresholds and multipliers are (under active calibration — B5).
- **Narrative (`narrative.rs`)**: Generates human-readable headlines for significant unemployment swings (surge/crisis/recovery framings), gated on a minimum change magnitude so small drifts stay silent.

Labor dynamics feed pressures directly (unemployment → SocialUnrest/PoliticalInstability) — they do not currently feed back into GDP growth as a labor-supply constraint; that link runs the other direction (GDP growth drives unemployment via Okun's Law).

## Physical Supply Chains (major component)

`economy::supply_chain_physical` is a "quantity-first" layer intentionally separate from USD-denominated GDP/trade bookkeeping. It exists because the COMTRADE trade baseline is in USD value while production recipes are physical, and the two are reconciled topologically rather than by unit conversion.

Core structures (`supply_chain_physical/mod.rs`):
- **Index** (shared, immutable): commodity IDs and country IDs with lookup maps, each commodity's required (non-substitutable) input commodities, the reverse map of which downstream commodities depend on a given input, per-commodity buffer target (in days of throughput), a strategic-importance weight, and a substitute-mitigation factor.
- **State** (per country × commodity, flat vectors for performance): current inventory, inventory target, a separate strategic reserve inventory/target, last-tick denial ratio, import/export flow per day (current and baseline), an import multiplier and a priority multiplier (both externally adjustable — see policy bridge below), country-level financing factor, input-coefficient multiplier, substitution resilience, capacity factor, a capacity multiplier per commodity, baseline production and final-demand rates, and scratch buffers for the daily allocation pass.

The **daily tick** (`supply_chain_physical/tick.rs`) runs, per country, per commodity:
1. Imports land in inventory, dampened by financing factor, import multiplier, and any active shock (itself reduced by a substitution-mitigation term scaled by that country's substitution resilience).
2. Planned production is computed from baseline production rate × financing × capacity multiplier × country capacity factor × (1 − shock).
3. For each input commodity with more than one downstream consumer, available inventory is split across competing planned outputs by a **weighted, capped, water-filling allocator** (`allocate_weighted_capped_with_scratch`) — deterministic, priority-weighted by each output's strategic weight and its priority multiplier, with an exact fast path when supply covers demand.
4. Realized production consumes the allocated input share and adds the produced quantity to inventory; commodities with no required inputs produce unconstrained.
5. Output inventory is split between final demand and exports using the same weighted-capped allocator (final demand and export requests, weighted by strategic weight); a strategic reserve buffer tops up short-fall inventory before allocation and reabsorbs surplus above target afterward; a denial ratio (unmet demand / total demand) is recorded per commodity per country; inventory is soft-capped to avoid runaway buildup.

This produces, per country per commodity: capacity multiplier, investment delta, actual vs. baseline production/day, imports/day, exports/day, inventory vs. target, and a denied-demand ratio — exposed via `SupplyChainCapacitySnapshot`/`SupplyChainCapacityRow` for diagnostics.

Agent and policy actions reach the physical layer through `EconomicEffectType` variants scoped to a specific commodity: `SupplyChainImportMultiplier`, `SupplyChainPriorityMultiplier`, `SupplyChainReserveRelease`, `SupplyChainCapacityMultiplier`. The policy bridge (`emergence/policies/economy_bridge.rs`) translates active policies into these effects for a fixed set of macro commodities (crude oil, natural gas, coal, wheat, corn, soybeans, copper, iron ore, aluminum) — e.g. trade tariffs reduce the import multiplier, resource rationing raises the priority multiplier, strategic-reserve-release policies trigger reserve draws, and fossil-fuel-expansion policies raise the capacity multiplier for fossil commodities. Numeric magnitudes on these effects are (under active calibration — B5).

A separate, lighter **sectoral shock bridge** (`economy/sectoral_shocks.rs`) computes an oil-sector shock from a global outage percentage and propagates it through a COMTRADE-derived import-vulnerability lookup to generate per-country `EconomicStrain` pressure — this is distinct from (and upstream of) the strategic-goods physical layer above.

## How Economic Stress Feeds `economic_strain`

`PressureType::EconomicStrain` is one of 13 pressure types and one of the cascade "spine" families. The wiring lives in `state/simulation_loop/runner_tick/tick_once.rs::wire_economy_pressures`, called once per tick, and draws on several independent economy signals:

- **Global crisis level** (`WorldEconomy::crisis_level()`, from `GlobalEventState`) above a threshold adds a global `EconomicStrain` pressure scaled by the excess over that threshold.
- **Per-country crisis membership** (`is_country_in_crisis` / `country_crisis_impact`) adds a targeted `EconomicStrain` pressure scaled by that country's total GDP impact from active events.
- **Commodity price shocks** (`get_commodity_price_shocks`, derived from food/energy price indices exceeding baseline thresholds) route to either `ResourceScarcity` or `EconomicStrain` as a global pressure, with an explicit calibration note in-code (B5 A5) tying the ResourceScarcity decay rate to a specific Catastrophe-boundary target.
- **Sectoral (COMTRADE) shocks** (`sectoral_shocks::compute_oil_sector_shock`, gated on simulated outage percentage) route to per-country `EconomicStrain`, scaled by that country's import vulnerability to the affected sector.
- **Trade deficits** (`get_trade_deficit_pressures`, from `CountryTradeState.balance_pct`) add per-country `EconomicStrain` once a deficit exceeds a threshold percentage of GDP.
- **Credit/financing strain** (`get_credit_strain_pressures`, from `country_financing_factor_shadow`, i.e. `1 - financing_factor`) adds per-country `EconomicStrain` once the strain exceeds a threshold.

Separately, the lighter Economy pillar (`emergence/economy/types.rs::collect_pressure_deltas`) converts its own micro-signals — currency stress above baseline and low trade-finance availability — into additional per-country `EconomicStrain`, and high import dependency combined with active shocks into `ResourceScarcity`. This is explicitly documented in-code as non-overlapping with the `WorldEconomy`-level conversions above (no double counting).

All per-tick pressure caps, thresholds, and scaling coefficients along this path are (under active calibration — B5).

`EconomicStrain` in turn feeds into `SocialUnrest`, `PoliticalInstability`, `ImperialOverstretch`, `ResourceScarcity`, `DemographicPressure`, and `TechnologicalDisruption` (its declared cascade targets), and several of the labor and supply-chain effects above (unemployment-driven unrest, resource denial ratios) reinforce these same targets independently — i.e., there are multiple parallel paths from real economic stress into the same pressure families, not a single chokepoint.

## System Interactions

### Feeds Into
- **[Pressures](#)** — GDP crisis level, per-country crisis impact, commodity shocks, sectoral vulnerability, trade deficits, and credit strain all add to `EconomicStrain`; unemployment (via labor) adds to `SocialUnrest`/`PoliticalInstability`; import dependency + shocks add to `ResourceScarcity`.
- **[Cascades](#)** — `EconomicStrain` is a spine pressure family whose cascade targets propagate economic stress into social, political, demographic, and resource-scarcity pressures elsewhere in the graph.

### Receives From
- **[Trade](#)** — bilateral flows, trade balance, and openness (`CountryTradeState`) feed directly into the GDP growth model's trade effect and into deficit-driven `EconomicStrain`.
- **Policies / agent actions** — `EconomicEffectType` levers (GDP growth, productivity, investment, and the four supply-chain-specific multipliers/releases) are pushed in from the emergence/policy layer each tick and accumulate in `country_modifiers`.

---

*Connected issues and related systems are automatically populated from the graph.*

**Contributors**: Shadow Work Team
**Last Updated**: 2026-07-14
**Edit on GitHub**: [Suggest changes](https://github.com/mistakeknot/shadow-workipedia/edit/main/wiki/systems/economy.md)
