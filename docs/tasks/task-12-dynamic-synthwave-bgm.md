# Task 12: Dynamic synthwave BGM

Implements `docs/features/dynamic-synthwave-bgm.md`.

## Files
- `src/audio/AudioManager.ts` (all changes are contained here)

## Subtasks

### 12.1 Lookahead scheduler
- Replace the self-chaining `setTimeout(tick, stepDur * 1000)` with a scheduler: a ~90 ms timer that schedules every step falling within the next ~200 ms directly on the `AudioContext` clock.
- Track `stepIndex` / `nextStepTime` as fields; `stopBGM()` keeps clearing the timer.

### 12.2 Effects chain
- In `init()`, build: `musicBus (gain) → musicFilter (lowpass, Q≈0.7) → musicGain → destination`.
- Add a delay send: `delaySend (gain ≈0.35) → DelayNode ⇄ feedback (≈0.3) → musicFilter`.
- `playMusicNote` connects to `musicBus` instead of `musicGain`, with an optional flag to also feed `delaySend`.
- On `startBGM`, set the filter cutoff per tier and the delay time to `stepDur * 3` (dotted eighth).

### 12.3 Percussion synthesis
- `playKick(t)`: sine osc, 150→45 Hz exponential pitch drop, ~0.16 s envelope.
- `playSnare(t)`: shared cached noise buffer through highpass ~1.5 kHz + short 180 Hz body tone.
- `playHat(t)`: same noise buffer through highpass ~6 kHz, ~0.045 s envelope.
- Cache one noise buffer per context (`getNoiseBuffer()`); drums route into `musicBus`.

### 12.4 Chord progressions per tier
- Define per-tier arrangements: `{ stepDur, progression: { bass, tones[] }[], arpType, padType, arpEveryN, arpOctave, arpVolume, filterCutoff, drums }`.
- Progressions: early Am–F–C–G, mid Am–G–F–E, late Am–F–Dm–E, boss Am–F–E–Bb°.
- Bar = 16 steps; bass + pad play on the downbeat from the bar's chord; arp cycles the chord tones.
- Drum patterns per tier: none / kick+off-beat hats / full kit / full kit with double-time hats.

### 12.5 Per-wave variation
- Select the arp index pattern (e.g. up-down, down-up) from `waveNumber % patterns.length` so waves within a tier differ without breaking the harmony.

### 12.6 Cleanup
- Delete the dead `BGM_CHORDS` constant.

## Acceptance criteria
- No audio assets added; SFX behaviour unchanged; music volume slider still works (master `musicGain` untouched).
- No timing drift: notes are scheduled on the AudioContext clock, JS timer only performs lookahead.
- Boss waves are audibly distinct (tempo, dissonant final chord, double-time hats).
- Early waves have no drums; mid adds kick/hats; late adds snare.
- `npx tsc --noEmit` clean; Playwright suite passes.
