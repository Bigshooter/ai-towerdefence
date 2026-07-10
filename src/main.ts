import { GameLoop } from './engine/GameLoop';
import { EntityManager } from './engine/EntityManager';
import { CollisionSystem } from './engine/CollisionSystem';
import { TileMap } from './map/TileMap';
import { Enemy, EnemyData } from './entities/Enemy';
import { Tower } from './entities/Tower';
import { Projectile } from './entities/Projectile';
import { WaveSystem } from './system/WaveSystem';
import { EconomySystem } from './system/EconomySystem';
import { UpgradeOption, UpgradeSystem } from './system/UpgradeSystem';
import { HealthSystem } from './system/HealthSystem';
import { UIManager } from './ui/UIManager';
import { AudioManager } from './audio/AudioManager';
import { DifficultyMode, GameState, EnemyType, TowerType } from './types';

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
  private entityManager = new EntityManager();
  private tileMap = new TileMap();
  private waveSystem = new WaveSystem();
  private economySystem = new EconomySystem(150);
  private upgradeSystem = new UpgradeSystem();
  private healthSystem = new HealthSystem(20, 20);
  private uiManager!: UIManager;
  private audioManager = new AudioManager();

  // Game state
  private gameState: GameState = 'menu';
  private gameData: GameData = { lives: 20, gold: 150, wave: 1, score: 0 };
  private enemies: Enemy[] = [];
  private towers: Tower[] = [];
  private projectiles: Projectile[] = [];
  private effects: Effect[] = [];

  // Wave tracking
  private waveCompleteTimer: number = 0;
  private wavePauseDuration: number = 3;
  private enemiesRemaining: number = 0;
  private spawningComplete: boolean = false;
  private spawnQueue: EnemyType[] = [];
  private spawnTimer: number = 0;
  private currentSpawnInterval: number = 1;
  private interWaveTimer: number = 0;
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

    // Initialize UI manager
    this.uiManager = new UIManager(this.canvas);
    this.setupUICallbacks();

    // Start game loop
    this.gameLoop = new GameLoop(
      this.canvas,
      (dt) => this.update(dt),
      () => this.render()
    );
    this.gameLoop.start();

    // Set global state reference for enemy HP scaling
    (window as any).gameState = {
      wave: 1,
      difficulty: this.difficultyMode,
      difficultyHpMultiplier: this.difficultyHpMultiplier,
    };
    (window as any).gameData = this.gameData;
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

    this.uiManager.onStartGame = (difficulty) => {
      this.startNewGame(difficulty);
    };

    this.uiManager.onPauseGame = () => {
      this.togglePause();
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

  private startNewGame(difficulty: DifficultyMode = 'easy'): void {
    this.difficultyMode = difficulty;
    this.difficultyHpMultiplier = this.getDifficultyHpMultiplier(difficulty);

    // Reset game state
    this.gameState = 'playing';
    this.uiManager.setGameState('playing');
    this.gameData = { lives: 20, gold: 150, wave: 1, score: 0 };
    this.enemies = [];
    this.towers = [];
    this.projectiles = [];
    this.effects = [];
    this.entityManager = new EntityManager();
    this.waveSystem = new WaveSystem();
    this.economySystem = new EconomySystem(150);
    this.healthSystem = new HealthSystem(20, 20);

    // Reset wave scheduling. All wave timing is advanced by update(dt) so it
    // pauses and resumes correctly with the game state.
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.spawningComplete = false;
    this.interWaveTimer = 1; // brief delay before the first wave

    // Keep global state in sync for enemy regeneration max HP calculations.
    (window as any).gameState = {
      wave: this.gameData.wave,
      difficulty: this.difficultyMode,
      difficultyHpMultiplier: this.difficultyHpMultiplier,
    };

    // Start BGM
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

    this.gameData = { lives: 20, gold: 150, wave: 1, score: 0 };
    this.enemies = [];
    this.towers = [];
    this.projectiles = [];
    this.effects = [];
    this.entityManager = new EntityManager();
    this.waveSystem = new WaveSystem();
    this.economySystem = new EconomySystem(150);
    this.healthSystem = new HealthSystem(20, 20);

    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.spawningComplete = false;
    this.interWaveTimer = 0;
    this.waveCompleteTimer = 0;

    this.audioManager.stopBGM();

    (window as any).gameState = {
      wave: this.gameData.wave,
      difficulty: this.difficultyMode,
      difficultyHpMultiplier: this.difficultyHpMultiplier,
    };
    (window as any).gameData = this.gameData;
  }

  private startNextWave(): void {
    const waveConfig = this.waveSystem.generateWave(this.gameData.wave);

    if (waveConfig.bossWave) {
      this.audioManager.playSFX('bossSpawn');
    } else {
      this.audioManager.playSFX('waveStart');
    }

    // Update BGM to match the new wave's intensity and character
    this.audioManager.startBGM({ waveNumber: this.gameData.wave, bossWave: waveConfig.bossWave });

    // Queue the wave's enemies; spawning is advanced by update(dt).
    this.spawnQueue = [...waveConfig.enemies];
    this.enemiesRemaining = waveConfig.enemies.length;
    this.currentSpawnInterval = waveConfig.spawnInterval;
    this.spawnTimer = 0;
    this.spawningComplete = false;
  }

  private spawnEnemy(type: EnemyType): void {
    const waypoints = this.tileMap.getWaypoints();
    if (waypoints.length === 0) return;

    const waveHpMultiplier = 1 + (this.gameData.wave - 1) * 0.15;
    const enemy = new Enemy(type, 0, waypoints, waveHpMultiplier * this.difficultyHpMultiplier);
    this.enemies.push(enemy);
    this.entityManager.add(enemy);
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

    // Get tower stats and cost
    const towerStats: Record<TowerType, { damage: number; range: number; fireRate: number; cost: number }> = {
      archer: { damage: 10, range: 120, fireRate: 2.5, cost: 50 },
      cannon: { damage: 30, range: 100, fireRate: 0.8, cost: 100 },
      sniper: { damage: 50, range: 200, fireRate: 0.5, cost: 150 },
      ice: { damage: 5, range: 90, fireRate: 1.5, cost: 75 },
      flamethrower: { damage: 100, range: 100, fireRate: 1.2, cost: 250 },
    };

    const stats = towerStats[towerType];
    if (!stats) return false;

    // Check if player has enough gold
    if (this.gameData.gold < stats.cost) {
      this.audioManager.playSFX('click'); // Error sound
      return false;
    }

    // Create and place tower
    const tower = new Tower(towerType, x, y);
    this.towers.push(tower);
    this.entityManager.add(tower);
    
    // Deduct gold
    this.gameData.gold -= stats.cost;
    this.audioManager.playSFX('click');

    return true;
  }

  private selectTower(col: number, row: number): void {
    // Find the tower occupying the clicked tile
    const selectedTower = this.towers.find(t =>
      Math.floor(t.centerX / 32) === col && Math.floor(t.centerY / 32) === row
    );

    if (selectedTower) {
      this.uiManager['selectedTowerId'] = selectedTower.id;
    } else {
      this.uiManager['selectedTowerId'] = null;
    }
  }

  private upgradeSelectedTower(): void {
    const towerId = this.uiManager.getSelectedTowerId();
    if (!towerId) return;

    const tower = this.towers.find(t => t.id === towerId);
    if (!tower) return;

    if (tower.data.level >= 5) return;

    const options = this.upgradeSystem.getUpgradeOptions(tower);
    if (options.length === 0) return;

    // Use first available option for simplicity
    const option = options[0];

    if (this.gameData.gold >= option.cost) {
      this.gameData.gold -= option.cost;
      option.apply(tower);
      tower.data.level++;
      tower.data.range = this.getRangeForLevel(tower.data.type, tower.data.level);
      this.audioManager.playSFX('click');
    }
  }

  private getRangeForLevel(type: TowerType, level: number): number {
    const baseRanges: Record<TowerType, number> = {
      archer: 120,
      cannon: 100,
      sniper: 200,
      ice: 90,
      flamethrower: 100,
    };
    const clampedLevel = Math.max(1, level);
    return baseRanges[type] * Math.pow(1.1, clampedLevel - 1);
  }

  private sellSelectedTower(): void {
    const towerId = this.uiManager.getSelectedTowerId();
    if (!towerId) return;

    const towerIndex = this.towers.findIndex(t => t.id === towerId);
    if (towerIndex === -1) return;

    const tower = this.towers[towerIndex];
    const sellValue = this.upgradeSystem.sellTower(tower);
    
    // Remove tower
    this.towers.splice(towerIndex, 1);
    this.entityManager.remove(towerId);
    
    // Add gold
    this.gameData.gold += sellValue;
    this.uiManager['selectedTowerId'] = null;
    this.audioManager.playSFX('click');
  }

  private update(dt: number): void {
    if (this.gameState !== 'playing') return;

    // Update economy
    this.economySystem.update(dt);

    // Advance the between-wave countdown, then start the next wave
    if (this.interWaveTimer > 0) {
      this.interWaveTimer -= dt;
      if (this.interWaveTimer <= 0) {
        this.interWaveTimer = 0;
        this.startNextWave();
      }
    }

    // Spawn queued enemies at the wave's spawn interval
    if (this.spawnQueue.length > 0) {
      this.spawnTimer += dt;
      if (this.spawnTimer >= this.currentSpawnInterval) {
        this.spawnTimer -= this.currentSpawnInterval;
        const type = this.spawnQueue.shift()!;
        this.spawnEnemy(type);
        if (this.spawnQueue.length === 0) {
          this.spawningComplete = true;
        }
      }
    }

    // Update enemies
    for (const enemy of this.enemies) {
      enemy.update(dt);
      
      // Check if enemy reached end of path (past last waypoint)
      const waypoints = this.tileMap.getWaypoints();
      if (!enemy.data.reachedEnd && enemy.data.waypointIndex >= waypoints.length - 1) {
        enemy.data.reachedEnd = true;
        this.healthSystem.loseLife();
        this.gameData.lives--;
        
        if (this.healthSystem.isGameOver()) {
          this.gameOver();
          return;
        }
      }
    }

    // Update towers and fire projectiles
    for (const tower of this.towers) {
      tower.update(dt);
      
      if (tower.data.fireCooldown <= 0) {
        const targetId = tower.findTarget(this.enemies);
        if (targetId) {
          const target = this.enemies.find(e => e.id === targetId);
          if (target && target.alive) {
            this.fireProjectile(tower, target);
            tower.data.fireCooldown = 1 / tower.data.fireRate;
          }
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
          
          // Apply slow effect
          if (projectile.data.slowFactor) {
            enemy.applySlow(projectile.data.slowFactor, projectile.data.slowDuration || 2);
          }

          // Add hit effect
          this.addEffect('hit', projectile.position.x, projectile.position.y);
          
          // Check if enemy died
          if (!enemy.alive) {
            this.gameData.gold += enemy.data.reward;
            this.gameData.score += enemy.data.reward * 10;
            this.addEffect('death', enemy.position.x, enemy.position.y);
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
                enemy.takeDamage(collisionResult.damage * 0.5);
                this.addEffect('explosion', projectile.position.x, projectile.position.y);
              }
            }
          }
          projectile.kill();
        }
      }

      // Remove off-screen projectiles
      if (projectile.position.x < -50 || projectile.position.x > 1330 || 
          projectile.position.y < -50 || projectile.position.y > 1010) {
        projectile.kill();
      }
    }

    // Update effects
    for (const effect of this.effects) {
      effect.update(dt);
    }

    // Clean up dead entities
    this.entityManager.cleanup();
    this.enemies = this.enemies.filter(e => e.alive);
    this.projectiles = this.projectiles.filter(p => p.alive);
    this.effects = this.effects.filter(e => e.alive);

    // Detect wave completion: all enemies spawned and none remain alive
    if (this.spawningComplete && this.enemies.length === 0) {
      this.spawningComplete = false;
      this.handleWaveComplete();
    }

    // Update global state references
    (window as any).gameState.wave = this.gameData.wave;
    (window as any).gameState.difficulty = this.difficultyMode;
    (window as any).gameState.difficultyHpMultiplier = this.difficultyHpMultiplier;
    (window as any).gameData = this.gameData;
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
      tower.data.damage
    );

    this.projectiles.push(projectile);
    this.entityManager.add(projectile);
    
    if (projectileType !== 'laser') {
      this.audioManager.playSFX('shoot');
    }
  }

  private handleWaveComplete(): void {
    this.waveCompleteTimer = 0;

    // Bonus gold for completing wave
    const bonusGold = 20 + this.gameData.wave * 5;
    this.gameData.gold += bonusGold;

    // Advance to the next wave after a pause (countdown driven by update(dt))
    this.gameData.wave++;
    this.interWaveTimer = this.wavePauseDuration;
  }

  private gameOver(): void {
    this.gameState = 'gameOver';
    this.uiManager.setGameState('gameOver');
    this.audioManager.stopBGM();
    this.audioManager.playSFX('gameOver');
  }

  private addEffect(type: string, x: number, y: number): void {
    const effect = new Effect(type, x, y);
    this.effects.push(effect);
    this.entityManager.add(effect);
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

    // Draw wave announcement
    if (this.waveCompleteTimer > 0 && this.waveCompleteTimer < 2) {
      const alpha = 1 - (this.waveCompleteTimer / 2);
      this.ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
      this.ctx.font = 'bold 32px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`Wave ${this.gameData.wave} Complete!`, this.canvas.width / 2, this.canvas.height / 2);
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
      this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 50);
      
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = '24px monospace';
      this.ctx.fillText(`Final Wave: ${this.gameData.wave}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
      this.ctx.fillText(`Score: ${this.gameData.score}`, this.canvas.width / 2, this.canvas.height / 2 + 50);
      this.ctx.textAlign = 'left';
    }

    // Draw menu screen (only over the gameplay area, not the HUD bars)
    if (this.gameState === 'menu') {
      const topBar = 50;
      const bottomBar = 80;
      const areaY = topBar;
      const areaHeight = this.canvas.height - topBar - bottomBar;
      const centerY = areaY + areaHeight / 2;

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
      this.ctx.fillText('Click START to begin', this.canvas.width / 2, centerY + 30);
      this.ctx.textAlign = 'left';
    }

    // Settings panel renders on top of everything else
    this.uiManager.renderHelp(this.ctx);
    this.uiManager.renderSettings(this.ctx);
  }
}

// Effect class for visual feedback
class Effect {
  id: string;
  position: { x: number; y: number };
  size = { width: 0, height: 0 };
  alive: boolean = true;
  private type: string;
  private timer: number = 0;
  private duration: number;

  constructor(type: string, x: number, y: number) {
    this.id = `effect_${type}_${Math.random().toString(36).substr(2, 9)}`;
    this.type = type;
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
        ctx.fillStyle = `rgba(255, 215, 0, ${1 - progress})`;
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('+10', this.position.x, this.position.y + yOffset);
        ctx.textAlign = 'left';
        
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
window.addEventListener('load', () => {
  new Game();
});
