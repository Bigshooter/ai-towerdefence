# Task 23: Game Orchestration & Audio Integration for High Scores

Part of `docs/features/persisted-map-high-scores.md`.

## Problem
The `Game` orchestrator in `main.ts` needs to wire the `HighScoreSystem` and `UIManager` together, evaluate high score qualification when a run ends, handle audio feedback (fanfares and chimes), and expose global test handles for automated verification.

## Files
- `src/main.ts`
- `src/audio/AudioManager.ts`

## Subtasks

### 23.1 HighScoreSystem Wiring in `Game` (`src/main.ts`)
- Instantiate `private highScoreSystem = new HighScoreSystem();` in `Game`.
- Set up `UIManager` callback bridges in `setupUICallbacks()`:
  - `this.uiManager.onCheckHighScore = (score, map) => this.highScoreSystem.isHighScore(map, score);`
  - `this.uiManager.onGetLeaderboard = (map) => this.highScoreSystem.getScores(map);`
  - `this.uiManager.onSubmitHighScore = (name) => { ... };`
    - Inserts score into `this.highScoreSystem.addScore(this.currentMap, name, this.gameData.score, this.gameData.wave, this.difficultyMode)`.
    - Plays audio confirmation SFX (`scoreSubmit`).
- Update `gameOver()`:
  - Check if `this.gameData.score > 0` and `this.highScoreSystem.isHighScore(this.currentMap, this.gameData.score)`.
  - If qualified:
    - Open high score name entry modal (`this.uiManager.openHighScoreEntry()`).
    - Trigger high score fanfare SFX (`this.audioManager.playSFX('highScore')`).
  - If not qualified:
    - Display standard Game Over screen.
- Expose `(window as any).highScoreSystem = this.highScoreSystem;` for Playwright testing.

### 23.2 Audio Manager Chimes & Fanfares (`src/audio/AudioManager.ts`)
- Add procedural Web Audio SFX presets to `playSFX(name)`:
  - `'highScore'`: An upbeat 3-note ascending synth arpeggio fanfare (e.g. C5 -> E5 -> G5 -> C6).
  - `'scoreSubmit'`: A crisp high-frequency confirmation chime.
  - `'typeKey'`: Subtle soft mechanical click when typing characters in the name entry box.

## Acceptance Criteria
- Qualifying runs automatically trigger the name entry modal on game over with fanfare audio.
- Non-qualifying runs proceed directly to the standard Game Over screen.
- Submitting a name saves the record into the active map's leaderboard and plays confirmation audio.
- High score state is accessible on `window.highScoreSystem` and `window.uiManager`.
- `npx tsc --noEmit` passes without errors.
