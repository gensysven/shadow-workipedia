---
id: capacity-stress
title: Capacity Stress
type: primitive
pattern: "utilization↑ → degradation → overflow → cascade failure"
usage_count: 49
related_primitives: [threshold-cascade, death-spiral, queue-backlog]
---

# Capacity Stress

## Pattern

Systems under high utilization degrade in quality and eventually fail. Unlike simple thresholds, capacity stress models the **progressive deterioration** as systems approach and exceed their limits.

```
Quality
    │
1.0 ├────────────╮
    │             ╲ Normal
0.8 ├──────────────╲────────
    │               ╲ Stressed
0.5 ├────────────────╲──────
    │                 ╲ Critical
0.2 ├──────────────────╲────
    │                   ╲ Overload
    └────────────────────────► Utilization
         70%  85%  100%  120%
```

## Key Mechanics

- **Utilization states**: Normal (<70%), Stressed (70-85%), Critical (85-100%), Overload (>100%)
- **Stress multiplier**: Quality degradation accelerates at higher utilization
- **Overflow cascade**: Excess demand cascades to other systems
- **Recovery lag**: Systems need time below threshold to recover

## Stress Multipliers by State

| State | Utilization | Stress Multiplier | Effect |
|-------|-------------|-------------------|--------|
| Normal | <70% | 1.0× | Full quality |
| Stressed | 70-85% | 1.3× | Minor degradation |
| Critical | 85-100% | 2.5× | Significant degradation |
| Overload | >100% | 5.0× | Cascading failures |

## Examples

### Hospital ICU Capacity
Normal operations → flu season surge → 85% capacity → diversions begin → remaining hospitals overload → mortality +250% → cascade failures across region

### Power Grid Stress
Summer demand climbs → grid at 95% → rolling blackouts → demand spikes on restored areas → cascade failures → regional blackout

### Highway Congestion
Traffic builds → 85% capacity → speeds drop → minor incidents cause major backups → cascade to alternate routes → gridlock

### Server Infrastructure
Load increases → 90% CPU → response times degrade → timeouts → retry storms → cascade failure

## Warning Signs

- Utilization consistently above 70%
- Quality metrics declining
- Overflow events increasing
- Recovery periods shortening
- Staff burnout indicators rising

## Issues Using This Primitive

- [[hospital-capacity-crisis]]
- [[power-grid-vulnerability]]
- [[traffic-congestion-cascade]]
- [[server-infrastructure-collapse]]
- [[emergency-services-overload]]
- [[housing-market-stress]]

## Related Primitives

- [[threshold-cascade]] - 85% utilization is a critical threshold
- [[death-spiral]] - Prolonged overload initiates death spirals
- [[queue-backlog]] - Excess demand creates backlogs
- [[feedback-loop]] - Degradation can create reinforcing loops

---

*This primitive appears in 49 ARCHITECTURE files, particularly healthcare and infrastructure.*
