# Feature: Dynamic Visual Evolution for Tower Upgrades

## Summary

Enhance the game's visual clarity and player feedback by transforming tower sprites and ambient rendering when towers are upgraded. Currently, towers at level 1 and level 5 look virtually identical aside from a small text label (`Lv.X`). This feature introduces distinct visual progression for each tower type across upgrade levels (or tiers), allowing players to instantly assess their defensive strength and tower specializations at a glance across the entire battlefield.

---

## Goals

1. **Glanceable Battlefield Awareness:** Players can instantly identify tower levels and upgraded status without clicking or reading text labels.
2. **Distinct Archetype Evolution:** Each tower archetype (Archer, Cannon, Sniper, Ice, Flamethrower) gains progressive visual enhancements (heavier chassis, extra barrels, glowing coils, crystal facets, energy crowns).
3. **Tiered Visual Hierarchy:** Visuals scale systematically across 3 main evolutionary tiers (Tier 1 / Base: Lv. 1, Tier 2 / Advanced: Lv. 2–3, Tier 3 / Elite / Master: Lv. 4–5).
4. **Performance & Memory Efficiency:** Sprite variations are generated procedurally on HTML5 canvas elements and cached via composite cache keys without causing frame drops or garbage collection spikes.

---

## Visual Progression by Tower Archetype

### 1. Archer (Rapid Pulse / Kinetic Turret)
*Theme: Sleek, high-frequency kinetic accelerator with multi-rail emitters.*

- **Tier 1 (Level 1):** Single slender barrel with standard olive/cyber chassis; minimal recoil flash.
- **Tier 2 (Levels 2–3):** Twin reinforced composite rails, glowing emerald energy capacitor on the housing, subtle muzzle flare when targeting.
- **Tier 3 (Levels 4–5):** Triple gatling rail array with rotating barrel hub, pulsing hyper-velocity neon green particle emitters, gilded chassis accents.

### 2. Cannon (Heavy Artillery / Siege Mortar)
*Theme: Massive heavy-metal siege artillery with explosive blast shields.*

- **Tier 1 (Level 1):** Standard single cast-iron barrel and compact box base.
- **Tier 2 (Levels 2–3):** Widened bore with heavy blast plating on the flanks; orange thermo-exhaust vents glowing on the breech.
- **Tier 3 (Levels 4–5):** Dual heavy howitzer barrels with spiked recoil shock-absorbers, glowing magma-orange core reactor, pulsing thermal smoke/venting aura on fire.

### 3. Sniper (Long-Range Railgun / Quantum Beam)
*Theme: High-tech precision particle rifle with telescoping optics and beam focus lenses.*

- **Tier 1 (Level 1):** Slender long barrel with single cyan target lens atop a dark chassis.
- **Tier 2 (Levels 2–3):** Extended telescoping barrel wrapped with illuminated magnetic acceleration coils; holographic cyan targeting reticle above the lens.
- **Tier 3 (Levels 4–5):** Dual quantum rails with central floating plasma prism; shimmering cyan energy discharge halo and prismatic targeting laser array.

### 4. Ice (Cryo Emitter / Zero-Kelvin Pylon)
*Theme: Crystalline arcane-tech pylon with floating frost shards.*

- **Tier 1 (Level 1):** Single triangular frost crystal atop a dark metal base.
- **Tier 2 (Levels 2–3):** Multi-faceted glowing sapphire crystal surrounded by 2 small orbiting cryo shards; pulsing frost mist at the pedestal.
- **Tier 3 (Levels 4–5):** Giant multi-tiered glacial spire with 4 rotating frozen shards, cold-light aura corona, and radiant ice spikes radiating from the platform base.

### 5. Flamethrower (Plasma Projector / Inferno Core)
*Theme: Heavy industrial fuel furnace with pressurized high-heat projectors.*

- **Tier 1 (Level 1):** Single industrial nozzle and fuel chamber.
- **Tier 2 (Levels 2–3):** Reinforced twin nozzles with pressurized copper fuel tanks glowing amber; pilot flame ignition flicker.
- **Tier 3 (Levels 4–5):** Heavy tri-nozzle furnace with superheated white-hot core window, heat-distortion radiance aura, and gilded industrial plating.

---

## Visual Indicators & Accents

Beyond the weapon sprites, all upgraded towers receive standard cosmetic status indicators:

1. **Base Pedestal Trim / Rank Badges:**
   - **Level 1:** Standard dark alloy base.
   - **Level 2–3:** Silver/bronze reinforced corner brackets and trim lines.
   - **Level 4–5:** Gold filigree trim with glowing corner power nodes.
2. **Energy Core / Pips:**
   - Level pips (1–5 illuminated gems/dots) integrated onto the tower pedestal beneath the sprite.
3. **Aura & Idle Effects (Tier 3 / Max Level):**
   - Subtle procedural canvas sine-wave glow or particle sparks matching the element (green sparks for Archer, smoke for Cannon, cyan pulse for Sniper, frost sparkles for Ice, fire embers for Flamethrower).

---

## Technical Architecture

### 1. Sprite Cache Key Update
In `SpaceSprites.ts`, extend the sprite cache key to incorporate the tower level (or tier index):
```typescript
const key = `${type}:${level}:${size}:${frame}:${hasTarget ? 1 : 0}`;
```

### 2. Tower Rendering Pipeline
- In `SpaceSprites.drawTower`:
  - Pass `level: number` into `drawTower(...)` and `createTowerSprite(...)`.
  - Check cached sprite for `${type}:${level}:${size}:${frame}:${hasTarget ? 1 : 0}`.
  - Draw level-appropriate chassis, barrel count, coil overlays, and trim details.
  - Render tier-specific dynamic canvas effects (e.g. enhanced targeting reticles, energy halos, heat glows).
- In `Tower.ts`:
  - Update `this.render(ctx)` to pass `this.data.level` into `SpaceSprites.drawTower`.

### 3. Upgrade State Integration
- In `UpgradeSystem.ts`:
  - When `apply(tower)` increments `tower.data.level` or unlocks archetype special abilities, the next render pass automatically requests the upgraded sprite key and displays the updated visual.

---

## Test & Acceptance Criteria

1. **Sprite Distinction:**
   - Placing a tower renders its default Level 1 appearance.
   - Upgrading a tower to Level 2/3 noticeably changes barrel counts, coils, and base trim.
   - Upgrading a tower to Level 4/5 applies elite tier visual elements (gold accents, multi-barrel/spire geometry, and radiant glow).
2. **Performance & Caching:**
   - All sprite variations are cached in `SpaceSprites.towerCache`. Canvas creations only occur once per unique `(type, level, size, frame, hasTarget)` combination.
   - Game maintains stable 60 FPS rendering with full boards of max-level towers.
3. **Automated Verification:**
   - Playwright test verifies tower visual progression upon upgrade actions and ensures level upgrades reflect both in data and on-screen rendering.
