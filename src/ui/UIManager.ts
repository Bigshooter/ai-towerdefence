import { DifficultyMode, GameState, TowerType } from '../types';
import { SpaceSprites } from '../visuals/SpaceSprites';

export class UIManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameState: GameState = 'menu';
  private selectedTowerType: string | null = null;
  private hoveredTile: { col: number; row: number } | null = null;
  private selectedTowerId: string | null = null;
  private showSettings: boolean = false;
  private showHelp: boolean = false;
  private draggingSlider: 'music' | 'sfx' | null = null;
  private selectedDifficulty: DifficultyMode = 'easy';
  private showDifficultyDropdown: boolean = false;

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
      if (this.showSettings || this.showHelp) return;

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

      // Help modal takes priority over game and UI interactions.
      if (this.handleHelpClick(x, y)) {
        return;
      }

      // Difficulty option list is drawn above the bottom bar; handle those
      // clicks before the UI-area gate.
      if (this.handleDifficultyDropdownOptionsClick(x, y)) {
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
      const towerUiVisible = this.gameState === 'playing' || this.gameState === 'paused' || this.gameState === 'waveComplete';
      switch (e.key) {
        case 'Escape':
          if (this.showSettings) { this.showSettings = false; break; }
          if (this.showHelp) { this.showHelp = false; break; }
          this.selectedTowerType = null;
          this.selectedTowerId = null;
          break;
        default:
          if (!towerUiVisible) break;
          if (!/^[1-9]$/.test(e.key)) break;

          const idx = parseInt(e.key, 10) - 1;
          const towerTypes = this.getAvailableTowerTypes();
          if (idx >= 0 && idx < towerTypes.length) {
            this.selectTowerType(towerTypes[idx].type, false);
          }
          break;
      }
    });
  }

  private handleUIClick(x: number, y: number): void {
    const uiY = this.canvas.height - 80;
    const towerUiVisible = this.gameState === 'playing' || this.gameState === 'paused' || this.gameState === 'waveComplete';

    // Difficulty dropdown is available before a run starts.
    if (this.gameState === 'menu' || this.gameState === 'gameOver') {
      const dropdown = this.getDifficultyDropdownRect();
      if (x >= dropdown.x && x <= dropdown.x + dropdown.w && y >= dropdown.y && y <= dropdown.y + dropdown.h) {
        this.showDifficultyDropdown = !this.showDifficultyDropdown;
        return;
      }
    }

    if (this.gameState === 'menu' || this.gameState === 'gameOver' || towerUiVisible) {
      const help = this.getHelpButtonRect();
      if (x >= help.x && x <= help.x + help.w && y >= help.y && y <= help.y + help.h) {
        this.showHelp = true;
        return;
      }
    }
    
    // Tower selection buttons (4 buttons, 60px each)
    if (towerUiVisible) {
      const towerTypes = this.getAvailableTowerTypes();
      for (let i = 0; i < towerTypes.length; i++) {
        const btnX = 50 + i * 70;
        if (x >= btnX && x <= btnX + 60 && y >= uiY && y <= uiY + 60) {
          this.selectTowerType(towerTypes[i].type);
          return;
        }
      }
    }

    // Upgrade/Sell buttons (if tower selected)
    if (towerUiVisible && this.selectedTowerId) {
      const { upgradeX: upgradeBtnX, sellX: sellBtnX } = this.getUpgradeButtonLayout();
      
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
      const reset = this.getResetButtonRect();
      if (x >= reset.x && x <= reset.x + reset.w && y >= reset.y && y <= reset.y + reset.h) {
        this.triggerReset();
        return;
      }

      const pause = this.getPauseButtonRect();
      if (x >= pause.x && x <= pause.x + pause.w && y >= pause.y && y <= pause.y + pause.h) {
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

  selectTowerType(type: 'archer' | 'cannon' | 'sniper' | 'ice' | 'flamethrower', allowToggle: boolean = true): void {
    if (allowToggle && this.selectedTowerType === type) {
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
  onResetGame?: () => void;
  onStartGame?: (difficulty: DifficultyMode) => void;
  onPauseGame?: () => void;
  onGetTowerInfo?: () => {
    level: number;
    upgradeCost: number;
    sellValue: number;
    canUpgrade: boolean;
    upgradePreview: string;
  } | null;
  onSetMusicVolume?: (v: number) => void;
  onSetSfxVolume?: (v: number) => void;
  onGetVolumes?: () => { music: number; sfx: number };
  onPreviewSfx?: () => void;

  // ---- Settings panel geometry & interaction ----

  private getGearRect(): { x: number; y: number; w: number; h: number } {
    const size = 34;
    return { x: this.canvas.width - size - 10, y: 8, w: size, h: size };
  }

  private getDifficultyDropdownRect(): { x: number; y: number; w: number; h: number } {
    const uiY = this.canvas.height - 80;
    return { x: this.canvas.width / 2 - 230, y: uiY + 20, w: 150, h: 40 };
  }

  private getHelpButtonRect(): { x: number; y: number; w: number; h: number } {
    const uiY = this.canvas.height - 80;
    return { x: this.canvas.width - 60, y: uiY + 20, w: 40, h: 40 };
  }

  private getPauseButtonRect(): { x: number; y: number; w: number; h: number } {
    const uiY = this.canvas.height - 80;
    return { x: this.canvas.width - 150, y: uiY + 20, w: 80, h: 40 };
  }

  private getResetButtonRect(): { x: number; y: number; w: number; h: number } {
    const pause = this.getPauseButtonRect();
    return { x: pause.x - 90, y: pause.y, w: 80, h: 40 };
  }

  private getHelpLayout() {
    const w = 820;
    const h = 560;
    const x = (this.canvas.width - w) / 2;
    const y = (this.canvas.height - h) / 2;
    return {
      x,
      y,
      w,
      h,
      closeBtn: { x: x + w - 44, y: y + 12, w: 30, h: 30 },
    };
  }

  private handleHelpClick(x: number, y: number): boolean {
    if (!this.showHelp) return false;

    const L = this.getHelpLayout();
    const c = L.closeBtn;
    if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
      this.showHelp = false;
      return true;
    }

    if (x >= L.x && x <= L.x + L.w && y >= L.y && y <= L.y + L.h) {
      return true;
    }

    this.showHelp = false;
    return true;
  }

  private getDifficultyOptionRect(index: number): { x: number; y: number; w: number; h: number } {
    const d = this.getDifficultyDropdownRect();
    const w = 58;
    const h = 24;
    const gap = 4;
    const totalW = w * 3 + gap * 2;
    const startX = d.x - totalW - 10;
    const y = d.y + 8;
    return { x: startX + index * (w + gap), y, w, h };
  }

  private handleDifficultyDropdownOptionsClick(x: number, y: number): boolean {
    if (!this.showDifficultyDropdown) return false;
    if (this.gameState !== 'menu' && this.gameState !== 'gameOver') return false;

    const modes: DifficultyMode[] = ['easy', 'medium', 'hard'];
    for (let i = 0; i < modes.length; i++) {
      const opt = this.getDifficultyOptionRect(i);
      if (x >= opt.x && x <= opt.x + opt.w && y >= opt.y && y <= opt.y + opt.h) {
        this.selectedDifficulty = modes[i];
        this.showDifficultyDropdown = false;
        return true;
      }
    }

    return false;
  }

  private formatDifficulty(mode: DifficultyMode): string {
    return mode.charAt(0).toUpperCase() + mode.slice(1);
  }

  private getActiveDifficulty(): DifficultyMode {
    const mode = (globalThis as any).gameState?.difficulty as DifficultyMode | undefined;
    if (mode === 'easy' || mode === 'medium' || mode === 'hard') return mode;
    return this.selectedDifficulty;
  }

  private getAvailableTowerTypes(): { type: TowerType; name: string; cost: number }[] {
    const base: { type: TowerType; name: string; cost: number }[] = [
      { type: 'archer', name: 'Archer', cost: 50 },
      { type: 'cannon', name: 'Cannon', cost: 100 },
      { type: 'sniper', name: 'Sniper', cost: 150 },
      { type: 'ice', name: 'Ice', cost: 75 },
    ];

    if (this.getWave() >= 25) {
      base.push({ type: 'flamethrower', name: 'Flame', cost: 250 });
    }

    return base;
  }

  private getUpgradeButtonLayout(): { upgradeX: number; sellX: number } {
    const hasFlamethrower = this.getAvailableTowerTypes().some(t => t.type === 'flamethrower');
    if (hasFlamethrower) {
      return { upgradeX: 410, sellX: 500 };
    }
    return { upgradeX: 340, sellX: 430 };
  }

  private getTowerRangePreview(type: string): { min: number; max: number } {
    const minRanges: Record<string, number> = {
      archer: 120,
      cannon: 100,
      sniper: 200,
      ice: 90,
      flamethrower: 100,
    };

    const min = minRanges[type] ?? 100;
    // Projected max at level 5 using the tower's legacy 10% per-level range scaling.
    const max = Math.round(min * Math.pow(1.1, 4));
    return { min, max };
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
      this.showDifficultyDropdown = false;
      this.onStartGame(this.selectedDifficulty);
    }
  }

  private triggerPause(): void {
    if (this.onPauseGame) {
      this.onPauseGame();
    }
  }

  private triggerReset(): void {
    if (this.onResetGame) {
      this.showHelp = false;
      this.showSettings = false;
      this.selectedTowerType = null;
      this.selectedTowerId = null;
      this.onResetGame();
    }
  }

  // Render UI overlay
  render(ctx: CanvasRenderingContext2D): void {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const towerUiVisible = this.gameState === 'playing' || this.gameState === 'paused' || this.gameState === 'waveComplete';

    // Top HUD bar
    ctx.fillStyle = 'rgba(26, 26, 46, 0.9)';
    ctx.fillRect(0, 0, width, 50);

    // Left-aligned HUD metrics cluster (health, gold, wave)
    const hudCenterY = 25;
    const hudStartX = 18;
    const hudGap = 132;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // Health
    ctx.fillStyle = '#CC2200';
    this.drawHeart(ctx, hudStartX + 8, hudCenterY - 8, 16);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(`${this.getLives()}`, hudStartX + 24, hudCenterY);

    // Gold
    const goldX = hudStartX + hudGap;
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('💰', goldX, hudCenterY);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`${this.getGold()}`, goldX + 28, hudCenterY);

    // Wave
    const waveX = hudStartX + hudGap * 2;
    ctx.fillStyle = '#7EC8FF';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`Wave: ${this.getWave()}`, waveX, hudCenterY);
    ctx.textBaseline = 'alphabetic';

    // Settings gear button (top-right)
    if (this.gameState === 'playing' || this.gameState === 'paused' || this.gameState === 'waveComplete') {
      const mode = this.getActiveDifficulty();
      const badgeW = 150;
      const badgeH = 28;
      const badgeX = width - 200;
      const badgeY = 11;
      const modeColor = mode === 'easy' ? '#6EEA8A' : (mode === 'medium' ? '#FFC767' : '#FF7A7A');

      ctx.fillStyle = 'rgba(24, 34, 52, 0.92)';
      ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
      ctx.strokeStyle = modeColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

      ctx.fillStyle = '#AFC7E8';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('DIFFICULTY', badgeX + 8, badgeY + 11);

      ctx.fillStyle = modeColor;
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(this.formatDifficulty(mode), badgeX + badgeW - 8, badgeY + 20);
      ctx.textAlign = 'left';
    }

    this.renderGearButton(ctx);

    // Bottom UI bar
    ctx.fillStyle = 'rgba(26, 26, 46, 0.9)';
    ctx.fillRect(0, height - 80, width, 80);

    // Tower selection buttons
    if (towerUiVisible) {
      const towerTypes = this.getAvailableTowerTypes();

      const towerSpriteFrame = Math.floor(Date.now() / 250) % 2;

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

        // Tower icon (actual in-game sprite)
        SpaceSprites.drawTower(
          ctx,
          towerTypes[i].type,
          btnX + 14,
          btnY + 6,
          32,
          towerSpriteFrame,
          isSelected,
          Date.now() / 1000,
        );

        // Name
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(towerTypes[i].name, btnX + 30, btnY + 50);
        ctx.fillText(`${towerTypes[i].cost}g`, btnX + 30, btnY + 58);

        // Hotkey hint in top-left corner of each button.
        ctx.textAlign = 'left';
        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = isSelected ? '#FFD700' : '#C7D8EE';
        ctx.fillText(`${i + 1}`, btnX + 4, btnY + 12);
        ctx.textAlign = 'left';
      }
    }

    // Upgrade/Sell buttons (if tower selected)
    if (towerUiVisible && this.selectedTowerId) {
      const { upgradeX: upgradeBtnX, sellX: sellBtnX } = this.getUpgradeButtonLayout();
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
      ctx.font = 'bold 9px monospace';
      const preview = maxed ? 'MAX LEVEL' : (info?.upgradePreview || 'UPGRADE');
      ctx.fillText(preview, upgradeBtnX + 40, height - 46);
      ctx.font = 'bold 12px monospace';
      if (maxed) {
        ctx.fillStyle = '#FFD700';
        ctx.fillText('MAX', upgradeBtnX + 40, height - 30);
      } else if (info) {
        ctx.fillStyle = affordable ? '#FFD700' : '#E06666';
        ctx.fillText(`${info.upgradeCost}g`, upgradeBtnX + 40, height - 30);
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
      const d = this.getDifficultyDropdownRect();
      ctx.fillStyle = 'rgba(54, 64, 88, 0.95)';
      ctx.fillRect(d.x, d.y, d.w, d.h);
      ctx.strokeStyle = '#7EC8FF';
      ctx.lineWidth = 2;
      ctx.strokeRect(d.x, d.y, d.w, d.h);

      ctx.fillStyle = '#D6E9FF';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('DIFFICULTY', d.x + 8, d.y + 13);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(this.formatDifficulty(this.selectedDifficulty), d.x + 8, d.y + 30);

      ctx.fillStyle = '#7EC8FF';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.showDifficultyDropdown ? '▲' : '▼', d.x + d.w - 16, d.y + 27);

      if (this.showDifficultyDropdown) {
        const modes: DifficultyMode[] = ['easy', 'medium', 'hard'];
        for (let i = 0; i < modes.length; i++) {
          const opt = this.getDifficultyOptionRect(i);
          const isSelected = this.selectedDifficulty === modes[i];
          ctx.fillStyle = isSelected ? 'rgba(126, 200, 255, 0.25)' : 'rgba(32, 38, 56, 0.95)';
          ctx.fillRect(opt.x, opt.y, opt.w, opt.h);
          ctx.strokeStyle = '#5B7FA5';
          ctx.lineWidth = 1;
          ctx.strokeRect(opt.x, opt.y, opt.w, opt.h);

          ctx.fillStyle = isSelected ? '#C6EEFF' : '#E6F0FF';
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'left';
          ctx.fillText(this.formatDifficulty(modes[i]), opt.x + 6, opt.y + 16);
        }
      }

      const btnX = width / 2 - 60;
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(btnX, height - 60, 120, 40);
      ctx.fillStyle = '#1A1A2E';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.gameState === 'menu' ? 'START' : 'RESTART', btnX + 60, height - 35);

      const help = this.getHelpButtonRect();
      ctx.fillStyle = '#334562';
      ctx.fillRect(help.x, help.y, help.w, help.h);
      ctx.strokeStyle = '#7EC8FF';
      ctx.lineWidth = 2;
      ctx.strokeRect(help.x, help.y, help.w, help.h);
      ctx.fillStyle = '#E6F2FF';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('?', help.x + help.w / 2, help.y + 26);
      ctx.textAlign = 'left';
    } else {
      const help = this.getHelpButtonRect();
      ctx.fillStyle = '#334562';
      ctx.fillRect(help.x, help.y, help.w, help.h);
      ctx.strokeStyle = '#7EC8FF';
      ctx.lineWidth = 2;
      ctx.strokeRect(help.x, help.y, help.w, help.h);
      ctx.fillStyle = '#E6F2FF';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('?', help.x + help.w / 2, help.y + 26);

      const reset = this.getResetButtonRect();
      ctx.fillStyle = '#7A2A2A';
      ctx.fillRect(reset.x, reset.y, reset.w, reset.h);
      ctx.strokeStyle = '#FF8866';
      ctx.lineWidth = 2;
      ctx.strokeRect(reset.x, reset.y, reset.w, reset.h);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('RESET', reset.x + reset.w / 2, reset.y + 25);

      const pause = this.getPauseButtonRect();
      ctx.fillStyle = '#6E6E6E';
      ctx.fillRect(pause.x, pause.y, pause.w, pause.h);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⏸', pause.x + pause.w / 2, pause.y + pause.h / 2);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }

    // Hover preview (range circle)
    if (towerUiVisible && this.hoveredTile && this.selectedTowerType) {
      const tileX = this.hoveredTile.col * 32;
      const tileY = this.hoveredTile.row * 32;
      const range = this.getTowerRangePreview(this.selectedTowerType);
      
      // Min-level range
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tileX + 16, tileY + 16, range.min, 0, Math.PI * 2);
      ctx.stroke();

      // Max-level projected range
      ctx.strokeStyle = 'rgba(126, 200, 255, 0.65)';
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.arc(tileX + 16, tileY + 16, range.max, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Highlight tile
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(tileX, tileY, 32, 32);

      // Compact legend near the tile
      ctx.fillStyle = 'rgba(8, 14, 26, 0.82)';
      ctx.fillRect(tileX + 20, tileY - 28, 96, 24);
      ctx.strokeStyle = 'rgba(120, 170, 220, 0.5)';
      ctx.strokeRect(tileX + 20, tileY - 28, 96, 24);
      ctx.fillStyle = '#FFD700';
      ctx.font = '10px monospace';
      ctx.fillText(`L1 ${range.min}`, tileX + 25, tileY - 13);
      ctx.fillStyle = '#7EC8FF';
      ctx.fillText(`L5 ${range.max}`, tileX + 68, tileY - 13);
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

  /** Draws the gameplay help modal on top of HUD and world overlays. */
  renderHelp(ctx: CanvasRenderingContext2D): void {
    if (!this.showHelp) return;

    const L = this.getHelpLayout();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = '#1C2234';
    ctx.fillRect(L.x, L.y, L.w, L.h);
    ctx.strokeStyle = '#7EC8FF';
    ctx.lineWidth = 3;
    ctx.strokeRect(L.x, L.y, L.w, L.h);

    const c = L.closeBtn;
    ctx.fillStyle = '#CC2200';
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('X', c.x + c.w / 2, c.y + 21);

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('TOWER HELP', L.x + 22, L.y + 44);

    ctx.fillStyle = '#CFE3FF';
    ctx.font = '14px monospace';
    ctx.fillText('Default skills and upgrade impact:', L.x + 22, L.y + 70);

    type HelpRow = { type: TowerType; name: string; base: string; upgrades: string };
    const rows: HelpRow[] = [
      {
        type: 'archer',
        name: 'Archer',
        base: 'Balanced single-target DPS. Base stats: damage 10, range 120, fire rate 2.5.',
        upgrades: 'Upgrades raise damage (+20%), range (+10%), and fire rate (+10%). Special at Lv3: Poison Tips.',
      },
      {
        type: 'cannon',
        name: 'Cannon',
        base: 'Heavy burst with splash. Base stats: damage 30, range 100, fire rate 0.8, splash radius 40.',
        upgrades: 'Core upgrades boost damage/range/fire rate. Special at Lv2: Incendiary Rounds (+30% splash radius).',
      },
      {
        type: 'sniper',
        name: 'Sniper',
        base: 'Long-range precision burst. Base stats: damage 50, range 200, fire rate 0.5.',
        upgrades: 'Core upgrades boost damage/range/fire rate. Special at Lv3: Piercing Rounds (+25% anti-armor damage).',
      },
      {
        type: 'ice',
        name: 'Ice',
        base: 'Control tower that slows targets. Base stats: damage 5, range 90, fire rate 1.5, slow x0.5 for 2s.',
        upgrades: 'Core upgrades boost damage/range/fire rate. Special at Lv2: Deep Freeze (+50% slow duration).',
      },
      {
        type: 'flamethrower',
        name: 'Flamethrower',
        base: 'Unlocks at wave 25. Heavy close-mid burn tower. Base stats: damage 100, range 100, fire rate 1.2.',
        upgrades: 'Core upgrades boost damage/range/fire rate. Designed for high burst lane control in short corridors.',
      },
    ];

    let y = L.y + 108;
    const iconX = L.x + 24;
    const textX = L.x + 72;
    const contentWidth = L.w - 96;
    const frame = Math.floor(Date.now() / 250) % 2;
    for (const row of rows) {
      ctx.fillStyle = 'rgba(30, 45, 70, 0.45)';
      ctx.fillRect(L.x + 18, y - 18, L.w - 36, 116);

      SpaceSprites.drawTower(ctx, row.type, iconX, y - 6, 34, frame, false, Date.now() / 1000);

      ctx.fillStyle = '#9ED8FF';
      ctx.font = 'bold 15px monospace';
      ctx.fillText(row.name, textX, y);

      ctx.fillStyle = '#E6F2FF';
      ctx.font = '12px monospace';
      const baseNextY = this.drawWrappedText(ctx, `Base: ${row.base}`, textX, y + 20, contentWidth, 15);
      const upgradesNextY = this.drawWrappedText(ctx, `Upgrades: ${row.upgrades}`, textX, baseNextY + 2, contentWidth, 15);

      ctx.strokeStyle = 'rgba(126, 200, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const dividerY = upgradesNextY + 4;
      ctx.moveTo(L.x + 20, dividerY);
      ctx.lineTo(L.x + L.w - 20, dividerY);
      ctx.stroke();

      y = dividerY + 14;
    }

    ctx.fillStyle = '#AFC7E8';
    ctx.font = '12px monospace';
    this.drawWrappedText(
      ctx,
      'Tip: The UPGRADE button previews the next applied stat change for your selected tower.',
      L.x + 22,
      L.y + L.h - 34,
      L.w - 44,
      14,
    );
  }

  private drawWrappedText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
  ): number {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth || !line) {
        line = candidate;
      } else {
        ctx.fillText(line, x, currentY);
        line = word;
        currentY += lineHeight;
      }
    }

    if (line) {
      ctx.fillText(line, x, currentY);
    }

    return currentY + lineHeight;
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
