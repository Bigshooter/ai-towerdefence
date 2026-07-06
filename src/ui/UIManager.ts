import { GameState } from '../types';

export class UIManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameState: GameState = 'menu';
  private selectedTowerType: string | null = null;
  private hoveredTile: { col: number; row: number } | null = null;
  private selectedTowerId: string | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Mouse move for hover effects
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      // Check if hovering over UI area (bottom 80px)
      if (y > this.canvas.height - 80) {
        return;
      }

      // Calculate tile hover
      const col = Math.floor(x / 32);
      const row = Math.floor(y / 32);
      this.hoveredTile = { col, row };
    });

    // Click to place tower or select
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      // Check UI area clicks
      if (y > this.canvas.height - 80) {
        this.handleUIClick(x, y);
        return;
      }

      // Game area click
      this.handleGameClick(x, y);
    });

    // Right-click to cancel
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.selectedTowerType = null;
      this.hoveredTile = null;
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'Escape':
          this.selectedTowerType = null;
          this.selectedTowerId = null;
          break;
        case '1':
          this.selectTowerType('archer');
          break;
        case '2':
          this.selectTowerType('cannon');
          break;
        case '3':
          this.selectTowerType('sniper');
          break;
        case '4':
          this.selectTowerType('ice');
          break;
      }
    });
  }

  private handleUIClick(x: number, y: number): void {
    const uiY = this.canvas.height - 80;
    
    // Tower selection buttons (4 buttons, 60px each)
    for (let i = 0; i < 4; i++) {
      const btnX = 50 + i * 70;
      if (x >= btnX && x <= btnX + 60 && y >= uiY && y <= uiY + 60) {
        const types: ('archer' | 'cannon' | 'sniper' | 'ice')[] = ['archer', 'cannon', 'sniper', 'ice'];
        this.selectTowerType(types[i]);
        return;
      }
    }

    // Upgrade/Sell buttons (if tower selected)
    if (this.selectedTowerId) {
      const upgradeBtnX = 340;
      const sellBtnX = 430;
      
      if (x >= upgradeBtnX && x <= upgradeBtnX + 80 && y >= uiY + 20 && y <= uiY + 60) {
        this.triggerUpgrade();
        return;
      }
      
      if (x >= sellBtnX && x <= sellBtnX + 80 && y >= uiY + 20 && y <= uiY + 60) {
        this.triggerSell();
        return;
      }
    }

    // Start/Pause buttons
    if (this.gameState === 'menu' || this.gameState === 'gameOver') {
      const startBtnX = 580;
      if (x >= startBtnX && x <= startBtnX + 120 && y >= uiY + 10 && y <= uiY + 50) {
        this.triggerStart();
      }
    } else if (this.gameState === 'playing') {
      const pauseBtnX = 1100;
      if (x >= pauseBtnX && x <= pauseBtnX + 40 && y >= uiY + 10 && y <= uiY + 50) {
        this.triggerPause();
      }
    }
  }

  private handleGameClick(x: number, y: number): void {
    if (this.selectedTowerType) {
      // Place tower
      const col = Math.floor(x / 32);
      const row = Math.floor(y / 32);
      this.triggerPlaceTower(this.selectedTowerType, col, row);
    } else {
      // Select existing tower
      const col = Math.floor(x / 32);
      const row = Math.floor(y / 32);
      this.triggerSelectTower(col, row);
    }
  }

  selectTowerType(type: 'archer' | 'cannon' | 'sniper' | 'ice'): void {
    if (this.selectedTowerType === type) {
      this.selectedTowerType = null; // Deselect
    } else {
      this.selectedTowerType = type;
      this.selectedTowerId = null;
    }
  }

  getSelectedTowerType(): string | null {
    return this.selectedTowerType;
  }

  getHoveredTile(): { col: number; row: number } | null {
    return this.hoveredTile;
  }

  getSelectedTowerId(): string | null {
    return this.selectedTowerId;
  }

  setGameState(state: GameState): void {
    this.gameState = state;
  }

  getGameState(): GameState {
    return this.gameState;
  }

  // Callbacks for game logic
  onPlaceTower?: (type: string, col: number, row: number) => boolean;
  onSelectTower?: (col: number, row: number) => void;
  onUpgradeTower?: () => void;
  onSellTower?: () => void;
  onStartGame?: () => void;
  onPauseGame?: () => void;

  private triggerPlaceTower(type: string, col: number, row: number): boolean {
    if (this.onPlaceTower) {
      const success = this.onPlaceTower(type, col, row);
      if (success) {
        this.selectedTowerType = null; // Deselect after successful placement
      }
      return success;
    }
    return false;
  }

  private triggerSelectTower(col: number, row: number): void {
    if (this.onSelectTower) {
      this.onSelectTower(col, row);
    }
  }

  private triggerUpgrade(): void {
    if (this.onUpgradeTower) {
      this.onUpgradeTower();
    }
  }

  private triggerSell(): void {
    if (this.onSellTower) {
      this.onSellTower();
    }
  }

  private triggerStart(): void {
    if (this.onStartGame) {
      this.onStartGame();
    }
  }

  private triggerPause(): void {
    if (this.onPauseGame) {
      this.onPauseGame();
    }
  }

  // Render UI overlay
  render(ctx: CanvasRenderingContext2D): void {
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Top HUD bar
    ctx.fillStyle = 'rgba(26, 26, 46, 0.9)';
    ctx.fillRect(0, 0, width, 50);

    // Lives (hearts)
    ctx.fillStyle = '#CC2200';
    for (let i = 0; i < 10; i++) {
      const hx = 20 + i * 25;
      const hy = 15;
      this.drawHeart(ctx, hx, hy, 8);
    }

    // Gold
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('💰', 280, 35);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`${this.getGold()}`, 310, 35);

    // Wave
    ctx.fillStyle = '#7EC8FF';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`Wave: ${this.getWave()}`, 420, 35);

    // Bottom UI bar
    ctx.fillStyle = 'rgba(26, 26, 46, 0.9)';
    ctx.fillRect(0, height - 80, width, 80);

    // Tower selection buttons
    const towerTypes: { type: string; name: string; color: string; cost: number }[] = [
      { type: 'archer', name: 'Archer', color: '#3DC83D', cost: 50 },
      { type: 'cannon', name: 'Cannon', color: '#9E9E9E', cost: 100 },
      { type: 'sniper', name: 'Sniper', color: '#A855F7', cost: 150 },
      { type: 'ice', name: 'Ice', color: '#7EC8FF', cost: 75 },
    ];

    for (let i = 0; i < towerTypes.length; i++) {
      const btnX = 50 + i * 70;
      const btnY = height - 70;
      const isSelected = this.selectedTowerType === towerTypes[i].type;

      // Button background
      ctx.fillStyle = isSelected ? 'rgba(255, 215, 0, 0.3)' : 'rgba(100, 100, 100, 0.5)';
      ctx.fillRect(btnX, btnY, 60, 60);

      // Button border
      ctx.strokeStyle = isSelected ? '#FFD700' : '#6E6E6E';
      ctx.lineWidth = 2;
      ctx.strokeRect(btnX, btnY, 60, 60);

      // Tower icon (simplified)
      ctx.fillStyle = towerTypes[i].color;
      ctx.fillRect(btnX + 15, btnY + 10, 30, 30);

      // Name
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(towerTypes[i].name, btnX + 30, btnY + 50);
      ctx.fillText(`${towerTypes[i].cost}g`, btnX + 30, btnY + 58);
      ctx.textAlign = 'left';
    }

    // Upgrade/Sell buttons (if tower selected)
    if (this.selectedTowerId) {
      const upgradeBtnX = 340;
      const sellBtnX = 430;

      // Upgrade button
      ctx.fillStyle = '#3DC83D';
      ctx.fillRect(upgradeBtnX, height - 60, 80, 40);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('UPGRADE', upgradeBtnX + 5, height - 35);

      // Sell button
      ctx.fillStyle = '#CC2200';
      ctx.fillRect(sellBtnX, height - 60, 80, 40);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('SELL', sellBtnX + 15, height - 35);
    }

    // Start/Pause button
    if (this.gameState === 'menu' || this.gameState === 'gameOver') {
      const btnX = width / 2 - 60;
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(btnX, height - 60, 120, 40);
      ctx.fillStyle = '#1A1A2E';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(this.gameState === 'menu' ? 'START' : 'RESTART', btnX + 15, height - 35);
    } else {
      const pauseBtnX = width - 60;
      ctx.fillStyle = '#6E6E6E';
      ctx.fillRect(pauseBtnX, height - 60, 40, 40);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '16px monospace';
      ctx.fillText('⏸', pauseBtnX + 8, height - 32);
    }

    // Hover preview (range circle)
    if (this.hoveredTile && this.selectedTowerType) {
      const tileX = this.hoveredTile.col * 32;
      const tileY = this.hoveredTile.row * 32;
      
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tileX + 16, tileY + 16, 80, 0, Math.PI * 2);
      ctx.stroke();

      // Highlight tile
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(tileX, tileY, 32, 32);
    }
  }

  private drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.beginPath();
    ctx.moveTo(x, y + size / 4);
    ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + size / 4);
    ctx.bezierCurveTo(x - size / 2, y + size / 2, x, y + size * 0.7, x, y + size);
    ctx.bezierCurveTo(x, y + size * 0.7, x + size / 2, y + size / 2, x + size / 2, y + size / 4);
    ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + size / 4);
    ctx.fill();
  }

  // Data getters for rendering
  getGold(): number { return (window as any).gameData?.gold ?? 0; }
  getWave(): number { return (window as any).gameData?.wave ?? 1; }
}
