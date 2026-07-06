// Low-key 80's synthwave chord progression: Am - F - C - G
const BGM_CHORDS: { bass: number; notes: number[] }[] = [
  { bass: 110.00, notes: [220.00, 261.63, 329.63] }, // Am (A C E)
  { bass: 174.61, notes: [174.61, 220.00, 261.63] }, // F  (F A C)
  { bass: 130.81, notes: [261.63, 329.63, 392.00] }, // C  (C E G)
  { bass: 196.00, notes: [246.94, 293.66, 392.00] }, // G  (G B D)
];

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private isPlaying: boolean = false;
  private bgmTimer: number | null = null;
  private musicVolume: number = 0.5;
  private sfxVolume: number = 0.7;

  init(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Load any persisted volume preferences
      const savedMusic = this.loadVolume('td_musicVolume');
      const savedSfx = this.loadVolume('td_sfxVolume');
      if (savedMusic !== null) this.musicVolume = savedMusic;
      if (savedSfx !== null) this.sfxVolume = savedSfx;

      // Separate gain buses for SFX and music so they can be controlled independently
      this.sfxGain = this.audioContext.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.audioContext.destination);

      this.musicGain = this.audioContext.createGain();
      this.musicGain.gain.value = this.musicVolume * 0.2; // keep BGM low-key
      this.musicGain.connect(this.audioContext.destination);
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  private loadVolume(key: string): number | null {
    try {
      const v = localStorage.getItem(key);
      if (v === null) return null;
      const n = parseFloat(v);
      return isNaN(n) ? null : Math.max(0, Math.min(1, n));
    } catch {
      return null;
    }
  }

  setMusicVolume(v: number): void {
    this.musicVolume = Math.max(0, Math.min(1, v));
    if (this.musicGain) this.musicGain.gain.value = this.musicVolume * 0.2;
    try { localStorage.setItem('td_musicVolume', String(this.musicVolume)); } catch { /* ignore */ }
  }

  setSfxVolume(v: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    if (this.sfxGain) this.sfxGain.gain.value = this.sfxVolume;
    try { localStorage.setItem('td_sfxVolume', String(this.sfxVolume)); } catch { /* ignore */ }
  }

  getMusicVolume(): number { return this.musicVolume; }
  getSfxVolume(): number { return this.sfxVolume; }

  playSFX(type: 'shoot' | 'hit' | 'kill' | 'waveStart' | 'bossSpawn' | 'gameOver' | 'click'): void {
    if (!this.audioContext) return;
    if (this.audioContext.state === 'suspended') this.audioContext.resume();

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    switch (type) {
      case 'shoot':
        this.playTone(ctx, now, 440, 0.05, 'square', 0.1);
        break;
      case 'hit':
        this.playNoise(ctx, now, 0.03, 0.08);
        break;
      case 'kill':
        this.playTone(ctx, now, 600, 0.1, 'square', 0.15);
        setTimeout(() => this.playTone(ctx, ctx.currentTime + 0.05, 800, 0.08, 'square', 0.1), 50);
        break;
      case 'waveStart':
        this.playTone(ctx, now, 300, 0.15, 'triangle', 0.2);
        setTimeout(() => this.playTone(ctx, ctx.currentTime + 0.15, 450, 0.15, 'triangle', 0.2), 150);
        break;
      case 'bossSpawn':
        for (let i = 0; i < 3; i++) {
          setTimeout(() => this.playTone(ctx, ctx.currentTime + i * 0.1, 200 - i * 30, 0.2, 'sawtooth', 0.2), i * 100);
        }
        break;
      case 'gameOver':
        this.playTone(ctx, now, 400, 0.3, 'square', 0.2);
        setTimeout(() => this.playTone(ctx, ctx.currentTime + 0.3, 300, 0.3, 'square', 0.2), 300);
        setTimeout(() => this.playTone(ctx, ctx.currentTime + 0.6, 200, 0.5, 'square', 0.2), 600);
        break;
      case 'click':
        this.playTone(ctx, now, 800, 0.03, 'sine', 0.1);
        break;
    }
  }

  startBGM(waveContext?: { waveNumber: number; bossWave: boolean }): void {
    if (!this.audioContext) return;
    if (this.audioContext.state === 'suspended') this.audioContext.resume();

    // Stop any existing BGM before starting a new one with different parameters.
    // Must run before setting isPlaying so re-starting with new wave params works.
    this.stopBGM();
    this.isPlaying = true;

    const isBoss = waveContext?.bossWave ?? false;
    const waveNum = waveContext?.waveNumber ?? 1;

    // === Determine musical arrangement based on wave tier ===
    let bassNotes: number[];
    let arpNotes: number[];
    let arpType: OscillatorType;
    let padType: OscillatorType;
    let stepDur: number;
    let hasPad: boolean;
    let hasSubBass: boolean;

    if (isBoss) {
      // BOSS WAVE: Maximum intensity — 2x tempo, all layers active, dissonant chords
      bassNotes = [65.41, 73.42, 82.41, 87.31]; // C2 D2 E2 F2 (chromatic descent)
      arpNotes = [261.63, 311.13, 392.00, 523.25]; // C4 d5 G5 c6 (minor triad + dissonance)
      arpType = 'sawtooth';
      padType = 'square';
      stepDur = 0.14; // 2x speed
      hasPad = true;
      hasSubBass = true;
    } else if (waveNum <= 4) {
      // EARLY WAVES: Calm, ambient — slow sine arpeggio with soft pads
      bassNotes = [110.00, 130.81, 146.83, 164.81]; // A2 C3 D3 E3
      arpNotes = [220.00, 261.63, 329.63, 392.00]; // A3 C4 E4 G4
      arpType = 'sine';
      padType = 'triangle';
      stepDur = 0.35;
      hasPad = true;
      hasSubBass = false;
    } else if (waveNum <= 9) {
      // MID WAVES: Building tension — square arpeggio with punchy bass
      bassNotes = [82.41, 98.00, 110.00, 130.81]; // E2 G2 A2 C3
      arpNotes = [329.63, 392.00, 440.00, 523.25]; // E4 G4 A4 c5
      arpType = 'square';
      padType = 'sawtooth';
      stepDur = 0.22;
      hasPad = true;
      hasSubBass = false;
    } else {
      // LATE WAVES: Aggressive — sawtooth bass, complex arpeggio patterns
      bassNotes = [55.00, 65.41, 73.42, 82.41]; // A1 C2 D2 E2 (sub-bass)
      arpNotes = [440.00, 523.25, 587.33, 659.25]; // A4 c5 d5 e5
      arpType = 'sawtooth';
      padType = 'square';
      stepDur = 0.18;
      hasPad = true;
      hasSubBass = true;
    }

    const stepsPerChord = 8;
    let step = 0;

    // Wave-specific seed for chord selection variety
    const chordSeed = Math.floor(waveNum * 1.618);

    const tick = () => {
      if (!this.isPlaying || !this.audioContext) return;
      const ctx = this.audioContext;
      const t = ctx.currentTime;
      const barIdx = Math.floor(step / stepsPerChord);
      const chordIdx = (chordSeed + barIdx) % bassNotes.length;
      const localStep = step % stepsPerChord;
      const barLen = stepDur * stepsPerChord;

      // On the downbeat of each bar: bass note + optional pad
      if (localStep === 0) {
        // Main bass — triangle for warmth and clarity
        this.playMusicNote(bassNotes[chordIdx], barLen * 0.95, 'triangle', 0.6, t);

        // Sub-bass: removed to eliminate rhythmic mismatch with main bass
        // (was ringing shorter than triangle, creating "on-off" pattern)

        // Sustained pad on downbeat — very short envelope so it doesn't bleed into the next chord
        if (hasPad) {
          for (const n of arpNotes) {
            this.playMusicNote(n / 4, barLen * 0.25, padType, 0.08, t);
          }
        }
      }

      // Arpeggio — different patterns per tier
      const arpIdx = localStep % arpNotes.length;
      let freq: number;
      if (isBoss) {
        // Boss: consistent octave for steady drive
        freq = arpNotes[arpIdx] * 2;
      } else if (waveNum <= 4) {
        // Early: gentle ascending pattern — no octave jumps
        freq = arpNotes[arpIdx];
      } else {
        // Mid/Late: consistent single octave for tight rhythm
        freq = arpNotes[arpIdx];
      }

      this.playMusicNote(freq, stepDur * 0.85, arpType, isBoss ? 0.25 : 0.18, t);

      step++;
      this.bgmTimer = window.setTimeout(tick, stepDur * 1000);
    };

    tick();
  }

  stopBGM(): void {
    this.isPlaying = false;
    if (this.bgmTimer !== null) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  private playMusicNote(frequency: number, duration: number, type: OscillatorType, volume: number, time: number): void {
    if (!this.audioContext || !this.musicGain) return;
    const ctx = this.audioContext;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + duration + 0.05);
  }

  private playTone(ctx: AudioContext, time: number, frequency: number, duration: number, type: OscillatorType, volume: number): void {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain ?? ctx.destination);
    osc.start(time);
    osc.stop(time + duration);
  }

  private playNoise(ctx: AudioContext, time: number, duration: number, volume: number): void {
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

    noise.connect(gain);
    gain.connect(this.sfxGain ?? ctx.destination);
    noise.start(time);
  }
}
