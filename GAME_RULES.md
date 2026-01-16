# Game Requirements & Rules

## Core Gameplay Principles

### 1. Evolution Size Progression
**Rule:** When entering a new World Stage (Prestige/Reset), the player's size resets to a base scale (1.0). In this new context, **all entities from previous evolutionary stages must be strictly smaller than the player's new base size.**

**Specific Constraint:**
> "Stage N Level 1 body size must be significantly larger than Stage N-1 Level 5 body size."

This ensures that even after the world scale is reset (making the Player small again), the relative hierarchy of nature is preserved. A Spider (Stage 5) should always feel larger than a Cockroach (Stage 4), even if the Spider is technically "Level 1" in a defined "New World".

**Implementation Implications:**
- When the World Resets (Zoom/Scale reset), a global `worldScaleDivisor` must be calculated.
- `worldScaleDivisor` = `(Original Stage Start Scale) / (New Base Scale [1.0])`.
- All newly spawned entities must have their canonical scales divided by this `worldScaleDivisor`.
- This ensures that a Stage 4 Cockroach (Scale 5.5) becomes `5.5 / 6.5 = ~0.85`, which is visibly smaller than the Stage 5 Spider (Scale 1.0).

### 2. Evolution Stages (Reference)
- Stage 0: Primitive (Scale 0.4 - 0.6)
- Stage 1: Ant (Scale 0.6 - 1.0)
- Stage 2: Ladybug (Scale 1.2 - 1.8)
- Stage 3: Pillbug (Scale 2.0 - 3.0)
- Stage 4: Cockroach (Scale 3.5 - 5.5)
- Stage 5: Spider (Scale 6.5 - 10.0) -> Triggers World Reset to Scale 1.0
- Stage 6: Mantis (Scale 12.0 - 18.0)
