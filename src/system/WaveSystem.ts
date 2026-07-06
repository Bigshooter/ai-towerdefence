import { EnemyType, WaveConfig } from '../types';

export class WaveSystem {
  private currentWave: number = 0;
  private enemiesToSpawn: EnemyType[] = [];
  private spawnTimer: number = 0;
  private waveInProgress: boolean = false;
  private waveCompleteTimer: number = 0;
  private wavePauseDuration: number = 3; // seconds between waves

  generateWave(waveNumber: number): WaveConfig {
    this.currentWave = waveNumber;
    const enemies: EnemyType[] = [];
    
    // Scale difficulty based on wave
    const baseCount = Math.floor(5 + waveNumber * 1.5);
    const bossWave = waveNumber % 5 === 0;

    for (let i = 0; i < baseCount; i++) {
      if (waveNumber <= 3) {
        enemies.push('normal');
      } else if (waveNumber <= 6) {
        enemies.push(Math.random() > 0.5 ? 'normal' : 'speed');
      } else if (waveNumber <= 10) {
        const rand = Math.random();
        if (rand < 0.4) enemies.push('normal');
        else if (rand < 0.7) enemies.push('speed');
        else enemies.push('armored');
      } else {
        const rand = Math.random();
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

  startNextWave(): void {
    this.waveInProgress = true;
    const config = this.generateWave(this.currentWave + 1);
    this.enemiesToSpawn = [...config.enemies];
    this.spawnTimer = 0;
  }

  update(dt: number): { spawnedEnemy?: EnemyType, waveComplete?: boolean } | null {
    if (!this.waveInProgress) return null;

    // Spawn enemies
    if (this.enemiesToSpawn.length > 0) {
      this.spawnTimer += dt;
      const config = this.generateWave(this.currentWave);
      
      if (this.spawnTimer >= config.spawnInterval) {
        this.spawnTimer = 0;
        const enemy = this.enemiesToSpawn.shift()!;
        return { spawnedEnemy: enemy };
      }
    }

    // Check if wave is complete
    if (this.enemiesToSpawn.length === 0) {
      this.waveCompleteTimer += dt;
      if (this.waveCompleteTimer >= this.wavePauseDuration) {
        this.waveInProgress = false;
        this.waveCompleteTimer = 0;
        return { waveComplete: true };
      }
    }

    return null;
  }

  isWaveInProgress(): boolean {
    return this.waveInProgress;
  }

  getEnemiesRemaining(): number {
    return this.enemiesToSpawn.length;
  }

  getCurrentWave(): number {
    return this.currentWave;
  }

  canStartNextWave(): boolean {
    return !this.waveInProgress && this.enemiesToSpawn.length === 0;
  }
}
