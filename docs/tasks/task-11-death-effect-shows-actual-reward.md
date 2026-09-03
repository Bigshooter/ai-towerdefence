# Task 11: Death effect shows the actual gold reward

## Problem
The floating gold text on enemy death is hardcoded to `'+10'` in `Effect.render()`, regardless of the enemy's actual reward (5–100 gold).

## Files
- `src/main.ts` (`Effect` class, `addEffect`, death-handling in `update`)

## Fix
1. Add an optional `label`/`amount` parameter to `Effect` (constructor and `addEffect`).
2. When an enemy dies, pass `enemy.data.reward` so the death effect renders `+${reward}`.
3. Other effect types ('hit', 'explosion') pass nothing and are unaffected.

## Acceptance criteria
- Killing a normal enemy shows "+5"; a boss shows "+100" (scaled types show their configured reward).
- Hit and explosion effects render exactly as before.
