# Feature: Selectable Map Types & Themed Environments

## Summary

Expand the game from a single fixed space map to three distinct, selectable maps with unique visual themes, custom tile aesthetics, and dedicated enemy path layouts. Players can choose their preferred map from the start menu alongside the difficulty setting before launching a run.

## Map Themes & Path Designs

### 1. Space Station (Default / Existing)
- **Theme & Atmosphere:** Deep cosmic void, starfield backdrop, metal platform grid, glowing energy conduits, cyber-barriers.
- **Path Layout:** Classic winding serpentine traversal from the upper-left docking bay across orbital solar arrays to the bottom-right escape portal.
- **Strategic Profile:** Balanced spacing with broad tower coverage zones and long straightaways for snipers and archers.

### 2. Dungeon Catacombs
- **Theme & Atmosphere:** Dark stone crypt, flagstone corridors, torchlight flickers, subterranean lava/water moats, ancient cracked brick walls.
- **Path Layout:** Winding subterranean maze with sharp 90-degree chokepoints, narrow hall switchbacks, and fortified central chamber bends.
- **Strategic Profile:** Tight corners and condensed corridors ideal for cannon splash damage and ice tower area slows.

### 3. Military Trench & Outpost
- **Theme & Atmosphere:** Desert combat outpost / forward operating base, reinforced sandbags, asphalt supply roads, wire fences, bunker emplacements.
- **Path Layout:** Perimeter sweep route entering from north checkpoints, navigating perimeter defenses, cutting through the central runway, and exiting at the command bunker.
- **Strategic Profile:** Extended outer perimeter turns followed by a central fast dash, challenging players to manage high-speed units across multiple defense zones.

---

## User Interface & Selection Flow

1. **Menu Selection:**
   - Add an interactive **Map Selector** on the menu / pre-game screen (dropdown or toggle buttons matching the existing difficulty selector design).
   - Display map title, short description, and strategic recommendation for each selection.
2. **Pre-Game State:**
   - Selected map dynamically updates the background map preview or sets the active map layout.
   - Selection persists across restarts or resets to the last chosen map.
3. **Run Launch:**
   - When clicking **START**, `UIManager.onStartGame` passes both `difficulty` and `mapType` (e.g. `'space' | 'dungeon' | 'military'`) to `Game.startNewGame()`.

---

## Technical Architecture

### 1. Types (`src/types.ts`)
- Define `MapType`:
  ```typescript
  export type MapType = 'space' | 'dungeon' | 'military';
  ```
- Define `MapDefinition`:
  ```typescript
  export interface MapDefinition {
    id: MapType;
    name: string;
    description: string;
    layout: number[][];
    backgroundColor: string;
  }
  ```

### 2. Map System (`src/map/TileMap.ts` & Map Layouts)
- Refactor `TileMap` to accept a `MapType` or `MapDefinition` on initialization/load.
- Store map matrices and path waypoints for each of the 3 maps:
  - `SPACE_MAP_LAYOUT`
  - `DUNGEON_MAP_LAYOUT`
  - `MILITARY_MAP_LAYOUT`
- Dynamically calculate start position, exit position, and waypoints for each map geometry.

### 3. Visuals & Theming (`src/visuals/`)
- Extend the sprite and backdrop rendering system to render theme-specific tiles:
  - **Space:** Starfield backdrop, metallic hull floor, energy walls, solar arrays.
  - **Dungeon:** Dark stone floor, cobblestone path, mossy brick walls, lava moats.
  - **Military:** Dusty tarmac / dirt roads, sandbags, camouflage bunkers, metal fencing.
- Update start/exit portals and path flow indicator styling to match each theme.

### 4. Game Orchestration (`src/main.ts`)
- `Game.startNewGame(difficulty, mapType)` initializes `TileMap` with the chosen `mapType`.
- Cache waypoints for enemy navigation based on the selected map.
- Handle map resets cleanly when transitioning back to the menu.

### 5. UI Manager (`src/ui/UIManager.ts`)
- Add `selectedMap: MapType` and map dropdown / button controls in the menu screen.
- Render map selection UI alongside difficulty controls.
- Add getter methods for test automation (`getSelectedMap()`, `getShowMapDropdown()`).

---

## Test & Acceptance Criteria

1. **Map Selection:**
   - Player can toggle/select between Space, Dungeon, and Military maps from the menu screen.
   - Starting the game loads the chosen map geometry, theme visuals, and path waypoints.
2. **Path & Enemy Traversal:**
   - Enemies spawn at the specific map's START portal, follow the custom path without clipping, and exit at the EXIT portal.
   - All buildable tiles match the active map layout; tower placement restrictions respect map walls and paths.
3. **Rendering & Performance:**
   - Each map renders distinct background, tile sprites, and portal designs smoothly at 60 FPS without memory leaks.
4. **Test Suite:**
   - Playwright end-to-end tests verify map selection interaction, distinct tile layouts, and enemy waypoint traversal across all three maps.
