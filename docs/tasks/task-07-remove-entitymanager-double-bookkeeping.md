# Task 07: Remove EntityManager double bookkeeping

## Problem
`Game` keeps typed arrays (`enemies`, `towers`, `projectiles`, `effects`) and mirrors every add/remove into `EntityManager`, whose `update()` is an empty loop. Two collections tracking the same entities is divergence risk with no benefit.

## Files
- `src/engine/EntityManager.ts`
- `src/main.ts`

## Fix
1. Remove `EntityManager` usage from `Game` (adds, removes, `cleanup()`, and the resets in `startNewGame`/`resetToMenu`); the typed arrays plus their `.filter(e => e.alive)` cleanup already do the job.
2. Delete `EntityManager.ts` if nothing else references it (verify with a workspace search), or keep it only if a future task genuinely needs a unified registry.

## Acceptance criteria
- Game compiles and plays identically with a single collection per entity kind.
- No dangling imports or references to `EntityManager`.
