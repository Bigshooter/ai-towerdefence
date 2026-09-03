# Task 20: Automated Playwright Tests for Tower Upgrade Visuals

Part of `docs/features/tower-upgrade-visuals.md`.

## Problem
We need automated Playwright tests to ensure tower visual upgrades, level updates, and sprite caching functions correctly without visual bugs, regressions, or performance degradation.

## Files
- `tests/helpers/game-page.ts`
- `tests/ui/tower-upgrade-visuals.spec.ts` (new spec)
- `tests/ui/tower-upgrade-sell.spec.ts`

## Subtasks

### 20.1 Test Helper Enhancements
- In `tests/helpers/game-page.ts`, add / ensure methods:
  - `getTowerLevel(col: number, row: number)`: Returns the current level of a placed tower at grid position.
  - `upgradeTowerToLevel(col: number, row: number, targetLevel: number)`: Iteratively purchases upgrades until target level is reached.
  - `getTowerSpriteCacheKeys()`: Inspects `SpaceSprites` cache keys to verify tier keys exist.

### 20.2 Visual Upgrade Playwright Spec (`tower-upgrade-visuals.spec.ts`)
- **Tier Transition Verification:**
  - Place each of the 5 tower types (Archer, Cannon, Sniper, Ice, Flamethrower).
  - Check baseline Level 1 state and sprite cache key.
  - Upgrade each tower to Level 2 (Tier 2 transition) and verify level increases and updated sprite key is generated.
  - Upgrade each tower to Level 4 (Tier 3 / Master transition) and verify tier 3 sprite key generation and active visual state.
- **Multiple Towers and Visual Independence:**
  - Place multiple towers of the same type at different levels (e.g. Lv 1 Archer and Lv 3 Archer side-by-side).
  - Verify both render independently without shared state corruption.
- **Projectile Visual Propagation Test:**
  - Trigger firing from upgraded towers and verify projectiles are spawned with matching level attributes.

## Acceptance criteria
- Playwright tests pass reliably: `npx playwright test tests/ui/tower-upgrade-visuals.spec.ts`.
- Full test suite passes: `npx playwright test`.
- TypeScript compiler passes: `npx tsc --noEmit`.
