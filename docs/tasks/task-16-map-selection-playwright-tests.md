# Task 16: Playwright Automated Tests for Map Selection & Traversal

Part of `docs/features/selectable-map-types.md`.

## Problem
We need automated Playwright end-to-end tests to prevent regressions when selecting maps, placing towers on different map layouts, and verifying enemy navigation on each map.

## Files
- `tests/helpers/game-page.ts`
- `tests/ui/map-selection.spec.ts` (new spec)
- `tests/ui/menu-and-navigation.spec.ts`

## Subtasks

### 16.1 Test Helper Enhancements
- In `tests/helpers/game-page.ts`, add methods:
  - `openMapDropdown()`: Clicks the MAP dropdown on the menu screen.
  - `selectMap(mapType: 'space' | 'dungeon' | 'military')`: Selects a map option from the open dropdown.
  - `getSelectedMap()`: Reads the selected map type from `uiManager`.
  - `getShowMapDropdown()`: Checks if the map dropdown is currently open.

### 16.2 Map Selection & UI Tests
- In `tests/ui/map-selection.spec.ts` (or `menu-and-navigation.spec.ts`):
  - Verify default map is `'space'`.
  - Open map dropdown, select `'dungeon'`, verify dropdown closes and selected map is updated.
  - Open map dropdown, select `'military'`, verify dropdown closes and selected map is updated.
  - Start game on `'dungeon'` map:
    - Verify start/exit coordinates and path differ from the space map.
    - Verify valid tower placement on buildable tiles and blocked placement on path/wall tiles for the dungeon layout.
  - Start game on `'military'` map:
    - Verify tower placement and path coordinates match the military layout.

## Acceptance criteria
- All new and existing Playwright tests pass: `npx playwright test --reporter=line`.
- No timing or click flakiness across the 3 map selections.
