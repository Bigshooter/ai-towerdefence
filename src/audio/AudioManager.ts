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

  startBGM(): void {
    if (!this.audioContext || this.isPlaying) return;
    if (this.audioContext.state === 'suspended') this.audioContext.resume();
    this.isPlaying = true;

    const stepDur = 0.28;      // seconds per arpeggio step
    const stepsPerChord = 8;   // one bar per chord
    let step = 0;

    const tick = () => {
      if (!this.isPlaying || !this.audioContext) return;
      const ctx = this.audioContext;
      const t = ctx.currentTime;
      const chord = BGM_CHORDS[Math.floor(step / stepsPerChord) % BGM_CHORDS.length];
      const localStep = step % stepsPerChord;
      const barLen = stepDur * stepsPerChord;

      // On the downbeat of each bar: warm bass note + soft sustained pad
      if (localStep === 0) {
        this.playMusicNote(chord.bass, barLen * 0.95, 'triangle', 0.55, t);
        for (const n of chord.notes) {
          this.playMusicNote(n / 2, barLen * 0.95, 'sine', 0.16, t);
        }
      }

      // Gentle square-wave arpeggio walking through the chord
      const arp = chord.notes[localStep % chord.notes.length];
      const freq = localStep % 4 === 3 ? arp * 2 : arp;
      this.playMusicNote(freq, stepDur * 0.9, 'square', 0.2, t);

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
