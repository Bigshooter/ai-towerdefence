# Task 25: Variable Game Speed Controls (1x, 2x, 3x, 5x)

Part of `docs/features/variable-game-speed-controls.md`.

## Problem
Currently, the game only runs at a single fixed real-time simulation speed (1x). Players have no way to accelerate wave progression, test tower builds rapidly, or fast-forward through early or slower waves.

## Files
- `src/types.ts`
- `src/ui/UIManager.ts`
- `src/main.ts`
- `tests/helpers/game-page.ts`
- `tests/ui/game-speed.spec.ts` (new spec)

## Subtasks

### 25.1 Types & State (`src/types.ts`)
- Define `GameSpeed = 1 | 2 | 3 | 5`.
- Define `AVAILABLE_GAME_SPEEDS: readonly GameSpeed[] = [1, 2, 3, 5]`.

### 25.2 UI Speed Button & Keyboard Controls (`src/ui/UIManager.ts`)
- Add `gameSpeed: GameSpeed = 1` state in `UIManager`.
- Implement `getGameSpeed(): GameSpeed`, `setGameSpeed(speed: GameSpeed): void`, `cycleGameSpeed(): GameSpeed`.
- Add `getSpeedButtonRect(): { x: number; y: number; w: number; h: number }` located on the bottom action dock next to Reset.
- Add click handling in `handleUIClick` when gameplay is active (`'playing'` or `'paused'`).
- Add keyboard hotkey (`Space` or `Tab` or `~`) to cycle speed when not in text input.
- Render the Speed button on the bottom HUD dock:
  - Label: `1X`, `2X`, `3X`, `5X`.
  - Color-coded borders & text:
    - 1X: Cyan (`#7EC8FF`)
    - 2X: Green (`#56D364`)
    - 3X: Gold (`#FFD700`)
    - 5X: Hyper Magenta (`#FF55FF`)

### 25.3 Game Simulation Sub-Stepping (`src/main.ts`)
- Add `gameSpeed: GameSpeed = 1` to `Game`.
- Wire `uiManager.onSetGameSpeed` and `uiManager.onCycleGameSpeed`.
- Refactor `Game.update(dt)`:
  - Split incoming delta time: `totalDt = dt * this.gameSpeed`.
  - Execute simulation in sub-steps of $\Delta t_{\text{sub}} \le 0.033\text{s}$ (30ms maximum) to guarantee collision accuracy and waypoint traversal fidelity at 2x, 3x, and 5x speeds.
- Expose `(window as any).game.gameSpeed` and `setGameSpeed`.

### 25.4 Automated Playwright Tests (`tests/ui/game-speed.spec.ts`)
- Add `clickSpeedButton()`, `getGameSpeed()`, and `setGameSpeed()` helpers to `tests/helpers/game-page.ts`.
- Write end-to-end tests:
  - Verify speed cycles from `1x` -> `2x` -> `3x` -> `5x` -> `1x` on click.
  - Verify speed controls work with keyboard shortcuts.
  - Verify simulation advances faster at higher speeds.
  - Verify pausing retains the speed setting upon resumption.

## Acceptance Criteria
- Clicking the speed button cycles through 1x, 2x, 3x, 5x, 1x.
- Game simulation updates smoothly without tunneling or collision glitches at 5x.
- All existing and new Playwright tests pass: `npx playwright test --reporter=line`.
- `npx tsc --noEmit` passes without errors.
