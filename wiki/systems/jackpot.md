---
id: jackpot
title: The Jackpot
domain: Simulation
relatedSystems: [pressures, shocks-and-forcing, cascades, agents]
editedBy: Shadow Work Team
lastUpdated: 2026-07-14
---

# The Jackpot

## Overview

The Jackpot is Shadow Work's name for the simulation's civilizational-collapse
end-state: the point at which sustained catastrophe becomes the world's
default condition rather than a regional event. The name and framing borrow
from William Gibson's *The Peripheral*, where the term describes a collapse
with "no one thing" behind it — many converging pressures rather than a
single cause. Shadow Work operationalizes that idea directly: the Jackpot is
detected from the chronicle record as a world-level threshold crossing, with
a computed epicenter, a computed leading causal family, and a set of
eligibility clauses that decide whether a given collapse counts as a "true"
Jackpot in the game's canon sense (the ruled **Samsara** predicate) versus an
ordinary, uncharacterized catastrophe.

The system's working design premise, formally ruled on 2026-07-11, is that
**the Jackpot is inevitable but modulatable**: no policy path escapes it, but
policy quality changes when it arrives and how bad it is when it does. That
premise is currently staged as a design prior, not yet a declared universe
axiom — see Design Stance below.

## What It Simulates

- **T0 (Jackpot onset)**: the first sustained month at which the
  population/GDP-weighted share of the world in Catastrophe-level pressure
  exceeds one half. Concretely, the evaluator (`chronicle/eval.rs`) scans the
  chronicle's monthly `world` rows for the first month `m` such that
  `cat_share > 0.5` holds for `m` and the following five months alike — six
  consecutive chronicled months, read at the chronicle's native monthly
  resolution. A world that spikes above 50% for a month or two and recovers
  does not trigger a Jackpot; the threshold has to hold as a sustained
  regime change, not a transient shock.
- **Epicenter**: the country where the collapse is judged to have started.
  Among all countries, the evaluator looks for the earliest onset of a
  sustained (again, 6-consecutive-month) run of `cat_count >= 3` — at least
  three of that country's own pressure families simultaneously at
  Catastrophe — within the 60 months leading up to T0. The country with the
  earliest such onset is the epicenter; ties break lexicographically by
  country code.
- **Leading family**: which pressure family gets "blamed" for the collapse.
  Within the epicenter, the evaluator first finds every pressure family that
  reached Catastrophe by T0, then sums each family's within-country cascade
  outflow — attribution deltas whose source is `cascade:<Family>` landing as
  positive contribution in a *different* family — over the 24 months up to
  T0. The family with the largest such outflow is the leading family (ties
  break on earlier first-Catastrophe month, then enum order). This is a
  causal-contribution measure, not just "which pressure number is highest."
- **Attribution shares and the multiplex principle**: for the leading family,
  the evaluator also computes, over that same 24-month attribution window,
  each individual source's (agent action, cascade, decay, etc.) share of
  total positive attribution — including which single source contributed the
  most (the "attribution head") and its share of the total. This is reported
  as diagnostic data on every verdict, not gated in the base predicate
  itself; it is the instrument the design ruling's multiplex clause checks
  against in the calibration sweep (see below). The intent is structural:
  the Jackpot should read as a chorus of contributing causes, not a soloist
  — no single source should dominate the collapse-window forcing in most
  runs.
- **Eligibility clauses (the ruled Samsara predicate)**: beyond bare T0
  existence, a run is only "eligible" (canon-grade Jackpot, as opposed to
  merely `no_jackpot`, `ineligible`, or `indeterminate`) if all of the
  following hold:
  - **Tech-led (A1)**: the leading family is `technological_disruption` or
    `compute_supply_stress`.
  - **Climate is context, not cause (A2)**: `environmental_stress` is not
    among the top two families by cascade outflow.
  - **Corporate epicenter (A3)**: the single largest attribution source into
    the leading family, over the 24-month window, is classed `corporate`
    (as opposed to `state`, `civil`, `systemic`, or `environment`).
  - **Accidental, not player-directed (A4)**: the earliest "igniting issue"
    in the epicenter that amplifies the leading family and emerged in the 24
    months before that family's first Catastrophe month must not have been
    preceded, in the 24 months before *it* emerged, by a matching
    `deploy_to_<epicenter>` player action. No igniting issue found at all is
    recorded as accidental by default.
  - **Corporate remnant (C.2)**: some corporate actor keeps effectiveness
    ≥ 0.5 continuously from T0 through T0+10 years (this clause is
    `indeterminate`, not failed, if the chronicle doesn't run that far yet).
  - **Exodus-capable bloc (C.3-lite)**: at the first chronicled month at or
    after T0+20 years, at least one country holds state capacity ≥ 0.5 with
    both tech-family pressures still below Crisis — a proxy for "somewhere
    retained the capacity to opt out." Also `indeterminate` if the
    chronicle horizon is too short.
  - A **soft, non-gating flag** notes if T0's year falls outside the
    2065–2145 design-prior window — diagnostic only, never a pass/fail gate.

  A run fails ("ineligible") if any hard clause resolves false; it's
  "indeterminate" if any unresolved clause needs more chronicle than exists
  yet; it's "eligible" only if every clause resolves true.

## How It Affects Gameplay

**Design stance — inevitable but modulatable:**
The Jackpot is not something a player can prevent outright; it is not a boss
fight with an escape hatch. What the player *can* do is change its shape:
sustained, well-targeted policy buys real T0 delay — the design ruling's
working language is "decades" — and materially reduces the severity of the
collapse window when it does arrive. The ruling is explicit that this is the
whole point of play: "we don't model whether civilization is in trouble; we
model what your choices buy you inside the trouble." Escape is off the table
by design; degree and timing are the entire game.

**Player Levers:**
- Policy and institutional investment aimed at the pressure families that
  feed the leading-family cascade (tech-family exposure, corporate
  concentration, and their downstream outflows) — the modulatable surface
  the design ruling targets.
- Anything that shifts a country's structural exposure/sensitivity/adaptive
  capacity profile, which determines how readily it can become an epicenter
  or later serve as an exodus-capable bloc.
- Player-directed deployment actions matter for canon classification
  specifically at the *igniting issue*: a `deploy_to_<country>` action
  timed just before the igniting issue emerges flips a run from
  "accidental" to player-directed, which fails the Samsara accidental
  clause even if every other clause holds.

**Warning Indicators:**
- Rising `cat_share` (population/GDP-weighted world Catastrophe share)
  approaching and holding above 50% is the leading indicator of an
  oncoming T0.
- A country accumulating three or more simultaneously Catastrophe-level
  pressure families is the epicenter signature the evaluator watches for.
  The tech families (`technological_disruption`, `compute_supply_stress`)
  climbing alongside concentrated corporate attribution share is the
  profile of a canon-eligible Jackpot specifically, as opposed to some
  other collapse shape.

**Win/Loss Conditions:**
- The Jackpot itself is not a binary win/loss flag in play; it is a
  detected regime the chronicle either does or doesn't cross into, with a
  computed date, place, and cause. What players are actually scored and
  judged on — per the design ruling's bench signal — is *modulation*: how
  far T0 was pushed out and how much collapse-window severity was reduced
  relative to a null-policy baseline, not whether the Jackpot occurred at
  all.

## Verification: the ablation harness

Because "your policy delayed the Jackpot" is exactly the kind of claim that
is easy to fake — by scripted narrative, by a stray direct-control shortcut,
or by numerical noise — the design ruling requires that all measured
modulation be checked against an **agent-effects ablation harness**: rerun
the same scenario with agent/policy effects switched off, and confirm the
measured delay and severity reduction disappear. If modulation *survives*
ablation, that is treated as direct-control leakage and is a hard stop on
the claim — the improvement wasn't coming from the modeled mechanism at
all. The harness is required to use deterministic reduction and paired-seed
float discipline specifically because float-order nondeterminism can
otherwise fake an ablation pass. This is the mechanism by which "the
Jackpot is modulatable" stays a falsifiable, checked claim rather than an
assumed one — verified per run family, not merely asserted in the fiction.

## Design Stance and Open Calibration

The "inevitable but modulatable" premise is currently the working design
premise governing calibration, architecture, and gameplay — it is **staged**
rather than declared: it becomes universe canon (an axiom) only once the
verification instruments described above exist and the modulation claims
have been independently shown falsifiable, not merely asserted. Promotion is
earned by the instruments, at a later batch in the project's sequencing, not
assumed now.

Several parts of the calibration are explicitly **in progress and not yet
final** (tracked as Batch 5 of the ruling's sequencing):
- The exact incidence rate, its target window, and the multiplex
  concentration threshold are calibration targets under active tuning, not
  shipped numbers — this document intentionally does not state them.
- The precise granularity of "single source" for the multiplex check
  (pressure-family level vs. actor-class level) and how it composes with
  the corporate-epicenter clause's concentration requirement are open
  definitional questions, not yet resolved.
- The 2065–2145 window referenced above is a soft design prior carried over
  from the shipped Samsara ruling — it is diagnostic only and is not, and
  will not become, a hard gate.

## System Interactions

### Feeds Into
- **[Cascades](#)** - The leading-family determination and epicenter onset
  are read directly from cascade outflow accounting between pressure
  families.
- **[Agents](#)** - Corporate-vs-state-vs-civil attribution classing (clause
  A3) and player-directed deployment detection (clause A4) both key off
  agent action records.

### Receives From
- **[Pressures](#)** - T0, epicenter, and leading-family determination are
  all computed from per-country, per-family pressure levels crossing
  Catastrophe/Crisis thresholds.
- **[Shocks and Forcing](#)** - Igniting issues and their amplification of
  the leading family originate as shocks/forcing events in the epicenter
  country.

---

*Connected issues and related systems are automatically populated from the graph.*

**Contributors**: Shadow Work Team
**Last Updated**: 2026-07-14
**Edit on GitHub**: [Suggest changes](https://github.com/mistakeknot/shadow-workipedia/edit/main/wiki/systems/jackpot.md)
