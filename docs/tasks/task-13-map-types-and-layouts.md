# Task 13: Core Map Types & Layout Definitions

Part of `docs/features/selectable-map-types.md`.

## Problem
Currently, the game only has a single hardcoded 40x30 tile map matrix (`MAP_LAYOUT`) and assumes space theming with a single fixed set of waypoints.

## Files
- `src/types.ts`
- `src/map/TileMap.ts`

## Subtasks

### 13.1 Define Types
- In `src/types.ts`, export:
  ```typescript
  export type MapType = 'space' | 'dungeon' | 'military';

  export interface MapDefinition {
    id: MapType;
    name: string;
    description: string;
    layout: number[][];
    backgroundColor: string;
  }
  ```

### 13.2 Create Layout Matrices
- Create distinct 40x30 grid layouts for:
  - **Space:** The existing winding serpentine orbital layout.
  - **Dungeon:** A subterranean labyrinth with sharp 90° chokepoints, narrow switchbacks, and fortified central chambers.
  - **Military:** A perimeter sweep entering from north checkpoints, following outer barricades, cutting through the central runway, and exiting at the command bunker.
- Ensure all three layouts guarantee:
  - Valid, unambiguous path connectivity (no adjacent ambiguity).
  - Clear, unblocked start and exit boundary positions.
  - Ample buildable tiles for strategic tower placements.

### 13.3 Update TileMap Class
- Refactor `TileMap` constructor: `constructor(mapType: MapType = 'space')` or `setMap(mapType: MapType)`.
- Dynamically extract start position, end position, and sequential waypoints for the active map layout.
- Provide `getMapType(): MapType`.

## Acceptance criteria
- `TileMap` can instantiate or switch between `'space'`, `'dungeon'`, and `'military'`.
- `getWaypoints()`, `getStartPosition()`, and `getEndPosition()` correctly return valid coordinates for all 3 maps.
- TypeScript compiler passes with `npx tsc --noEmit`.
