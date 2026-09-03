# Feature: Dynamic Synthwave BGM

## Summary

Upgrade the procedurally generated background music from a single setTimeout-driven arpeggio loop into a small synthwave step-sequencer with sample-accurate timing, percussion, real chord progressions, and a filter/delay effects chain. The music still requires no audio assets — everything is synthesized with the Web Audio API.

## Goals

- Tight, drift-free timing at all tempos (including 2x boss tempo)
- Each wave tier feels like a genuinely different arrangement, not just a faster arpeggio
- Classic synthwave character: four-on-the-floor kick, off-beat hats, dotted-eighth delay, low-pass warmth
- Musically coherent: the arpeggio and pad always follow the current chord

## Behaviour

Tier selection is unchanged (chosen per wave in `startBGM`, driven by `Game.onWaveStarted`):

| Tier | Waves | Tempo (16th) | Progression | Drums | Arp |
|------|-------|-------------|-------------|-------|-----|
| Early | 1–4 | 0.22s (~68 BPM) | Am – F – C – G | none | sine, 8th notes |
| Mid | 5–9 | 0.16s (~94 BPM) | Am – G – F – E (Andalusian) | kick + off-beat hats | square, 16ths |
| Late | 10+ | 0.13s (~115 BPM) | Am – F – Dm – E | full kit (kick/snare/hats) | sawtooth, 16ths |
| Boss | every 5th wave | 0.11s (~136 BPM) | Am – F – E – Bb° (diminished) | full kit, double-time hats | sawtooth, octave up |

Per-wave variety: the arpeggio pattern (up-down, down-up, etc.) is selected from the wave number, so consecutive waves within a tier don't sound identical — while the chord progression stays musically intact.

## Technical design

1. **Lookahead scheduler** — a ~90 ms JS timer schedules all notes 200 ms ahead on the `AudioContext` clock (`nextStepTime += stepDur`), replacing per-step `setTimeout` chaining. Eliminates jitter/drift.
2. **Percussion synthesis** —
   - Kick: sine oscillator with fast 150→45 Hz pitch drop
   - Snare: shared noise buffer through a highpass (~1.5 kHz) plus a short body tone
   - Hi-hat: shared noise buffer through a highpass (~6 kHz), very short envelope
3. **Effects chain** — `musicBus → lowpass filter → musicGain → destination`. Filter cutoff opens per tier (1.2 kHz early → 5 kHz boss). Arp notes also feed a send into a `DelayNode` with feedback, tempo-synced to a dotted eighth (`stepDur * 3`).
4. **Chord data** — each tier defines a progression of `{ bass, tones[] }` bars; bass, pad, and arpeggio all derive from the active bar's chord. Replaces the previous unrelated note ladders and the dead `BGM_CHORDS` constant.

## Out of scope (possible follow-ups)

- Seamless transitions when the tier doesn't change between waves (currently the track restarts each wave)
- Sidechain-style gain ducking on the kick
- Lead melody line, menu/game-over themes, low-lives tension layer
