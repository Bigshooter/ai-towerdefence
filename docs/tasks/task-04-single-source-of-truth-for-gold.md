# Task 04: Make EconomySystem the single source of truth for gold

## Problem
Gold lives in two places: `gameData.gold` and `EconomySystem.gold`. Passive income is double-added (`EconomySystem.update()` adds to its internal gold *and* returns the amount, which `Game.update()` adds to `gameData.gold` again). Kill rewards and wave bonuses go to `gameData.gold` without `setGold()`, so the two values constantly drift.

## Files
- `src/system/EconomySystem.ts`
- `src/main.ts` (all `gameData.gold` mutations)

## Fix
1. Route every gold mutation through `EconomySystem` (`addGold`, `spendGold`); remove direct writes to `gameData.gold`.
2. Change `EconomySystem.update()` to either add internally and return the amount for display only, or return the amount without adding — pick one behaviour; do not do both.
3. Treat `gameData.gold` as a read-only mirror refreshed from `economySystem.getGold()` once per frame (for UI/window global consumers), or remove it entirely if the UI can call the economy system directly.

## Acceptance criteria
- Passive income grants exactly `periodicIncomeAmount` per interval (no double-count).
- Buying, upgrading, selling towers, kill rewards, and wave bonuses all reconcile: `economySystem.getGold()` always equals displayed gold.
- Existing Playwright economy tests still pass.
