---
id: resource-depletion
title: Resource Depletion
type: primitive
pattern: "consumption > regeneration → scarcity → rationing → conflict"
usage_count: 80
related_primitives: [threshold-cascade, capacity-stress, exodus-migration]
---

# Resource Depletion

## Pattern

Resources have **stock** (current amount) and **flow** (consumption vs regeneration). When consumption exceeds regeneration, stocks deplete. Scarcity triggers rationing, price spikes, and conflict.

```
Stock
    │
Max ├────────────────╮
    │                 ╲ Consumption > Regeneration
    │                  ╲
30% ├───────────────────╲─── Scarcity threshold
    │                    ╲
10% ├─────────────────────╲─ Depletion threshold
    │                      ╲___
    └────────────────────────────► Time
```

## Key Mechanics

- **Stock/flow accounting**: Track current stock, consumption rate, regeneration rate
- **Resource types**: Non-renewable (oil), Renewable (fish), Conditionally renewable (aquifers)
- **Scarcity dynamics**: Price multiplier increases exponentially as stock depletes
- **Rationing**: Triggered when stock falls below scarcity threshold

## Resource Types

| Type | Regeneration | Examples |
|------|--------------|----------|
| Non-renewable | 0 | Oil, minerals, rare earths |
| Renewable | Stock-dependent | Fish, forests, soil |
| Conditional | Until threshold | Aquifers, antibiotics |

## Scarcity Effects

| Stock Level | Price Multiplier | Effect |
|-------------|------------------|--------|
| >30% | 1.0× | Normal market |
| 20-30% | 2-3× | Scarcity pricing |
| 10-20% | 5-7× | Rationing begins |
| <10% | 10×+ | Crisis/conflict |

## Examples

### Water Conflict (SW#07)
Aquifer consumption exceeds recharge → water table drops → wells fail → agricultural collapse → rural exodus → conflict over remaining supply

### Oil Depletion
Peak production → declining output → price spikes → economic disruption → geopolitical competition → resource wars

### Antibiotic Effectiveness
Overuse → resistance develops → effectiveness depletes → infections untreatable → post-antibiotic crisis

### Fishery Collapse
Overfishing → stock below recovery threshold → permanent collapse → coastal community devastation

## Warning Signs

- Stock approaching 30% of maximum
- Consumption rate exceeding regeneration
- Price volatility increasing
- Conflict over access emerging

## Issues Using This Primitive

- [[water-scarcity-conflict]]
- [[oil-depletion-crisis]]
- [[antibiotic-resistance-crisis]]
- [[fishery-collapse]]
- [[rare-earth-supply-crisis]]
- [[helium-shortage]]

## Related Primitives

- [[threshold-cascade]] - Depletion threshold triggers cascades
- [[capacity-stress]] - Scarcity creates capacity stress
- [[exodus-migration]] - Depletion drives migration
- [[capture-concentration]] - Scarcity enables capture

---

*This primitive appears in ~80 ARCHITECTURE files, modeling resource dynamics.*
