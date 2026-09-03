# Task 15: Map Selection UI & Main Game Integration

Part of `docs/features/selectable-map-types.md`.

## Problem
The menu screen currently only allows selecting the difficulty level ('easy' | 'medium' | 'hard'). The player needs a way to select the map type on the menu screen, preview it, and launch a game with the selected map.

## Files
- `src/ui/UIManager.ts`
- `src/main.ts`

## Subtasks

### 15.1 UIManager Map Selector Controls
- Add `selectedMap: MapType = 'space'` and `showMapDropdown: boolean = false` to `UIManager`.
- Render a **MAP** dropdown/button control in the menu UI alongside the difficulty selector (e.g. at the bottom HUD area of the menu screen).
- Add click handling for toggling the map dropdown and picking `'space'`, `'dungeon'`, or `'military'`.
- Provide helper methods: `getSelectedMap()`, `getShowMapDropdown()`, `setSelectedMap(map: MapType)`.

### 15.2 Main Game Integration
- Update `UIManager.onStartGame` signature to `(difficulty: DifficultyMode, mapType: MapType) => void`.
- Update `Game.startNewGame(difficulty, mapType)`:
  - Reconfigure `this.tileMap.setMap(mapType)` (or instantiate the map).
  - Update cached `this.waypoints` from the new map layout so enemies navigate the correct path.
- Update menu screen rendering in `main.ts` so the previewed map reflects the currently selected map before starting.
- Ensure `resetToMenu()` retains or restores the chosen map layout.

## Acceptance criteria
- Map selection UI is accessible, visible, and responsive on the main menu.
- Clicking START begins the game with the selected map, theme visuals, and corresponding enemy path.
- Closing/opening the map dropdown works without blocking difficulty selection or START button clicks.
- `npx tsc --noEmit` runs without type errors.
