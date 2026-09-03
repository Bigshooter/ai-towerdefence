# Task 18: Tower Render Pipeline & Real-Time Dynamic Effects

Part of `docs/features/tower-upgrade-visuals.md`.

## Problem
Tower rendering in `Tower.ts` only draws the static sprite, a generic target glow, and a text string (`Lv.X`). It lacks dynamic real-time effects (energy halos, rotating cryo shards, superheated plasma aura, level pip indicators) that make high-tier towers feel powerful and distinct during gameplay.

## Files
- `src/entities/Tower.ts`
- `src/visuals/SpaceSprites.ts`

## Subtasks

### 18.1 Update Tower Render Pipeline
- In `Tower.render(ctx)`:
  - Pass `this.data.level` to `SpaceSprites.drawTower`.
  - Pass the active animation time and frame counter.

### 18.2 Render Pedestal Level Pips
- In `Tower.render(ctx)` or `SpaceSprites.drawTower`:
  - Render 1 to 5 miniature glowing pips/gems along the bottom pedestal edge:
    - Levels 1–3: Cyan / amber pips.
    - Levels 4–5: Radiant gold / neon green pips.
  - Keep the font label `Lv.X` above the tower or enhance its styling for elite tiers (e.g. golden text with glow at Lv 5).

### 18.3 Dynamic Real-Time Archetype Effects
Enhance `SpaceSprites.drawTower` dynamic canvas overlays based on `level` and `hasTarget`:
- **Sniper (Tier 2/3):**
  - Tier 2: Pulsing holographic cyan targeting reticle with faint guide laser when targeting.
  - Tier 3: Concentric rotating holographic ring + beam targeting laser.
- **Flamethrower (Tier 2/3):**
  - Tier 2: Dual flickering amber pilot flames.
  - Tier 3: Radiant superheated heat-distortion corona around nozzle furnace.
- **Ice (Tier 2/3):**
  - Tier 2: 2 small procedural frost shards orbiting the crystal base (`Math.sin(time * 3)`, `Math.cos(time * 3)`).
  - Tier 3: 4 orbiting frost shards with pulsing sub-zero ground fog.
- **Cannon (Tier 2/3):**
  - Tier 2: Glowing thermo-vent exhaust pulses.
  - Tier 3: Magma core pulse and muzzle smoke venting when target acquired.
- **Archer (Tier 2/3):**
  - Tier 2: Capacitor power spark when target acquired.
  - Tier 3: Pulsing neon green power nodes and rapid muzzle flicker.

## Acceptance criteria
- All 5 tower types exhibit dynamic ambient or targeting visual feedback appropriate to their tier.
- Orbiting shards, targeting reticles, and energy pulses animate smoothly at 60 FPS without frame-rate dips.
- Level pips cleanly communicate level 1 through 5 on the tower base.
