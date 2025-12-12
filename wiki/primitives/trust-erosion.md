---
id: trust-erosion
title: Trust Erosion
type: primitive
pattern: "harm → fear → avoidance → worse outcomes → more harm"
usage_count: 59
related_primitives: [legitimacy-dynamics, death-spiral, threshold-cascade]
---

# Trust Erosion

## Pattern

Trust erodes asymmetrically: **slow to build, fast to collapse**. A single harm event can destroy years of accumulated trust, while recovery requires sustained positive performance over extended periods.

```
Trust Level
    │
1.0 ├────────╮
    │         ╲
0.5 ├──────────╲────────────────────
    │           ╲___________________
0.15├─────────────────────────────── (trust floor)
    │
    └────────────────────────────────► Time
         Harm    Long recovery period
         Event
```

## Key Mechanics

- **Asymmetric dynamics**: Erosion rate 4× faster than recovery rate
- **Trust floor**: Below ~15%, trust cannot recover without major intervention
- **Contagion**: Trust loss in one domain spreads to related domains
- **Harm sensitivity**: How much each harm event affects trust (varies by domain)

## Parameters

| Parameter | Range | Description |
|-----------|-------|-------------|
| current_trust | 0.0-1.0 | Current trust level |
| erosion_rate | 0.01-0.1 | Trust loss per tick during harm |
| recovery_rate | 0.005-0.02 | Trust gain per tick during good performance |
| floor | 0.05-0.15 | Minimum trust level (recovery nearly impossible below) |
| harm_sensitivity | 0.1-0.5 | Impact of each harm event |

## Examples

### Healthcare Trust
Medical errors → fear of hospitals → delayed care → worse outcomes → more errors. Trust in healthcare institutions fell from 80% to 34% (2020-2024) following perceived COVID mismanagement.

### Institutional Trust Cascade
University trust 57%→36% → media trust 32%→16% → government trust 22%→11%. Once one institution falls below trust floor, skepticism spreads to related institutions.

### Vaccine Hesitancy
Single adverse event report → amplified fear → declining vaccination → disease outbreaks → blame institutions → deeper erosion.

## Warning Signs

- Trust approaching floor (~30%)
- Multiple harm events in short period
- Trust contagion to related domains beginning
- Recovery efforts failing to gain traction

## Issues Using This Primitive

- [[vaccine-hesitancy-pandemic-vulnerability]]
- [[institutional-legitimacy-collapse]]
- [[medical-error-iatrogenic-harm]]
- [[police-community-trust-breakdown]]
- [[financial-institution-credibility-crisis]]

## Related Primitives

- [[legitimacy-dynamics]] - Trust feeds legitimacy, legitimacy enables trust-building
- [[death-spiral]] - Trust erosion can trigger death spirals
- [[threshold-cascade]] - Trust floor is a critical threshold
- [[contagion-propagation]] - Trust loss spreads across domains

---

*This primitive appears in 59 ARCHITECTURE files and is fundamental to institutional dynamics.*
