# Task 08: Delete dead code

## Problem
Several unused members clutter the codebase and mislead readers:

- `Tower.upgrade()` — computes `cost` and discards it; never called (UpgradeSystem/Game handle upgrades).
- `Game.enemiesRemaining` — assigned in `startNextWave()`, never read.
- `Projectile.targetId` — comment says "will be resolved on update"; never is.
- Legacy canvas render methods superseded by `SpaceSprites`: `Enemy.renderNormal/renderSpeed/...`, `Tower.renderArcher/renderCannon/renderSniper/...`.
- Duplicate off-screen bounds checks: both `Projectile.update()` and `Game.update()` kill off-screen projectiles — keep the one in `Projectile.update()`.
- Unused `WaveSystem` members (covered by Task 05 — skip here if that task is done first).

## Files
- `src/entities/Tower.ts`
- `src/entities/Enemy.ts`
- `src/entities/Projectile.ts`
- `src/main.ts`

## Fix
1. Search for references before deleting each item (some may be used by tests via window globals).
2. Delete the dead members and the duplicate bounds check in `Game.update()`.
3. Keep `Tower.getUpgradeCost()` — it is used by `UpgradeSystem`.

## Acceptance criteria
- No compile errors; no behaviour change.
- Playwright suite passes.
