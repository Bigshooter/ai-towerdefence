# Task 02: Fix the "Wave Complete" banner

## Problem
`handleWaveComplete()` sets `waveCompleteTimer = 0` and nothing ever increments it, but `render()` only draws the banner when `waveCompleteTimer > 0 && < 2` — so it never shows. The text would also display the wrong wave number because `gameData.wave++` runs before the banner is drawn.

## Files
- `src/main.ts` (`handleWaveComplete`, `update`, `render`)

## Fix
1. Capture the completed wave number before incrementing (e.g. `completedWave = this.gameData.wave` stored on the class).
2. Start the banner by setting `waveCompleteTimer` to a small positive epsilon or restructure to count up from 0 with a separate `bannerActive` flag.
3. Increment `waveCompleteTimer += dt` in `update()` while the banner is active; deactivate after 2 seconds.
4. Render `Wave ${completedWave} Complete!` using the captured number.

## Acceptance criteria
- After clearing a wave, "Wave N Complete!" fades out over ~2 seconds showing the wave that was just completed.
- Banner does not render during pause/menu/gameOver states.
