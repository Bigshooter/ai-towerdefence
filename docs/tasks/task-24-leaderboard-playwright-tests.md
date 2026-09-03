# Task 24: Playwright Automated Tests for Persisted Leaderboards

Part of `docs/features/persisted-map-high-scores.md`.

## Problem
We need automated Playwright end-to-end tests to verify:
1. High score qualification checks and name input truncation (up to 6 letters).
2. Per-map leaderboard isolation (scores submitted on Space do not contaminate Dungeon or Military).
3. Local storage persistence across browser page reloads.
4. UI interactions (menu button, map tab switching, modal closing).

## Files
- `tests/helpers/game-page.ts`
- `tests/ui/leaderboards.spec.ts` (new spec)
- `tests/ui/menu-and-navigation.spec.ts`

## Subtasks

### 24.1 Test Page Object Enhancements (`tests/helpers/game-page.ts`)
- Add helper methods to `GamePage`:
  - `openLeaderboards()`: Clicks the HIGH SCORES button on the menu.
  - `selectLeaderboardTab(map: 'space' | 'dungeon' | 'military')`: Switches the active tab in the leaderboard modal.
  - `closeLeaderboards()`: Clicks the CLOSE button in the leaderboard modal.
  - `typeHighScoreName(name: string)`: Sends keyboard keypresses or sets input buffer for high score entry.
  - `submitHighScore()`: Clicks the SUBMIT button on the high score modal.
  - `getLeaderboardEntries(map: 'space' | 'dungeon' | 'military')`: Evaluates in-page `window.highScoreSystem.getScores(map)`.
  - `clearLeaderboards()`: Calls `window.highScoreSystem.clearScores()` or clears `localStorage`.

### 24.2 Automated Test Scenarios (`tests/ui/leaderboards.spec.ts`)
- **Scenario 1: Main Menu Leaderboard Navigation & Tab Switching**
  - Open leaderboard modal from the Main Menu.
  - Verify tab switching between Space, Dungeon, and Military maps updates displayed entries.
  - Close modal and verify return to the main menu.
- **Scenario 2: Name Input Constraint & Submission (Max 6 Chars)**
  - Simulate game over with qualifying score.
  - Type a name exceeding 6 characters (e.g. `"CYBERWARRIOR"`).
  - Verify input buffer is strictly clamped to 6 characters (`"CYBERW"`).
  - Submit score and verify the entry appears on the map's leaderboard.
- **Scenario 3: Per-Map Leaderboard Isolation**
  - Submit score on `'space'` map.
  - Verify entry exists under Space Station leaderboard.
  - Verify Dungeon and Military leaderboards do not contain this entry.
- **Scenario 4: Persistence Across Page Reloads**
  - Submit multiple scores on a map.
  - Reload browser page (`page.reload()`).
  - Open leaderboard modal and assert previously submitted scores and ranks are preserved from `localStorage`.
- **Scenario 5: Top 10 Truncation & Sorting**
  - Inject 12 scores of varying values.
  - Verify only the top 10 highest scores are retained in descending order.

## Acceptance Criteria
- All tests in `tests/ui/leaderboards.spec.ts` pass cleanly in headless mode.
- Complete test suite passes: `npx playwright test --reporter=line`.
- No flaky timeouts during modal transitions or keyboard input simulation.
