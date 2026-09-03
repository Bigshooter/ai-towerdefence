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
export type TowerType = 'archer' | 'cannon' | 'sniper' | 'ice' | 'flamethrower';

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
export type ProjectileType = 'arrow' | 'cannonball' | 'laser' | 'ice' | 'flame';

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

export type DifficultyMode = 'easy' | 'medium' | 'hard';

export type MapType = 'space' | 'dungeon' | 'military';

export interface MapDefinition {
  id: MapType;
  name: string;
  description: string;
  backgroundColor: string;
}

export interface GameData {
  lives: number;
  gold: number;
  wave: number;
  score: number;
}

export interface HighScoreEntry {
  id: string;
  name: string; // 1-6 characters, uppercase alphanumeric
  score: number;
  wave: number;
  difficulty: DifficultyMode;
  mapType: MapType;
  timestamp: number; // Unix epoch ms
}

export type GameSpeed = 1 | 2 | 3 | 5;

export const AVAILABLE_GAME_SPEEDS: readonly GameSpeed[] = [1, 2, 3, 5] as const;

export type Leaderboards = Record<MapType, HighScoreEntry[]>;

