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
import { UIManager } from './ui/UIManager';
import { AudioManager } from './audio/AudioManager';
import { SpaceSprites } from './visuals/SpaceSprites';
import { DifficultyMode, GameData as IGameData, GameSpeed, GameState, EnemyType, MapType, TowerType, Position, WaveConfig } from './types';

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
  private uiManager!: UIManager;
  private audioManager = new AudioManager();

  // Game state
  private gameState: GameState = 'menu';
  private gameSpeed: GameSpeed = 1;
  private gameData: GameData = { lives: 20, gold: 150, wave: 1, score: 0 };
  private enemies: Enemy[] = [];
  private towers: Tower[] = [];
  private projectiles: Projectile[] = [];
  private effects: Effect[] = [];

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
    (window as any).SpaceSprites = SpaceSprites;
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
    };

    this.uiManager.onSetGameSpeed = (speed) => {
      this.gameSpeed = speed;
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

  private startNewGame(difficulty: DifficultyMode = 'easy', mapType: MapType = 'space'): void {
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
    this.economySystem = new EconomySystem(150);
    this.healthSystem = new HealthSystem(20, 20);
    this.bannerTimer = 0;

    // Brief delay before the first wave; timing advances via update(dt) so it
    // pauses and resumes correctly with the game state.
    this.waveSystem.scheduleWave(1, 1);

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

    if (!this.economySystem.spendGold(stats.cost)) {
      this.audioManager.playSFX('click'); // Error sound
      return false;
    }

    // Create and place tower
    const tower = new Tower(towerType, x, y);
    this.towers.push(tower);
    this.syncGold();
    this.audioManager.playSFX('click');

    return true;
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

    if (this.economySystem.spendGold(option.cost)) {
      this.syncGold();
      option.apply(tower);
      tower.data.level++;
      this.audioManager.playSFX('click');
    }
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

    // Add gold
    this.economySystem.addGold(sellValue);
    this.syncGold();
    this.uiManager.setSelectedTower(null);
    this.audioManager.playSFX('click');
  }

  public setGameSpeed(speed: GameSpeed): void {
    this.gameSpeed = speed;
    this.uiManager.setGameSpeed(speed);
  }

  public getGameSpeed(): GameSpeed {
    return this.gameSpeed;
  }

  private update(dt: number): void {
    if (this.gameState !== 'playing') return;

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
          
          // Apply slow effect
          if (projectile.data.slowFactor) {
            enemy.applySlow(projectile.data.slowFactor, projectile.data.slowDuration || 2);
          }

          // Add hit effect
          this.addEffect('hit', projectile.position.x, projectile.position.y);
          
          // Check if enemy died
          if (!enemy.alive) {
            this.economySystem.addGold(enemy.data.reward);
            this.gameData.score += enemy.data.reward * 10;
            this.addEffect('death', enemy.position.x, enemy.position.y, `+${enemy.data.reward}`);
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
    this.economySystem.addGold(bonusGold);
    this.syncGold();

    // Banner shows the wave that was just cleared
    this.bannerWave = this.gameData.wave;
    this.bannerTimer = 2;

    // Advance to the next wave after a pause (countdown driven by update(dt))
    this.gameData.wave++;
    this.waveSystem.scheduleWave(this.gameData.wave, this.wavePauseDuration);
  }

  private syncGold(): void {
    this.gameData.gold = this.economySystem.getGold();
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
      this.ctx.fillText(`Wave ${this.bannerWave} Complete!`, this.canvas.width / 2, this.canvas.height / 2);
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

    // Settings, help, leaderboard, and high score modals render on top of everything else
    this.uiManager.renderHelp(this.ctx);
    this.uiManager.renderSettings(this.ctx);
    this.uiManager.renderLeaderboardModal(this.ctx);
    this.uiManager.renderHighScoreEntry(this.ctx);
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
window.addEventListener('load', () => {
  new Game();
});
