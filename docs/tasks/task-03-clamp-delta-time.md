# Task 03: Clamp delta time in GameLoop

## Problem
`GameLoop.tick()` computes `dt` from raw frame timestamps with no cap. When the tab is backgrounded, `requestAnimationFrame` pauses; on return `dt` can be many seconds — enemies teleport past waypoints (skipping the `dist < 4` arrival check) and projectiles jump through enemies.

## Files
- `src/engine/GameLoop.ts`

## Fix
1. Clamp `dt` in `tick()`: `const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);`
2. Remove or fix the unused `deltaTime` getter (it recomputes from `performance.now()` and is misleading) — delete if nothing references it.

## Acceptance criteria
- Switching away from the tab for 30+ seconds and returning does not cause enemies to skip path segments or projectiles to tunnel through targets.
- Normal gameplay timing is unchanged (clamp only engages above 100 ms frames).
