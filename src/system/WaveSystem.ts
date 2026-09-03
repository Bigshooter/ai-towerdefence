import { EnemyType, WaveConfig } from '../types';

export interface WaveEvents {
  waveStarted?: WaveConfig;
  spawned?: EnemyType;
  waveComplete?: boolean;
}

export class WaveSystem {
  private spawnQueue: EnemyType[] = [];
  private spawnTimer: number = 0;
  private spawnInterval: number = 1;
  private pendingWave: number = 0;
  private interWaveTimer: number = 0;
  private spawningComplete: boolean = false;

  private prngState: number = 12345;

  public setSeed(seed: number): void {
    this.prngState = seed >>> 0;
  }

  private nextRandom(): number {
    // Linear Congruential Generator (deterministic across clients)
    this.prngState = (this.prngState * 1664525 + 1013904223) >>> 0;
    return (this.prngState >>> 0) / 4294967296;
  }

  generateWave(waveNumber: number): WaveConfig {
    const enemies: EnemyType[] = [];
    
    // Scale difficulty based on wave
    const baseCount = Math.floor(5 + waveNumber * 1.5);
    const bossWave = waveNumber % 5 === 0;

    for (let i = 0; i < baseCount; i++) {
      if (waveNumber <= 3) {
        enemies.push('normal');
      } else if (waveNumber <= 6) {
        enemies.push(this.nextRandom() > 0.5 ? 'normal' : 'speed');
      } else if (waveNumber <= 10) {
        const rand = this.nextRandom();
        if (rand < 0.4) enemies.push('normal');
        else if (rand < 0.7) enemies.push('speed');
        else enemies.push('armored');
      } else {
        const rand = this.nextRandom();
        if (rand < 0.3) enemies.push('normal');
        else if (rand < 0.5) enemies.push('speed');
        else if (rand < 0.75) enemies.push('armored');
        else enemies.push('regenerating');
      }
    }

    if (bossWave) {
      enemies.push('boss');
    }

    const spawnInterval = Math.max(0.3, 1 - waveNumber * 0.02);

    return {
      waveNumber,
      enemies,
      spawnInterval,
      bossWave,
    };
  }

  /** Queue a wave to start after a delay; timing advances via update(dt). */
  scheduleWave(waveNumber: number, delaySeconds: number, customConfig?: WaveConfig): void {
    this.pendingWave = waveNumber;
    this.interWaveTimer = delaySeconds;
    if (customConfig) {
      this.pendingConfig = customConfig;
    } else {
      this.pendingConfig = null;
    }
  }

  private pendingConfig: WaveConfig | null = null;

  update(dt: number, aliveEnemies: number): WaveEvents {
    const events: WaveEvents = {};

    if (this.interWaveTimer > 0) {
      this.interWaveTimer -= dt;
      if (this.interWaveTimer <= 0) {
        this.interWaveTimer = 0;
        events.waveStarted = this.startWave(this.pendingWave, this.pendingConfig);
      }
    }

    if (this.spawnQueue.length > 0) {
      this.spawnTimer += dt;
      if (this.spawnTimer >= this.spawnInterval) {
        this.spawnTimer -= this.spawnInterval;
        events.spawned = this.spawnQueue.shift();
        if (this.spawnQueue.length === 0) {
          this.spawningComplete = true;
        }
      }
    }

    // Complete once everything has spawned and the field is clear
    if (this.spawningComplete && aliveEnemies === 0 && !events.spawned) {
      this.spawningComplete = false;
      events.waveComplete = true;
    }

    return events;
  }

  private startWave(waveNumber: number, customConfig: WaveConfig | null = null): WaveConfig {
    const config = customConfig ?? this.generateWave(waveNumber);
    this.spawnQueue = [...config.enemies];
    this.spawnInterval = config.spawnInterval;
    this.spawnTimer = 0;
    this.spawningComplete = false;
    return config;
  }
}
