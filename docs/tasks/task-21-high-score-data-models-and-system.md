# Task 21: High Score Data Models & HighScoreSystem Core

Part of `docs/features/persisted-map-high-scores.md`.

## Problem
The game currently has no persistent record of player performance across runs. When a game finishes, scores and waves reached are lost upon page reload or returning to the main menu. We need data contracts and an isolated business logic system to manage, validate, sort, and persist per-map high scores to `localStorage`.

## Files
- `src/types.ts`
- `src/system/HighScoreSystem.ts` (new file)

## Subtasks

### 21.1 Domain Types & Interfaces (`src/types.ts`)
- Define `HighScoreEntry`:
  ```typescript
  export interface HighScoreEntry {
    id: string;
    name: string; // 1-6 characters, uppercase alphanumeric
    score: number;
    wave: number;
    difficulty: DifficultyMode;
    mapType: MapType;
    timestamp: number; // Unix epoch ms
  }
  ```
- Define `Leaderboards`:
  ```typescript
  export type Leaderboards = Record<MapType, HighScoreEntry[]>;
  ```

### 21.2 HighScoreSystem Implementation (`src/system/HighScoreSystem.ts`)
- Create `HighScoreSystem` class with the following capabilities:
  - **Storage Key & Constraints:** Constant `STORAGE_KEY = 'td_highscores'`, `MAX_ENTRIES_PER_MAP = 10`, `MAX_NAME_LENGTH = 6`.
  - **Persistence & Serialization:**
    - `loadScores()`: Reads and deserializes JSON from `localStorage`. Safely validates the schema. If empty, corrupted, or unavailable (e.g. storage disabled/blocked), initializes an empty dictionary `{ space: [], dungeon: [], military: [] }` with fallback placeholder entries or empty arrays.
    - `saveScores()`: Serializes in-memory leaderboards into `localStorage`. Handles quota exceptions gracefully.
  - **Qualification Check:**
    - `isHighScore(mapType: MapType, score: number): boolean`: Returns `true` if `score > 0` and either the map's leaderboard has fewer than 10 entries or `score` is greater than the 10th placed score.
  - **Insertion & Sorting:**
    - `addScore(mapType: MapType, name: string, score: number, wave: number, difficulty: DifficultyMode): HighScoreEntry`:
      - Sanitizes `name`: strips non-alphanumeric characters, converts to uppercase, clamps length to max 6 characters, defaults to `'PLAYER'` if empty.
      - Creates a new `HighScoreEntry` with a unique ID and current timestamp.
      - Inserts the entry into `this.leaderboards[mapType]`.
      - Sorts descending by `score`, then by `wave` descending, then by `timestamp` ascending.
      - Truncates to the top 10 entries.
      - Persists via `saveScores()`.
      - Returns the created entry.
  - **Query & Maintenance:**
    - `getScores(mapType: MapType): HighScoreEntry[]`: Returns a copy of the sorted scores for the requested map.
    - `clearScores(mapType?: MapType)`: Clears scores for a specific map or all maps and persists changes.

## Acceptance Criteria
- `HighScoreSystem` manages independent leaderboards for `'space'`, `'dungeon'`, and `'military'` maps.
- Qualifying score checks and insertion sorts work deterministically.
- Corrupted `localStorage` data does not crash initialization.
- Name strings are strictly sanitized to 1–6 uppercase alphanumeric characters.
- `npx tsc --noEmit` passes without errors.
