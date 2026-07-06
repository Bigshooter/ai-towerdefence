export class AudioManager {
  private audioContext: AudioContext | null = null;
  private bgmOscillators: OscillatorNode[] = [];
  private bgmGain: GainNode | null = null;
  private isPlaying: boolean = false;

  init(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  playSFX(type: 'shoot' | 'hit' | 'kill' | 'waveStart' | 'bossSpawn' | 'gameOver' | 'click'): void {
    if (!this.audioContext) return;

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
    this.isPlaying = true;

    const ctx = this.audioContext;
    this.bgmGain = ctx.createGain();
    this.bgmGain.gain.value = 0.08;
    this.bgmGain.connect(ctx.destination);

    // Simple chiptune melody using oscillators
    const notes = [261, 293, 329, 349, 392, 440, 493, 523]; // C major scale
    let noteIndex = 0;

    const playNote = () => {
      if (!this.isPlaying || !ctx) return;

      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = notes[noteIndex % notes.length];

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      gain.connect(this.bgmGain!);

      osc.connect(gain);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);

      noteIndex++;
      setTimeout(playNote, 250);
    };

    playNote();
  }

  stopBGM(): void {
    this.isPlaying = false;
    if (this.bgmGain) {
      this.bgmGain.gain.exponentialRampToValueAtTime(0.001, this.audioContext!.currentTime + 0.5);
    }
  }

  private playTone(ctx: AudioContext, time: number, frequency: number, duration: number, type: OscillatorType, volume: number): void {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
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
    gain.connect(ctx.destination);
    noise.start(time);
  }
}
