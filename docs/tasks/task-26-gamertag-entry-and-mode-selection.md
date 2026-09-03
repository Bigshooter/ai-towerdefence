# Task 26: Gamertag Landing Entry & Mode Selection Modal

Part of [docs/features/cooperative-multiplayer.md](docs/features/cooperative-multiplayer.md).

## Problem
Currently, players land directly on the main menu without an established player identity or gamertag until the high score entry modal is triggered at game over. To support multiplayer matchmaking, room hosting, and personalized co-op gameplay, players should enter or confirm their 6-character arcade gamertag immediately upon loading the game URL, followed by selecting between Solo and Multiplayer modes.

## Relevant Files
- [src/types.ts](src/types.ts)
- [src/ui/UIManager.ts](src/ui/UIManager.ts)
- [src/main.ts](src/main.ts)
- [src/system/HighScoreSystem.ts](src/system/HighScoreSystem.ts)
- [tests/helpers/game-page.ts](tests/helpers/game-page.ts)

## Subtasks

### 26.1 Gamertag State & Persistence Model ([src/types.ts](src/types.ts))
- Define `GameMode = 'solo' | 'multiplayer'`.
- Define `GamertagState`:
  ```typescript
  export interface GamertagState {
    tag: string;
    isConfirmed: boolean;
  }
  ```
- Store and retrieve the confirmed gamertag in `localStorage` under the key `td_gamertag` (defaulting to empty string or fallback `PLAYER`).

### 26.2 Gamertag Landing Modal UI ([src/ui/UIManager.ts](src/ui/UIManager.ts))
- Implement an arcade 6-letter input dialog shown whenever no confirmed gamertag is in memory:
  - Reuse the 6-character slot box visual aesthetic with uppercase letters (`A-Z`, `0-9`) and glowing border accents.
  - Handle keyboard typing, `Backspace`, `Delete`, `Enter` to confirm, and on-screen **CONFIRM** button click.
  - Automatically uppercase input and truncate at 6 characters.
  - If empty upon confirmation, generate a fallback tag (e.g. `PILOT1` or `ACE01`).
- Provide an edit icon / tag chip in the menu HUD allowing players to edit their gamertag at any time.

### 26.3 Mode Selection Screen ([src/ui/UIManager.ts](src/ui/UIManager.ts) & [src/main.ts](src/main.ts))
- Add menu view states: `'gamertag_entry'`, `'mode_select'`, `'solo_menu'`, `'multiplayer_hub'`.
- On Mode Select screen, render two prominent arcade selection cards:
  - **SOLO PLAY:** Icon, description (*"Classic single-player defense. Build towers, clear waves, climb the leaderboard."*), and **PLAY SOLO** button.
  - **MULTIPLAYER CO-OP:** Icon, description (*"2-player cooperative defense. Shared base, individual gold, 50/50 split rewards."*), and **PLAY CO-OP** button.
- Wire button click handlers in `UIManager.handleUIClick` to transition to the respective menus.

### 26.4 Automated Playwright Tests
- Create test cases verifying:
  - Visiting the game URL displays the 6-character gamertag entry prompt.
  - Entering a gamertag persists it to `localStorage` and transitions to Mode Selection.
  - Clicking "Solo Play" leads to the existing single-player menu.
  - Clicking "Multiplayer Co-Op" opens the multiplayer lobby hub.
  - Returning visits with saved `localStorage` prefill the gamertag.

## Acceptance Criteria
- New visitors are presented with the arcade gamertag entry dialog before accessing game modes.
- Gamertag input accepts 1 to 6 alphanumeric characters and automatically uppercases.
- Saved gamertags persist across browser reloads.
- Solo mode launches standard single-player gameplay seamlessly without regression.
- Mode selection navigation operates cleanly with full keyboard and mouse support.
