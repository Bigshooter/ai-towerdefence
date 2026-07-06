import { GameState } from '../types';

export class UIManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameState: GameState = 'menu';
  private selectedTowerType: string | null = null;
  private hoveredTile: { col: number; row: number } | null = null;
  private selectedTowerId: string | null = null;
  private showSettings: boolean = false;
  private draggingSlider: 'music' | 'sfx' | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.setupEventListeners();
  }

  private toCanvasCoords(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  private setupEventListeners(): void {
    // Mouse move for hover effects (and settings slider dragging)
    this.canvas.addEventListener('mousemove', (e) => {
      const { x, y } = this.toCanvasCoords(e);

      // Dragging a volume slider takes priority
      if (this.draggingSlider) {
        this.setSliderFromX(this.draggingSlider, x);
        return;
      }

      // No hover updates while the settings panel is open
      if (this.showSettings) return;

      // Check if hovering over UI area (bottom 80px)
      if (y > this.canvas.height - 80) {
        return;
      }

      // Calculate tile hover
      const col = Math.floor(x / 32);
      const row = Math.floor(y / 32);
      this.hoveredTile = { col, row };
    });

    // Begin dragging a slider when pressing on one
    this.canvas.addEventListener('mousedown', (e) => {
      if (!this.showSettings) return;
      const { x, y } = this.toCanvasCoords(e);
      const slider = this.hitSlider(x, y);
      if (slider) {
        this.draggingSlider = slider;
        this.setSliderFromX(slider, x);
      }
    });

    const endDrag = () => {
      if (this.draggingSlider === 'sfx' && this.onPreviewSfx) this.onPreviewSfx();
      this.draggingSlider = null;
    };
    window.addEventListener('mouseup', endDrag);

    // Click to place tower or select
    this.canvas.addEventListener('click', (e) => {
      const { x, y } = this.toCanvasCoords(e);

      // Settings gear / panel take priority over everything else
      if (this.handleSettingsClick(x, y)) {
        return;
      }

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
          if (this.showSettings) { this.showSettings = false; break; }
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
      const startBtnX = this.canvas.width / 2 - 60;
      if (x >= startBtnX && x <= startBtnX + 120 && y >= uiY + 20 && y <= uiY + 60) {
        this.triggerStart();
      }
    } else if (this.gameState === 'playing' || this.gameState === 'paused') {
      const pauseBtnX = this.canvas.width - 60;
      if (x >= pauseBtnX && x <= pauseBtnX + 40 && y >= uiY + 20 && y <= uiY + 60) {
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
  onGetTowerInfo?: () => { level: number; upgradeCost: number; sellValue: number; canUpgrade: boolean } | null;
  onSetMusicVolume?: (v: number) => void;
  onSetSfxVolume?: (v: number) => void;
  onGetVolumes?: () => { music: number; sfx: number };
  onPreviewSfx?: () => void;

  // ---- Settings panel geometry & interaction ----

  private getGearRect(): { x: number; y: number; w: number; h: number } {
    const size = 34;
    return { x: this.canvas.width - size - 10, y: 8, w: size, h: size };
  }

  private getSettingsLayout() {
    const w = 460;
    const h = 300;
    const x = (this.canvas.width - w) / 2;
    const y = (this.canvas.height - h) / 2;
    const trackX = x + 150;
    const trackW = w - 200;
    return {
      x, y, w, h, trackX, trackW,
      musicY: y + 130,
      sfxY: y + 200,
      closeBtn: { x: x + w - 42, y: y + 14, w: 28, h: 28 },
    };
  }

  private hitSlider(x: number, y: number): 'music' | 'sfx' | null {
    const L = this.getSettingsLayout();
    if (x < L.trackX - 12 || x > L.trackX + L.trackW + 12) return null;
    if (Math.abs(y - L.musicY) <= 18) return 'music';
    if (Math.abs(y - L.sfxY) <= 18) return 'sfx';
    return null;
  }

  private setSliderFromX(which: 'music' | 'sfx', x: number): void {
    const L = this.getSettingsLayout();
    const v = Math.max(0, Math.min(1, (x - L.trackX) / L.trackW));
    if (which === 'music') this.onSetMusicVolume?.(v);
    else this.onSetSfxVolume?.(v);
  }

  /** Returns true if the click was consumed by the gear button or settings panel. */
  private handleSettingsClick(x: number, y: number): boolean {
    const gear = this.getGearRect();
    if (x >= gear.x && x <= gear.x + gear.w && y >= gear.y && y <= gear.y + gear.h) {
      this.showSettings = !this.showSettings;
      return true;
    }

    if (!this.showSettings) return false;

    const L = this.getSettingsLayout();
    const c = L.closeBtn;
    if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
      this.showSettings = false;
      return true;
    }

    const slider = this.hitSlider(x, y);
    if (slider) {
      this.setSliderFromX(slider, x);
      if (slider === 'sfx' && this.onPreviewSfx) this.onPreviewSfx();
      return true;
    }

    // Clicks anywhere inside the panel are consumed; clicks outside close it
    if (x >= L.x && x <= L.x + L.w && y >= L.y && y <= L.y + L.h) return true;
    this.showSettings = false;
    return true;
  }

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

    // Lives (heart icon + remaining count)
    ctx.fillStyle = '#CC2200';
    this.drawHeart(ctx, 26, 14, 16);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(`${this.getLives()}`, 42, 33);

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

    // Settings gear button (top-right)
    this.renderGearButton(ctx);

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
      const info = this.onGetTowerInfo ? this.onGetTowerInfo() : null;
      const gold = this.getGold();
      const maxed = !!info && !info.canUpgrade;
      const affordable = !!info && info.canUpgrade && gold >= info.upgradeCost;

      // Upgrade button
      ctx.fillStyle = maxed ? '#4A4A4A' : (affordable ? '#3DC83D' : '#7A5A2A');
      ctx.fillRect(upgradeBtnX, height - 60, 80, 40);
      ctx.strokeStyle = affordable ? '#BFFFBF' : '#3A3A3A';
      ctx.lineWidth = 2;
      ctx.strokeRect(upgradeBtnX, height - 60, 80, 40);
      ctx.textAlign = 'center';
      ctx.fillStyle = affordable ? '#FFFFFF' : '#CFCFCF';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('UPGRADE', upgradeBtnX + 40, height - 44);
      ctx.font = 'bold 12px monospace';
      if (maxed) {
        ctx.fillStyle = '#FFD700';
        ctx.fillText('MAX', upgradeBtnX + 40, height - 29);
      } else if (info) {
        ctx.fillStyle = affordable ? '#FFD700' : '#E06666';
        ctx.fillText(`${info.upgradeCost}g`, upgradeBtnX + 40, height - 29);
      }

      // Sell button
      ctx.fillStyle = '#CC2200';
      ctx.fillRect(sellBtnX, height - 60, 80, 40);
      ctx.strokeStyle = '#FF8866';
      ctx.lineWidth = 2;
      ctx.strokeRect(sellBtnX, height - 60, 80, 40);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('SELL', sellBtnX + 40, height - 44);
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#FFD700';
      ctx.fillText(info ? `+${info.sellValue}g` : '', sellBtnX + 40, height - 29);

      ctx.textAlign = 'left';
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

  private renderGearButton(ctx: CanvasRenderingContext2D): void {
    const g = this.getGearRect();
    const cx = g.x + g.w / 2;
    const cy = g.y + g.h / 2;

    // Button background
    ctx.fillStyle = this.showSettings ? 'rgba(255, 215, 0, 0.25)' : 'rgba(100, 100, 100, 0.4)';
    ctx.fillRect(g.x, g.y, g.w, g.h);
    ctx.strokeStyle = this.showSettings ? '#FFD700' : '#8A8A8A';
    ctx.lineWidth = 2;
    ctx.strokeRect(g.x, g.y, g.w, g.h);

    // Cog: outer teeth + ring + hub
    ctx.fillStyle = this.showSettings ? '#FFD700' : '#E0E0E0';
    const teeth = 8;
    const rOuter = 11;
    const rInner = 7;
    ctx.beginPath();
    for (let i = 0; i < teeth * 2; i++) {
      const ang = (i / (teeth * 2)) * Math.PI * 2;
      const r = i % 2 === 0 ? rOuter : rInner;
      const px = cx + Math.cos(ang) * r;
      const py = cy + Math.sin(ang) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Hub hole
    ctx.fillStyle = 'rgba(26, 26, 46, 0.95)';
    ctx.beginPath();
    ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Draws the settings overlay. Called last so it sits above all other overlays. */
  renderSettings(ctx: CanvasRenderingContext2D): void {
    if (!this.showSettings) return;

    const L = this.getSettingsLayout();
    const vols = this.onGetVolumes ? this.onGetVolumes() : { music: 0, sfx: 0 };

    // Dim the whole screen
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Panel
    ctx.fillStyle = '#1E1E32';
    ctx.fillRect(L.x, L.y, L.w, L.h);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.strokeRect(L.x, L.y, L.w, L.h);

    // Title
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('SETTINGS', L.x + 24, L.y + 42);

    // Close button (X)
    const c = L.closeBtn;
    ctx.fillStyle = '#CC2200';
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('X', c.x + c.w / 2, c.y + c.h / 2 + 6);
    ctx.textAlign = 'left';

    this.drawSlider(ctx, 'Music', L.trackX, L.musicY, L.trackW, vols.music, '#7EC8FF');
    this.drawSlider(ctx, 'Sound FX', L.trackX, L.sfxY, L.trackW, vols.sfx, '#3DC83D');
  }

  private drawSlider(
    ctx: CanvasRenderingContext2D,
    label: string,
    trackX: number,
    trackY: number,
    trackW: number,
    value: number,
    color: string,
  ): void {
    // Label (to the left of the track)
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(label, trackX - 20, trackY + 6);

    // Track
    ctx.fillStyle = '#3A3A50';
    ctx.fillRect(trackX, trackY - 4, trackW, 8);

    // Filled portion
    ctx.fillStyle = color;
    ctx.fillRect(trackX, trackY - 4, trackW * value, 8);

    // Handle
    const hx = trackX + trackW * value;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(hx, trackY, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Percentage
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${Math.round(value * 100)}%`, trackX + trackW + 16, trackY + 5);
  }

  // Data getters for rendering
  getGold(): number { return (window as any).gameData?.gold ?? 0; }
  getLives(): number { return (window as any).gameData?.lives ?? 0; }
  getWave(): number { return (window as any).gameData?.wave ?? 1; }
}
