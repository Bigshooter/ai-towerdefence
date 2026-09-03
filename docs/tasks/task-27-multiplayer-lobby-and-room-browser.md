# Task 27: Multiplayer Lobby, Room Creation & Room Browser

Part of [docs/features/cooperative-multiplayer.md](docs/features/cooperative-multiplayer.md).

## Problem
In multiplayer mode, players need an intuitive lobby interface to either host a new game room (picking map and difficulty) or browse existing hosted rooms waiting for a partner.

## Relevant Files
- [src/types.ts](src/types.ts)
- [src/ui/UIManager.ts](src/ui/UIManager.ts)
- [src/main.ts](src/main.ts)
- [tests/helpers/game-page.ts](tests/helpers/game-page.ts)

## Subtasks

### 27.1 Lobby & Room Data Types ([src/types.ts](src/types.ts))
- Define room and lobby structures:
  ```typescript
  export interface MultiplayerRoom {
    id: string;
    hostTag: string;
    guestTag?: string;
    mapType: MapType;
    difficulty: Difficulty;
    status: 'waiting' | 'ready' | 'starting' | 'in_game';
    createdAt: number;
  }
  ```
- Define lobby views: `'multiplayer_hub' | 'create_room' | 'browse_rooms' | 'waiting_room'`.

### 27.2 Create Room View & Waiting Room ([src/ui/UIManager.ts](src/ui/UIManager.ts))
- **Create Room Screen:**
  - Interactive Map Picker (`Space Station`, `Dungeon Catacombs`, `Military Outpost`).
  - Difficulty Selector (`Easy`, `Medium`, `Hard`).
  - **CREATE LOBBY** button and **BACK** button.
- **Host Waiting Room Screen:**
  - Displays Room Header: `Room Code: #XXXX`.
  - Host info box showing Host Gamertag, Map, and Difficulty.
  - Partner Slot: Animated pulsing status *"Waiting for Player 2 to join..."*.
  - When Player 2 connects: Updates partner slot with Guest Gamertag and green "CONNECTED" badge.
  - **START MATCH** button (enabled once both players are ready) and **LEAVE ROOM** button.

### 27.3 Join Room Browser View ([src/ui/UIManager.ts](src/ui/UIManager.ts))
- **Browse Rooms Screen:**
  - Table / Card listing of open hosted rooms:
    - Host Gamertag
    - Map Environment & Icon
    - Difficulty Badge
    - **JOIN** button per room
  - Header actions: **REFRESH** list, **DIRECT CODE ENTRY** box, and **BACK** button.
  - Empty state message: *"No active rooms waiting. Create one now to host!"*.

### 27.4 Synchronized Launch Countdown ([src/ui/UIManager.ts](src/ui/UIManager.ts) & [src/main.ts](src/main.ts))
- Ready check toggle button for both Host and Guest.
- When both players are Ready, trigger a 3-second synchronized visual countdown banner on the canvas (`3... 2... 1... LAUNCH`).
- Transition game state into `'playing'` with shared seed and parameters.

## Acceptance Criteria
- Host can select map and difficulty and transition to waiting room with generated room code.
- Guest can browse open rooms displaying Host Gamertag, Map, and Difficulty.
- Clicking Join connects Guest to Host room.
- Both players see each other's gamertags, toggle ready status, and experience the synchronized countdown launch.
