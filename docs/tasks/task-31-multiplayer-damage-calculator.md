# Task 31: Multiplayer Real-Time Damage Calculator & Contribution Stats

Part of [docs/features/multiplayer-damage-calculator.md](docs/features/multiplayer-damage-calculator.md).

## Problem
In cooperative multiplayer mode, players have no visibility into how much damage their towers are contributing to the team defense compared to their partner. There is no tracking or display of cumulative damage, contribution split percentages, or per-tower archetype effectiveness.

## Relevant Files
- [src/types.ts](src/types.ts)
- [src/entities/Projectile.ts](src/entities/Projectile.ts)
- [src/entities/Tower.ts](src/entities/Tower.ts)
- [src/main.ts](src/main.ts)
- [src/ui/UIManager.ts](src/ui/UIManager.ts)
- [tests/helpers/game-page.ts](tests/helpers/game-page.ts)

## Subtasks

### 31.1 Damage Calculator Subsystem ([src/types.ts](src/types.ts) & `src/system/DamageCalculator.ts`)
- Define player combat metrics interfaces in [src/types.ts](src/types.ts):
  - `PlayerCombatStats`: `totalDamage`, `waveDamage`, `kills`, `damageByTowerType`.
  - `MultiplayerCombatState`: `p1`, `p2`.
- Implement `DamageCalculator` class in `src/system/DamageCalculator.ts`:
  - `recordDamage(role: PlayerRole, amount: number, towerType: TowerType): void`
  - `recordKill(role: PlayerRole): void`
  - `getTotalDamage(role: PlayerRole): number`
  - `getWaveDamage(role: PlayerRole): number`
  - `getKills(role: PlayerRole): number`
  - `getContributionSplit(): { p1Percent: number; p2Percent: number }`
  - `resetWaveDamage(): void`
  - `reset(): void`

### 31.2 Projectile & Splash Damage Attribution ([src/entities/Projectile.ts](src/entities/Projectile.ts) & [src/main.ts](src/main.ts))
- Extend `Projectile` to store `ownerRole?: PlayerRole` and `towerType?: TowerType`.
- When `Tower` fires a projectile in [src/main.ts](src/main.ts), pass `tower.data.ownerRole` and `tower.data.type` into `Projectile`.
- In `Game.updateSimulation()`, when resolving single-target projectile hits and area-of-effect splash damage against enemies:
  - Calculate actual damage inflicted: `const actualDmg = enemy.takeDamage(damage)`.
  - Credit the attacking player: `this.damageCalculator.recordDamage(proj.ownerRole, actualDmg, proj.towerType)`.
  - When an enemy dies, credit the kill: `this.damageCalculator.recordKill(proj.ownerRole)`.

### 31.3 Multiplayer HUD Damage Bar & Live Meters ([src/ui/UIManager.ts](src/ui/UIManager.ts))
- Update the top multiplayer HUD bar to render a dual contribution meter:
  - Bar background with Cyan (`#00E5FF`) representing Player 1 share and Magenta (`#FF007F`) representing Player 2 share.
  - Live numeric text labels:
    - `[P1] [TAG]: [DMG] DMG ([P1%]%)`
    - `[P2] [TAG]: [DMG] DMG ([P2%]%)`
- Wire callbacks between [src/main.ts](src/main.ts) and [src/ui/UIManager.ts](src/ui/UIManager.ts) to read live combat metrics.

### 31.4 Combat Stats Breakdown Dialog & Game Over Recap ([src/ui/UIManager.ts](src/ui/UIManager.ts))
- Add an expandable **DAMAGE STATS** modal toggleable via button or hotkey `D`:
  - Compares Total Damage, Kills, Gold Contributed, and per-tower archetype charts.
- Update the Multiplayer Game Over screen:
  - Display side-by-side total combat statistics for both pilots.
  - Highlight the Match MVP with a gold badge.
- Update wave completion banner to highlight Wave MVP when in multiplayer mode.

### 31.5 Automated Playwright Test Suite (`tests/ui/damage-calculator.spec.ts`)
- Add helper methods to [tests/helpers/game-page.ts](tests/helpers/game-page.ts) for reading damage values and contribution percentages.
- Write end-to-end tests:
  - Verify Player 1's tower attacks accumulate damage exclusively under Player 1.
  - Verify Player 2's tower attacks accumulate damage exclusively under Player 2.
  - Verify splash damage correctly attributes across all damaged targets.
  - Verify contribution percentages update dynamically in the HUD.
  - Verify Game Over screen displays the combat damage recap.

## Acceptance Criteria
- Tower attacks and splash damage accurately credit the owning player's damage balance.
- Top HUD bar displays real-time damage values and split percentages for both players in multiplayer mode.
- Wave completion banners and Game Over screens display damage statistics and MVP recognitions.
- All Playwright test suites pass: `npx playwright test`.
- `npx tsc --noEmit` and `npm run build` pass without errors.
