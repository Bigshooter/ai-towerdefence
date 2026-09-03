import { DifficultyMode, GameData, GameSpeed, GameState, HighScoreEntry, MapType, TowerType } from '../types';
import { SpaceSprites } from '../visuals/SpaceSprites';

export class UIManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameState: GameState = 'menu';
  private gameSpeed: GameSpeed = 1;
  private selectedTowerType: string | null = null;
  private hoveredTile: { col: number; row: number } | null = null;
  private selectedTowerId: string | null = null;
  private showSettings: boolean = false;
  private showHelp: boolean = false;
  private draggingSlider: 'music' | 'sfx' | null = null;
  private selectedDifficulty: DifficultyMode = 'easy';
  private showDifficultyDropdown: boolean = false;
  private selectedMap: MapType = 'space';
  private showMapDropdown: boolean = false;

  // High score & leaderboards
  private showHighScoreEntry: boolean = false;
  private highScoreNameInput: string = '';
  private highScoreScore: number = 0;
  private highScoreWave: number = 1;
  private highScoreDifficulty: DifficultyMode = 'easy';
  private highScoreMap: MapType = 'space';
  private showLeaderboardModal: boolean = false;
  private activeLeaderboardTab: MapType = 'space';
  private lastSubmittedEntryId: string | null = null;

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

      // High Score name entry takes priority
      if (this.handleHighScoreEntryClick(x, y)) {
        return;
      }

      // Leaderboard modal takes priority
      if (this.handleLeaderboardClick(x, y)) {
        return;
      }

      // Settings gear / panel take priority over everything else
      if (this.handleSettingsClick(x, y)) {
        return;
      }

      // Help modal takes priority over game and UI interactions.
      if (this.handleHelpClick(x, y)) {
        return;
      }

      // Leaderboard button in menu/game-over HUD
      if (this.handleHUDLeaderboardClick(x, y)) {
        return;
      }

      // Leaderboard button on game over screen
      if (this.handleGameOverLeaderboardClick(x, y)) {
        return;
      }

      // Difficulty option list is drawn above the bottom bar; handle those
      // clicks before the UI-area gate.
      if (this.handleDifficultyDropdownOptionsClick(x, y)) {
        return;
      }

      // Map option list is drawn above the bottom bar
      if (this.handleMapDropdownOptionsClick(x, y)) {
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
      this.selectedTowerId = null;
      this.hoveredTile = null;
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // High score text entry captures keystrokes
      if (this.showHighScoreEntry) {
        if (e.key === 'Backspace') {
          this.highScoreNameInput = this.highScoreNameInput.slice(0, -1);
          this.onPreviewTypeKey?.();
          e.preventDefault();
          return;
        }
        if (e.key === 'Enter') {
          this.submitHighScore();
          e.preventDefault();
          return;
        }
        if (e.key === 'Escape') {
          this.closeHighScoreEntry();
          e.preventDefault();
          return;
        }
        if (e.key.length === 1 && /^[a-zA-Z0-9]$/.test(e.key)) {
          if (this.highScoreNameInput.length < 6) {
            this.highScoreNameInput += e.key.toUpperCase();
            this.onPreviewTypeKey?.();
          }
          e.preventDefault();
          return;
        }
        return;
      }

      if (this.showLeaderboardModal) {
        if (e.key === 'Escape') {
          this.closeLeaderboardModal();
          e.preventDefault();
          return;
        }
      }

      const towerUiVisible = this.gameState === 'playing' || this.gameState === 'paused' || this.gameState === 'waveComplete';
      switch (e.key) {
        case 'Escape':
          if (this.showSettings) { this.showSettings = false; break; }
          if (this.showHelp) { this.showHelp = false; break; }
          this.selectedTowerType = null;
          this.selectedTowerId = null;
          break;
        case ' ':
        case '`':
        case '~':
        case 's':
        case 'S':
          if (towerUiVisible) {
            this.cycleGameSpeed();
            e.preventDefault();
          }
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

    // Difficulty and Map dropdowns are available before a run starts.
    if (this.gameState === 'menu' || this.gameState === 'gameOver') {
      const difficultyDropdown = this.getDifficultyDropdownRect();
      if (x >= difficultyDropdown.x && x <= difficultyDropdown.x + difficultyDropdown.w && y >= difficultyDropdown.y && y <= difficultyDropdown.y + difficultyDropdown.h) {
        this.showDifficultyDropdown = !this.showDifficultyDropdown;
        this.showMapDropdown = false;
        return;
      }

      const mapDropdown = this.getMapDropdownRect();
      if (x >= mapDropdown.x && x <= mapDropdown.x + mapDropdown.w && y >= mapDropdown.y && y <= mapDropdown.y + mapDropdown.h) {
        this.showMapDropdown = !this.showMapDropdown;
        this.showDifficultyDropdown = false;
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
      const speed = this.getSpeedButtonRect();
      if (x >= speed.x && x <= speed.x + speed.w && y >= speed.y && y <= speed.y + speed.h) {
        this.cycleGameSpeed();
        return;
      }

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

  setSelectedTower(id: string | null): void {
    this.selectedTowerId = id;
  }

  getUpgradeButtonLayout(): { upgradeX: number; sellX: number } {
    const hasFlamethrower = this.getAvailableTowerTypes().some(t => t.type === 'flamethrower');
    if (hasFlamethrower) {
      return { upgradeX: 410, sellX: 500 };
    }
    return { upgradeX: 340, sellX: 430 };
  }

  getShowSettings(): boolean {
    return this.showSettings;
  }

  getShowHelp(): boolean {
    return this.showHelp;
  }

  getShowDifficultyDropdown(): boolean {
    return this.showDifficultyDropdown;
  }

  getSelectedDifficulty(): DifficultyMode {
    return this.selectedDifficulty;
  }

  getShowMapDropdown(): boolean {
    return this.showMapDropdown;
  }

  getSelectedMap(): MapType {
    return this.selectedMap;
  }

  setSelectedMap(map: MapType): void {
    this.selectedMap = map;
    if (this.onSelectMap) {
      this.onSelectMap(map);
    }
  }

  setGameState(state: GameState): void {
    this.gameState = state;
  }

  getGameState(): GameState {
    return this.gameState;
  }

  // High score getters and helpers
  getShowHighScoreEntry(): boolean {
    return this.showHighScoreEntry;
  }

  getHighScoreInput(): string {
    return this.highScoreNameInput;
  }

  setHighScoreInput(name: string): void {
    const cleaned = (name || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
    this.highScoreNameInput = cleaned;
  }

  getShowLeaderboardModal(): boolean {
    return this.showLeaderboardModal;
  }

  getActiveLeaderboardTab(): MapType {
    return this.activeLeaderboardTab;
  }

  setActiveLeaderboardTab(map: MapType): void {
    this.activeLeaderboardTab = map;
  }

  openHighScoreEntry(score: number, wave: number, difficulty: DifficultyMode, map: MapType): void {
    this.highScoreScore = score;
    this.highScoreWave = wave;
    this.highScoreDifficulty = difficulty;
    this.highScoreMap = map;
    this.highScoreNameInput = '';
    this.showHighScoreEntry = true;
    this.showLeaderboardModal = false;
    this.showSettings = false;
    this.showHelp = false;
  }

  closeHighScoreEntry(): void {
    this.showHighScoreEntry = false;
  }

  openLeaderboardModal(map?: MapType): void {
    if (map) {
      this.activeLeaderboardTab = map;
    }
    this.showLeaderboardModal = true;
    this.showHighScoreEntry = false;
    this.showSettings = false;
    this.showHelp = false;
  }

  closeLeaderboardModal(): void {
    this.showLeaderboardModal = false;
  }

  submitHighScore(): void {
    const sanitized = (this.highScoreNameInput || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
    const nameToSubmit = sanitized.length > 0 ? sanitized : 'PLAYER';
    let createdEntryId: string | null = null;
    if (this.onSubmitHighScore) {
      const res = this.onSubmitHighScore(
        nameToSubmit,
        this.highScoreScore,
        this.highScoreWave,
        this.highScoreDifficulty,
        this.highScoreMap
      );
      if (res && typeof res === 'object' && res.id) {
        createdEntryId = res.id;
      }
    }
    this.lastSubmittedEntryId = createdEntryId;
    this.showHighScoreEntry = false;
    this.activeLeaderboardTab = this.highScoreMap;
    this.showLeaderboardModal = true;
  }

  // Game speed controls
  getGameSpeed(): GameSpeed {
    return this.gameSpeed;
  }

  setGameSpeed(speed: GameSpeed): void {
    this.gameSpeed = speed;
    this.onSetGameSpeed?.(speed);
  }

  cycleGameSpeed(): GameSpeed {
    const speeds: GameSpeed[] = [1, 2, 3, 5];
    const nextIdx = (speeds.indexOf(this.gameSpeed) + 1) % speeds.length;
    this.gameSpeed = speeds[nextIdx];
    this.onSetGameSpeed?.(this.gameSpeed);
    return this.gameSpeed;
  }

  // Callbacks for game logic
  onPlaceTower?: (type: string, col: number, row: number) => boolean;
  onSelectTower?: (col: number, row: number) => void;
  onUpgradeTower?: () => void;
  onSellTower?: () => void;
  onResetGame?: () => void;
  onStartGame?: (difficulty: DifficultyMode, mapType: MapType) => void;
  onSelectMap?: (mapType: MapType) => void;
  onPauseGame?: () => void;
  onSetGameSpeed?: (speed: GameSpeed) => void;
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
  onGetGameData?: () => GameData;
  onSubmitHighScore?: (
    name: string,
    score?: number,
    wave?: number,
    difficulty?: DifficultyMode,
    map?: MapType
  ) => HighScoreEntry | void;
  onGetLeaderboard?: (map: MapType) => HighScoreEntry[];
  onCheckHighScore?: (score: number, map: MapType) => boolean;
  onPreviewTypeKey?: () => void;

  // ---- Settings panel geometry & interaction ----

  private getGearRect(): { x: number; y: number; w: number; h: number } {
    const size = 34;
    return { x: this.canvas.width - size - 10, y: 8, w: size, h: size };
  }

  private getDifficultyDropdownRect(): { x: number; y: number; w: number; h: number } {
    const uiY = this.canvas.height - 80;
    return { x: this.canvas.width / 2 - 230, y: uiY + 20, w: 150, h: 40 };
  }

  private getMapDropdownRect(): { x: number; y: number; w: number; h: number } {
    const uiY = this.canvas.height - 80;
    return { x: this.canvas.width / 2 + 80, y: uiY + 20, w: 150, h: 40 };
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

  private getSpeedButtonRect(): { x: number; y: number; w: number; h: number } {
    const reset = this.getResetButtonRect();
    return { x: reset.x - 90, y: reset.y, w: 80, h: 40 };
  }

  private getHelpLayout() {
    const w = 860;
    const h = 720;
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

  private getMapOptionRect(index: number): { x: number; y: number; w: number; h: number } {
    const d = this.getMapDropdownRect();
    const w = 72;
    const h = 24;
    const gap = 4;
    const startX = d.x + d.w + 10;
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

  private handleMapDropdownOptionsClick(x: number, y: number): boolean {
    if (!this.showMapDropdown) return false;
    if (this.gameState !== 'menu' && this.gameState !== 'gameOver') return false;

    const maps: MapType[] = ['space', 'dungeon', 'military'];
    for (let i = 0; i < maps.length; i++) {
      const opt = this.getMapOptionRect(i);
      if (x >= opt.x && x <= opt.x + opt.w && y >= opt.y && y <= opt.y + opt.h) {
        this.selectedMap = maps[i];
        this.showMapDropdown = false;
        if (this.onSelectMap) {
          this.onSelectMap(this.selectedMap);
        }
        return true;
      }
    }

    return false;
  }

  private formatDifficulty(mode: DifficultyMode): string {
    return mode.charAt(0).toUpperCase() + mode.slice(1);
  }

  private formatMap(map: MapType): string {
    switch (map) {
      case 'space': return 'Space';
      case 'dungeon': return 'Dungeon';
      case 'military': return 'Military';
    }
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

  private getHUDLeaderboardButtonRect(): { x: number; y: number; w: number; h: number } {
    const size = 34;
    const gearX = this.canvas.width - size - 10;
    const btnW = 150;
    return { x: gearX - btnW - 12, y: 8, w: btnW, h: size };
  }

  private getGameOverLeaderboardButtonRect(): { x: number; y: number; w: number; h: number } {
    return { x: this.canvas.width / 2 - 100, y: this.canvas.height / 2 + 80, w: 200, h: 40 };
  }

  private getHighScoreEntryLayout() {
    const w = 580;
    const h = 420;
    const x = (this.canvas.width - w) / 2;
    const y = (this.canvas.height - h) / 2;
    const boxW = 54;
    const boxH = 64;
    const gap = 12;
    const boxesTotalW = 6 * boxW + 5 * gap;
    const boxesStartX = x + (w - boxesTotalW) / 2;
    const boxesY = y + 175;
    const submitBtn = { x: boxesStartX, y: boxesY + boxH + 30, w: 260, h: 44 };
    const backspaceBtn = { x: boxesStartX + 276, y: boxesY + boxH + 30, w: 108, h: 44 };
    return {
      x,
      y,
      w,
      h,
      boxesStartX,
      boxesY,
      boxW,
      boxH,
      gap,
      submitBtn,
      backspaceBtn,
      closeBtn: { x: x + w - 42, y: y + 14, w: 28, h: 28 },
    };
  }

  private getLeaderboardLayout() {
    const w = 840;
    const h = 680;
    const x = (this.canvas.width - w) / 2;
    const y = (this.canvas.height - h) / 2;
    const tabW = 210;
    const tabH = 38;
    const gap = 12;
    const tabsTotalW = 3 * tabW + 2 * gap;
    const tabsStartX = x + (w - tabsTotalW) / 2;
    const tabsY = y + 70;
    const closeBtn = { x: x + w - 44, y: y + 14, w: 30, h: 30 };
    const bottomCloseBtn = { x: x + w / 2 - 80, y: y + h - 56, w: 160, h: 40 };
    return {
      x,
      y,
      w,
      h,
      tabW,
      tabH,
      gap,
      tabsStartX,
      tabsY,
      closeBtn,
      bottomCloseBtn,
    };
  }

  private handleHighScoreEntryClick(x: number, y: number): boolean {
    if (!this.showHighScoreEntry) return false;
    const L = this.getHighScoreEntryLayout();

    const c = L.closeBtn;
    if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
      this.closeHighScoreEntry();
      return true;
    }

    const s = L.submitBtn;
    if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) {
      this.submitHighScore();
      return true;
    }

    const b = L.backspaceBtn;
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      this.highScoreNameInput = this.highScoreNameInput.slice(0, -1);
      this.onPreviewTypeKey?.();
      return true;
    }

    // Modal consumes all clicks
    return true;
  }

  private handleLeaderboardClick(x: number, y: number): boolean {
    if (!this.showLeaderboardModal) return false;
    const L = this.getLeaderboardLayout();

    const c = L.closeBtn;
    if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
      this.closeLeaderboardModal();
      return true;
    }

    const bc = L.bottomCloseBtn;
    if (x >= bc.x && x <= bc.x + bc.w && y >= bc.y && y <= bc.y + bc.h) {
      this.closeLeaderboardModal();
      return true;
    }

    const maps: MapType[] = ['space', 'dungeon', 'military'];
    for (let i = 0; i < maps.length; i++) {
      const tabX = L.tabsStartX + i * (L.tabW + L.gap);
      if (x >= tabX && x <= tabX + L.tabW && y >= L.tabsY && y <= L.tabsY + L.tabH) {
        this.activeLeaderboardTab = maps[i];
        return true;
      }
    }

    if (x >= L.x && x <= L.x + L.w && y >= L.y && y <= L.y + L.h) {
      return true;
    }

    this.closeLeaderboardModal();
    return true;
  }

  private handleHUDLeaderboardClick(x: number, y: number): boolean {
    if (this.gameState !== 'menu' && this.gameState !== 'gameOver') return false;
    const btn = this.getHUDLeaderboardButtonRect();
    if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
      this.openLeaderboardModal(this.selectedMap);
      return true;
    }
    return false;
  }

  private handleGameOverLeaderboardClick(x: number, y: number): boolean {
    if (this.gameState !== 'gameOver') return false;
    const btn = this.getGameOverLeaderboardButtonRect();
    if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
      this.openLeaderboardModal(this.selectedMap);
      return true;
    }
    return false;
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
      this.showMapDropdown = false;
      this.onStartGame(this.selectedDifficulty, this.selectedMap);
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

    // Settings gear button & HUD Leaderboards button (top-right)
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
    } else if (this.gameState === 'menu' || this.gameState === 'gameOver') {
      const lbBtn = this.getHUDLeaderboardButtonRect();
      ctx.fillStyle = this.showLeaderboardModal ? 'rgba(255, 215, 0, 0.25)' : 'rgba(54, 64, 88, 0.95)';
      ctx.fillRect(lbBtn.x, lbBtn.y, lbBtn.w, lbBtn.h);
      ctx.strokeStyle = this.showLeaderboardModal ? '#FFD700' : '#7EC8FF';
      ctx.lineWidth = 2;
      ctx.strokeRect(lbBtn.x, lbBtn.y, lbBtn.w, lbBtn.h);

      ctx.fillStyle = this.showLeaderboardModal ? '#FFD700' : '#D6E9FF';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('🏆 HIGH SCORES', lbBtn.x + lbBtn.w / 2, lbBtn.y + 22);
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

      // Map selection dropdown
      const m = this.getMapDropdownRect();
      ctx.fillStyle = 'rgba(54, 64, 88, 0.95)';
      ctx.fillRect(m.x, m.y, m.w, m.h);
      ctx.strokeStyle = '#7EC8FF';
      ctx.lineWidth = 2;
      ctx.strokeRect(m.x, m.y, m.w, m.h);

      ctx.fillStyle = '#D6E9FF';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('MAP', m.x + 8, m.y + 13);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(this.formatMap(this.selectedMap), m.x + 8, m.y + 30);

      ctx.fillStyle = '#7EC8FF';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.showMapDropdown ? '▲' : '▼', m.x + m.w - 16, m.y + 27);

      if (this.showMapDropdown) {
        const maps: MapType[] = ['space', 'dungeon', 'military'];
        for (let i = 0; i < maps.length; i++) {
          const opt = this.getMapOptionRect(i);
          const isSelected = this.selectedMap === maps[i];
          ctx.fillStyle = isSelected ? 'rgba(126, 200, 255, 0.25)' : 'rgba(32, 38, 56, 0.95)';
          ctx.fillRect(opt.x, opt.y, opt.w, opt.h);
          ctx.strokeStyle = '#5B7FA5';
          ctx.lineWidth = 1;
          ctx.strokeRect(opt.x, opt.y, opt.w, opt.h);

          ctx.fillStyle = isSelected ? '#C6EEFF' : '#E6F0FF';
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'left';
          ctx.fillText(this.formatMap(maps[i]), opt.x + 6, opt.y + 16);
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

      const speedBtn = this.getSpeedButtonRect();
      const speedColors: Record<GameSpeed, { bg: string; border: string; text: string }> = {
        1: { bg: 'rgba(30, 50, 75, 0.95)', border: '#7EC8FF', text: '#7EC8FF' },
        2: { bg: 'rgba(25, 60, 40, 0.95)', border: '#56D364', text: '#56D364' },
        3: { bg: 'rgba(65, 55, 20, 0.95)', border: '#FFD700', text: '#FFD700' },
        5: { bg: 'rgba(70, 20, 70, 0.95)', border: '#FF55FF', text: '#FF55FF' },
      };
      const speedStyle = speedColors[this.gameSpeed] || speedColors[1];
      ctx.fillStyle = speedStyle.bg;
      ctx.fillRect(speedBtn.x, speedBtn.y, speedBtn.w, speedBtn.h);
      ctx.strokeStyle = speedStyle.border;
      ctx.lineWidth = 2;
      ctx.strokeRect(speedBtn.x, speedBtn.y, speedBtn.w, speedBtn.h);
      ctx.fillStyle = speedStyle.text;
      ctx.font = 'bold 14px monospace';
      ctx.fillText(`${this.gameSpeed}X`, speedBtn.x + speedBtn.w / 2, speedBtn.y + 25);

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

    let y = L.y + 104;
    const iconX = L.x + 24;
    const textX = L.x + 72;
    const contentWidth = L.w - 96;
    const frame = Math.floor(Date.now() / 250) % 2;
    for (const row of rows) {
      SpaceSprites.drawTower(ctx, row.type, iconX, y - 6, 34, frame, false, Date.now() / 1000);

      ctx.fillStyle = '#9ED8FF';
      ctx.font = 'bold 15px monospace';
      ctx.fillText(row.name, textX, y);

      ctx.fillStyle = '#E6F2FF';
      ctx.font = '12px monospace';
      const baseNextY = this.drawWrappedText(ctx, `Base: ${row.base}`, textX, y + 18, contentWidth, 14);
      const upgradesNextY = this.drawWrappedText(ctx, `Upgrades: ${row.upgrades}`, textX, baseNextY + 2, contentWidth, 14);

      const cardH = (upgradesNextY - y) + 22;
      ctx.fillStyle = 'rgba(30, 45, 70, 0.45)';
      ctx.fillRect(L.x + 18, y - 14, L.w - 36, cardH);

      // Re-draw text and icon over card background
      SpaceSprites.drawTower(ctx, row.type, iconX, y - 6, 34, frame, false, Date.now() / 1000);

      ctx.fillStyle = '#9ED8FF';
      ctx.font = 'bold 15px monospace';
      ctx.fillText(row.name, textX, y);

      ctx.fillStyle = '#E6F2FF';
      ctx.font = '12px monospace';
      this.drawWrappedText(ctx, `Base: ${row.base}`, textX, y + 18, contentWidth, 14);
      this.drawWrappedText(ctx, `Upgrades: ${row.upgrades}`, textX, baseNextY + 2, contentWidth, 14);

      ctx.strokeStyle = 'rgba(126, 200, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const dividerY = y - 14 + cardH + 4;
      ctx.moveTo(L.x + 20, dividerY);
      ctx.lineTo(L.x + L.w - 20, dividerY);
      ctx.stroke();

      y = dividerY + 10;
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

  /** Draws the high score name entry modal overlay */
  renderHighScoreEntry(ctx: CanvasRenderingContext2D): void {
    if (!this.showHighScoreEntry) return;

    const L = this.getHighScoreEntryLayout();

    // Dim background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Modal body
    ctx.fillStyle = '#1C2234';
    ctx.fillRect(L.x, L.y, L.w, L.h);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.strokeRect(L.x, L.y, L.w, L.h);

    // Close button (X)
    const c = L.closeBtn;
    ctx.fillStyle = '#CC2200';
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('X', c.x + c.w / 2, c.y + c.h / 2 + 5);

    // Header title
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('★ NEW HIGH SCORE! ★', L.x + L.w / 2, L.y + 48);

    // Score & Map info banner
    const mapName = this.formatMap(this.highScoreMap);
    ctx.fillStyle = '#7EC8FF';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(
      `MAP: ${mapName.toUpperCase()}  |  SCORE: ${this.highScoreScore.toLocaleString()}  |  WAVE: ${this.highScoreWave}`,
      L.x + L.w / 2,
      L.y + 84
    );

    // Instruction prompt
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('ENTER YOUR NAME (UP TO 6 LETTERS)', L.x + L.w / 2, L.y + 135);

    // 6 letter slot boxes
    const cursorBlink = Math.floor(Date.now() / 500) % 2 === 0;

    for (let i = 0; i < 6; i++) {
      const bx = L.boxesStartX + i * (L.boxW + L.gap);
      const by = L.boxesY;
      const char = this.highScoreNameInput[i] || '';
      const isFocused = i === this.highScoreNameInput.length && i < 6;

      ctx.fillStyle = 'rgba(14, 18, 30, 0.95)';
      ctx.fillRect(bx, by, L.boxW, L.boxH);

      ctx.strokeStyle = isFocused ? '#FFD700' : (char ? '#7EC8FF' : '#3A4A66');
      ctx.lineWidth = isFocused ? 3 : 2;
      ctx.strokeRect(bx, by, L.boxW, L.boxH);

      if (char) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 32px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(char, bx + L.boxW / 2, by + L.boxH / 2 + 10);
      } else if (isFocused && cursorBlink) {
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 32px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('_', bx + L.boxW / 2, by + L.boxH / 2 + 6);
      }
    }

    // Submit button
    const s = L.submitBtn;
    ctx.fillStyle = '#2EA043';
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.strokeStyle = '#56D364';
    ctx.lineWidth = 2;
    ctx.strokeRect(s.x, s.y, s.w, s.h);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SUBMIT HIGH SCORE', s.x + s.w / 2, s.y + s.h / 2 + 5);

    // Backspace button
    const b = L.backspaceBtn;
    ctx.fillStyle = '#334562';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = '#7EC8FF';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x, b.y, b.w, b.h);

    ctx.fillStyle = '#E6F2FF';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⌫ DEL', b.x + b.w / 2, b.y + b.h / 2 + 5);

    ctx.textAlign = 'left';
  }

  /** Draws the persistent leaderboard modal overlay */
  renderLeaderboardModal(ctx: CanvasRenderingContext2D): void {
    if (!this.showLeaderboardModal) return;

    const L = this.getLeaderboardLayout();

    // Dim background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Modal body
    ctx.fillStyle = '#1C2234';
    ctx.fillRect(L.x, L.y, L.w, L.h);
    ctx.strokeStyle = '#7EC8FF';
    ctx.lineWidth = 3;
    ctx.strokeRect(L.x, L.y, L.w, L.h);

    // Close button (X)
    const c = L.closeBtn;
    ctx.fillStyle = '#CC2200';
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('X', c.x + c.w / 2, c.y + c.h / 2 + 5);

    // Modal title
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('🏆 HIGH SCORES & LEADERBOARDS', L.x + 32, L.y + 44);

    // Map Tabs
    const maps: { id: MapType; label: string }[] = [
      { id: 'space', label: 'SPACE STATION' },
      { id: 'dungeon', label: 'DUNGEON CATACOMBS' },
      { id: 'military', label: 'MILITARY OUTPOST' },
    ];

    for (let i = 0; i < maps.length; i++) {
      const tabX = L.tabsStartX + i * (L.tabW + L.gap);
      const tabY = L.tabsY;
      const isSelected = this.activeLeaderboardTab === maps[i].id;

      ctx.fillStyle = isSelected ? 'rgba(126, 200, 255, 0.25)' : 'rgba(22, 28, 44, 0.9)';
      ctx.fillRect(tabX, tabY, L.tabW, L.tabH);

      ctx.strokeStyle = isSelected ? '#FFD700' : '#4A5B7A';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeRect(tabX, tabY, L.tabW, L.tabH);

      ctx.fillStyle = isSelected ? '#FFD700' : '#AFC7E8';
      ctx.font = isSelected ? 'bold 12px monospace' : '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(maps[i].label, tabX + L.tabW / 2, tabY + L.tabH / 2 + 4);
    }

    // Table Column Headers
    const headerY = L.y + 130;
    ctx.fillStyle = 'rgba(32, 44, 70, 0.7)';
    ctx.fillRect(L.x + 24, headerY - 14, L.w - 48, 28);
    ctx.strokeStyle = '#4A5B7A';
    ctx.lineWidth = 1;
    ctx.strokeRect(L.x + 24, headerY - 14, L.w - 48, 28);

    ctx.fillStyle = '#7EC8FF';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';

    const colRank = L.x + 40;
    const colName = L.x + 110;
    const colScore = L.x + 230;
    const colWave = L.x + 390;
    const colDiff = L.x + 510;
    const colDate = L.x + 660;

    ctx.fillText('RANK', colRank, headerY + 4);
    ctx.fillText('NAME', colName, headerY + 4);
    ctx.fillText('SCORE', colScore, headerY + 4);
    ctx.fillText('WAVE', colWave, headerY + 4);
    ctx.fillText('DIFFICULTY', colDiff, headerY + 4);
    ctx.fillText('DATE', colDate, headerY + 4);

    // Leaderboard Rows
    const scores = this.onGetLeaderboard ? this.onGetLeaderboard(this.activeLeaderboardTab) : [];

    if (scores.length === 0) {
      ctx.fillStyle = '#7EC8FF';
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('No high scores recorded yet for this map.', L.x + L.w / 2, L.y + 320);
      ctx.font = '13px monospace';
      ctx.fillStyle = '#AFC7E8';
      ctx.fillText('Defend your base to set the first high score!', L.x + L.w / 2, L.y + 350);
    } else {
      const rowStartY = L.y + 160;
      const rowH = 42;

      for (let i = 0; i < scores.length; i++) {
        const entry = scores[i];
        const rowY = rowStartY + i * rowH;
        const isHighlight = entry.id === this.lastSubmittedEntryId;

        // Row background
        ctx.fillStyle = isHighlight
          ? 'rgba(255, 215, 0, 0.2)'
          : (i % 2 === 0 ? 'rgba(26, 34, 52, 0.55)' : 'rgba(18, 24, 38, 0.55)');
        ctx.fillRect(L.x + 24, rowY, L.w - 48, rowH - 4);

        if (isHighlight) {
          ctx.strokeStyle = '#FFD700';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(L.x + 24, rowY, L.w - 48, rowH - 4);
        }

        // Rank badge & styling
        const rankColor = i === 0 ? '#FFD700' : (i === 1 ? '#E0E0E0' : (i === 2 ? '#CD7F32' : '#8FA6C8'));
        ctx.fillStyle = rankColor;
        ctx.font = 'bold 15px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`#${i + 1}`, colRank, rowY + 24);

        // Name
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 15px monospace';
        ctx.fillText(entry.name, colName, rowY + 24);

        // Score
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 15px monospace';
        ctx.fillText(entry.score.toLocaleString(), colScore, rowY + 24);

        // Wave
        ctx.fillStyle = '#7EC8FF';
        ctx.font = '13px monospace';
        ctx.fillText(`Wave ${entry.wave}`, colWave, rowY + 24);

        // Difficulty
        const diffColor = entry.difficulty === 'easy' ? '#6EEA8A' : (entry.difficulty === 'medium' ? '#FFC767' : '#FF7A7A');
        ctx.fillStyle = diffColor;
        ctx.font = 'bold 13px monospace';
        ctx.fillText(this.formatDifficulty(entry.difficulty), colDiff, rowY + 24);

        // Date
        const dateObj = new Date(entry.timestamp);
        const dateStr = !isNaN(dateObj.getTime()) ? dateObj.toISOString().split('T')[0] : '';
        ctx.fillStyle = '#AFC7E8';
        ctx.font = '12px monospace';
        ctx.fillText(dateStr, colDate, rowY + 24);
      }
    }

    // Bottom Close Button
    const bc = L.bottomCloseBtn;
    ctx.fillStyle = '#334562';
    ctx.fillRect(bc.x, bc.y, bc.w, bc.h);
    ctx.strokeStyle = '#7EC8FF';
    ctx.lineWidth = 2;
    ctx.strokeRect(bc.x, bc.y, bc.w, bc.h);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CLOSE', bc.x + bc.w / 2, bc.y + bc.h / 2 + 5);

    ctx.textAlign = 'left';
  }

  // Data getters for rendering
  getGold(): number { return this.onGetGameData?.().gold ?? 0; }
  getLives(): number { return this.onGetGameData?.().lives ?? 0; }
  getWave(): number { return this.onGetGameData?.().wave ?? 1; }
}
