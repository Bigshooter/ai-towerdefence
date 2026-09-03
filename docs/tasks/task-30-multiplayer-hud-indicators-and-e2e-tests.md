# Task 30: Multiplayer HUD, Partner Indicators & End-to-End Tests

Part of [docs/features/cooperative-multiplayer.md](docs/features/cooperative-multiplayer.md).

## Problem
Players in cooperative multiplayer need visual cues to see their partner's presence, gold reserves, and active target points on the grid. Additionally, the multiplayer flow requires robust end-to-end automated testing with multi-user browser contexts in Playwright.

## Relevant Files
- [src/ui/UIManager.ts](src/ui/UIManager.ts)
- [src/main.ts](src/main.ts)
- [tests/helpers/game-page.ts](tests/helpers/game-page.ts)

## Subtasks

### 30.1 Dual Player HUD Header ([src/ui/UIManager.ts](src/ui/UIManager.ts))
- In multiplayer mode, render a redesigned top HUD bar:
  - **Left Section:** Shared Base Lives (`❤️ [HP]`), Current Wave (`WAVE [N]/∞`), Game Speed button (`[1X / 2X / 3X / 5X]`).
  - **Center Section:** Co-Op Mode Badge (`2P CO-OP | [MAP] | [DIFFICULTY]`).
  - **Right Section:** Dual Player Info Chips:
    - **P1 Chip (Cyan):** `[P1] [HOST_TAG] | [GOLD]g`
    - **P2 Chip (Amber/Magenta):** `[P2] [GUEST_TAG] | [GOLD]g`

### 30.2 Partner Mouse Pointer & Tactical Grid Ping System ([src/ui/UIManager.ts](src/ui/UIManager.ts))
- Transmit normalized cursor grid coordinates ($X, Y$) on mouse move:
  - Render a small neon cursor indicator for the remote player labeled with their gamertag.
- Add tactical grid pinging (e.g. `Middle Click` or `Shift + Left Click` on a tile):
  - Spawns an animated pulsing radar circle on the targeted tile with sound cue to highlight build suggestions.

### 30.3 Multi-Client Playwright Test Infrastructure ([tests/helpers/game-page.ts](tests/helpers/game-page.ts))
- Extend `GamePage` helper to support multi-context browser orchestration:
  ```typescript
  export class MultiPlayerHarness {
    public static async createPair(browser: Browser): Promise<{ host: GamePage; guest: GamePage }>;
  }
  ```
- Automate complete multiplayer flows:
  - Player 1 enters gamertag `HOST01`, selects Multiplayer, creates room on Dungeon map / Hard difficulty.
  - Player 2 enters gamertag `JOIN02`, selects Multiplayer, browses open rooms, joins `HOST01` room.
  - Both toggle Ready and launch match.
  - Player 1 builds an Archer tower; verify it appears on Player 2's canvas with Player 1 ownership color.
  - Player 2 builds a Cannon tower; verify it appears on Player 1's canvas.
  - Trigger wave start; verify enemy kills split gold evenly to both players.
  - Change game speed to 2x on Host; verify Guest game speed updates to 2x.

## Acceptance Criteria
- Top HUD bar displays live gold balances and gamertags for both players.
- Partner cursor and tactical pings render smoothly across the canvas.
- Multi-client Playwright tests simulate 2 concurrent players end-to-end and pass consistently.
