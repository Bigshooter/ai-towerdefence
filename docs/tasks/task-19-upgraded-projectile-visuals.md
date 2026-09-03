# Task 19: Upgraded Projectile & Muzzle Flash Visual Variations

Part of `docs/features/tower-upgrade-visuals.md`.

## Problem
Projectiles fired by upgraded towers look identical to baseline projectiles. Attacks from high-tier towers (e.g. Lv. 5 Gatling Archer or Magma Howitzer Cannon) lack punch and visual impact matching their enhanced damage and splash.

## Files
- `src/visuals/SpaceSprites.ts`
- `src/entities/Projectile.ts`
- `src/entities/Tower.ts`
- `src/types.ts`

## Subtasks

### 19.1 Pass Upgrade Tier / Level to Projectiles
- In `src/entities/Projectile.ts`:
  - Add optional `level?: number` (or `tier?: number`) to `ProjectileOptions` and `ProjectileData`.
- In `src/entities/Tower.ts` (or firing logic in `main.ts`):
  - Pass `tower.data.level` into the projectile spawn constructor.

### 19.2 Procedural Visual Evolution for Projectiles in SpaceSprites
- Update `SpaceSprites.drawProjectile` to accept `level: number = 1`.
- Expand projectile visuals across tiers:
  - **Archer (Arrow / Kinetic Bolt):**
    - Tier 1: Slender kinetic needle.
    - Tier 2: Double-pronged energized green bolt with light particle trail.
    - Tier 3: Triple-prong hyper-velocity bolt with pulsing neon green plasma trail.
  - **Cannon (Cannonball / Explosive Shell):**
    - Tier 1: Standard metallic shell.
    - Tier 2: Incendiary shell wrapped in orange flame aura with smoke puffs.
    - Tier 3: Superheated magma core shell with trailing embers and shockwave ring.
  - **Sniper (Laser Beam):**
    - Tier 1: Slender cyan laser beam.
    - Tier 2: Dual-frequency accelerated beam with brighter white core.
    - Tier 3: Broad prismatic quantum beam with rotating magnetic particle rings.
  - **Ice (Cryo Shard):**
    - Tier 1: Single ice crystal.
    - Tier 2: Cluster of sharp crystalline shards with frost trail.
    - Tier 3: Glacial comet surrounded by rotating frost motes.
  - **Flamethrower (Flame / Plasma Jet):**
    - Tier 1: Standard orange flame burst.
    - Tier 2: Dense dual-tone orange/amber high-pressure stream.
    - Tier 3: Blue/white superheated plasma jet stream with high-intensity distortion.

## Acceptance criteria
- Projectiles fired from upgraded towers render visually distinct enhanced trails and sprites.
- Projectile cache keys cleanly incorporate tier/level without excessive allocations.
- Frame rate remains smooth during heavy projectile combat.
