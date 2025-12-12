---
id: legitimacy-dynamics
title: Legitimacy Dynamics
type: primitive
pattern: "performance → legitimacy → compliance → capacity → performance"
usage_count: 98
related_primitives: [trust-erosion, death-spiral, resistance-backlash]
---

# Legitimacy Dynamics

## Pattern

Legitimacy is the perceived right to govern or exercise authority. It creates a virtuous or vicious cycle: good performance builds legitimacy, legitimacy enables compliance, compliance provides capacity, capacity enables performance.

```
    Performance
         │
         ▼
    Legitimacy ◄───────┐
         │             │
         ▼             │
    Compliance         │
         │             │
         ▼             │
     Capacity ─────────┘
```

## Key Mechanics

- **Performance-legitimacy coupling**: Good outcomes build legitimacy (0.01-0.03 per tick)
- **Legitimacy decay**: Without positive performance, legitimacy erodes (0.005 per tick)
- **Compliance function**: Compliance = f(legitimacy, coercion, ideology)
- **Capture risk**: Low legitimacy + high coercion → authoritarian capture

## Legitimacy Sources

| Source | Weight | Stability |
|--------|--------|-----------|
| Performance | 0.4 | Volatile |
| Tradition | 0.2 | Stable |
| Ideology | 0.2 | Moderate |
| Charisma | 0.1 | Volatile |
| Coercion | 0.1 | Unstable |

## Compliance Calculation

```
compliance = base_compliance × legitimacy_factor + coercion_bonus

where:
- legitimacy_factor = legitimacy ^ 0.7 (diminishing returns)
- coercion_bonus = coercion × (1 - legitimacy) × 0.3
```

High legitimacy → voluntary compliance
Low legitimacy → requires coercion → breeds resistance

## Examples

### State Legitimacy Crisis
Poor services → tax avoidance → less revenue → worse services → lower legitimacy → non-compliance spiral

### Gang vs State Competition
State legitimacy <40% + gang providing services → gang legitimacy may exceed state → parallel governance → state collapse in territory

### Democratic Backsliding
Electoral manipulation → legitimacy questioned → protests → repression → legitimacy↓↓ → authoritarian capture

### Institutional Authority
University credentialing → degree inflation → credential value↓ → legitimacy of expertise↓ → alternative authorities emerge

## Warning Signs

- Legitimacy below 50%
- Compliance requiring increasing coercion
- Alternative authorities gaining legitimacy
- Performance-legitimacy link breaking down

## Issues Using This Primitive

- [[democratic-backsliding]]
- [[state-capacity-collapse]]
- [[gang-governance-competition]]
- [[institutional-legitimacy-crisis]]
- [[expert-authority-collapse]]
- [[regulatory-capture]]

## Related Primitives

- [[trust-erosion]] - Trust feeds legitimacy
- [[death-spiral]] - Legitimacy collapse triggers death spirals
- [[resistance-backlash]] - Low legitimacy enables resistance
- [[capture-concentration]] - Capture undermines legitimacy

---

*This primitive appears in 98 ARCHITECTURE files, fundamental to governance dynamics.*
