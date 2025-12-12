---
id: death-spiral
title: Death Spiral
type: primitive
pattern: "A↓ → B↓ → A↓↓ → B↓↓ → collapse"
usage_count: 75
related_primitives: [feedback-loop, threshold-cascade, trust-erosion]
---

# Death Spiral

## Pattern

Self-reinforcing collapse where each iteration worsens the conditions that caused the previous decline. Unlike simple decay, death spirals **accelerate** as they progress, making intervention increasingly difficult.

```
Health
    │
1.0 ├──╮
    │   ╲
0.7 ├────╲──── Intervention threshold
    │     ╲
0.3 ├──────╲── Point of no return
    │       ╲
0.0 ├────────╲_____
    └────────────────► Time
```

## Key Mechanics

- **Feedback multiplier**: Each tick's decay accelerates future decay
- **Intervention threshold**: Above this, external help can reverse the spiral
- **Point of no return**: Below this, collapse is mathematically inevitable
- **Variant types**: Fiscal, debt trap, quality degradation, brain drain

## Parameters

| Parameter | Range | Description |
|-----------|-------|-------------|
| health | 0.0-1.0 | Current system health |
| decay_rate | 0.01-0.05 | Base decay per tick |
| feedback_multiplier | 1.5-3.0 | How much decay accelerates decay |
| intervention_threshold | 0.5-0.7 | Point where intervention still possible |
| point_of_no_return | 0.2-0.4 | Irreversibility threshold |

## Spiral Variants

### Fiscal Death Spiral
Revenue↓ → services↓ → population exodus → tax base↓ → revenue↓↓

### Quality Death Spiral
Quality↓ → reputation↓ → enrollment↓ → funding↓ → quality↓↓

### Brain Drain Spiral
Poor conditions → skilled workers leave → weaker economy → conditions↓↓ → more leave

### Debt Trap Spiral
Debt↑ → interest burden↑ → default risk↑ → borrowing cost↑ → debt↑↑

### Healthcare Cost Spiral
Costs↑ → insurance premiums↑ → healthy leave pool → sicker pool → costs↑↑

## Examples

### Nursing Home Quality Collapse
Private equity acquires facility → cost cutting → staff reduction → quality decline → citations → reputation damage → census decline → more cuts → death spiral

### Municipal Fiscal Crisis
Factory closure → job losses → population exodus → property values↓ → tax revenue↓ → service cuts → more exodus → fiscal death spiral

### Academic Brain Drain
Low salaries → best faculty leave → reputation decline → student quality↓ → rankings↓ → harder to attract faculty → spiral continues

## Warning Signs

- Feedback multiplier exceeding 2.0
- Health approaching intervention threshold
- Multiple reinforcing factors active simultaneously
- Recovery efforts producing diminishing returns

## Issues Using This Primitive

- [[nursing-home-quality-collapse]]
- [[municipal-fiscal-crisis]]
- [[healthcare-cost-spiral]]
- [[academic-brain-drain]]
- [[rural-hospital-closure-cascade]]
- [[pension-fund-collapse]]

## Related Primitives

- [[feedback-loop]] - Death spirals are runaway reinforcing loops
- [[threshold-cascade]] - Point of no return is a critical threshold
- [[trust-erosion]] - Trust loss often feeds death spirals
- [[capacity-stress]] - Overload can initiate death spirals

---

*This primitive appears in 75 ARCHITECTURE files and models catastrophic system failures.*
