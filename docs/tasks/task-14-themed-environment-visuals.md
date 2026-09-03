# Task 14: Themed Environment Visuals & Sprites

Part of `docs/features/selectable-map-types.md`.

## Problem
All visual tiles, backdrop starfields, and portals currently use a space theme only. Dungeon and military maps need custom tile appearances, ambient backdrops, and styled path flow/portal indicators.

## Files
- `src/visuals/SpaceSprites.ts` (or create theme sprite modules e.g. `src/visuals/ThemeSprites.ts`)
- `src/map/TileMap.ts`

## Subtasks

### 14.1 Themed Backdrops
- **Space:** Animated cosmic starfield (existing).
- **Dungeon:** Dark textured stone floor with subtle ambient torchlight glow flickers.
- **Military:** Dusty desert terrain with tread marks, grid lines, and concrete runway markings.

### 14.2 Themed Tile Sprites
- Implement distinct procedural visual rendering per `MapType` for:
  - **Ground / Grass:** Metallic paneling (Space), cracked flagstone (Dungeon), dusty earth / tarmac (Military).
  - **Path:** Energy conduit / cyber runway (Space), cobblestone crypt floor (Dungeon), paved supply road with road markings (Military).
  - **Obstacles (Wall/Tree/Water):** Cyber barriers & coolant pools (Space), mossy brick columns & subterranean lava (Dungeon), sandbags, wire barricades, & muddy trenches (Military).

### 14.3 Themed Portals and Flow Indicators
- Customize the START / EXIT portal graphics and path flow chevrons to match the active map theme:
  - **Space:** Glowing sci-fi warp portals (green/red plasma rings).
  - **Dungeon:** Runic stone archways / crypt entrance & exit stairs.
  - **Military:** Checkpoint guard barricade / bunker hangar gate.

### 14.4 Wire into TileMap Rendering
- Update `TileMap.render(ctx)` to route backdrop, tile sprite, and portal rendering through the active theme renderer.

## Acceptance criteria
- Switching between maps renders clearly distinct visual themes at 60 FPS.
- Tile caches are properly keyed or separated per theme to avoid sprite bleed.
- Path flow chevrons and start/exit endpoints render clearly on all three map themes.
