---
id: shocks-and-forcing
title: Shocks & Scenario Forcing
domain: Simulation
relatedSystems: [pressures, cascades, jackpot, climate]
editedBy: Shadow Work Team
lastUpdated: 2026-07-14
---

# Shocks & Scenario Forcing

## Overview

The world doesn't only get worse from the inside. Every month, the simulation rolls the dice on a small roster of external shock events — market volatility, oil price spikes, political scandals, and the like — that inject sudden pressure from outside the normal cause-and-effect chain of agents, institutions, and policy. Layered alongside these episodic shocks is a second, quieter mechanism: century-scale forcing curves that model long real-world trajectories (climate stress, demographic change, tech acceleration) as slow, deliberate ramps. Together these two mechanisms are the simulation's exogenous inputs — the parts of the story the player's country never controls.

## What It Simulates

- **Shock events**: Named, recurring external crises (a scandal, an oil shock, labor unrest) that fire probabilistically and dump pressure into a specific pressure family, either worldwide or in a handful of named target countries. They model the "stuff just happens" texture of real geopolitics — a shock isn't caused by anything in the simulation's internal logic, it's an exogenous roll.
- **Scenario forcing curves**: Named, externally-anchored trend lines (e.g. "climate stress keeps rising for the rest of the century") that ramp in slowly over decades and then hold at a plateau. They model real-world trajectories that don't wait for any in-game institution to react — the curve's shape is fixed at scenario-selection time, and it's the world's *response* to that pressure that's actually up for grabs.
- **Rare-large impulse design**: The shock roster is deliberately tuned toward infrequent-but-large hits rather than frequent-small ones, so that which seed gets unlucky enough to draw a *cluster* of shocks in the same stretch of years becomes the dominant factor in when (and whether) a country's pressures tip into collapse — not a smooth, predictable decline curve.

## How It Affects Gameplay

**Player Levers:**
- Shocks and forcing curves are not directly steerable by the player — they are exogenous by design. What the player *can* do is build resilience (institutional capacity, pressure-relief policy) so that when a shock or a forcing ramp lands, the country has headroom left to absorb it rather than getting pushed over a crisis threshold.
- Because shock damage scales with a country's remaining headroom in the targeted pressure (see Mechanism below), keeping any given pressure family low is itself a hedge against the next roll landing badly.

**Warning Indicators:**
- A pressure family that shocks or forcing curves both feed (e.g. `environmental_stress`, hit by both the "Climate event" shock and the "climate-ramp" forcing curve) is a compounding-risk family — watch it more closely than a family with only one exogenous feed.
- A cluster of shock events landing in a short window is the mechanism's signature "bad luck" pattern — several near-simultaneous hits to the same or related pressure families is a stronger warning sign than any single large event.
- Forcing curves are slow and visible in advance — once a curve's ramp window has started, the plateau it's heading toward is already fixed, so a rising trend in a forcing-fed pressure family that isn't explained by any in-game event is likely the underlying curve, not a policy failure.

**Win/Loss Conditions:**
- Neither shocks nor forcing curves alone cause collapse; they add pressure into the same shared pressure store that every other system reads. Whether an added dose of pressure tips a country into crisis or catastrophe depends on how much headroom was left and how the rest of the simulation (cascades, issues, institutions) responds afterward.
- Because shock timing is stochastic and forcing timing is fixed, the same starting conditions can play out very differently across seeds — a run's proximity to a shock cluster can determine how early a collapse trajectory becomes locked in, independent of anything the player did differently.

## The Shock Event Roster

Seven named shock events ship in the default configuration, each targeting one pressure family:

| Event | Pressure family | Scope |
|---|---|---|
| Market volatility | `economic_strain` | Targeted countries (USA, CHN, DEU, JPN) |
| Oil price shock | `resource_scarcity` | Global |
| Political scandal | `legitimacy_crisis` | Targeted countries (USA, BRA, RUS, NGA) |
| Labor unrest | `social_unrest` | Targeted countries (CHN, IND, IDN, BRA) |
| Regional tensions | `military_tension` | Targeted countries (RUS, CHN, USA, SAU, IND) |
| Climate event | `environmental_stress` | Targeted countries (USA, CHN, IND, IDN, BRA, NGA) |
| Elite power struggle | `elite_fracture` | Targeted countries (RUS, CHN, SAU) |

Each event has its own monthly probability and a magnitude added to its pressure family when it fires. Specific probability and magnitude values are under active calibration — B5 — so exact numbers are not reproduced here; what matters mechanically is the *shape* of the roster:

- **Global vs. targeted**: "Oil price shock" is the one global event — it rolls once per month for the whole world and, when it fires, applies to every country (each still individually gated by its own remaining headroom). Every other event is targeted: it rolls independently for each country in its named target list, so in a given month it might fire in some target countries and not others.
- **One family per event**: each shock is scoped to a single pressure family — there's no shock that spreads damage across multiple families at once.
- **Country selection reflects real-world exposure**: the target lists aren't arbitrary — they read as the countries most plausibly exposed to that kind of shock (major economies for market volatility, resource/military powers for regional tensions, and so on).

## Monthly Lottery: Rare-Large Impulse Design

Shocks are rolled once per month, not per tick. For a targeted event, each listed country gets its own independent roll that month; for the global event, one shared roll decides whether it fires everywhere at once. A roll under the event's probability triggers the shock; otherwise nothing happens that month for that (event, country) pair.

The defaults file carries an explicit design history: shock probabilities have been dialed down repeatedly (documented as roughly a 9x cut from an earlier baseline) while magnitudes were dialed up in compensation, so that the *expected* long-run dose into each pressure family stays roughly the same but the *variance* of any single impulse goes up sharply. The stated intent, in the codebase's own words, is a "rare-large cluster lottery" — instead of many small, predictable nudges, the roster fires infrequently but hard.

This has a specific consequence for how collapse timing plays out across different random seeds: because the underlying deterministic drift in pressures tends to converge to similar outcomes across seeds, it's the stochastic *clustering* of shocks — several unlucky rolls landing close together in time — that ends up deciding when (and how early) a given seed's world crosses into crisis. Two runs with identical starting conditions and identical policy choices can diverge substantially in collapse timing purely because one seed happened to draw a shock cluster the other didn't. This is by design: the simulation's internal calibration work uses the spread (interquartile range) of collapse timing across seeds as a target metric, and the shock roll is deliberately the main lever tuned to keep that spread wide rather than letting every seed converge on the same collapse date. Exact probability, magnitude, and dispersion-target values are under active calibration — B5.

Each shock roll is derived deterministically from the run's seed together with the event name, country, and month, meaning two runs sharing the same seed will always draw identical shock outcomes at identical points in time regardless of what else differs between them — shocks are a controlled, reproducible source of randomness, not fresh noise every run.

## Century-v0 Forcing: The Four Named Curves

Where shocks are episodic, forcing curves are structural: slow-moving inputs anchored to real-world trajectory shapes that a scenario can opt into as part of its identity. The default named set — `century-v0` — has four curves, each feeding one pressure family:

| Curve | Pressure family fed | Character |
|---|---|---|
| `climate-ramp` | `environmental_stress` | Slowest, longest ramp of the four; begins mid-century and climbs for decades |
| `resource-tightening` | `resource_scarcity` | Begins later than climate and follows it with a lag, reflecting resource pressure trailing climate stress |
| `demographic-wave` | `demographic_pressure` | A multi-decade wave beginning mid-century |
| `tech-acceleration` | `tech_disruption` | Begins earliest of the four, reflecting technological disruption as a nearer-term force |

Every curve has the same **ramp-then-hold** shape: nothing before a start point, then a straight linear climb over a fixed number of months, then a flat plateau held indefinitely once the ramp completes. There's no decay, oscillation, or overshoot — once a curve reaches its peak, it simply holds there. The relative ordering and pacing of the four curves — tech disruption arriving first, climate and demographics arriving in the mid-century range, resource tightening trailing climate — is the intentional shape of the set; exact start points, ramp lengths, and peak magnitudes are under active calibration — B5.

**Forcing is scenario identity, not hidden noise.** Unlike shocks, which are always active (unless explicitly ablated), forcing curves are empty by default — a scenario has to opt in to the named `century-v0` set (or, in principle, any future named set) via configuration. Because the set is chosen when a scenario is configured rather than rolled at runtime, two scenarios that differ only in whether forcing is switched on are meant to be compared as different scenario identities, not as the same scenario experiencing different luck. This is a deliberate contrast with shocks: shocks are stochastic and reproducible-by-seed; forcing is deterministic and reproducible-by-configuration.

Forcing curves apply uniformly to every country at once — there's no per-country targeting concept for forcing the way there is for shocks. Once a curve's ramp has started, its trajectory to the plateau is fixed; the only thing left uncertain is how the rest of the world (agents, institutions, policy) responds to the rising pressure it feeds.

## System Interactions

### Feeds Into
- **[Pressures](#)** - Both shocks and forcing curves write additively into the same per-country pressure families that every other system reads and writes; a shock or forcing dose is weighed against a country's remaining headroom in that pressure family before being applied, exactly like other external inputs to pressure.
- **[Cascades](#)** - A shock or forcing-driven pressure spike that pushes a country's pressure family over the cascade threshold can itself trigger cross-country cascade propagation to that country's neighbors, compounding the exogenous hit into a regional one.
- **[Jackpot](#)** - The `century-v0` forcing set is described as the forcing set for the default "Jackpot" scenario world — the long-run climate/demographic/tech trajectory that world is built around.
- **[Climate](#)** - The `climate-ramp` forcing curve is the mechanism's direct model of long-run climate stress, and the "Climate event" shock is a separate, episodic climate-linked hit to the same pressure family.

### Receives From
- **Scenario configuration** - Whether forcing is active at all, and which named curve set is selected, is decided when a scenario is configured, not rolled or discovered mid-run.
- **Run seed** - Shock timing and which countries get hit in any given month is derived from the run's seed, so shock history is reproducible for a given seed but varies across seeds.

---

*Connected issues and related systems are automatically populated from the graph.*

**Contributors**: Shadow Work Team
**Last Updated**: 2026-07-14
**Edit on GitHub**: [Suggest changes](https://github.com/mistakeknot/shadow-workipedia/edit/main/wiki/systems/shocks-and-forcing.md)
