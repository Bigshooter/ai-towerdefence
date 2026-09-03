# Task 28: Cooperative Split Economy & Dual Tower Ownership

Part of [docs/features/cooperative-multiplayer.md](docs/features/cooperative-multiplayer.md).

## Problem
In cooperative multiplayer, players share a common base defense, but maintain separate gold wallets so each player makes their own economic and build decisions. Furthermore, all gold income from defeated enemies and wave bonuses must be split evenly between both players.

## Relevant Files
- [src/types.ts](src/types.ts)
- [src/system/EconomySystem.ts](src/system/EconomySystem.ts)
- [src/entities/Tower.ts](src/entities/Tower.ts)
- [src/entities/Enemy.ts](src/entities/Enemy.ts)
- [src/ui/UIManager.ts](src/ui/UIManager.ts)
- [src/main.ts](src/main.ts)
- [src/visuals/SpaceSprites.ts](src/visuals/SpaceSprites.ts)

## Subtasks

### 28.1 Cooperative Economy System Refactor ([src/system/EconomySystem.ts](src/system/EconomySystem.ts))
- Extend `EconomySystem` to support dual-player gold management:
  ```typescript
  export class EconomySystem {
    private playerGold: Map<string, number> = new Map();
    private isMultiplayer: boolean = false;

    public initMultiplayer(p1Id: string, p2Id: string, startingGold: number): void;
    public getGold(playerId?: string): number;
    public deductGold(amount: number, playerId: string): boolean;
    public awardSplitReward(totalReward: number): { p1Amount: number; p2Amount: number };
  }
  ```
- Implement 50/50 reward division:
  - Total bounty $R$ is split: $R_1 = \lfloor R/2 \rfloor, R_2 = \lceil R/2 \rceil$, alternating the odd remainder to ensure strict fairness over time.
  - Wave completion bonus is divided equally between both players.

### 28.2 Tower Ownership & Color Accents ([src/entities/Tower.ts](src/entities/Tower.ts) & [src/visuals/SpaceSprites.ts](src/visuals/SpaceSprites.ts))
- Add `ownerId: string` and `ownerTag: string` to `Tower` entity.
- Render distinctive visual ownership rings / corner indicators on towers:
  - **Player 1 (Host):** Neon Cyan accent ring (`#00E5FF`).
  - **Player 2 (Guest):** Neon Amber/Magenta accent ring (`#FFB300` / `#FF007F`).
- In the Tower Inspector panel, display `Owner: [Gamertag]`, `Level [N] [Type]`, and upgrade options.

### 28.3 Purchase & Upgrade Transactions ([src/main.ts](src/main.ts) & [src/ui/UIManager.ts](src/ui/UIManager.ts))
- When local player places a tower:
  - Validate local player's gold $\ge \text{cost}$.
  - Deduct cost from local player's balance.
  - Assign local player's ID and gamertag as tower owner.
- When local player upgrades a tower:
  - Deduct upgrade cost from the upgrader's gold balance.
- When local player sells a tower:
  - Refund 70% of base + upgrade value to the selling player.

### 28.4 Floating Gold Feedback ([src/main.ts](src/main.ts) & [src/ui/UIManager.ts](src/ui/UIManager.ts))
- Render floating combat text above dead enemies showing shared split:
  - e.g. `+10g (Shared)` in green/gold.
- Update HUD top bar to display dual gold meters:
  - `[P1] ACE999: 540g`
  - `[P2] NOVA01: 410g`

## Acceptance Criteria
- Both players start with independent, configurable starting gold.
- Enemy kill rewards and wave completion bonuses split 50/50 evenly between Player 1 and Player 2.
- Tower placement and upgrades deduct gold only from the active player's balance.
- Towers clearly display color-coded visual cues denoting Player 1 vs Player 2 ownership.
- Tower sales refund the selling player accurately.
