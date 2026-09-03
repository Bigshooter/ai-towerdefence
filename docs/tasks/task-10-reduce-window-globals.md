# Task 10: Reduce reliance on window globals

## Problem
`Game` writes `(window as any).game/gameState/gameData/uiManager/audioManager` on init and re-syncs `gameState`/`gameData` every frame. Game code shouldn't depend on ambient globals, and the per-frame sync hides which code actually consumes them (likely the Playwright tests and enemy HP scaling comments).

## Files
- `src/main.ts`
- `tests/helpers/game-page.ts` and specs (read-only audit)
- `src/entities/Enemy.ts` (verify it no longer reads `window.gameState` — HP multiplier is passed in via constructor)

## Fix
1. Audit which globals the tests actually read (grep `window.` in `tests/`). Keep only those, exposed behind a single deliberate test hook, e.g. `(window as any).__game = { getState, getData, uiManager }` set once in `init()`.
2. Remove the per-frame global sync in `update()`; if tests need live values, expose getters instead of copied snapshots.
3. Remove globals nothing consumes (`audioManager`, `game` if unused).

## Acceptance criteria
- Playwright suite passes unchanged (or with minimal helper updates in `tests/helpers/game-page.ts`).
- No per-frame writes to `window`.
- Production game logic never reads from `window`.
