# Plan: Pixel Art Tower Defense Game (Web)

## TL;DR
Build a browser-based pixel art tower defense game using vanilla JavaScript + HTML5 Canvas. Endless wave mode with increasing difficulty on a single static map. Features 4+ tower types, 5 enemy types, upgrade system, economy, and full audio. No save system needed.

---

## Steps

### Phase 1: Core Engine & Rendering
1. **Project setup** — Initialize TypeScript project with Vite + Canvas. Set up pixel-art rendering pipeline (fixed logical resolution scaled to window).
2. **Game loop** — Implement requestAnimationFrame-based game loop with delta-time accumulation for frame-rate independence.
3. **Tile map system** — Create a grid-based tile map (e.g., 40x30 tiles at 32px = 1280x960 logical). Define walkable terrain, walls, and the fixed enemy path as a waypoint array.
4. **Camera & viewport** — Implement camera that follows/clips to the game area. Pixel-art scaling with `image-rendering: pixelated`.

### Phase 2: Entity Systems
5. **Enemy system** — Base `Enemy` class with HP, speed, armor, regeneration stats. Subclasses for each type (Normal, Speed, Armored, Regenerating, Boss). Enemies follow the waypoint path.
6. **Tower system** — Base `Tower` class with range, damage, fireRate, target selection logic. Subclasses: Archer (single-target balanced), Cannon (AoE splash), Sniper (high dmg, slow), Ice (slow/debuff aura).
7. **Projectile system** — Base projectile with position, velocity, damage, effects (splash radius, slow field). Handles collision detection against enemies along its path.

### Phase 3: Gameplay Mechanics
8. **Wave system** — Endless wave generator that scales enemy count, HP, and speed per wave. Boss every 5th wave. Wave transition with brief pause for tower placement.
9. **Economy** — Gold earned per kill (scaled by enemy tier). Starting gold + periodic income. Gold displayed in HUD.
10. **Health/lives system** — Player starts with N lives. Each enemy reaching the end path costs 1 life. Game over at 0.
11. **Upgrade system** — Between waves: select tower → upgrade panel showing damage/range/fireRate upgrades and special ability unlocks (e.g., Cannon gets bigger splash, Ice gets freeze duration). Costs scale per level.

### Phase 4: UI & Art
12. **Pixel-art assets** — Create or source 32x32 sprite sheets for: towers (4 types), enemies (5 types + boss), projectiles, terrain tiles, UI elements. Use a consistent palette.
13. **HUD** — Top bar showing lives, gold, current wave number. Bottom panel for tower selection (build mode) and selected tower info/upgrade buttons. All pixel-art styled.
14. **Build mode** — Click-to-place towers on valid tiles. Preview range circle on hover. Cancel placement with right-click or Escape.

### Phase 5: Audio & Polish
15. **Sound effects** — SFX for: tower fire, projectile hit, enemy death, wave start, boss spawn, game over, UI clicks. Use short pixel-art style audio (chiptune aesthetic).
16. **Background music** — Looping chiptune BGM that intensifies slightly at higher waves (or use a single track).
17. **Visual polish** — Hit flash effects, damage numbers, enemy death animations, wave announcement text, screen shake on boss spawn or explosions.

### Phase 6: Game Flow & States
18. **Menu system** — Main menu with "Start Game" button. In-game pause (Escape). Game over screen with final wave reached and restart option.
19. **State management** — Game states: `MENU → PLAYING → PAUSED → WAVE_COMPLETE → GAME_OVER`. Clean transitions between states.

---

## Relevant Files

- `package.json` — Dependencies: vite, typescript, @types/node
- `tsconfig.json` — ES2022 target, strict mode, module resolution
- `vite.config.ts` — Canvas build config with pixelated image rendering
- `src/main.ts` — Entry point, initializes game canvas and starts loop
- `src/engine/` — Core systems (game loop, entity manager, collision)
  - `GameLoop.ts` — Delta-time game loop
  - `EntityManager.ts` — Entity lifecycle management
  - `CollisionSystem.ts` — Projectile-enemy overlap detection
- `src/map/` — Map and path data
  - `TileMap.ts` — Grid-based map rendering and collision
  - `Path.ts` — Waypoint path definition for enemies
- `src/entities/` — Game objects
  - `Enemy.ts` + subclasses (Normal, Speed, Armored, Regen, Boss)
  - `Tower.ts` + subclasses (Archer, Cannon, Sniper, Ice)
  - `Projectile.ts` — Base projectile with effects
- `src/systems/` — Gameplay logic
  - `WaveSystem.ts` — Endless wave generation and scaling
  - `EconomySystem.ts` — Gold management
  - `UpgradeSystem.ts` — Tower upgrade logic
  - `HealthSystem.ts` — Lives tracking, game over condition
- `src/ui/` — User interface
  - `HUD.ts` — Top bar (lives, gold, wave)
  - `BuildPanel.ts` — Tower selection and placement
  - `UpgradePanel.ts` — Selected tower upgrade UI
  - `MenuScreen.ts` — Main menu / game over screens
- `src/audio/` — Sound management
  - `AudioManager.ts` — BGM + SFX playback with volume control
- `assets/sprites/` — Pixel art sprite sheets (32x32)
- `assets/audio/` — Chiptune BGM and SFX files

---

## Verification

1. **Build & run** — `npm run dev` starts Vite dev server, game loads in browser at `localhost:5173`
2. **Core gameplay** — Place towers, enemies spawn on wave 1, follow path, get killed by towers, gold earned correctly
3. **Wave progression** — Waves scale indefinitely; boss appears every 5th wave; lives decrease when enemies reach end
4. **Upgrades** — Select placed tower between waves → upgrade panel shows options → stats change after confirming
5. **Audio** — BGM loops, SFX play on relevant events (fire, kill, wave start)
6. **UI** — All UI elements are pixel-art styled; build mode works with hover preview and click-to-place
7. **Game over** — Lives reach 0 → game over screen shows final wave; restart works

---

## Decisions

- **Endless mode only** (no campaign/levels) — infinite waves with scaling difficulty
- **Single static map** — one fixed path, no level selection or procedural generation
- **No save system** — pure arcade experience, no persistence needed
- **Vanilla JS + Canvas** — no game framework (Phaser, PixiJS), keeping dependencies minimal and code transparent
- **TypeScript** for type safety across entity systems and component interfaces
- **32x32 pixel art** as the base sprite size for consistency across towers, enemies, and UI

---

## Sprite Asset Specification

All sprites use a **classic 16-color NES palette** (high contrast, retro feel). Base sprite size is **32×32 pixels**. Each entity includes idle, attack/walk, and death animations where applicable.

### Color Palette Reference (NES-style)

| Role | Colors |
|------|--------|
| Greens (grass/terrain) | #0F6F0F, #1FA81F, #3DC83D, #5FE85F |
| Browns (path/wood) | #8B5E2A, #A0724A, #C49A6C, #D4B896 |
| Blues (ice/water) | #1A3A6E, #2E5CA8, #4A8FE8, #7EC8FF |
| Reds (fire/damage) | #8B0000, #CC2200, #FF4444, #FF8888 |
| Yellows/Golds (gold/lightning) | #8B6914, #D4A017, #FFD700, #FFFACD |
| Purples (magic) | #4B0082, #7B2FBE, #A855F7, #D8B4FE |
| Grays (metal/armor) | #3A3A3A, #6E6E6E, #9E9E9E, #C8C8C8 |
| Neutrals (skin/background) | #1A1A2E, #3D3D5C, #F5E6CC, #FFFFFF |

---

### TOWERS (4 types × 3 animations each = 12 sprites)

#### 1. Archer Tower — `archer_tower.png`
- **Idle frame:** A small wooden watchtower (3-story structure). Brown wood base (#8B5E2A), gray stone foundation (#6E6E6E), green thatched roof (#3DC83D). A tiny archer figure stands on top, facing right, holding a bow.
- **Attack frame:** Same tower, but the archer is now leaning back drawing the bowstring. Arrow visible nocked and aimed forward-right. Slight motion blur lines behind arrow.
- **Build/placeholder:** Gray outline of the tower structure with a question mark overlay (for build mode preview).

#### 2. Cannon Tower — `cannon_tower.png`
- **Idle frame:** A stone bastion (#9E9E9E) with a large iron cannon (#3A3A3A) mounted on top, barrel pointing right. Red plume/flag on top (#CC2200). Small smoke wisps rising from cannon barrel.
- **Attack frame:** Cannon recoiling backward (shifted 2px left), muzzle flash (#FFD700 + #FFFACD) at barrel tip, small explosion cloud (#C8C8C8 + white). Cannonball visible mid-flight.
- **Build/placeholder:** Gray outline with question mark overlay.

#### 3. Sniper Tower — `sniper_tower.png`
- **Idle frame:** A tall thin spire (#4A8FE8) with a crystal lens at the top (#7EC8FF). Purple magical energy swirls around the lens (#A855F7). Dark purple base (#4B0082). Sleek, elegant design.
- **Attack frame:** Crystal lens glowing bright white (#FFFFFF), thin laser beam extending from lens to the right (yellow-white gradient line). Energy particles trailing along beam path.
- **Build/placeholder:** Gray outline with question mark overlay.

#### 4. Ice Tower — `ice_tower.png`
- **Idle frame:** An ice crystal formation (#7EC8FF) on a blue stone base (#1A3A6E). Snowflakes gently falling around it (small white diamond shapes). Frost crystals growing on the ground at its base (#FFFFFF with light blue tint).
- **Attack frame:** Ice tower pulsing brighter, expanding ring of frost emanating outward from base (concentric light-blue circles). Snowflake particles flying outward.
- **Build/placeholder:** Gray outline with question mark overlay.

---

### ENEMIES (5 types × 3 animations each = 15 sprites)

#### 1. Normal Enemy — `enemy_normal.png`
- **Idle/walk frame:** A small goblin-like creature (#3DC83D body, #F5E6CC face). Round body, two stubby legs, tiny arms raised. Simple angry eyes (#1A1A2E). Slight bounce pose (one foot forward).
- **Walk cycle (2 frames):** Frame 1 — left foot forward, body leaning slightly right. Frame 2 — right foot forward, body leaning slightly left. Same colors.
- **Death frame:** Falling backward, X-shaped eyes (#FF4444), limbs splayed outward, small "poof" dust cloud at feet (#C8C8C8).

#### 2. Speed Enemy — `enemy_speed.png`
- **Idle/walk frame:** A thin, wiry rat-person (#A0724A body, #D4B896 belly). Long tail trailing behind, pointed ears, quick darting eyes (#FF4444). Streamlined body shape suggesting speed. Motion lines behind it.
- **Walk cycle (2 frames):** Frame 1 — legs spread wide in a running pose, body horizontal. Frame 2 — legs crossed, body slightly tilted forward. More motion lines than normal enemy.
- **Death frame:** Curling into a ball, stars circling head (#FFD700), small dust puff at feet.

#### 3. Armored/Tank Enemy — `enemy_armored.png`
- **Idle/walk frame:** A large armored knight (#6E6E6E armor, #8B0000 cape). Bulky rectangular body shape, helmet with visor (#3A3A3A), shield on left arm (#C8C8C8). Slow, heavy stance — both feet planted.
- **Walk cycle (2 frames):** Frame 1 — right foot lifting high (slow stomp). Frame 2 — left foot slamming down, small ground crack effect (#8B5E2A). Very subtle body sway.
- **Death frame:** Armor cracking (#FF4444 cracks), one arm falling off (#C8C8C8), helmet tipping forward, slow fall to knees.

#### 4. Regenerating Enemy — `enemy_regenerating.png`
- **Idle/walk frame:** A purple slime/ooze creature (#A855F7 body, #D8B4FE highlights). Amorphous blob shape with two eyes (#1A1A2E) and a small mouth. Green healing particles (+ symbols in #3DC83D) floating around it.
- **Walk cycle (2 frames):** Frame 1 — blob stretching upward slightly, bottom bulging left. Frame 2 — blob stretching right, bottom bulging left. Fluid, wobbly animation.
- **Death frame:** Splitting into two smaller blobs that fade out (#D8B4FE → transparent), green healing particles turning red (#FF4444) then dissipating.

#### 5. Boss Enemy — `enemy_boss.png`
- **Idle/walk frame:** A massive dragon-like creature (#CC2200 body, #FF4444 wings). Towering presence — fills most of a 32×32 sprite. Horns (#C8C8C8), glowing eyes (#FFD700), spiked tail. Standing on hind legs, front claws raised.
- **Walk cycle (2 frames):** Frame 1 — left claw raised high, tail swiping right. Frame 2 — right claw raised, tail swiping left. Ground tremor lines beneath feet.
- **Death frame:** Collapsing forward, wings folding in, body cracking with internal fire (#FFD700), large explosion at death point.

---

### PROJECTILES (4 types)

#### 1. Arrow — `projectile_arrow.png`
- Single sprite: Brown shaft (#8B5E2A) with gray tip (#C8C8C8), fletching feathers at back (#F5E6CC). Slight motion blur trail behind it.

#### 2. Cannonball — `projectile_cannonball.png`
- Single sprite: Dark iron sphere (#3A3A3A) with highlight dot (#6E6E6E). Small smoke trail (2-3 gray circles fading out) behind it.

#### 3. Laser Beam — `projectile_laser.png`
- Single sprite: Thin bright line (#FFFFFF core, #7EC8FF glow around it). Energy particles at tip. No trail needed — instant hit feel.

#### 4. Ice Crystal — `projectile_ice.png`
- Single sprite: Diamond-shaped ice crystal (#7EC8FF) with white highlight (#FFFFFF). Small snowflake pattern etched into surface. Frost particles trailing behind.

---

### TERRAIN TILES (6 tiles for map)

| Tile | Description | Size |
|------|-------------|------|
| `tile_grass` | Dark green grass base (#0F6F0F) with lighter green tufts (#3DC83D) scattered randomly. Subtle texture variation. | 32×32 |
| `tile_path` | Dirt path (#A0724A) with darker patches (#8B5E2A) for wear. Slightly uneven edges where it meets grass. | 32×32 |
| `tile_wall` | Stone wall (#6E6E6E) with mortar lines (#3A3A3A). Some moss growth at bottom (#1FA81F). Solid, impassable look. | 32×32 |
| `tile_water` | Blue water (#2E5CA8) with lighter wave highlights (#4A8FE8) in horizontal stripes. Subtle shimmer effect. | 32×32 |
| `tile_tree` | Tree: brown trunk (#8B5E2A) + round green canopy (#1FA81F, #3DC83D). Used as decorative obstacle. | 32×32 |
| `tile_road_edge` | Edge of path where it meets grass — transitional tile with grass on one side and dirt on the other. Helps map readability. | 32×32 |

---

### UI ELEMENTS (pixel-art styled)

| Element | Description | Size |
|---------|-------------|------|
| `icon_gold` | Gold coin: yellow circle (#FFD700) with "$" symbol in darker gold (#8B6914). Small shine highlight. | 16×16 |
| `icon_heart` | Red heart (#CC2200) with darker red outline (#8B0000). Represents lives. | 16×16 |
| `icon_wave` | Number badge: dark circle (#1A1A2E) with white wave number text. | 16×16 |
| `btn_tower_archer` | Small tower icon for build panel: miniature archer tower (32×32 preview). | 32×32 |
| `btn_tower_cannon` | Small tower icon for build panel: miniature cannon tower. | 32×32 |
| `btn_tower_sniper` | Small tower icon for build panel: miniature sniper spire. | 32×32 |
| `btn_tower_ice` | Small tower icon for build panel: miniature ice crystal. | 32×32 |
| `btn_upgrade` | Green upgrade button (#3DC83D) with "+" symbol in white. Rounded pixel corners. | 24×24 |
| `btn_sell` | Red sell button (#CC2200) with "$" in yellow. | 24×24 |
| `panel_background` | Semi-transparent dark panel (#1A1A2E at 80% opacity) with gray border (#6E6E6E). Used for upgrade panels and menus. | Variable (64-128 wide) |
| `btn_start` | Large "START" button: brown wood texture (#A0724A) with gold lettering (#FFD700). Pixel-art styled. | 96×32 |
| `btn_pause` | Pause icon: two vertical bars (#FFFFFF) on dark background. | 16×16 |

---

### EFFECTS & PARTICLES

| Effect | Description | Size |
|--------|-------------|------|
| `hit_flash` | White flash circle (#FFFFFF) with yellow edge (#FFD700). Used when projectile hits enemy. | 16×16 |
| `explosion_small` | Small explosion: orange center (#FF4444) fading to yellow edges (#FFD700), gray smoke ring outside. | 24×24 |
| `explosion_large` | Large explosion (boss/cannon): red core → orange → yellow → white outer ring, with debris particles. | 32×32 |
| `slow_field` | Blue circular aura (#4A8FE8) with falling snowflake particles (#FFFFFF). Shows Ice tower slow effect area. | 32×32 (animated) |
| `death_poof` | Small dust cloud: gray circles fading to transparent, with a "+10" gold text floating up in yellow. | 24×24 |
| `damage_number` | White number (#FFFFFF) with black outline showing damage dealt. Floats upward from hit point. | Variable width |

---

### SPRITE SHEET LAYOUT RECOMMENDATION

For efficient loading, organize sprites into sheets:
