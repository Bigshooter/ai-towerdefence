# Task 01: Propagate tower upgrade stats to projectiles

## Problem
Special upgrades have no effect. Ice's "Deep Freeze" boosts `tower.data.slowDuration` and Cannon's "Incendiary Rounds" boosts `tower.data.splashRadius`, but `Projectile` hardcodes `splashRadius: 40`, `slowFactor: 0.5`, `slowDuration: 2` based on projectile type. `Game.fireProjectile()` only passes `damage`.

## Files
- `src/entities/Projectile.ts`
- `src/main.ts` (`fireProjectile`)

## Fix
1. Extend the `Projectile` constructor to accept optional `splashRadius`, `slowFactor`, and `slowDuration` (e.g. via an options object), falling back to the current type-based defaults only when not provided.
2. In `Game.fireProjectile()`, pass `tower.data.splashRadius`, `tower.data.slowFactor`, and `tower.data.slowDuration` through to the projectile.
3. Ensure the splash-damage handling in `Game.update()` reads the projectile's actual `splashRadius` (it already does — verify no other hardcoded values remain).

## Acceptance criteria
- Upgrading a cannon with Incendiary Rounds increases the effective splash radius of its projectiles.
- Upgrading an ice tower with Deep Freeze increases the slow duration applied to enemies.
- Un-upgraded towers behave exactly as before.
