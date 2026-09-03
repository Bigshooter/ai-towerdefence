# Task 05: Consolidate wave spawning logic into WaveSystem

## Problem
`Game` only uses `WaveSystem.generateWave()`; the class's own spawn machinery (`startNextWave`, `update`, `spawnTimer`, `waveInProgress`, `waveCompleteTimer`) is dead code, re-implemented inside `Game` (`spawnQueue`, `spawnTimer`, `currentSpawnInterval`, `interWaveTimer`, `spawningComplete`). `WaveSystem.update()` also calls `generateWave()` every frame — generating new random enemy lists just to read `spawnInterval`.

## Files
- `src/system/WaveSystem.ts`
- `src/main.ts`

## Fix
1. Decide on one owner: move the spawn-queue/timer/inter-wave state from `Game` into `WaveSystem` (preferred), driven by `waveSystem.update(dt)` returning spawn/complete events.
2. Store the active `WaveConfig` when a wave starts instead of regenerating it per frame.
3. Delete the now-unused duplicate fields from `Game` and the dead members from `WaveSystem`.
4. Keep `Game` responsible only for reacting to events (spawn enemy, wave complete → bonus gold, next-wave countdown).

## Acceptance criteria
- Wave pacing (spawn interval, 3s pause between waves, boss every 5th wave) is unchanged.
- No wave state is duplicated between `Game` and `WaveSystem`.
- Pause correctly freezes spawning (update-driven, no wall-clock timers).
