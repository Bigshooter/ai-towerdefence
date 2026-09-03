// A chord bar: bass root plus chord tones the pad/arp derive from (frequencies in Hz)
interface BarChord {
  bass: number;
  tones: number[];
}

interface Arrangement {
  stepDur: number; // 16th-note length in seconds
  progression: BarChord[]; // one chord per 16-step bar
  arpType: OscillatorType;
  padType: OscillatorType;
  arpEveryN: number; // arp note every N steps
  arpOctave: number; // frequency multiplier for the arp
  arpVolume: number;
  filterCutoff: number;
  drums: 'none' | 'light' | 'full' | 'double';
}

// Arp index patterns, chosen per wave for variety within a tier
const ARP_PATTERNS: number[][] = [
  [0, 1, 2, 1], // up-down
  [2, 1, 0, 1], // down-up
  [0, 2, 1, 2], // leapfrog
  [1, 0, 2, 0], // pivot
];

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private musicFilter: BiquadFilterNode | null = null;
  private musicDelay: DelayNode | null = null;
  private delaySend: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private isPlaying: boolean = false;
  private bgmTimer: number | null = null;
  private arrangement: Arrangement | null = null;
  private stepIndex: number = 0;
  private nextStepTime: number = 0;
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
      this.musicGain.gain.value = this.musicVolume;
      this.musicGain.connect(this.audioContext.destination);

      // Music chain: instruments -> musicBus -> lowpass filter -> musicGain
      this.musicFilter = this.audioContext.createBiquadFilter();
      this.musicFilter.type = 'lowpass';
      this.musicFilter.frequency.value = 1800;
      this.musicFilter.Q.value = 0.7;
      this.musicFilter.connect(this.musicGain);

      this.musicBus = this.audioContext.createGain();
      this.musicBus.gain.value = 1;
      this.musicBus.connect(this.musicFilter);

      // Tempo-synced feedback delay; arp notes are sent into it for a synthwave echo
      this.musicDelay = this.audioContext.createDelay(1);
      this.musicDelay.delayTime.value = 0.3;
      const feedback = this.audioContext.createGain();
      feedback.gain.value = 0.3;
      this.musicDelay.connect(feedback);
      feedback.connect(this.musicDelay);
      this.musicDelay.connect(this.musicFilter);

      this.delaySend = this.audioContext.createGain();
      this.delaySend.gain.value = 0.35;
      this.delaySend.connect(this.musicDelay);
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
    if (this.musicGain) this.musicGain.gain.value = this.musicVolume;
    try { localStorage.setItem('td_musicVolume', String(this.musicVolume)); } catch { /* ignore */ }
  }

  setSfxVolume(v: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    if (this.sfxGain) this.sfxGain.gain.value = this.sfxVolume;
    try { localStorage.setItem('td_sfxVolume', String(this.sfxVolume)); } catch { /* ignore */ }
  }

  getMusicVolume(): number { return this.musicVolume; }
  getSfxVolume(): number { return this.sfxVolume; }

  playSFX(type: 'shoot' | 'hit' | 'kill' | 'waveStart' | 'bossSpawn' | 'gameOver' | 'click' | 'highScore' | 'scoreSubmit' | 'typeKey'): void {
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
      case 'typeKey':
        this.playTone(ctx, now, 950, 0.02, 'sine', 0.05);
        break;
      case 'highScore':
        this.playTone(ctx, now, 523.25, 0.09, 'triangle', 0.2); // C5
        setTimeout(() => this.playTone(ctx, ctx.currentTime + 0.08, 659.25, 0.09, 'triangle', 0.2), 80); // E5
        setTimeout(() => this.playTone(ctx, ctx.currentTime + 0.16, 783.99, 0.09, 'triangle', 0.2), 160); // G5
        setTimeout(() => this.playTone(ctx, ctx.currentTime + 0.24, 1046.50, 0.22, 'triangle', 0.25), 240); // C6
        break;
      case 'scoreSubmit':
        this.playTone(ctx, now, 880, 0.08, 'triangle', 0.2);
        setTimeout(() => this.playTone(ctx, ctx.currentTime + 0.07, 1174.66, 0.18, 'triangle', 0.2), 70);
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

    const waveNum = waveContext?.waveNumber ?? 1;
    this.arrangement = this.buildArrangement(waveNum, waveContext?.bossWave ?? false);

    // Tempo-synced dotted-eighth delay; filter opens up with intensity
    const now = this.audioContext.currentTime;
    if (this.musicDelay) this.musicDelay.delayTime.setValueAtTime(this.arrangement.stepDur * 3, now);
    if (this.musicFilter) this.musicFilter.frequency.setValueAtTime(this.arrangement.filterCutoff, now);

    // Per-wave arp pattern keeps waves within a tier from sounding identical
    const arpPattern = ARP_PATTERNS[waveNum % ARP_PATTERNS.length];

    this.stepIndex = 0;
    this.nextStepTime = now + 0.06;

    // Lookahead scheduler: the JS timer only queues notes on the AudioContext
    // clock, so timing stays sample-accurate regardless of timer jitter.
    const scheduleAhead = 0.2; // seconds
    const scheduler = () => {
      if (!this.isPlaying || !this.audioContext || !this.arrangement) return;
      while (this.nextStepTime < this.audioContext.currentTime + scheduleAhead) {
        this.scheduleStep(this.stepIndex, this.nextStepTime, arpPattern);
        this.stepIndex++;
        this.nextStepTime += this.arrangement.stepDur;
      }
      this.bgmTimer = window.setTimeout(scheduler, 90);
    };

    scheduler();
  }

  private buildArrangement(waveNum: number, isBoss: boolean): Arrangement {
    // Chords in A minor (frequencies in Hz)
    const Am: BarChord = { bass: 110.00, tones: [220.00, 261.63, 329.63] }; // A2 | A3 C4 E4
    const AmLow: BarChord = { bass: 55.00, tones: [220.00, 261.63, 329.63] }; // A1 | A3 C4 E4
    const F: BarChord = { bass: 87.31, tones: [174.61, 220.00, 261.63] }; // F2 | F3 A3 C4
    const C: BarChord = { bass: 130.81, tones: [261.63, 329.63, 392.00] }; // C3 | C4 E4 G4
    const G: BarChord = { bass: 98.00, tones: [196.00, 246.94, 293.66] }; // G2 | G3 B3 D4
    const E: BarChord = { bass: 82.41, tones: [164.81, 207.65, 246.94] }; // E2 | E3 G#3 B3
    const Dm: BarChord = { bass: 73.42, tones: [146.83, 174.61, 220.00] }; // D2 | D3 F3 A3
    const Bbdim: BarChord = { bass: 58.27, tones: [233.08, 277.18, 329.63] }; // Bb1 | Bb3 Db4 E4

    if (isBoss) {
      // BOSS: fastest tempo, diminished final chord, full kit with double-time hats
      return {
        stepDur: 0.11,
        progression: [AmLow, F, E, Bbdim],
        arpType: 'sawtooth',
        padType: 'square',
        arpEveryN: 1,
        arpOctave: 2,
        arpVolume: 0.22,
        filterCutoff: 5000,
        drums: 'double',
      };
    }
    if (waveNum <= 4) {
      // EARLY: calm and ambient — no drums, gentle 8th-note sine arp
      return {
        stepDur: 0.22,
        progression: [Am, F, C, G],
        arpType: 'sine',
        padType: 'triangle',
        arpEveryN: 2,
        arpOctave: 1,
        arpVolume: 0.14,
        filterCutoff: 1200,
        drums: 'none',
      };
    }
    if (waveNum <= 9) {
      // MID: building tension — Andalusian descent, kick and off-beat hats
      return {
        stepDur: 0.16,
        progression: [Am, G, F, E],
        arpType: 'square',
        padType: 'sawtooth',
        arpEveryN: 1,
        arpOctave: 1,
        arpVolume: 0.16,
        filterCutoff: 2200,
        drums: 'light',
      };
    }
    // LATE: aggressive — sub-bass root, full kit, sawtooth arp
    return {
      stepDur: 0.13,
      progression: [AmLow, F, Dm, E],
      arpType: 'sawtooth',
      padType: 'square',
      arpEveryN: 1,
      arpOctave: 2,
      arpVolume: 0.18,
      filterCutoff: 3500,
      drums: 'full',
    };
  }

  /** Schedule one 16th-note step of the sequence at an absolute AudioContext time. */
  private scheduleStep(step: number, t: number, arpPattern: number[]): void {
    const a = this.arrangement;
    if (!a) return;

    const stepsPerBar = 16;
    const bar = Math.floor(step / stepsPerBar) % a.progression.length;
    const chord = a.progression[bar];
    const local = step % stepsPerBar;
    const barLen = a.stepDur * stepsPerBar;

    // Downbeat: bass root held for the bar + soft pad an octave below the chord
    if (local === 0) {
      this.playMusicNote(chord.bass, barLen * 0.95, 'triangle', 0.55, t);
      for (const tone of chord.tones) {
        this.playMusicNote(tone / 2, barLen * 0.9, a.padType, 0.05, t);
      }
    }

    // Drums
    if (a.drums !== 'none') {
      if (local % 4 === 0) this.playKick(t); // four-on-the-floor
      if ((a.drums === 'full' || a.drums === 'double') && (local === 4 || local === 12)) {
        this.playSnare(t);
      }
      if (a.drums === 'double' ? true : local % 2 === 1) this.playHat(t); // off-beat hats, double-time on boss
    }

    // Arpeggio follows the current chord, echoed via the delay send
    if (local % a.arpEveryN === 0) {
      const patternIdx = Math.floor(local / a.arpEveryN) % arpPattern.length;
      const freq = chord.tones[arpPattern[patternIdx]] * a.arpOctave;
      this.playMusicNote(freq, a.stepDur * a.arpEveryN * 0.9, a.arpType, a.arpVolume, t, true);
    }
  }

  stopBGM(): void {
    this.isPlaying = false;
    if (this.bgmTimer !== null) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  private playMusicNote(frequency: number, duration: number, type: OscillatorType, volume: number, time: number, echo: boolean = false): void {
    if (!this.audioContext || !this.musicBus) return;
    const ctx = this.audioContext;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(gain);
    gain.connect(this.musicBus);
    if (echo && this.delaySend) gain.connect(this.delaySend);
    osc.start(time);
    osc.stop(time + duration + 0.05);
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (!this.noiseBuffer) {
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }
    return this.noiseBuffer;
  }

  private playKick(time: number): void {
    if (!this.audioContext || !this.musicBus) return;
    const ctx = this.audioContext;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.9, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);

    osc.connect(gain);
    gain.connect(this.musicBus);
    osc.start(time);
    osc.stop(time + 0.2);
  }

  private playSnare(time: number): void {
    if (!this.audioContext || !this.musicBus) return;
    const ctx = this.audioContext;

    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1500;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.15);
    noise.connect(hp);
    hp.connect(noiseGain);
    noiseGain.connect(this.musicBus);
    noise.start(time);
    noise.stop(time + 0.16);

    // Short tonal body under the noise
    this.playMusicNote(180, 0.09, 'triangle', 0.25, time);
  }

  private playHat(time: number): void {
    if (!this.audioContext || !this.musicBus) return;
    const ctx = this.audioContext;

    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 6000;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);
    noise.connect(hp);
    hp.connect(gain);
    gain.connect(this.musicBus);
    noise.start(time);
    noise.stop(time + 0.05);
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
