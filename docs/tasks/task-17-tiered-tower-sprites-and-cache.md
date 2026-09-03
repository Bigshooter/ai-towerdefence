# Task 17: Tiered Tower Sprite Generation & Cache Key Evolution

Part of `docs/features/tower-upgrade-visuals.md`.

## Problem
All towers currently use a static sprite regardless of level (`TOWER_STATS` base appearance). The sprite cache key only tracks `${type}:${size}:${frame}:${hasTarget ? 1 : 0}`, ignoring `level`. Upgraded towers look identical to level 1 towers.

## Files
- `src/visuals/SpaceSprites.ts`
- `src/entities/Tower.ts`
- `src/types.ts`

## Subtasks

### 17.1 Expand Sprite Cache Key
- Update `SpaceSprites.drawTower` and `SpaceSprites.createTowerSprite` signatures to accept `level: number`.
- Formulate the sprite cache key as:
  ```typescript
  const tier = level >= 4 ? 3 : level >= 2 ? 2 : 1;
  const key = `${type}:t${tier}:${size}:${frame}:${hasTarget ? 1 : 0}`;
  ```

### 17.2 Procedural Sprite Generation for All 5 Archetypes

#### 1. Archer (Kinetic Railgun)
- **Tier 1 (Lv. 1):** Single olive-green barrel, base cyber chassis.
- **Tier 2 (Lv. 2–3):** Twin reinforced composite rails, glowing emerald energy capacitor on housing.
- **Tier 3 (Lv. 4–5):** Triple gatling rail array with rotating hub, gilded trim, and illuminated neon green power lines.

#### 2. Cannon (Heavy Siege Artillery)
- **Tier 1 (Lv. 1):** Compact dark base with single cast-iron barrel.
- **Tier 2 (Lv. 2–3):** Reinforced blast-shield side panels, widened bore, glowing orange thermo-vents on breech.
- **Tier 3 (Lv. 4–5):** Dual heavy howitzer barrels with recoil pistons, glowing magma-orange core reactor.

#### 3. Sniper (Long-Range Quantum Beam)
- **Tier 1 (Lv. 1):** Slender long barrel with single cyan target lens.
- **Tier 2 (Lv. 2–3):** Extended telescoping barrel wrapped in cyan magnetic acceleration coils.
- **Tier 3 (Lv. 4–5):** Dual quantum rails with central floating plasma prism and gilded housing.

#### 4. Ice (Zero-Kelvin Cryo Pylon)
- **Tier 1 (Lv. 1):** Simple triangular frost crystal on dark pedestal.
- **Tier 2 (Lv. 2–3):** Multi-faceted sapphire crystal with flanking cryo shard mounts.
- **Tier 3 (Lv. 4–5):** Grand multi-tiered glacial spire with radiant ice spikes radiating from pedestal.

#### 5. Flamethrower (Plasma Projector)
- **Tier 1 (Lv. 1):** Single industrial nozzle and fuel chamber.
- **Tier 2 (Lv. 2–3):** Twin nozzles with pressurized copper fuel canisters glowing amber.
- **Tier 3 (Lv. 4–5):** Heavy tri-nozzle furnace with superheated white-hot core window and gilded plating.

### 17.3 Base Pedestal Trim & Rank Accents
- In `createTowerSprite`:
  - **Tier 1:** Standard dark alloy base ring.
  - **Tier 2:** Silver / cyan reinforced corner brackets.
  - **Tier 3:** Gilded gold trim with glowing corner nodes.

## Acceptance criteria
- `createTowerSprite` renders 3 distinct visual tiers for all 5 tower types.
- Sprites are cleanly cached under tier-aware keys without redundant re-renders.
- TypeScript compiler passes with `npx tsc --noEmit`.
