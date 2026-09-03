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

export type GameMode = 'solo' | 'multiplayer';

export type PlayerRole = 'p1' | 'p2';

export interface GamertagState {
  tag: string;
  isConfirmed: boolean;
}

export interface MultiplayerRoom {
  id: string;
  hostTag: string;
  guestTag?: string;
  mapType: MapType;
  difficulty: DifficultyMode;
  status: 'waiting' | 'ready' | 'starting' | 'in_game';
  hostReady: boolean;
  guestReady: boolean;
  createdAt: number;
}

export interface PlayerCombatStats {
  totalDamage: number;
  waveDamage: number;
  kills: number;
  damageByTowerType: Record<TowerType, number>;
}

export interface MultiplayerCombatState {
  p1: PlayerCombatStats;
  p2: PlayerCombatStats;
}

export interface EnemySnapshot {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  waypointIndex: number;
  slowFactor: number;
  alive: boolean;
}

export interface ProjectileSnapshot {
  id: string;
  type: ProjectileType;
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  level: number;
  alive: boolean;
}

export interface TowerSnapshot {
  id: string;
  type: TowerType;
  x: number;
  y: number;
  level: number;
  ownerRole?: PlayerRole;
  ownerTag?: string;
  targetId?: string | null;
}

export interface HostStateSnapshot {
  frame: number;
  wave: number;
  lives: number;
  score: number;
  gameState: GameState;
  bannerTimer: number;
  bannerWave: number;
  p1Gold: number;
  p2Gold: number;
  p1Stats: PlayerCombatStats;
  p2Stats: PlayerCombatStats;
  enemies: EnemySnapshot[];
  projectiles: ProjectileSnapshot[];
  towers: TowerSnapshot[];
}

export type NetworkMessage =
  | { type: 'QUERY_ROOMS' }
  | { type: 'ANNOUNCE_ROOM'; room: MultiplayerRoom }
  | { type: 'JOIN_ROOM'; roomId: string; guestTag: string }
  | { type: 'JOIN_ACCEPTED'; room: MultiplayerRoom }
  | { type: 'LEAVE_ROOM'; roomId: string; role: PlayerRole }
  | { type: 'TOGGLE_READY'; roomId: string; role: PlayerRole; ready: boolean }
  | { type: 'START_MATCH'; roomId: string; seed: number; mapType: MapType; difficulty: DifficultyMode; p1Tag: string; p2Tag: string }
  | { type: 'PLACE_TOWER'; roomId: string; role: PlayerRole; towerType: TowerType; col: number; row: number; towerId: string }
  | { type: 'UPGRADE_TOWER'; roomId: string; role: PlayerRole; towerId: string }
  | { type: 'SELL_TOWER'; roomId: string; role: PlayerRole; towerId: string }
  | { type: 'START_WAVE'; roomId: string; role: PlayerRole; waveNumber: number; config?: WaveConfig }
  | { type: 'SET_GAME_SPEED'; roomId: string; role: PlayerRole; speed: GameSpeed }
  | { type: 'PAUSE_GAME'; roomId: string; role: PlayerRole; paused: boolean }
  | { type: 'CURSOR_MOVE'; roomId: string; role: PlayerRole; col: number; row: number; canvasX: number; canvasY: number }
  | { type: 'PING_TILE'; roomId: string; role: PlayerRole; col: number; row: number }
  | { type: 'SYNC_STATE'; roomId: string; role: PlayerRole; frame: number; wave: number; lives: number; p1Gold: number; p2Gold: number; p1Damage: number; p2Damage: number }
  | { type: 'HOST_SNAPSHOT'; roomId: string; snapshot: HostStateSnapshot };

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

