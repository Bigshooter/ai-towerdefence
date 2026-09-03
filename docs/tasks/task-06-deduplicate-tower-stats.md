# Task 06: Deduplicate tower stats

## Problem
Tower base stats are defined twice: `TOWER_STATS` in `src/entities/Tower.ts` and an inline `towerStats` record in `Game.placeTower()`. They already disagree (the main.ts copy omits `splashRadius`/`slowFactor`/`slowDuration`), and any balance change must be made in two places.

## Files
- `src/entities/Tower.ts`
- `src/main.ts` (`placeTower`)

## Fix
1. Export `TOWER_STATS` (or a `getTowerStats(type)` helper) from `Tower.ts`.
2. In `placeTower()`, import and use it for the cost check; delete the inline record.

## Acceptance criteria
- Tower costs and stats come from exactly one definition.
- Placement cost checks behave identically (archer 50, cannon 100, sniper 150, ice 75, flamethrower 250).
