---
id: queue-backlog
title: Queue & Backlog
type: primitive
pattern: "arrival > service → backlog grows → delays compound → outcomes degrade"
usage_count: 40
related_primitives: [capacity-stress, death-spiral, threshold-cascade]
---

# Queue & Backlog

## Pattern

When arrival rate exceeds service rate, backlogs grow. Waiting in queue degrades outcomes—people get sicker, infrastructure deteriorates, cases go stale. Unlike simple capacity stress, queue dynamics model the **accumulating damage from delay**.

```
        Queue Length
             │
    ┌────────┼────────────────────────┐
    │        │     ╱                  │
    │        │    ╱  Backlog growing  │
    │        │   ╱                    │
    │        │  ╱                     │
    │ ───────┼─────────────────────── │
    │ Stable │                        │
    │        │                        │
    └────────┼────────────────────────┘
             └────────────────────────► Time
```

## Key Mechanics

- **Little's Law**: Wait time (W) = Queue length (L) / Arrival rate (λ)
- **Queue states**: Clearing, Stable, Growing, Exploding
- **Service degradation**: Service rate falls under pressure
- **Outcome degradation**: Wait time causes harm (health, justice, maintenance)
- **Abandonment**: People leave queue without service

## Queue States

| State | Behavior | Characteristics |
|-------|----------|-----------------|
| Clearing | L↓ | Excess capacity |
| Stable | L≈ | Arrival ≈ service |
| Growing | L↑ | Arrival > service |
| Exploding | L↑↑ | Service degrading |

## Little's Law Application

```
Wait_time = Queue_length / Service_rate

Example: 1000 pending cases, 50 cases/week
Wait_time = 1000 / 50 = 20 weeks
```

## Examples

### Healthcare Waitlist
Surgery backlog grows → wait times increase → patients deteriorate → surgeries become more complex → service rate drops → backlog grows faster

### Immigration Backlog
Case processing < arrivals → years-long waits → applicants age out of categories → families separated → system legitimacy erodes

### Maintenance Backlog
Deferred repairs accumulate → small issues become big failures → emergency repairs displace planned maintenance → backlog grows exponentially

### Court System Delay
Case backlog → plea bargain pressure → wrongful convictions OR dismissals → justice delayed = justice denied

### Diagnostic Backlog
Test backlog → delayed diagnoses → diseases progress → worse outcomes → higher treatment costs → less capacity for prevention

## Outcome Degradation

| Wait Time | Outcome Impact |
|-----------|----------------|
| Normal | Baseline |
| 2× expected | -20% outcomes |
| 4× expected | -50% outcomes |
| 8× expected | -80% outcomes |

## Warning Signs

- Queue state transitioning to "Growing"
- Wait times exceeding outcome-safe thresholds
- Abandonment rate increasing
- Service rate declining under pressure

## Issues Using This Primitive

- [[healthcare-waitlist-crisis]]
- [[immigration-backlog]]
- [[infrastructure-maintenance-deficit]]
- [[court-system-delays]]
- [[diagnostic-backlog]]

## Related Primitives

- [[capacity-stress]] - Queues form when capacity stressed
- [[death-spiral]] - Backlog can trigger service death spiral
- [[threshold-cascade]] - Queue thresholds trigger cascades
- [[trust-erosion]] - Long waits erode system trust

---

*This primitive appears in ~40 ARCHITECTURE files, modeling delay dynamics.*
