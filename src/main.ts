import { GameLoop } from './engine/GameLoop';
import { CollisionSystem } from './engine/CollisionSystem';
import { TileMap } from './map/TileMap';
import { Enemy } from './entities/Enemy';
import { Tower, TOWER_STATS } from './entities/Tower';
import { Projectile } from './entities/Projectile';
import { WaveSystem } from './system/WaveSystem';
import { EconomySystem } from './system/EconomySystem';
import { UpgradeOption, UpgradeSystem } from './system/UpgradeSystem';
import { HealthSystem } from './system/HealthSystem';
import { HighScoreSystem } from './system/HighScoreSystem';
import { DamageCalculator } from './system/DamageCalculator';
import { UIManager } from './ui/UIManager';
import { AudioManager } from './audio/AudioManager';
import { SpaceSprites } from './visuals/SpaceSprites';
import { MultiplayerNetwork } from './network/MultiplayerNetwork';
import { DifficultyMode, EnemySnapshot, GameData as IGameData, GameMode, GameSpeed, GameState, EnemyType, HostStateSnapshot, MapType, MultiplayerRoom, NetworkMessage, PlayerRole, Position, ProjectileSnapshot, TowerSnapshot, TowerType, WaveConfig } from './types';

interface GameData {
  lives: number;
  gold: number;
  wave: number;
  score: number;
}

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameLoop!: GameLoop;
  private tileMap = new TileMap();
  private waveSystem = new WaveSystem();
  private economySystem = new EconomySystem(150);
  private upgradeSystem = new UpgradeSystem();
  private healthSystem = new HealthSystem(20, 20);
  private highScoreSystem = new HighScoreSystem();
  private damageCalculator = new DamageCalculator();
  private uiManager!: UIManager;
  private audioManager = new AudioManager();
  private network = new MultiplayerNetwork();

  // Game state
  private gameState: GameState = 'menu';
  private gameMode: GameMode = 'solo';
  private gameSpeed: GameSpeed = 1;
  private gameData: GameData = { lives: 20, gold: 150, wave: 1, score: 0 };
  private enemies: Enemy[] = [];
  private towers: Tower[] = [];
  private projectiles: Projectile[] = [];
  private effects: Effect[] = [];

  // Multiplayer tracking
  private isHost: boolean = true;
  private localRole: PlayerRole = 'p1';
  private p1Tag: string = 'HOST';
  private p2Tag: string = 'GUEST';
  private currentRoomId: string | null = null;
  private countdownTimer: number | null = null;
  private rngSeed: number = 12345;

  // Wave tracking
  private waypoints: Position[] = [];
  private wavePauseDuration: number = 3;
  private bannerTimer: number = 0;
  private bannerWave: number = 0;
  private difficultyMode: DifficultyMode = 'easy';
  private difficultyHpMultiplier: number = 1;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    
    // Set canvas size
    this.canvas.width = 1280;
    this.canvas.height = 960;

    this.init();
  }

  private init(): void {
    // Initialize audio
    this.audioManager.init();

    // Cache waypoints for map
    this.waypoints = this.tileMap.getWaypoints();

    // Initialize UI manager
    this.uiManager = new UIManager(this.canvas);
    this.setupUICallbacks();
    this.setupNetworkCallbacks();

    // Start game loop
    this.gameLoop = new GameLoop(
      this.canvas,
      (dt) => this.update(dt),
      () => this.render()
    );
    this.gameLoop.start();

    // Test hooks; gameData is mutated in place so the reference stays live
    (window as any).game = this;
    (window as any).gameData = this.gameData;
    (window as any).uiManager = this.uiManager;
    (window as any).highScoreSystem = this.highScoreSystem;
    (window as any).damageCalculator = this.damageCalculator;
    (window as any).network = this.network;
    (window as any).SpaceSprites = SpaceSprites;
  }

  private setupNetworkCallbacks(): void {
    this.network.subscribe((msg: NetworkMessage) => {
      this.handleNetworkMessage(msg);
    });
  }

  private handleNetworkMessage(msg: NetworkMessage): void {
    switch (msg.type) {
      case 'ANNOUNCE_ROOM': {
        const rooms = this.uiManager.getOpenRooms();
        const existingIdx = rooms.findIndex((r) => r.id === msg.room.id);
        if (existingIdx >= 0) {
          rooms[existingIdx] = msg.room;
        } else {
          rooms.push(msg.room);
        }
        this.uiManager.setOpenRooms(rooms);
        break;
      }
      case 'JOIN_ACCEPTED': {
        if (this.localRole === 'p2') {
          this.currentRoomId = msg.room.id;
          this.uiManager.setMultiplayerRoom(msg.room);
          this.uiManager.setLocalPlayerRole('p2');
          this.uiManager.setP1Tag(msg.room.hostTag);
          this.uiManager.setP2Tag(msg.room.guestTag || this.uiManager.getGamertag());
          this.uiManager.setActiveMenuScreen('multiplayer_waiting_room');
          this.audioManager.playSFX('click');
        } else if (this.localRole === 'p1') {
          this.uiManager.setMultiplayerRoom(msg.room);
          this.uiManager.setP2Tag(msg.room.guestTag || 'GUEST');
          this.audioManager.playSFX('click');
        }
        break;
      }
      case 'LEAVE_ROOM': {
        if (msg.role === 'p2' && this.localRole === 'p1') {
          const room = this.uiManager.getMultiplayerRoom();
          if (room) {
            room.guestTag = undefined;
            room.guestReady = false;
            room.status = 'waiting';
            this.uiManager.setMultiplayerRoom(room);
          }
          this.countdownTimer = null;
          this.uiManager.setMatchCountdown(null);
        } else if (msg.role === 'p1' && this.localRole === 'p2') {
          this.currentRoomId = null;
          this.uiManager.setMultiplayerRoom(null);
          this.uiManager.setActiveMenuScreen('multiplayer_hub');
        }
        break;
      }
      case 'TOGGLE_READY': {
        const room = this.uiManager.getMultiplayerRoom();
        if (room && room.id === msg.roomId) {
          if (msg.role === 'p1') {
            room.hostReady = msg.ready;
          } else {
            room.guestReady = msg.ready;
          }
          this.uiManager.setMultiplayerRoom(room);

          // If both are ready and I am host, start countdown
          if (this.isHost && room.hostReady && room.guestReady && this.countdownTimer === null) {
            this.startLaunchCountdown();
          }
        }
        break;
      }
      case 'START_MATCH': {
        this.startNewCoopGame(
          msg.mapType,
          msg.difficulty,
          msg.p1Tag,
          msg.p2Tag,
          this.localRole === 'p1',
          msg.seed
        );
        break;
      }
      case 'PLACE_TOWER': {
        if (msg.role !== this.localRole) {
          this.handleRemotePlaceTower(msg.towerType, msg.col, msg.row, msg.role, msg.towerId);
        }
        break;
      }
      case 'UPGRADE_TOWER': {
        if (msg.role !== this.localRole) {
          this.handleRemoteUpgradeTower(msg.towerId, msg.role);
        }
        break;
      }
      case 'SELL_TOWER': {
        if (msg.role !== this.localRole) {
          this.handleRemoteSellTower(msg.towerId, msg.role);
        }
        break;
      }
      case 'START_WAVE': {
        if (msg.role !== this.localRole) {
          this.gameData.wave = msg.waveNumber;
          this.bannerWave = msg.waveNumber - 1;
          this.bannerTimer = 2;
          this.damageCalculator.resetWaveDamage();
          this.waveSystem.scheduleWave(msg.waveNumber, this.wavePauseDuration, msg.config);
        }
        break;
      }
      case 'SET_GAME_SPEED': {
        if (msg.role !== this.localRole) {
          this.gameSpeed = msg.speed;
          this.uiManager.setGameSpeed(msg.speed);
        }
        break;
      }
      case 'PAUSE_GAME': {
        if (msg.role !== this.localRole) {
          if (msg.paused && this.gameState === 'playing') {
            this.togglePause();
          } else if (!msg.paused && this.gameState === 'paused') {
            this.togglePause();
          }
        }
        break;
      }
      case 'CURSOR_MOVE': {
        if (msg.role !== this.localRole) {
          const tag = msg.role === 'p1' ? this.p1Tag : this.p2Tag;
          this.uiManager.setRemoteCursor({
            col: msg.col,
            row: msg.row,
            canvasX: msg.canvasX,
            canvasY: msg.canvasY,
            tag,
            visible: true,
          });
        }
        break;
      }
      case 'PING_TILE': {
        if (msg.role !== this.localRole) {
          this.uiManager.addPing(msg.col, msg.row, msg.role);
          this.audioManager.playSFX('click');
        }
        break;
      }
      case 'HOST_SNAPSHOT': {
        if (!this.isHost && this.localRole === 'p2' && this.gameState === 'playing') {
          this.handleHostSnapshot(msg.snapshot);
        }
        break;
      }
    }
  }

  private startLaunchCountdown(): void {
    this.countdownTimer = 3;
    this.uiManager.setMatchCountdown(3);

    const interval = window.setInterval(() => {
      if (this.countdownTimer !== null) {
        this.countdownTimer--;
        this.uiManager.setMatchCountdown(this.countdownTimer);

        if (this.countdownTimer <= 0) {
          clearInterval(interval);
          this.countdownTimer = null;
          this.uiManager.setMatchCountdown(null);

          const room = this.uiManager.getMultiplayerRoom();
          const seed = Date.now();
          const map = room?.mapType || 'space';
          const diff = room?.difficulty || 'easy';
          const p1 = room?.hostTag || this.uiManager.getGamertag();
          const p2 = room?.guestTag || 'PLAYER 2';

          this.network.broadcast({
            type: 'START_MATCH',
            roomId: room?.id || 'ROOM',
            seed,
            mapType: map,
            difficulty: diff,
            p1Tag: p1,
            p2Tag: p2,
          });

          this.startNewCoopGame(map, diff, p1, p2, true, seed);
        }
      } else {
        clearInterval(interval);
      }
    }, 800);
  }

  private setupUICallbacks(): void {
    this.uiManager.onPlaceTower = (type, col, row) => {
      return this.placeTower(type, col, row);
    };

    this.uiManager.onSelectTower = (col, row) => {
      this.selectTower(col, row);
    };

    this.uiManager.onUpgradeTower = () => {
      this.upgradeSelectedTower();
    };

    this.uiManager.onSellTower = () => {
      this.sellSelectedTower();
    };

    this.uiManager.onResetGame = () => {
      this.resetToMenu();
    };

    this.uiManager.onGetTowerInfo = () => {
      const towerId = this.uiManager.getSelectedTowerId();
      if (!towerId) return null;
      const tower = this.towers.find(t => t.id === towerId);
      if (!tower) return null;

      const options = this.upgradeSystem.getUpgradeOptions(tower);
      const canUpgrade = tower.data.level < 5 && options.length > 0;
      const nextOption = canUpgrade ? options[0] : null;
      const upgradeCost = nextOption ? nextOption.cost : 0;
      const sellValue = this.upgradeSystem.sellTower(tower);
      const upgradePreview = nextOption ? this.getUpgradePreview(tower, nextOption) : 'MAX';
      return { level: tower.data.level, upgradeCost, sellValue, canUpgrade, upgradePreview };
    };

    this.uiManager.onStartGame = (difficulty, mapType) => {
      this.startNewGame(difficulty, mapType);
    };

    this.uiManager.onSelectMap = (mapType) => {
      this.tileMap.setMap(mapType);
      this.waypoints = this.tileMap.getWaypoints();
    };

    this.uiManager.onPauseGame = () => {
      this.togglePause();
      if (this.gameMode === 'multiplayer' && this.currentRoomId) {
        this.network.broadcast({
          type: 'PAUSE_GAME',
          roomId: this.currentRoomId,
          role: this.localRole,
          paused: this.gameState === 'paused',
        });
      }
    };

    this.uiManager.onSetGameSpeed = (speed) => {
      this.gameSpeed = speed;
      if (this.gameMode === 'multiplayer' && this.currentRoomId) {
        this.network.broadcast({
          type: 'SET_GAME_SPEED',
          roomId: this.currentRoomId,
          role: this.localRole,
          speed,
        });
      }
    };

    this.uiManager.onCreateMultiplayerRoom = (mapType, difficulty) => {
      const myTag = this.uiManager.getGamertag();
      this.isHost = true;
      this.localRole = 'p1';
      this.p1Tag = myTag;
      this.uiManager.setP1Tag(myTag);
      this.uiManager.setLocalPlayerRole('p1');
      const room = this.network.createRoom(myTag, mapType, difficulty);
      this.currentRoomId = room.id;
      this.uiManager.setMultiplayerRoom(room);
      this.uiManager.setActiveMenuScreen('multiplayer_waiting_room');
    };

    this.uiManager.onJoinMultiplayerRoom = (roomId) => {
      const myTag = this.uiManager.getGamertag();
      this.isHost = false;
      this.localRole = 'p2';
      this.p2Tag = myTag;
      this.uiManager.setP2Tag(myTag);
      this.uiManager.setLocalPlayerRole('p2');
      this.currentRoomId = roomId;
      this.network.requestJoinRoom(roomId, myTag);
    };

    this.uiManager.onQueryRooms = () => {
      this.uiManager.setOpenRooms([]);
      this.network.queryOpenRooms();
    };

    this.uiManager.onLeaveMultiplayerRoom = () => {
      this.network.leaveCurrentRoom();
      this.currentRoomId = null;
      this.uiManager.setMultiplayerRoom(null);
      this.countdownTimer = null;
      this.uiManager.setMatchCountdown(null);
    };

    this.uiManager.onToggleMultiplayerReady = (ready) => {
      this.network.toggleReady(ready);
      const room = this.uiManager.getMultiplayerRoom();
      if (room) {
        if (this.localRole === 'p1') room.hostReady = ready;
        else room.guestReady = ready;
        this.uiManager.setMultiplayerRoom(room);

        // If I am Host and both players are ready, start countdown immediately
        if (this.isHost && room.hostReady && room.guestReady && this.countdownTimer === null) {
          this.startLaunchCountdown();
        }
      }
    };

    this.uiManager.onPingTile = (col, row) => {
      this.uiManager.addPing(col, row, this.localRole);
      if (this.currentRoomId) {
        this.network.broadcast({
          type: 'PING_TILE',
          roomId: this.currentRoomId,
          role: this.localRole,
          col,
          row,
        });
      }
    };

    this.uiManager.onSendCursorMove = (col, row, canvasX, canvasY) => {
      if (this.currentRoomId) {
        this.network.broadcast({
          type: 'CURSOR_MOVE',
          roomId: this.currentRoomId,
          role: this.localRole,
          col,
          row,
          canvasX,
          canvasY,
        });
      }
    };

    this.uiManager.onSetMusicVolume = (v) => {
      this.audioManager.setMusicVolume(v);
    };

    this.uiManager.onSetSfxVolume = (v) => {
      this.audioManager.setSfxVolume(v);
    };

    this.uiManager.onGetVolumes = () => ({
      music: this.audioManager.getMusicVolume(),
      sfx: this.audioManager.getSfxVolume(),
    });

    this.uiManager.onPreviewSfx = () => {
      this.audioManager.playSFX('click');
    };

    this.uiManager.onGetGameData = () => this.gameData;

    this.uiManager.onCheckHighScore = (score, map) => {
      return this.highScoreSystem.isHighScore(map, score);
    };

    this.uiManager.onGetLeaderboard = (map) => {
      return this.highScoreSystem.getScores(map);
    };

    this.uiManager.onSubmitHighScore = (name, score, wave, difficulty, map) => {
      const entry = this.highScoreSystem.addScore(
        map ?? this.tileMap.getMapType(),
        name,
        score ?? this.gameData.score,
        wave ?? this.gameData.wave,
        difficulty ?? this.difficultyMode
      );
      this.audioManager.playSFX('scoreSubmit');
      return entry;
    };

    this.uiManager.onPreviewTypeKey = () => {
      this.audioManager.playSFX('typeKey');
    };

    this.uiManager.onGetCombatStats = () => ({
      p1: this.damageCalculator.getStats('p1'),
      p2: this.damageCalculator.getStats('p2'),
      split: this.damageCalculator.getContributionSplit(),
      waveLeader: this.damageCalculator.getWaveLeader(this.p1Tag, this.p2Tag),
    });
  }

  private fmtStat(value: number): string {
    return Number.isInteger(value) ? `${value}` : value.toFixed(1);
  }

  private getUpgradePreview(tower: Tower, option: UpgradeOption): string {
    switch (option.type) {
      case 'damage': {
        const delta = tower.data.damage * 0.2;
        return `DMG +${this.fmtStat(delta)}`;
      }
      case 'range': {
        const delta = tower.data.range * 0.1;
        return `RNG +${this.fmtStat(delta)}`;
      }
      case 'fireRate': {
        const delta = tower.data.fireRate * 0.1;
        return `SPD +${this.fmtStat(delta)}`;
      }
      case 'special':
        if (tower.data.type === 'cannon') return 'SPLASH +30%';
        if (tower.data.type === 'ice') return 'SLOW +50%';
        if (tower.data.type === 'sniper') return 'ARMR +25%';
        if (tower.data.type === 'archer') return 'POISON';
        return option.name.toUpperCase();
    }
  }

  private getDifficultyHpMultiplier(mode: DifficultyMode): number {
    if (mode === 'medium') return 2;
    if (mode === 'hard') return 3;
    return 1;
  }

  public startNewGame(difficulty: DifficultyMode = 'easy', mapType: MapType = 'space'): void {
    this.gameMode = 'solo';
    this.uiManager.setGameMode('solo');
    this.difficultyMode = difficulty;
    this.difficultyHpMultiplier = this.getDifficultyHpMultiplier(difficulty);

    this.tileMap.setMap(mapType);
    this.waypoints = this.tileMap.getWaypoints();

    // Reset game state
    this.gameState = 'playing';
    this.uiManager.setGameState('playing');
    Object.assign(this.gameData, { lives: 20, gold: 150, wave: 1, score: 0 });
    this.enemies = [];
    this.towers = [];
    this.projectiles = [];
    this.effects = [];
    this.waveSystem = new WaveSystem();
    this.waveSystem.setSeed(Date.now());
    this.economySystem = new EconomySystem(150);
    this.economySystem.setMultiplayer(false);
    this.healthSystem = new HealthSystem(20, 20);
    this.damageCalculator.reset();
    this.damageCalculator.setMultiplayer(false);
    this.bannerTimer = 0;

    // Brief delay before the first wave
    this.waveSystem.scheduleWave(1, 1);

    // Start BGM
    this.audioManager.startBGM();
  }

  public startNewCoopGame(
    mapType: MapType = 'space',
    difficulty: DifficultyMode = 'easy',
    p1Tag: string = 'HOST',
    p2Tag: string = 'GUEST',
    isHost: boolean = true,
    seed: number = Date.now()
  ): void {
    this.gameMode = 'multiplayer';
    this.uiManager.setGameMode('multiplayer');
    this.isHost = isHost;
    this.localRole = isHost ? 'p1' : 'p2';
    this.p1Tag = p1Tag;
    this.p2Tag = p2Tag;
    this.uiManager.setP1Tag(p1Tag);
    this.uiManager.setP2Tag(p2Tag);
    this.uiManager.setLocalPlayerRole(this.localRole);
    this.rngSeed = seed;

    this.difficultyMode = difficulty;
    this.difficultyHpMultiplier = this.getDifficultyHpMultiplier(difficulty);

    this.tileMap.setMap(mapType);
    this.waypoints = this.tileMap.getWaypoints();

    // Reset game state
    this.gameState = 'playing';
    this.uiManager.setGameState('playing');
    Object.assign(this.gameData, { lives: 20, gold: 150, wave: 1, score: 0 });
    this.enemies = [];
    this.towers = [];
    this.projectiles = [];
    this.effects = [];
    this.waveSystem = new WaveSystem();
    this.waveSystem.setSeed(this.rngSeed);
    this.economySystem = new EconomySystem(150);
    this.economySystem.setMultiplayer(true, 150);
    this.uiManager.setP1Gold(150);
    this.uiManager.setP2Gold(150);
    this.healthSystem = new HealthSystem(20, 20);
    this.damageCalculator.reset();
    this.damageCalculator.setMultiplayer(true);
    this.bannerTimer = 0;

    this.waveSystem.scheduleWave(1, 1);
    this.audioManager.startBGM();
  }

  private togglePause(): void {
    if (this.gameState === 'playing') {
      this.gameState = 'paused';
      this.uiManager.setGameState('paused');
      this.audioManager.stopBGM();
    } else if (this.gameState === 'paused') {
      this.gameState = 'playing';
      this.uiManager.setGameState('playing');
      this.audioManager.startBGM();
    }
  }

  private resetToMenu(): void {
    this.gameState = 'menu';
    this.uiManager.setGameState('menu');

    Object.assign(this.gameData, { lives: 20, gold: 150, wave: 1, score: 0 });
    this.enemies = [];
    this.towers = [];
    this.projectiles = [];
    this.effects = [];
    this.waveSystem = new WaveSystem();
    this.economySystem = new EconomySystem(150);
    this.healthSystem = new HealthSystem(20, 20);
    this.bannerTimer = 0;

    this.audioManager.stopBGM();
  }

  private onWaveStarted(config: WaveConfig): void {
    if (config.bossWave) {
      this.audioManager.playSFX('bossSpawn');
    } else {
      this.audioManager.playSFX('waveStart');
    }

    // Update BGM to match the new wave's intensity and character
    this.audioManager.startBGM({ waveNumber: config.waveNumber, bossWave: config.bossWave });
  }

  private spawnEnemy(type: EnemyType): void {
    if (this.waypoints.length === 0) return;

    const waveHpMultiplier = 1 + (this.gameData.wave - 1) * 0.15;
    const enemy = new Enemy(type, 0, this.waypoints, waveHpMultiplier * this.difficultyHpMultiplier);
    this.enemies.push(enemy);
  }

  private placeTower(type: string, col: number, row: number): boolean {
    if (!this.uiManager.getGameState() || this.uiManager.getGameState() === 'paused') return false;

    const towerType = type as TowerType;
    if (towerType === 'flamethrower' && this.gameData.wave < 25) {
      this.audioManager.playSFX('click');
      return false;
    }

    const x = col * 32 + 16;
    const y = row * 32 + 16;

    // Check if tile is buildable
    if (!this.tileMap.isBuildable(col, row)) return false;

    // Check if a tower already occupies this exact tile
    const existingTower = this.towers.find(t =>
      Math.floor(t.centerX / 32) === col && Math.floor(t.centerY / 32) === row
    );
    if (existingTower) return false;

    // Get tower stats and cost from the single stats definition
    const stats = TOWER_STATS[towerType];
    if (!stats) return false;

    const isMp = this.gameMode === 'multiplayer';
    const spendSuccess = isMp
      ? this.economySystem.spendGold(stats.cost, this.localRole)
      : this.economySystem.spendGold(stats.cost);

    if (!spendSuccess) {
      this.audioManager.playSFX('click'); // Error sound
      return false;
    }

    // Create and place tower
    const ownerRole = isMp ? this.localRole : undefined;
    const ownerTag = isMp ? (this.localRole === 'p1' ? this.p1Tag : this.p2Tag) : undefined;
    const tower = new Tower(towerType, x, y, ownerRole, ownerTag);
    this.towers.push(tower);
    this.syncGold();
    this.audioManager.playSFX('click');

    // Broadcast placement in multiplayer
    if (isMp && this.currentRoomId) {
      this.network.broadcast({
        type: 'PLACE_TOWER',
        roomId: this.currentRoomId,
        role: this.localRole,
        towerType,
        col,
        row,
        towerId: tower.id,
      });
    }

    return true;
  }

  private handleRemotePlaceTower(
    type: TowerType,
    col: number,
    row: number,
    role: PlayerRole,
    towerId: string
  ): void {
    const stats = TOWER_STATS[type];
    if (!stats) return;

    this.economySystem.spendGold(stats.cost, role);
    const x = col * 32 + 16;
    const y = row * 32 + 16;
    const ownerTag = role === 'p1' ? this.p1Tag : this.p2Tag;
    const tower = new Tower(type, x, y, role, ownerTag, towerId);
    this.towers.push(tower);
    this.syncGold();
  }

  private selectTower(col: number, row: number): void {
    // Find the tower occupying the clicked tile
    const selectedTower = this.towers.find(t =>
      Math.floor(t.centerX / 32) === col && Math.floor(t.centerY / 32) === row
    );

    this.uiManager.setSelectedTower(selectedTower ? selectedTower.id : null);
  }

  private upgradeSelectedTower(): void {
    const towerId = this.uiManager.getSelectedTowerId();
    if (!towerId) return;

    const tower = this.towers.find(t => t.id === towerId);
    if (!tower) return;

    if (tower.data.level >= 5) return;

    const options = this.upgradeSystem.getUpgradeOptions(tower);
    if (options.length === 0) return;

    // Use current upgrade option for the tower
    const option = options[0];
    const isMp = this.gameMode === 'multiplayer';
    const spendSuccess = isMp
      ? this.economySystem.spendGold(option.cost, this.localRole)
      : this.economySystem.spendGold(option.cost);

    if (spendSuccess) {
      this.syncGold();
      option.apply(tower);
      tower.data.level++;
      this.audioManager.playSFX('click');

      if (isMp && this.currentRoomId) {
        this.network.broadcast({
          type: 'UPGRADE_TOWER',
          roomId: this.currentRoomId,
          role: this.localRole,
          towerId: tower.id,
        });
      }
    }
  }

  private handleRemoteUpgradeTower(towerId: string, role: PlayerRole): void {
    const tower = this.towers.find(t => t.id === towerId);
    if (!tower) return;

    const options = this.upgradeSystem.getUpgradeOptions(tower);
    if (options.length === 0) return;

    const option = options[0];
    this.economySystem.spendGold(option.cost, role);
    option.apply(tower);
    tower.data.level++;
    this.syncGold();
  }

  private sellSelectedTower(): void {
    const towerId = this.uiManager.getSelectedTowerId();
    if (!towerId) return;

    const towerIndex = this.towers.findIndex(t => t.id === towerId);
    if (towerIndex === -1) return;

    const tower = this.towers[towerIndex];
    const sellValue = this.upgradeSystem.sellTower(tower);
    const isMp = this.gameMode === 'multiplayer';
    
    // Remove tower
    this.towers.splice(towerIndex, 1);

    // Add gold
    if (isMp) {
      this.economySystem.addGold(sellValue, this.localRole);
    } else {
      this.economySystem.addGold(sellValue);
    }
    this.syncGold();
    this.uiManager.setSelectedTower(null);
    this.audioManager.playSFX('click');

    if (isMp && this.currentRoomId) {
      this.network.broadcast({
        type: 'SELL_TOWER',
        roomId: this.currentRoomId,
        role: this.localRole,
        towerId: tower.id,
      });
    }
  }

  private handleRemoteSellTower(towerId: string, role: PlayerRole): void {
    const towerIndex = this.towers.findIndex(t => t.id === towerId);
    if (towerIndex === -1) return;

    const tower = this.towers[towerIndex];
    const sellValue = this.upgradeSystem.sellTower(tower);
    this.towers.splice(towerIndex, 1);
    this.economySystem.addGold(sellValue, role);
    this.syncGold();
  }

  public setGameSpeed(speed: GameSpeed): void {
    this.gameSpeed = speed;
    this.uiManager.setGameSpeed(speed);
  }

  public getGameSpeed(): GameSpeed {
    return this.gameSpeed;
  }

  private update(dt: number): void {
    this.uiManager.updatePings(dt);

    if (this.gameState !== 'playing') return;

    // In multiplayer mode, if local player is Guest (P2), Host (P1) is authoritative over the simulation loop.
    if (this.gameMode === 'multiplayer' && !this.isHost) {
      for (const effect of this.effects) {
        effect.update(dt);
      }
      this.effects = this.effects.filter(e => e.alive);
      if (this.bannerTimer > 0) {
        this.bannerTimer = Math.max(0, this.bannerTimer - dt * this.gameSpeed);
      }
      this.syncGold();
      return;
    }

    const totalDt = dt * this.gameSpeed;
    const maxSubStep = 0.033;
    let remainingDt = totalDt;

    while (remainingDt > 0) {
      const stepDt = Math.min(remainingDt, maxSubStep);
      this.updateSimulation(stepDt);
      remainingDt -= stepDt;
      if (this.gameState !== 'playing') break;
    }

    if (this.bannerTimer > 0) {
      this.bannerTimer = Math.max(0, this.bannerTimer - dt * this.gameSpeed);
    }

    this.syncGold();

    // In multiplayer, Host broadcasts authoritative state snapshot to Guest
    if (this.gameMode === 'multiplayer' && this.isHost && this.currentRoomId) {
      this.broadcastHostSnapshot();
    }
  }

  private frameCount: number = 0;

  private broadcastHostSnapshot(): void {
    if (!this.currentRoomId) return;
    this.frameCount++;

    const enemySnaps: EnemySnapshot[] = this.enemies.map(e => ({
      id: e.id,
      type: e.data.type,
      x: e.position.x,
      y: e.position.y,
      hp: e.data.currentHp,
      maxHp: e.data.hp * e.getHpMultiplier(),
      waypointIndex: e.data.waypointIndex,
      slowFactor: e.data.slowFactor,
      alive: e.alive,
    }));

    const projSnaps: ProjectileSnapshot[] = this.projectiles.map(p => ({
      id: p.id,
      type: p.data.type,
      x: p.position.x,
      y: p.position.y,
      dirX: p.direction.x,
      dirY: p.direction.y,
      level: p.data.level ?? 1,
      alive: p.alive,
    }));

    const towerSnaps: TowerSnapshot[] = this.towers.map(t => ({
      id: t.id,
      type: t.data.type,
      x: t.position.x,
      y: t.position.y,
      level: t.data.level,
      ownerRole: t.data.ownerRole,
      ownerTag: t.data.ownerTag,
      targetId: t.data.targetId,
    }));

    const snapshot: HostStateSnapshot = {
      frame: this.frameCount,
      wave: this.gameData.wave,
      lives: this.gameData.lives,
      score: this.gameData.score,
      gameState: this.gameState,
      bannerTimer: this.bannerTimer,
      bannerWave: this.bannerWave,
      p1Gold: this.economySystem.getP1Gold(),
      p2Gold: this.economySystem.getP2Gold(),
      p1Stats: this.damageCalculator.getStats('p1'),
      p2Stats: this.damageCalculator.getStats('p2'),
      enemies: enemySnaps,
      projectiles: projSnaps,
      towers: towerSnaps,
    };

    this.network.broadcast({
      type: 'HOST_SNAPSHOT',
      roomId: this.currentRoomId,
      snapshot,
    });
  }

  private handleHostSnapshot(snap: HostStateSnapshot): void {
    this.gameData.lives = snap.lives;
    this.healthSystem.setLives(snap.lives);
    this.gameData.score = snap.score;
    this.gameData.wave = snap.wave;
    this.bannerTimer = snap.bannerTimer;
    this.bannerWave = snap.bannerWave;
    this.economySystem.setGold(snap.p1Gold, 'p1');
    this.economySystem.setGold(snap.p2Gold, 'p2');
    this.damageCalculator.setStats(snap.p1Stats, snap.p2Stats);

    // Sync enemies
    const currentEnemyMap = new Map(this.enemies.map(e => [e.id, e]));
    const updatedEnemies: Enemy[] = [];

    for (const snapEnemy of snap.enemies) {
      let enemy = currentEnemyMap.get(snapEnemy.id);
      if (!enemy) {
        enemy = new Enemy(
          snapEnemy.type,
          snapEnemy.waypointIndex,
          this.waypoints,
          this.difficultyHpMultiplier,
          snapEnemy.id
        );
      }
      enemy.position.x = snapEnemy.x;
      enemy.position.y = snapEnemy.y;
      enemy.data.currentHp = snapEnemy.hp;
      enemy.data.slowFactor = snapEnemy.slowFactor;
      enemy.data.waypointIndex = snapEnemy.waypointIndex;
      enemy.alive = snapEnemy.alive;
      updatedEnemies.push(enemy);
    }
    this.enemies = updatedEnemies;

    // Sync projectiles
    const currentProjMap = new Map(this.projectiles.map(p => [p.id, p]));
    const updatedProjectiles: Projectile[] = [];

    for (const snapProj of snap.projectiles) {
      let proj = currentProjMap.get(snapProj.id);
      if (!proj) {
        proj = new Projectile(
          snapProj.type,
          snapProj.x + 8,
          snapProj.y + 8,
          snapProj.x + 8 + snapProj.dirX * 50,
          snapProj.y + 8 + snapProj.dirY * 50,
          0,
          { level: snapProj.level, customId: snapProj.id }
        );
      }
      proj.position.x = snapProj.x;
      proj.position.y = snapProj.y;
      proj.direction.x = snapProj.dirX;
      proj.direction.y = snapProj.dirY;
      proj.data.level = snapProj.level;
      proj.alive = snapProj.alive;
      updatedProjectiles.push(proj);
    }
    this.projectiles = updatedProjectiles;

    // Sync towers
    const currentTowerMap = new Map(this.towers.map(t => [t.id, t]));
    const updatedTowers: Tower[] = [];

    for (const snapTower of snap.towers) {
      let tower = currentTowerMap.get(snapTower.id);
      if (!tower) {
        tower = new Tower(
          snapTower.type,
          snapTower.x + 16,
          snapTower.y + 16,
          snapTower.ownerRole,
          snapTower.ownerTag,
          snapTower.id
        );
      }
      tower.data.level = snapTower.level;
      tower.data.targetId = snapTower.targetId ?? null;
      updatedTowers.push(tower);
    }
    this.towers = updatedTowers;

    if (snap.gameState === 'gameOver' && this.gameState !== 'gameOver') {
      this.gameOver();
    }

    this.syncGold();
  }

  private updateSimulation(dt: number): void {
    // Periodic passive income accrues inside the economy system
    this.economySystem.update(dt);

    // Advance wave scheduling and spawning
    const waveEvents = this.waveSystem.update(dt, this.enemies.length);
    if (waveEvents.waveStarted) {
      this.onWaveStarted(waveEvents.waveStarted);
    }
    if (waveEvents.spawned) {
      this.spawnEnemy(waveEvents.spawned);
    }

    // Update enemies
    for (const enemy of this.enemies) {
      enemy.update(dt);
      
      // Check if enemy reached the true end of path
      if (enemy.data.reachedEnd) {
        this.healthSystem.loseLife();
        this.gameData.lives = this.healthSystem.getLives();
        
        if (this.healthSystem.isGameOver()) {
          this.gameOver();
          return;
        }
      }
    }

    // Update towers and fire projectiles
    for (const tower of this.towers) {
      tower.update(dt);
      const targetId = tower.findTarget(this.enemies);
      
      if (tower.data.fireCooldown <= 0 && targetId) {
        const target = this.enemies.find(e => e.id === targetId);
        if (target && target.alive) {
          this.fireProjectile(tower, target);
          tower.data.fireCooldown = 1 / tower.data.fireRate;
        }
      }
    }

    // Update projectiles and check collisions
    for (const projectile of this.projectiles) {
      projectile.update(dt);
      
      const collisionResult = projectile.checkCollision(this.enemies);
      if (collisionResult.hitId) {
        const enemy = this.enemies.find(e => e.id === collisionResult.hitId);
        if (enemy && enemy.alive) {
          const damage = enemy.takeDamage(collisionResult.damage);
          this.damageCalculator.recordDamage(projectile.data.ownerRole, damage, projectile.data.towerType);
          
          // Apply slow effect
          if (projectile.data.slowFactor) {
            enemy.applySlow(projectile.data.slowFactor, projectile.data.slowDuration || 2);
          }

          // Add hit effect
          this.addEffect('hit', projectile.position.x, projectile.position.y);
          
          // Check if enemy died
          if (!enemy.alive) {
            this.damageCalculator.recordKill(projectile.data.ownerRole);
            if (this.gameMode === 'multiplayer') {
              const split = this.economySystem.awardSplitReward(enemy.data.reward);
              this.gameData.score += enemy.data.reward * 10;
              this.addEffect('death', enemy.position.x, enemy.position.y, `+${split.p1Amount}g`);
            } else {
              this.economySystem.addGold(enemy.data.reward);
              this.gameData.score += enemy.data.reward * 10;
              this.addEffect('death', enemy.position.x, enemy.position.y, `+${enemy.data.reward}`);
            }
            this.syncGold();
            this.audioManager.playSFX('kill');
          } else {
            this.audioManager.playSFX('hit');
          }
        }
        
        // Remove projectile after hit (unless it has splash)
        if (!projectile.data.splashRadius) {
          projectile.kill();
        } else {
          // Apply splash damage
          for (const enemy of this.enemies) {
            if (enemy.id !== collisionResult.hitId && enemy.alive) {
              const dist = CollisionSystem.distance(projectile.position, enemy.position);
              if (dist <= (projectile.data.splashRadius || 0)) {
                const splashDmg = enemy.takeDamage(collisionResult.damage * 0.5);
                this.damageCalculator.recordDamage(projectile.data.ownerRole, splashDmg, projectile.data.towerType);
                if (!enemy.alive) {
                  this.damageCalculator.recordKill(projectile.data.ownerRole);
                  if (this.gameMode === 'multiplayer') {
                    const split = this.economySystem.awardSplitReward(enemy.data.reward);
                    this.gameData.score += enemy.data.reward * 10;
                    this.addEffect('death', enemy.position.x, enemy.position.y, `+${split.p1Amount}g`);
                  } else {
                    this.economySystem.addGold(enemy.data.reward);
                    this.gameData.score += enemy.data.reward * 10;
                    this.addEffect('death', enemy.position.x, enemy.position.y, `+${enemy.data.reward}`);
                  }
                  this.syncGold();
                  this.audioManager.playSFX('kill');
                }
                this.addEffect('explosion', projectile.position.x, projectile.position.y);
              }
            }
          }
          projectile.kill();
        }
      }
    }

    // Update effects
    for (const effect of this.effects) {
      effect.update(dt);
    }

    // Clean up dead entities
    this.enemies = this.enemies.filter(e => e.alive);
    this.projectiles = this.projectiles.filter(p => p.alive);
    this.effects = this.effects.filter(e => e.alive);

    if (waveEvents.waveComplete) {
      this.handleWaveComplete();
    }
  }

  private fireProjectile(tower: Tower, target: Enemy): void {
    const projectileType = tower.data.type === 'archer' ? 'arrow' : 
                          tower.data.type === 'cannon' ? 'cannonball' :
                          tower.data.type === 'sniper' ? 'laser' :
                          tower.data.type === 'flamethrower' ? 'flame' : 'ice';

    const projectile = new Projectile(
      projectileType,
      tower.centerX,
      tower.centerY,
      target.position.x + target.size.width / 2,
      target.position.y + target.size.height / 2,
      tower.data.damage,
      {
        splashRadius: tower.data.splashRadius,
        slowFactor: tower.data.slowFactor,
        slowDuration: tower.data.slowDuration,
        level: tower.data.level,
        ownerRole: tower.data.ownerRole,
        towerType: tower.data.type,
      }
    );

    this.projectiles.push(projectile);
    
    if (projectileType !== 'laser') {
      this.audioManager.playSFX('shoot');
    }
  }

  private handleWaveComplete(): void {
    // Bonus gold for completing wave
    const bonusGold = 20 + this.gameData.wave * 5;
    if (this.gameMode === 'multiplayer') {
      this.economySystem.awardSplitReward(bonusGold);
    } else {
      this.economySystem.addGold(bonusGold);
    }
    this.syncGold();

    // Banner shows the wave that was just cleared
    this.bannerWave = this.gameData.wave;
    this.bannerTimer = 2;

    if (this.gameMode === 'multiplayer') {
      if (this.isHost) {
        this.gameData.wave++;
        const nextConfig = this.waveSystem.generateWave(this.gameData.wave);
        this.waveSystem.scheduleWave(this.gameData.wave, this.wavePauseDuration, nextConfig);
        this.damageCalculator.resetWaveDamage();
        if (this.currentRoomId) {
          this.network.broadcast({
            type: 'START_WAVE',
            roomId: this.currentRoomId,
            role: this.localRole,
            waveNumber: this.gameData.wave,
            config: nextConfig,
          });
        }
      } else {
        this.damageCalculator.resetWaveDamage();
      }
    } else {
      this.damageCalculator.resetWaveDamage();
      this.gameData.wave++;
      this.waveSystem.scheduleWave(this.gameData.wave, this.wavePauseDuration);
    }
  }

  private syncGold(): void {
    this.gameData.gold = this.economySystem.getGold(this.localRole);
    this.uiManager.setP1Gold(this.economySystem.getP1Gold());
    this.uiManager.setP2Gold(this.economySystem.getP2Gold());
  }

  private gameOver(): void {
    this.gameState = 'gameOver';
    this.uiManager.setGameState('gameOver');
    this.audioManager.stopBGM();
    this.audioManager.playSFX('gameOver');

    if (this.gameData.score > 0 && this.highScoreSystem.isHighScore(this.tileMap.getMapType(), this.gameData.score)) {
      this.uiManager.openHighScoreEntry(
        this.gameData.score,
        this.gameData.wave,
        this.difficultyMode,
        this.tileMap.getMapType()
      );
      setTimeout(() => {
        this.audioManager.playSFX('highScore');
      }, 350);
    }
  }

  private addEffect(type: string, x: number, y: number, label?: string): void {
    this.effects.push(new Effect(type, x, y, label));
  }

  private render(): void {
    // Clear canvas
    this.ctx.fillStyle = '#0F6F0F';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Render tile map
    this.tileMap.render(this.ctx);

    // Render enemies
    for (const enemy of this.enemies) {
      if (enemy.alive) {
        enemy.render(this.ctx);
      }
    }

    // Render towers
    for (const tower of this.towers) {
      if (tower.alive) {
        tower.render(this.ctx);
        
        // Draw range circle for selected tower
        const selectedId = this.uiManager.getSelectedTowerId();
        if (selectedId === tower.id) {
          this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
          this.ctx.lineWidth = 2;
          this.ctx.beginPath();
          this.ctx.arc(tower.centerX, tower.centerY, tower.data.range, 0, Math.PI * 2);
          this.ctx.stroke();
        }
      }
    }

    // Render projectiles
    for (const projectile of this.projectiles) {
      if (projectile.alive) {
        projectile.render(this.ctx);
      }
    }

    // Render effects
    for (const effect of this.effects) {
      if (effect.alive) {
        effect.render(this.ctx);
      }
    }

    // Render UI overlay
    this.uiManager.render(this.ctx);

    // Draw wave announcement (fades out as the timer runs down)
    if (this.bannerTimer > 0) {
      const alpha = this.bannerTimer / 2;
      this.ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
      this.ctx.font = 'bold 32px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`Wave ${this.bannerWave} Complete!`, this.canvas.width / 2, this.canvas.height / 2 - (this.gameMode === 'multiplayer' ? 18 : 0));
      if (this.gameMode === 'multiplayer') {
        const leader = this.damageCalculator.getWaveLeader(this.p1Tag, this.p2Tag);
        if (leader && leader.waveDamage > 0) {
          this.ctx.fillStyle = `rgba(0, 229, 255, ${alpha})`;
          this.ctx.font = 'bold 20px monospace';
          this.ctx.fillText(`★ WAVE MVP: ${leader.tag} (${leader.waveDamage.toLocaleString()} DMG) ★`, this.canvas.width / 2, this.canvas.height / 2 + 18);
        }
      }
      this.ctx.textAlign = 'left';
    }

    // Draw pause overlay (only over the gameplay area, not the HUD bars)
    if (this.gameState === 'paused') {
      const topBar = 50;
      const bottomBar = 80;
      const areaY = topBar;
      const areaHeight = this.canvas.height - topBar - bottomBar;

      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      this.ctx.fillRect(0, areaY, this.canvas.width, areaHeight);

      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = 'bold 48px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('PAUSED', this.canvas.width / 2, areaY + areaHeight / 2);
      this.ctx.textAlign = 'left';
    }

    // Draw game over screen
    if (this.gameState === 'gameOver') {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      
      this.ctx.fillStyle = '#FF4444';
      this.ctx.font = 'bold 64px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - (this.gameMode === 'multiplayer' ? 140 : 50));
      
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = '24px monospace';
      this.ctx.fillText(`Final Wave: ${this.gameData.wave}`, this.canvas.width / 2, this.canvas.height / 2 - (this.gameMode === 'multiplayer' ? 80 : -20));
      this.ctx.fillText(`Score: ${this.gameData.score}`, this.canvas.width / 2, this.canvas.height / 2 - (this.gameMode === 'multiplayer' ? 50 : -50));
      
      if (this.gameMode === 'multiplayer') {
        const p1Stats = this.damageCalculator.getStats('p1');
        const p2Stats = this.damageCalculator.getStats('p2');
        const split = this.damageCalculator.getContributionSplit();
        const mvp = p1Stats.totalDamage >= p2Stats.totalDamage
          ? { tag: this.p1Tag, dmg: p1Stats.totalDamage, role: 'p1' }
          : { tag: this.p2Tag, dmg: p2Stats.totalDamage, role: 'p2' };

        // MVP Badge
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 22px monospace';
        this.ctx.fillText(`🏆 MATCH MVP: ${mvp.tag} (${Math.round(mvp.dmg).toLocaleString()} DMG) 🏆`, this.canvas.width / 2, this.canvas.height / 2 - 10);

        // Stats card box
        const boxW = 560;
        const boxH = 110;
        const boxX = (this.canvas.width - boxW) / 2;
        const boxY = this.canvas.height / 2 + 15;
        this.ctx.fillStyle = 'rgba(20, 30, 48, 0.9)';
        this.ctx.fillRect(boxX, boxY, boxW, boxH);
        this.ctx.strokeStyle = '#00E5FF';
        this.ctx.lineWidth = 1.5;
        this.ctx.strokeRect(boxX, boxY, boxW, boxH);

        // Column 1: P1
        this.ctx.textAlign = 'left';
        this.ctx.fillStyle = '#00E5FF';
        this.ctx.font = 'bold 15px monospace';
        this.ctx.fillText(`[P1] ${this.p1Tag}`, boxX + 24, boxY + 28);

        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '13px monospace';
        this.ctx.fillText(`Damage: ${Math.round(p1Stats.totalDamage).toLocaleString()} (${split.p1Percent}%)`, boxX + 24, boxY + 56);
        this.ctx.fillText(`Kills: ${p1Stats.kills}  |  Gold: ${this.economySystem.getP1Gold()}g`, boxX + 24, boxY + 84);

        // Column 2: P2
        this.ctx.fillStyle = '#FF007F';
        this.ctx.font = 'bold 15px monospace';
        this.ctx.fillText(`[P2] ${this.p2Tag}`, boxX + 310, boxY + 28);

        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '13px monospace';
        this.ctx.fillText(`Damage: ${Math.round(p2Stats.totalDamage).toLocaleString()} (${split.p2Percent}%)`, boxX + 310, boxY + 56);
        this.ctx.fillText(`Kills: ${p2Stats.kills}  |  Gold: ${this.economySystem.getP2Gold()}g`, boxX + 310, boxY + 84);
      }
      this.ctx.textAlign = 'left';
    }

    // Draw menu screen (only over the gameplay area, not the HUD bars)
    if (this.gameState === 'menu') {
      const topBar = 50;
      const bottomBar = 80;
      const areaY = topBar;
      const areaHeight = this.canvas.height - topBar - bottomBar;
      const centerY = areaY + areaHeight / 2;

      if (this.uiManager.getActiveMenuScreen() === 'solo_menu') {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, areaY, this.canvas.width, areaHeight);

        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 72px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('TOWER DEFENCE', this.canvas.width / 2, centerY - 100);

        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '24px monospace';
        this.ctx.fillText('Defend your base from waves of enemies!', this.canvas.width / 2, centerY - 30);

        this.ctx.fillStyle = '#7EC8FF';
        this.ctx.font = '18px monospace';
        this.ctx.fillText('Click START to begin', this.canvas.width / 2, centerY + 25);

        // Change Mode Button on Solo Menu
        const modeBtnX = this.canvas.width / 2 - 160;
        const modeBtnY = centerY + 70;
        const modeBtnW = 320;
        const modeBtnH = 46;

        this.ctx.fillStyle = 'rgba(24, 38, 64, 0.95)';
        this.ctx.fillRect(modeBtnX, modeBtnY, modeBtnW, modeBtnH);
        this.ctx.strokeStyle = '#00E5FF';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(modeBtnX, modeBtnY, modeBtnW, modeBtnH);

        this.ctx.fillStyle = '#00E5FF';
        this.ctx.font = 'bold 14px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('⚔️ CHANGE MODE (SOLO / CO-OP)', modeBtnX + modeBtnW / 2, modeBtnY + 28);
        this.ctx.textAlign = 'left';
      } else if (this.uiManager.getActiveMenuScreen() === 'mode_select') {
        this.uiManager.renderModeSelect(this.ctx);
      } else if (this.uiManager.getActiveMenuScreen() === 'multiplayer_hub') {
        this.uiManager.renderMultiplayerHub(this.ctx);
      } else if (this.uiManager.getActiveMenuScreen() === 'multiplayer_create') {
        this.uiManager.renderMultiplayerCreate(this.ctx);
      } else if (this.uiManager.getActiveMenuScreen() === 'multiplayer_browse') {
        this.uiManager.renderMultiplayerBrowse(this.ctx);
      } else if (this.uiManager.getActiveMenuScreen() === 'multiplayer_waiting_room') {
        this.uiManager.renderMultiplayerWaitingRoom(this.ctx);
      }
    }

    // Settings, help, leaderboard, high score, and gamertag modals render on top of everything else
    this.uiManager.renderHelp(this.ctx);
    this.uiManager.renderSettings(this.ctx);
    this.uiManager.renderLeaderboardModal(this.ctx);
    this.uiManager.renderHighScoreEntry(this.ctx);
    this.uiManager.renderGamertagModal(this.ctx);
    this.uiManager.renderDamageStatsModal(this.ctx);
  }
}

// Effect class for visual feedback
class Effect {
  id: string;
  position: { x: number; y: number };
  size = { width: 0, height: 0 };
  alive: boolean = true;
  private type: string;
  private label: string;
  private timer: number = 0;
  private duration: number;

  constructor(type: string, x: number, y: number, label: string = '') {
    this.id = `effect_${type}_${Math.random().toString(36).substr(2, 9)}`;
    this.type = type;
    this.label = label;
    this.position = { x, y };
    
    switch (type) {
      case 'hit':
        this.duration = 0.2;
        break;
      case 'death':
        this.duration = 0.5;
        break;
      case 'explosion':
        this.duration = 0.4;
        break;
      default:
        this.duration = 0.3;
    }
  }

  update(dt: number): void {
    this.timer += dt;
    if (this.timer >= this.duration) {
      this.alive = false;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const progress = this.timer / this.duration;
    
    switch (this.type) {
      case 'hit':
        // White flash
        ctx.fillStyle = `rgba(255, 255, 255, ${1 - progress})`;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, 8 * progress, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'death':
        // Gold text floating up
        const yOffset = -progress * 30;
        if (this.label) {
          ctx.fillStyle = `rgba(255, 215, 0, ${1 - progress})`;
          ctx.font = 'bold 14px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(this.label, this.position.x, this.position.y + yOffset);
          ctx.textAlign = 'left';
        }
        
        // Dust cloud
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2;
          const dist = progress * 20;
          const px = this.position.x + Math.cos(angle) * dist;
          const py = this.position.y + Math.sin(angle) * dist - progress * 10;
          ctx.fillStyle = `rgba(200, 200, 200, ${0.5 * (1 - progress)})`;
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        break;

      case 'explosion':
        // Expanding ring
        const radius = progress * 40;
        ctx.strokeStyle = `rgba(255, 100, 0, ${1 - progress})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Inner flash
        if (progress < 0.5) {
          ctx.fillStyle = `rgba(255, 255, 100, ${1 - progress * 2})`;
          ctx.beginPath();
          ctx.arc(this.position.x, this.position.y, radius * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
    }
  }
}

// Initialize game when page loads
if (document.getElementById('game-canvas')) {
  new Game();
} else {
  window.addEventListener('DOMContentLoaded', () => {
    new Game();
  });
}
