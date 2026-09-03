# Task 22: High Score Name Entry & Leaderboard Canvas UI

Part of `docs/features/persisted-map-high-scores.md`.

## Problem
Players need interactive canvas interfaces to:
1. Enter their 1–6 character arcade name when qualifying for a high score upon game over.
2. View, browse, and switch between per-map leaderboards from both the Main Menu and the Game Over screen.

## Files
- `src/ui/UIManager.ts`

## Subtasks

### 22.1 UI State & Callbacks
- Add UI state properties in `UIManager`:
  - `showHighScoreEntry: boolean = false`
  - `highScoreNameInput: string = ''`
  - `showLeaderboardModal: boolean = false`
  - `activeLeaderboardTab: MapType = 'space'`
  - `lastSubmittedEntryId: string | null = null`
  - `highScoreCursorTimer: number = 0`
- Add callback hooks for game integration:
  - `onSubmitHighScore?: (name: string) => void`
  - `onGetLeaderboard?: (map: MapType) => HighScoreEntry[]`
  - `onCheckHighScore?: (score: number, map: MapType) => boolean`
  - `onOpenLeaderboard?: () => void`

### 22.2 Arcade Name Entry Modal (`renderHighScoreEntry`)
- Render a retro arcade name-input modal over the game canvas:
  - Header: `"★ NEW HIGH SCORE! ★"` with score and wave summary.
  - Subheader: `"ENTER YOUR NAME (UP TO 6 LETTERS)"`.
  - 6 distinct letter slot boxes showing current characters or an animated blinking cursor `_`.
  - On-screen clickable controls:
    - Interactive **SUBMIT** button (disabled if input is empty, highlighted when valid).
    - Optional on-screen **BACKSPACE** and **CLEAR** buttons.
- Listen for keyboard input (`keydown`):
  - `[A-Za-z0-9]`: Appends uppercase character if current length < 6.
  - `Backspace`: Removes last character.
  - `Enter`: Triggers submit if input length >= 1.
  - `Escape`: Closes entry with default name or returns.

### 22.3 Leaderboard Viewer Modal (`renderLeaderboardModal`)
- Render a modal overlay displaying the top 10 rankings:
  - Title: `"LEADERBOARDS"`.
  - Map tab buttons: `[ SPACE STATION ]`, `[ DUNGEON ]`, `[ MILITARY ]` indicating the active tab.
  - Column headers: `RANK`, `NAME`, `SCORE`, `WAVE`, `DIFFICULTY`, `DATE`.
  - Render rows 1–10:
    - Gold (`#FFD700`), Silver (`#C0C0C0`), and Bronze (`#CD7F32`) styling for ranks 1, 2, and 3.
    - Highlight row if its entry matches `lastSubmittedEntryId`.
    - Show `"--- NO ENTRIES YET ---"` if the leaderboard is empty.
  - Footer buttons: `[ CLOSE ]` or `[ MAIN MENU ]`.

### 22.4 Main Menu & Game Over Integration
- On Main Menu:
  - Add a **HIGH SCORES** button below or alongside START / SETTINGS / HELP.
  - Clicking opens the Leaderboard modal on the currently selected map tab.
- On Game Over:
  - Add a **LEADERBOARD** button alongside RETRY / MENU buttons.
  - Clicking opens the Leaderboard modal to review the final standings.

### 22.5 Test Automation Getters & Setters
- Expose methods:
  - `getShowHighScoreEntry(): boolean`
  - `getHighScoreInput(): string`
  - `setHighScoreInput(name: string): void`
  - `getShowLeaderboardModal(): boolean`
  - `getActiveLeaderboardTab(): MapType`
  - `setActiveLeaderboardTab(map: MapType): void`
  - `submitHighScore(): void`

## Acceptance Criteria
- Typing keyboard letters populates the 6 letter slots up to the 6-character limit.
- Submitting adds the score and transitions to the leaderboard modal with the new rank highlighted.
- Map tab buttons correctly toggle leaderboard data between Space, Dungeon, and Military maps.
- Canvas hit-testing reliably detects clicks on letter buttons, submit button, map tabs, and close buttons.
- `npx tsc --noEmit` passes without errors.
