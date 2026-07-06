// Core game types and interfaces

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Entity {
  id: string;
  position: Position;
  size: Size;
  alive: boolean;
}

// Tower types
export type TowerType = 'archer' | 'cannon' | 'sniper' | 'ice';

export interface TowerStats {
  damage: number;
  range: number;
  fireRate: number; // attacks per second
  cost: number;
  splashRadius?: number;
  slowFactor?: number;
  slowDuration?: number;
}

// Enemy types
export type EnemyType = 'normal' | 'speed' | 'armored' | 'regenerating' | 'boss';

export interface EnemyStats {
  hp: number;
  speed: number; // pixels per second
  reward: number;
  armor?: number;
  regenRate?: number; // HP per second
}

// Projectile types
export type ProjectileType = 'arrow' | 'cannonball' | 'laser' | 'ice';

export interface ProjectileStats {
  damage: number;
  speed: number;
  splashRadius?: number;
  slowFactor?: number;
  slowDuration?: number;
}

// Wave configuration
export interface WaveConfig {
  waveNumber: number;
  enemies: EnemyType[];
  spawnInterval: number; // seconds between spawns
  bossWave: boolean;
}

// Game state
export type GameState = 'menu' | 'playing' | 'paused' | 'waveComplete' | 'gameOver';

export interface GameData {
  lives: number;
  gold: number;
  wave: number;
  score: number;
}
