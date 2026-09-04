import { DifficultyMode, GameData, GameMode, GameSpeed, GameState, HighScoreEntry, MapType, MultiplayerRoom, PlayerCombatStats, PlayerRole, TowerType } from '../types';
import { SpaceSprites } from '../visuals/SpaceSprites';

export type MenuScreen =
  | 'solo_menu'
  | 'mode_select'
  | 'multiplayer_hub'
  | 'multiplayer_create'
  | 'multiplayer_browse'
  | 'multiplayer_waiting_room';

export class UIManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameState: GameState = 'menu';
  private gameMode: GameMode = 'solo';
  private activeMenuScreen: MenuScreen = 'solo_menu';
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

  // Gamertag & Mode State
  private showGamertagModal: boolean = false;
  private gamertag: string = 'PLAYER';
  private gamertagInput: string = '';
  private hasConfirmedGamertag: boolean = false;

  // Multiplayer State
  private multiplayerRoom: MultiplayerRoom | null = null;
  private localPlayerRole: PlayerRole = 'p1';
  private openRooms: MultiplayerRoom[] = [];
  private roomCodeInput: string = '';
  private createMapSelect: MapType = 'space';
  private createDifficultySelect: DifficultyMode = 'easy';
  private p1Gold: number = 150;
  private p2Gold: number = 150;
  private p1Tag: string = 'HOST';
  private p2Tag: string = 'GUEST';
  private matchCountdown: number | null = null;
  private remoteCursor: { col: number; row: number; canvasX: number; canvasY: number; tag: string; visible: boolean } | null = null;
  private activePings: Array<{ col: number; row: number; x: number; y: number; timer: number; role: PlayerRole }> = [];

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

  // Damage stats & Combat Telemetry
  private showDamageStatsModal: boolean = false;

  // Multiplayer Callbacks
  public onConfirmGamertag?: (tag: string) => void;
  public onCreateMultiplayerRoom?: (map: MapType, diff: DifficultyMode) => void;
  public onJoinMultiplayerRoom?: (roomId: string) => void;
  public onQueryRooms?: () => void;
  public onLeaveMultiplayerRoom?: () => void;
  public onToggleMultiplayerReady?: (ready: boolean) => void;
  public onPingTile?: (col: number, row: number) => void;
  public onSendCursorMove?: (col: number, row: number, canvasX: number, canvasY: number) => void;
  public onGetCombatStats?: () => {
    p1: PlayerCombatStats;
    p2: PlayerCombatStats;
    split: { p1Percent: number; p2Percent: number; p1Total: number; p2Total: number };
    waveLeader: { tag: string; role: PlayerRole; waveDamage: number } | null;
  } | null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.initGamertagFromStorage();
    this.setupEventListeners();
  }

  private initGamertagFromStorage(): void {
    try {
      const saved = localStorage.getItem('td_gamertag');
      if (saved && saved.trim().length > 0) {
        const cleaned = saved.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
        this.gamertag = cleaned || 'PLAYER';
        this.gamertagInput = this.gamertag;
        this.hasConfirmedGamertag = true;
        this.activeMenuScreen = 'solo_menu';
      } else {
        this.gamertag = 'PLAYER';
        this.gamertagInput = '';
        this.hasConfirmedGamertag = false;
        this.showGamertagModal = true;
        this.activeMenuScreen = 'mode_select';
      }
    } catch {
      this.gamertag = 'PLAYER';
      this.gamertagInput = 'PLAYER';
      this.hasConfirmedGamertag = true;
      this.activeMenuScreen = 'solo_menu';
    }
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

      // Broadcast cursor move in multiplayer mode
      if (this.gameMode === 'multiplayer' && (this.gameState === 'playing' || this.gameState === 'paused' || this.gameState === 'waveComplete')) {
        this.onSendCursorMove?.(col, row, x, y);
      }
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

      // Gamertag modal takes priority
      if (this.handleGamertagModalClick(x, y)) {
        return;
      }

      // High Score name entry takes priority
      if (this.handleHighScoreEntryClick(x, y)) {
        return;
      }

      // Leaderboard modal takes priority
      if (this.handleLeaderboardClick(x, y)) {
        return;
      }

      // Damage Stats modal takes priority when open
      if (this.handleDamageStatsModalClick(x, y)) {
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

      // In multiplayer top HUD, check click on Damage Stats button or contribution bar
      if (this.gameMode === 'multiplayer' && (this.gameState === 'playing' || this.gameState === 'paused' || this.gameState === 'waveComplete')) {
        const statsBtn = this.getDamageStatsButtonRect();
        if (x >= statsBtn.x && x <= statsBtn.x + statsBtn.w && y >= statsBtn.y && y <= statsBtn.y + statsBtn.h) {
          this.showDamageStatsModal = !this.showDamageStatsModal;
          return;
        }

        const barRect = this.getDamageMeterBarRect();
        if (x >= barRect.x && x <= barRect.x + barRect.w && y >= barRect.y && y <= barRect.y + barRect.h) {
          this.showDamageStatsModal = !this.showDamageStatsModal;
          return;
        }
      }

      // Menu sub-screens (mode select, multiplayer hub/create/browse/waiting)
      if (this.gameState === 'menu' && this.handleMenuScreensClick(x, y)) {
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

      // Shift+Click in multiplayer to ping grid
      if (e.shiftKey && this.gameMode === 'multiplayer') {
        const col = Math.floor(x / 32);
        const row = Math.floor(y / 32);
        this.onPingTile?.(col, row);
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
      // Gamertag entry captures keystrokes
      if (this.showGamertagModal) {
        if (e.key === 'Backspace') {
          this.gamertagInput = this.gamertagInput.slice(0, -1);
          this.onPreviewTypeKey?.();
          e.preventDefault();
          return;
        }
        if (e.key === 'Enter') {
          this.confirmGamertag();
          e.preventDefault();
          return;
        }
        if (e.key === 'Escape') {
          this.closeGamertagModal();
          e.preventDefault();
          return;
        }
        if (e.key.length === 1 && /^[a-zA-Z0-9]$/.test(e.key)) {
          if (this.gamertagInput.length < 6) {
            this.gamertagInput += e.key.toUpperCase();
            this.onPreviewTypeKey?.();
          }
          e.preventDefault();
          return;
        }
        return;
      }

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

      if (this.showDamageStatsModal) {
        if (e.key === 'Escape' || e.key === 'd' || e.key === 'D') {
          this.showDamageStatsModal = false;
          e.preventDefault();
          return;
        }
      }

      // Multiplayer browse room code input
      if (this.gameState === 'menu' && this.activeMenuScreen === 'multiplayer_browse') {
        if (e.key === 'Backspace') {
          this.roomCodeInput = this.roomCodeInput.slice(0, -1);
          e.preventDefault();
          return;
        }
        if (e.key === 'Enter' && this.roomCodeInput.trim().length > 0) {
          this.onJoinMultiplayerRoom?.(this.roomCodeInput.trim());
          e.preventDefault();
          return;
        }
        if (e.key.length === 1 && /^[a-zA-Z0-9-]$/.test(e.key)) {
          if (this.roomCodeInput.length < 12) {
            this.roomCodeInput += e.key.toUpperCase();
          }
          e.preventDefault();
          return;
        }
      }

      const towerUiVisible = this.gameState === 'playing' || this.gameState === 'paused' || this.gameState === 'waveComplete';
      switch (e.key) {
        case 'Escape':
          if (this.showDamageStatsModal) { this.showDamageStatsModal = false; break; }
          if (this.showSettings) { this.showSettings = false; break; }
          if (this.showHelp) { this.showHelp = false; break; }
          this.selectedTowerType = null;
          this.selectedTowerId = null;
          break;
        case 'd':
        case 'D':
          if (this.gameMode === 'multiplayer' || towerUiVisible) {
            this.showDamageStatsModal = !this.showDamageStatsModal;
            e.preventDefault();
          }
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

  // --- Gamertag & Mode Management ---

  getGamertag(): string {
    return this.gamertag;
  }

  setGamertag(name: string): void {
    const cleaned = (name || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
    this.gamertag = cleaned || 'PLAYER';
    this.gamertagInput = this.gamertag;
    this.hasConfirmedGamertag = true;
    try {
      localStorage.setItem('td_gamertag', this.gamertag);
    } catch {
      // ignore
    }
  }

  getGamertagInput(): string {
    return this.gamertagInput;
  }

  setGamertagInput(val: string): void {
    this.gamertagInput = (val || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
  }

  isGamertagModalOpen(): boolean {
    return this.showGamertagModal;
  }

  openGamertagModal(): void {
    this.gamertagInput = this.gamertag;
    this.showGamertagModal = true;
    this.showLeaderboardModal = false;
    this.showSettings = false;
    this.showHelp = false;
  }

  closeGamertagModal(): void {
    if (this.hasConfirmedGamertag) {
      this.showGamertagModal = false;
    }
  }

  confirmGamertag(customName?: string): string {
    const nameToSanitize = customName !== undefined ? customName : this.gamertagInput;
    const sanitized = (nameToSanitize || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
    const finalTag = sanitized.length > 0 ? sanitized : 'PLAYER';
    this.gamertag = finalTag;
    this.gamertagInput = finalTag;
    this.hasConfirmedGamertag = true;
    this.showGamertagModal = false;
    try {
      localStorage.setItem('td_gamertag', finalTag);
    } catch {
      // ignore
    }
    this.onConfirmGamertag?.(finalTag);
    if (this.activeMenuScreen === 'solo_menu' || !this.activeMenuScreen) {
      this.activeMenuScreen = 'mode_select';
    }
    return finalTag;
  }

  getGameMode(): GameMode {
    return this.gameMode;
  }

  setGameMode(mode: GameMode): void {
    this.gameMode = mode;
    if (mode === 'solo') {
      this.activeMenuScreen = 'solo_menu';
    } else {
      this.activeMenuScreen = 'multiplayer_hub';
    }
  }

  getActiveMenuScreen(): MenuScreen {
    return this.activeMenuScreen;
  }

  setActiveMenuScreen(screen: MenuScreen): void {
    this.activeMenuScreen = screen;
  }

  // --- Multiplayer State Management ---

  getMultiplayerRoom(): MultiplayerRoom | null {
    return this.multiplayerRoom ? { ...this.multiplayerRoom } : null;
  }

  setMultiplayerRoom(room: MultiplayerRoom | null): void {
    this.multiplayerRoom = room ? { ...room } : null;
    if (room) {
      this.p1Tag = room.hostTag;
      this.p2Tag = room.guestTag || 'WAITING...';
    }
  }

  getOpenRooms(): MultiplayerRoom[] {
    return [...this.openRooms];
  }

  setOpenRooms(rooms: MultiplayerRoom[]): void {
    this.openRooms = [...rooms];
  }

  getLocalPlayerRole(): PlayerRole {
    return this.localPlayerRole;
  }

  setLocalPlayerRole(role: PlayerRole): void {
    this.localPlayerRole = role;
  }

  setP1Gold(amount: number): void {
    this.p1Gold = amount;
  }

  setP2Gold(amount: number): void {
    this.p2Gold = amount;
  }

  getP1Gold(): number {
    return this.p1Gold;
  }

  getP2Gold(): number {
    return this.p2Gold;
  }

  setP1Tag(tag: string): void {
    this.p1Tag = tag;
  }

  setP2Tag(tag: string): void {
    this.p2Tag = tag;
  }

  getP1Tag(): string {
    return this.p1Tag;
  }

  getP2Tag(): string {
    return this.p2Tag;
  }

  setMatchCountdown(count: number | null): void {
    this.matchCountdown = count;
  }

  // --- Combat Telemetry & Damage Stats ---

  getShowDamageStatsModal(): boolean {
    return this.showDamageStatsModal;
  }

  setShowDamageStatsModal(show: boolean): void {
    this.showDamageStatsModal = show;
  }

  getDamageStatsButtonRect(): { x: number; y: number; w: number; h: number } {
    return { x: 256, y: 11, w: 72, h: 28 };
  }

  getDamageMeterBarRect(): { x: number; y: number; w: number; h: number } {
    return { x: 338, y: 11, w: 326, h: 28 };
  }

  getDamageStatsModalRect(): { x: number; y: number; w: number; h: number } {
    const w = 680;
    const h = 500;
    return {
      x: (this.canvas.width - w) / 2,
      y: (this.canvas.height - h) / 2,
      w,
      h,
    };
  }

  getP1TotalDamage(): number {
    const stats = this.onGetCombatStats?.();
    return stats?.p1?.totalDamage ?? 0;
  }

  getP2TotalDamage(): number {
    const stats = this.onGetCombatStats?.();
    return stats?.p2?.totalDamage ?? 0;
  }

  getP1ContributionPercent(): number {
    const stats = this.onGetCombatStats?.();
    return stats?.split?.p1Percent ?? 50;
  }

  getP2ContributionPercent(): number {
    const stats = this.onGetCombatStats?.();
    return stats?.split?.p2Percent ?? 50;
  }

  getMatchCountdown(): number | null {
    return this.matchCountdown;
  }

  setRemoteCursor(c: { col: number; row: number; canvasX: number; canvasY: number; tag: string; visible: boolean } | null): void {
    this.remoteCursor = c;
  }

  getRemoteCursor() {
    return this.remoteCursor;
  }

  addPing(col: number, row: number, role: PlayerRole): void {
    this.activePings.push({
      col,
      row,
      x: col * 32 + 16,
      y: row * 32 + 16,
      timer: 2.0, // 2 seconds pulse
      role,
    });
  }

  updatePings(dt: number): void {
    for (let i = this.activePings.length - 1; i >= 0; i--) {
      this.activePings[i].timer -= dt;
      if (this.activePings[i].timer <= 0) {
        this.activePings.splice(i, 1);
      }
    }
  }

  getCreateMapSelect(): MapType {
    return this.createMapSelect;
  }

  setCreateMapSelect(map: MapType): void {
    this.createMapSelect = map;
  }

  getCreateDifficultySelect(): DifficultyMode {
    return this.createDifficultySelect;
  }

  setCreateDifficultySelect(diff: DifficultyMode): void {
    this.createDifficultySelect = diff;
  }

  getRoomCodeInput(): string {
    return this.roomCodeInput;
  }

  setRoomCodeInput(val: string): void {
    this.roomCodeInput = (val || '').replace(/[^a-zA-Z0-9-]/g, '').toUpperCase().slice(0, 12);
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

  private getGamertagModalLayout() {
    const w = 620;
    const h = 420;
    const x = (this.canvas.width - w) / 2;
    const y = (this.canvas.height - h) / 2;
    const boxW = 54;
    const boxH = 64;
    const gap = 14;
    const boxesTotalW = 6 * boxW + 5 * gap;
    const boxesStartX = x + (w - boxesTotalW) / 2;
    const boxesY = y + 175;
    const submitBtn = { x: boxesStartX, y: boxesY + boxH + 30, w: 260, h: 46 };
    const backspaceBtn = { x: boxesStartX + 276, y: boxesY + boxH + 30, w: 118, h: 46 };
    const randomBtn = { x: x + w - 140, y: y + 20, w: 90, h: 30 };
    const closeBtn = { x: x + w - 42, y: y + 14, w: 28, h: 28 };
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
      randomBtn,
      closeBtn,
    };
  }

  private handleGamertagModalClick(x: number, y: number): boolean {
    if (!this.showGamertagModal) return false;
    const L = this.getGamertagModalLayout();

    if (this.hasConfirmedGamertag) {
      const c = L.closeBtn;
      if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
        this.closeGamertagModal();
        return true;
      }
    }

    const r = L.randomBtn;
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
      const prefixes = ['ACE', 'NOVA', 'FOX', 'VAL', 'SKY', 'NEO', 'MAX', 'ZED'];
      const p = prefixes[Math.floor(Math.random() * prefixes.length)];
      const num = Math.floor(10 + Math.random() * 90);
      this.gamertagInput = `${p}${num}`.slice(0, 6);
      this.onPreviewTypeKey?.();
      return true;
    }

    const s = L.submitBtn;
    if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) {
      this.confirmGamertag();
      this.onPreviewSfx?.();
      return true;
    }

    const b = L.backspaceBtn;
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      this.gamertagInput = this.gamertagInput.slice(0, -1);
      this.onPreviewTypeKey?.();
      return true;
    }

    return true; // Modal consumes all clicks
  }

  private handleMenuScreensClick(x: number, y: number): boolean {
    if (this.gameState !== 'menu') return false;

    // Solo Menu: Mode Switch button & Gamertag chip & Center Change Mode button
    if (this.activeMenuScreen === 'solo_menu') {
      // Top bar mode button
      if (x >= 18 && x <= 168 && y >= 8 && y <= 42) {
        this.activeMenuScreen = 'mode_select';
        this.onPreviewSfx?.();
        return true;
      }
      // Top bar gamertag chip
      if (x >= 178 && x <= 340 && y >= 8 && y <= 42) {
        this.openGamertagModal();
        this.onPreviewSfx?.();
        return true;
      }
      // Center "Change Mode" button on solo menu canvas
      const centerY = 50 + (this.canvas.height - 50 - 80) / 2;
      const modeBtnX = this.canvas.width / 2 - 160;
      const modeBtnY = centerY + 70;
      if (x >= modeBtnX && x <= modeBtnX + 320 && y >= modeBtnY && y <= modeBtnY + 46) {
        this.activeMenuScreen = 'mode_select';
        this.onPreviewSfx?.();
        return true;
      }
      return false; // let normal menu click handling happen
    }

    // Mode Select Screen
    if (this.activeMenuScreen === 'mode_select') {
      // Edit tag chip top right
      if (x >= 800 && x <= 1040 && y >= 190 && y <= 235) {
        this.openGamertagModal();
        return true;
      }
      // Solo Card
      if ((x >= 260 && x <= 620 && y >= 250 && y <= 710) || (x >= 310 && x <= 570 && y >= 620 && y <= 680)) {
        this.gameMode = 'solo';
        this.activeMenuScreen = 'solo_menu';
        this.onPreviewSfx?.();
        return true;
      }
      // Multiplayer Card
      if ((x >= 660 && x <= 1020 && y >= 250 && y <= 710) || (x >= 710 && x <= 970 && y >= 620 && y <= 680)) {
        this.gameMode = 'multiplayer';
        this.activeMenuScreen = 'multiplayer_hub';
        this.onPreviewSfx?.();
        return true;
      }
      return true;
    }

    // Multiplayer Hub Screen
    if (this.activeMenuScreen === 'multiplayer_hub') {
      // Edit tag chip
      if (x >= 760 && x <= 980 && y >= 110 && y <= 160) {
        this.openGamertagModal();
        return true;
      }
      // Create Game button
      if (x >= 340 && x <= 940 && y >= 220 && y <= 290) {
        this.activeMenuScreen = 'multiplayer_create';
        this.onPreviewSfx?.();
        return true;
      }
      // Join Game button
      if (x >= 340 && x <= 940 && y >= 310 && y <= 380) {
        this.activeMenuScreen = 'multiplayer_browse';
        this.onQueryRooms?.();
        this.onPreviewSfx?.();
        return true;
      }
      // Back to Mode Select / Solo button
      if (x >= 340 && x <= 940 && y >= 410 && y <= 460) {
        this.activeMenuScreen = 'mode_select';
        this.onPreviewSfx?.();
        return true;
      }
      return true;
    }

    // Multiplayer Create Screen
    if (this.activeMenuScreen === 'multiplayer_create') {
      // Map options
      if (x >= 260 && x <= 480 && y >= 190 && y <= 255) {
        this.createMapSelect = 'space';
        this.onPreviewSfx?.();
        return true;
      }
      if (x >= 510 && x <= 730 && y >= 190 && y <= 255) {
        this.createMapSelect = 'dungeon';
        this.onPreviewSfx?.();
        return true;
      }
      if (x >= 760 && x <= 980 && y >= 190 && y <= 255) {
        this.createMapSelect = 'military';
        this.onPreviewSfx?.();
        return true;
      }

      // Difficulty options
      if (x >= 260 && x <= 480 && y >= 325 && y <= 390) {
        this.createDifficultySelect = 'easy';
        this.onPreviewSfx?.();
        return true;
      }
      if (x >= 510 && x <= 730 && y >= 325 && y <= 390) {
        this.createDifficultySelect = 'medium';
        this.onPreviewSfx?.();
        return true;
      }
      if (x >= 760 && x <= 980 && y >= 325 && y <= 390) {
        this.createDifficultySelect = 'hard';
        this.onPreviewSfx?.();
        return true;
      }

      // Create Lobby button
      if (x >= 360 && x <= 640 && y >= 460 && y <= 515) {
        this.onCreateMultiplayerRoom?.(this.createMapSelect, this.createDifficultySelect);
        this.onPreviewSfx?.();
        return true;
      }

      // Back button
      if (x >= 670 && x <= 830 && y >= 460 && y <= 515) {
        this.activeMenuScreen = 'multiplayer_hub';
        this.onPreviewSfx?.();
        return true;
      }
      return true;
    }

    // Multiplayer Browse Screen
    if (this.activeMenuScreen === 'multiplayer_browse') {
      // Join by code button
      if (x >= 660 && x <= 820 && y >= 95 && y <= 135) {
        if (this.roomCodeInput.trim().length > 0) {
          this.onJoinMultiplayerRoom?.(this.roomCodeInput.trim());
          this.onPreviewSfx?.();
        }
        return true;
      }

      // Room table rows
      const rowStartY = 202;
      const rowH = 46;
      for (let i = 0; i < this.openRooms.length; i++) {
        const rowY = rowStartY + i * rowH;
        // Join button for this row (colAction is at x: 920..1030)
        if (x >= 910 && x <= 1040 && y >= rowY && y <= rowY + 36) {
          this.onJoinMultiplayerRoom?.(this.openRooms[i].id);
          this.onPreviewSfx?.();
          return true;
        }
      }

      // Refresh button
      if (x >= 420 && x <= 590 && y >= 600 && y <= 648) {
        this.onQueryRooms?.();
        this.onPreviewSfx?.();
        return true;
      }

      // Back button
      if (x >= 630 && x <= 780 && y >= 600 && y <= 648) {
        this.activeMenuScreen = 'multiplayer_hub';
        this.onPreviewSfx?.();
        return true;
      }
      return true;
    }

    // Multiplayer Waiting Room Screen
    if (this.activeMenuScreen === 'multiplayer_waiting_room') {
      const isHost = this.localPlayerRole === 'p1';
      const myReady = isHost ? Boolean(this.multiplayerRoom?.hostReady) : Boolean(this.multiplayerRoom?.guestReady);

      // Ready toggle button
      if (x >= 380 && x <= 640 && y >= 460 && y <= 515) {
        this.onToggleMultiplayerReady?.(!myReady);
        this.onPreviewSfx?.();
        return true;
      }

      // Leave Room button
      if (x >= 670 && x <= 840 && y >= 460 && y <= 515) {
        this.onLeaveMultiplayerRoom?.();
        this.activeMenuScreen = 'multiplayer_hub';
        this.onPreviewSfx?.();
        return true;
      }
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

    // In-game multiplayer visuals (pings and remote cursor)
    if (this.gameMode === 'multiplayer' && towerUiVisible) {
      this.renderMultiplayerPings(ctx);
      this.renderRemoteCursor(ctx);
    }

    // Top HUD bar
    ctx.fillStyle = 'rgba(26, 26, 46, 0.9)';
    ctx.fillRect(0, 0, width, 50);

    const hudCenterY = 25;
    const hudStartX = 18;

    if (this.gameMode === 'multiplayer' && towerUiVisible) {
      // Co-op Top HUD
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      // Health
      ctx.fillStyle = '#CC2200';
      this.drawHeart(ctx, hudStartX + 8, hudCenterY - 8, 16);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(`${this.getLives()}`, hudStartX + 24, hudCenterY);

      // Wave
      ctx.fillStyle = '#7EC8FF';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(`Wave: ${this.getWave()}`, hudStartX + 75, hudCenterY);

      // 2P Co-Op Badge
      ctx.fillStyle = 'rgba(0, 229, 255, 0.15)';
      ctx.fillRect(hudStartX + 160, hudCenterY - 14, 68, 28);
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 1;
      ctx.strokeRect(hudStartX + 160, hudCenterY - 14, 68, 28);
      ctx.fillStyle = '#00E5FF';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('2P CO-OP', hudStartX + 194, hudCenterY);
      ctx.textAlign = 'left';

      // [D] STATS Button
      const statsBtn = this.getDamageStatsButtonRect();
      ctx.fillStyle = this.showDamageStatsModal ? 'rgba(0, 229, 255, 0.35)' : 'rgba(24, 38, 64, 0.95)';
      ctx.fillRect(statsBtn.x, statsBtn.y, statsBtn.w, statsBtn.h);
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(statsBtn.x, statsBtn.y, statsBtn.w, statsBtn.h);
      ctx.fillStyle = '#00E5FF';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('📊 STATS', statsBtn.x + statsBtn.w / 2, hudCenterY);
      ctx.textAlign = 'left';

      // Dual Damage Contribution Meter Bar
      const barRect = this.getDamageMeterBarRect();
      const stats = this.onGetCombatStats?.();
      const split = stats?.split || { p1Percent: 50, p2Percent: 50, p1Total: 0, p2Total: 0 };
      const p1Pct = split.p1Percent;
      const p2Pct = split.p2Percent;

      // Outer bar
      ctx.fillStyle = 'rgba(10, 16, 28, 0.9)';
      ctx.fillRect(barRect.x, barRect.y, barRect.w, barRect.h);
      ctx.strokeStyle = '#445577';
      ctx.lineWidth = 1;
      ctx.strokeRect(barRect.x, barRect.y, barRect.w, barRect.h);

      // Split fill
      const p1W = Math.round((p1Pct / 100) * barRect.w);
      if (p1W > 0) {
        ctx.fillStyle = '#00E5FF';
        ctx.fillRect(barRect.x, barRect.y, p1W, barRect.h);
      }
      if (barRect.w - p1W > 0) {
        ctx.fillStyle = '#FF007F';
        ctx.fillRect(barRect.x + p1W, barRect.y, barRect.w - p1W, barRect.h);
      }

      // Player cards already show names; keep the meter focused on contribution.
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#002233';
      ctx.textAlign = 'left';
      ctx.fillText(`P1  ${p1Pct}%`, barRect.x + 8, hudCenterY);

      ctx.fillStyle = '#330018';
      ctx.textAlign = 'right';
      ctx.fillText(`${p2Pct}%  P2`, barRect.x + barRect.w - 8, hudCenterY);
      ctx.textAlign = 'left';

      // P1 Meter (Host)
      const p1X = width - 606;
      const isMeP1 = this.localPlayerRole === 'p1';
      ctx.fillStyle = isMeP1 ? 'rgba(0, 229, 255, 0.25)' : 'rgba(20, 30, 48, 0.9)';
      ctx.fillRect(p1X, hudCenterY - 14, 165, 28);
      ctx.strokeStyle = isMeP1 ? '#00E5FF' : '#008899';
      ctx.lineWidth = isMeP1 ? 2 : 1;
      ctx.strokeRect(p1X, hudCenterY - 14, 165, 28);

      ctx.save();
      ctx.beginPath();
      ctx.rect(p1X + 1, hudCenterY - 13, 163, 26);
      ctx.clip();
      ctx.fillStyle = '#00E5FF';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`[P1] ${this.p1Tag}`, p1X + 8, hudCenterY);
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${this.p1Gold}g`, p1X + 157, hudCenterY);
      ctx.textAlign = 'left';
      ctx.restore();

      // P2 Meter (Guest)
      const p2X = width - 431;
      const isMeP2 = this.localPlayerRole === 'p2';
      ctx.fillStyle = isMeP2 ? 'rgba(255, 0, 127, 0.25)' : 'rgba(38, 20, 35, 0.9)';
      ctx.fillRect(p2X, hudCenterY - 14, 165, 28);
      ctx.strokeStyle = isMeP2 ? '#FF007F' : '#99004C';
      ctx.lineWidth = isMeP2 ? 2 : 1;
      ctx.strokeRect(p2X, hudCenterY - 14, 165, 28);

      ctx.save();
      ctx.beginPath();
      ctx.rect(p2X + 1, hudCenterY - 13, 163, 26);
      ctx.clip();
      ctx.fillStyle = '#FF007F';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`[P2] ${this.p2Tag}`, p2X + 8, hudCenterY);
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${this.p2Gold}g`, p2X + 157, hudCenterY);
      ctx.textAlign = 'left';
      ctx.restore();

      ctx.textBaseline = 'alphabetic';
    } else if (this.gameState === 'menu' && this.activeMenuScreen === 'solo_menu') {
      // Menu state with solo menu active: show Mode selector button and Pilot tag button
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      // Mode switch button
      const modeBtnX = 18;
      const modeBtnY = 8;
      const modeBtnW = 145;
      const modeBtnH = 34;

      ctx.fillStyle = 'rgba(0, 229, 255, 0.15)';
      ctx.fillRect(modeBtnX, modeBtnY, modeBtnW, modeBtnH);
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(modeBtnX, modeBtnY, modeBtnW, modeBtnH);

      ctx.fillStyle = '#00E5FF';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('🎮 MODE: SOLO ▾', modeBtnX + modeBtnW / 2, modeBtnY + modeBtnH / 2);

      // Pilot Tag button
      const pilotBtnX = 175;
      const pilotBtnY = 8;
      const pilotBtnW = 160;
      const pilotBtnH = 34;

      ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
      ctx.fillRect(pilotBtnX, pilotBtnY, pilotBtnW, pilotBtnH);
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(pilotBtnX, pilotBtnY, pilotBtnW, pilotBtnH);

      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`👤 ${this.gamertag} [EDIT]`, pilotBtnX + pilotBtnW / 2, pilotBtnY + pilotBtnH / 2);

      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    } else {
      // Left-aligned HUD metrics cluster (health, gold, wave)
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
    }

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

  // ==========================================
  // --- MULTIPLAYER & GAMERTAG RENDERING ---
  // ==========================================

  /** Draws the Gamertag Entry Modal */
  renderGamertagModal(ctx: CanvasRenderingContext2D): void {
    if (!this.showGamertagModal) return;

    const L = this.getGamertagModalLayout();

    // Dim background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Modal body
    ctx.fillStyle = '#1C2234';
    ctx.fillRect(L.x, L.y, L.w, L.h);
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 3;
    ctx.strokeRect(L.x, L.y, L.w, L.h);

    // Close button (X) if already confirmed once
    if (this.hasConfirmedGamertag) {
      const c = L.closeBtn;
      ctx.fillStyle = '#CC2200';
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('X', c.x + c.w / 2, c.y + c.h / 2 + 5);
    }

    // Random button
    const r = L.randomBtn;
    ctx.fillStyle = 'rgba(0, 229, 255, 0.15)';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 1;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = '#00E5FF';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('🎲 RANDOM', r.x + r.w / 2, r.y + r.h / 2 + 4);

    // Header title
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('★ PILOT IDENTIFICATION ★', L.x + L.w / 2, L.y + 48);

    // Subtitle
    ctx.fillStyle = '#7EC8FF';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('ENTER YOUR 6-DIGIT ARCADE GAMERTAG', L.x + L.w / 2, L.y + 86);

    // Instructions
    ctx.fillStyle = '#AFC7E8';
    ctx.font = '12px monospace';
    ctx.fillText('Used for Multiplayer Matchmaking and High Score Leaderboards', L.x + L.w / 2, L.y + 120);

    // 6 letter slot boxes
    const cursorBlink = Math.floor(Date.now() / 450) % 2 === 0;

    for (let i = 0; i < 6; i++) {
      const bx = L.boxesStartX + i * (L.boxW + L.gap);
      const by = L.boxesY;
      const char = this.gamertagInput[i] || '';
      const isFocused = i === this.gamertagInput.length && i < 6;

      ctx.fillStyle = 'rgba(14, 18, 30, 0.95)';
      ctx.fillRect(bx, by, L.boxW, L.boxH);

      ctx.strokeStyle = isFocused ? '#FFD700' : (char ? '#00E5FF' : '#3A4A66');
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
    ctx.fillText('CONFIRM GAMERTAG', s.x + s.w / 2, s.y + s.h / 2 + 5);

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

  /** Draws the Mode Selection Screen (Solo vs Multiplayer) */
  renderModeSelect(ctx: CanvasRenderingContext2D): void {
    const topBar = 50;
    const bottomBar = 80;
    const areaY = topBar;
    const areaH = this.canvas.height - topBar - bottomBar;

    ctx.fillStyle = 'rgba(10, 14, 26, 0.96)';
    ctx.fillRect(0, areaY, this.canvas.width, areaH);

    // Header Title
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SELECT GAME MODE', this.canvas.width / 2, areaY + 60);

    // Gamertag Badge top right
    const tagChipX = 820;
    const tagChipY = areaY + 30;
    ctx.fillStyle = 'rgba(0, 229, 255, 0.15)';
    ctx.fillRect(tagChipX, tagChipY, 210, 36);
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 1;
    ctx.strokeRect(tagChipX, tagChipY, 210, 36);

    ctx.fillStyle = '#00E5FF';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`PILOT: ${this.gamertag}`, tagChipX + 12, tagChipY + 22);
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'right';
    ctx.fillText('[EDIT]', tagChipX + 198, tagChipY + 22);

    // --- Card 1: Solo Play ---
    const card1X = 260;
    const card1Y = areaY + 90;
    const cardW = 360;
    const cardH = 430;

    ctx.fillStyle = 'rgba(24, 34, 52, 0.95)';
    ctx.fillRect(card1X, card1Y, cardW, cardH);
    ctx.strokeStyle = '#7EC8FF';
    ctx.lineWidth = 2;
    ctx.strokeRect(card1X, card1Y, cardW, cardH);

    ctx.fillStyle = '#7EC8FF';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('🛡️ SOLO DEFENSE', card1X + cardW / 2, card1Y + 50);

    ctx.fillStyle = '#E6F0FF';
    ctx.font = '13px monospace';
    const c1Lines = [
      '• Classic single-player defense',
      '• Build towers & manage gold',
      '• 3 Themed maps & 3 difficulties',
      '• Climb the map leaderboards',
      '• Dynamic synthwave BGM',
    ];
    for (let i = 0; i < c1Lines.length; i++) {
      ctx.textAlign = 'left';
      ctx.fillText(c1Lines[i], card1X + 30, card1Y + 120 + i * 36);
    }

    const btn1X = card1X + 40;
    const btn1Y = card1Y + cardH - 80;
    const btn1W = cardW - 80;
    const btn1H = 50;

    ctx.fillStyle = '#FFD700';
    ctx.fillRect(btn1X, btn1Y, btn1W, btn1H);
    ctx.strokeStyle = '#FFE066';
    ctx.lineWidth = 2;
    ctx.strokeRect(btn1X, btn1Y, btn1W, btn1H);

    ctx.fillStyle = '#1A1A2E';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PLAY SOLO', btn1X + btn1W / 2, btn1Y + btn1H / 2 + 6);

    // --- Card 2: Multiplayer Co-Op ---
    const card2X = 660;
    const card2Y = card1Y;

    ctx.fillStyle = 'rgba(18, 38, 30, 0.95)';
    ctx.fillRect(card2X, card2Y, cardW, cardH);
    ctx.strokeStyle = '#56D364';
    ctx.lineWidth = 2;
    ctx.strokeRect(card2X, card2Y, cardW, cardH);

    ctx.fillStyle = '#56D364';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⚔️ 2-PLAYER CO-OP', card2X + cardW / 2, card2Y + 50);

    ctx.fillStyle = '#E6FFE6';
    ctx.font = '13px monospace';
    const c2Lines = [
      '• Real-time 2-player cooperative',
      '• Shared base lives & wave path',
      '• Individual gold reserves',
      '• 50/50 split bounties & rewards',
      '• Fully synchronized simulation',
    ];
    for (let i = 0; i < c2Lines.length; i++) {
      ctx.textAlign = 'left';
      ctx.fillText(c2Lines[i], card2X + 30, card2Y + 120 + i * 36);
    }

    const btn2X = card2X + 40;
    const btn2Y = btn1Y;
    const btn2W = btn1W;
    const btn2H = btn1H;

    ctx.fillStyle = '#2EA043';
    ctx.fillRect(btn2X, btn2Y, btn2W, btn2H);
    ctx.strokeStyle = '#56D364';
    ctx.lineWidth = 2;
    ctx.strokeRect(btn2X, btn2Y, btn2W, btn2H);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PLAY CO-OP', btn2X + btn2W / 2, btn2Y + btn2H / 2 + 6);

    ctx.textAlign = 'left';
  }

  /** Draws the Multiplayer Hub (Create or Join) */
  renderMultiplayerHub(ctx: CanvasRenderingContext2D): void {
    const topBar = 50;
    const bottomBar = 80;
    const areaY = topBar;
    const areaH = this.canvas.height - topBar - bottomBar;

    ctx.fillStyle = 'rgba(10, 14, 26, 0.96)';
    ctx.fillRect(0, areaY, this.canvas.width, areaH);

    const L = {
      x: 260,
      y: areaY + 40,
      w: 760,
      h: 520,
    };

    ctx.fillStyle = '#1C2234';
    ctx.fillRect(L.x, L.y, L.w, L.h);
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 3;
    ctx.strokeRect(L.x, L.y, L.w, L.h);

    // Title
    ctx.fillStyle = '#00E5FF';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MULTIPLAYER CO-OP HUB', L.x + L.w / 2, L.y + 55);

    // Gamertag Pill
    ctx.fillStyle = '#AFC7E8';
    ctx.font = '13px monospace';
    ctx.fillText(`Logged in as Pilot: ${this.gamertag}`, L.x + L.w / 2, L.y + 90);

    // Button 1: Create Game
    const btn1 = { x: 340, y: L.y + 130, w: 600, h: 70 };
    ctx.fillStyle = '#2EA043';
    ctx.fillRect(btn1.x, btn1.y, btn1.w, btn1.h);
    ctx.strokeStyle = '#56D364';
    ctx.lineWidth = 2;
    ctx.strokeRect(btn1.x, btn1.y, btn1.w, btn1.h);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('👑 CREATE GAME (HOST)', btn1.x + btn1.w / 2, btn1.y + 30);
    ctx.font = '12px monospace';
    ctx.fillStyle = '#D6FFD6';
    ctx.fillText('Choose map & difficulty, wait for partner in lobby', btn1.x + btn1.w / 2, btn1.y + 52);

    // Button 2: Join Game
    const btn2 = { x: 340, y: L.y + 220, w: 600, h: 70 };
    ctx.fillStyle = '#1F6FEB';
    ctx.fillRect(btn2.x, btn2.y, btn2.w, btn2.h);
    ctx.strokeStyle = '#58A6FF';
    ctx.lineWidth = 2;
    ctx.strokeRect(btn2.x, btn2.y, btn2.w, btn2.h);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('🚀 JOIN GAME (BROWSE)', btn2.x + btn2.w / 2, btn2.y + 30);
    ctx.font = '12px monospace';
    ctx.fillStyle = '#D6EAFF';
    ctx.fillText('Browse waiting hosts or enter a direct room code', btn2.x + btn2.w / 2, btn2.y + 52);

    // Button 3: Back to Mode Select
    const btn3 = { x: 340, y: L.y + 320, w: 600, h: 50 };
    ctx.fillStyle = '#30363D';
    ctx.fillRect(btn3.x, btn3.y, btn3.w, btn3.h);
    ctx.strokeStyle = '#8B949E';
    ctx.lineWidth = 1;
    ctx.strokeRect(btn3.x, btn3.y, btn3.w, btn3.h);

    ctx.fillStyle = '#E6EDF3';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⬅ BACK TO MODE SELECT', btn3.x + btn3.w / 2, btn3.y + btn3.h / 2 + 5);

    ctx.textAlign = 'left';
  }

  /** Draws Create Room View */
  renderMultiplayerCreate(ctx: CanvasRenderingContext2D): void {
    const topBar = 50;
    const bottomBar = 80;
    const areaY = topBar;
    const areaH = this.canvas.height - topBar - bottomBar;

    ctx.fillStyle = 'rgba(10, 14, 26, 0.96)';
    ctx.fillRect(0, areaY, this.canvas.width, areaH);

    const L = { x: 220, y: areaY + 30, w: 840, h: 560 };

    ctx.fillStyle = '#1C2234';
    ctx.fillRect(L.x, L.y, L.w, L.h);
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 3;
    ctx.strokeRect(L.x, L.y, L.w, L.h);

    // Title
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CREATE CO-OP LOBBY', L.x + L.w / 2, L.y + 45);

    // Section 1: Choose Map
    ctx.fillStyle = '#7EC8FF';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('1. SELECT MAP ENVIRONMENT', L.x + 40, L.y + 90);

    const maps: { id: MapType; name: string; x: number }[] = [
      { id: 'space', name: 'SPACE STATION', x: 260 },
      { id: 'dungeon', name: 'DUNGEON', x: 510 },
      { id: 'military', name: 'MILITARY', x: 760 },
    ];

    for (const m of maps) {
      const isSel = this.createMapSelect === m.id;
      ctx.fillStyle = isSel ? 'rgba(0, 229, 255, 0.25)' : 'rgba(30, 40, 60, 0.9)';
      ctx.fillRect(m.x, L.y + 110, 220, 65);
      ctx.strokeStyle = isSel ? '#00E5FF' : '#4A5B7A';
      ctx.lineWidth = isSel ? 2 : 1;
      ctx.strokeRect(m.x, L.y + 110, 220, 65);

      ctx.fillStyle = isSel ? '#00E5FF' : '#E6F0FF';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(m.name, m.x + 110, L.y + 148);
    }

    // Section 2: Choose Difficulty
    ctx.fillStyle = '#7EC8FF';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('2. SELECT DIFFICULTY', L.x + 40, L.y + 225);

    const diffs: { id: DifficultyMode; name: string; color: string; x: number }[] = [
      { id: 'easy', name: 'EASY', color: '#56D364', x: 260 },
      { id: 'medium', name: 'MEDIUM', color: '#FFD700', x: 510 },
      { id: 'hard', name: 'HARD', color: '#FF7A7A', x: 760 },
    ];

    for (const d of diffs) {
      const isSel = this.createDifficultySelect === d.id;
      ctx.fillStyle = isSel ? 'rgba(255, 215, 0, 0.2)' : 'rgba(30, 40, 60, 0.9)';
      ctx.fillRect(d.x, L.y + 245, 220, 65);
      ctx.strokeStyle = isSel ? d.color : '#4A5B7A';
      ctx.lineWidth = isSel ? 2 : 1;
      ctx.strokeRect(d.x, L.y + 245, 220, 65);

      ctx.fillStyle = isSel ? d.color : '#E6F0FF';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(d.name, d.x + 110, L.y + 283);
    }

    // Bottom Action Buttons
    const btnCreate = { x: 360, y: L.y + 380, w: 280, h: 55 };
    ctx.fillStyle = '#2EA043';
    ctx.fillRect(btnCreate.x, btnCreate.y, btnCreate.w, btnCreate.h);
    ctx.strokeStyle = '#56D364';
    ctx.lineWidth = 2;
    ctx.strokeRect(btnCreate.x, btnCreate.y, btnCreate.w, btnCreate.h);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CREATE LOBBY', btnCreate.x + btnCreate.w / 2, btnCreate.y + btnCreate.h / 2 + 6);

    const btnBack = { x: 670, y: L.y + 380, w: 160, h: 55 };
    ctx.fillStyle = '#30363D';
    ctx.fillRect(btnBack.x, btnBack.y, btnBack.w, btnBack.h);
    ctx.strokeStyle = '#8B949E';
    ctx.lineWidth = 1;
    ctx.strokeRect(btnBack.x, btnBack.y, btnBack.w, btnBack.h);

    ctx.fillStyle = '#E6EDF3';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('BACK', btnBack.x + btnBack.w / 2, btnBack.y + btnBack.h / 2 + 6);

    ctx.textAlign = 'left';
  }

  /** Draws Browse Rooms View */
  renderMultiplayerBrowse(ctx: CanvasRenderingContext2D): void {
    const topBar = 50;
    const bottomBar = 80;
    const areaY = topBar;
    const areaH = this.canvas.height - topBar - bottomBar;

    ctx.fillStyle = 'rgba(10, 14, 26, 0.96)';
    ctx.fillRect(0, areaY, this.canvas.width, areaH);

    const L = { x: 160, y: areaY + 20, w: 960, h: 600 };

    ctx.fillStyle = '#1C2234';
    ctx.fillRect(L.x, L.y, L.w, L.h);
    ctx.strokeStyle = '#7EC8FF';
    ctx.lineWidth = 3;
    ctx.strokeRect(L.x, L.y, L.w, L.h);

    // Title
    ctx.fillStyle = '#7EC8FF';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('OPEN CO-OP GAMES', L.x + 30, L.y + 45);

    // Direct Code Box
    ctx.fillStyle = '#AFC7E8';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('ROOM CODE:', 310, L.y + 45);

    ctx.fillStyle = 'rgba(14, 18, 30, 0.95)';
    ctx.fillRect(420, L.y + 25, 220, 40);
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(420, L.y + 25, 220, 40);

    ctx.fillStyle = this.roomCodeInput ? '#FFFFFF' : '#6E7681';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.roomCodeInput || 'ENTER CODE...', 530, L.y + 50);

    const btnJoinCode = { x: 660, y: L.y + 25, w: 160, h: 40 };
    ctx.fillStyle = '#1F6FEB';
    ctx.fillRect(btnJoinCode.x, btnJoinCode.y, btnJoinCode.w, btnJoinCode.h);
    ctx.strokeStyle = '#58A6FF';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(btnJoinCode.x, btnJoinCode.y, btnJoinCode.w, btnJoinCode.h);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('JOIN BY CODE', btnJoinCode.x + btnJoinCode.w / 2, btnJoinCode.y + 25);

    // Table Column Headers
    const headerY = L.y + 90;
    ctx.fillStyle = 'rgba(32, 44, 70, 0.7)';
    ctx.fillRect(L.x + 24, headerY, L.w - 48, 32);
    ctx.strokeStyle = '#4A5B7A';
    ctx.lineWidth = 1;
    ctx.strokeRect(L.x + 24, headerY, L.w - 48, 32);

    ctx.fillStyle = '#7EC8FF';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';

    const colHost = L.x + 40;
    const colMap = L.x + 220;
    const colDiff = L.x + 420;
    const colRoom = L.x + 600;
    const colAction = L.x + 760;

    ctx.fillText('HOST', colHost, headerY + 21);
    ctx.fillText('MAP', colMap, headerY + 21);
    ctx.fillText('DIFFICULTY', colDiff, headerY + 21);
    ctx.fillText('ROOM ID', colRoom, headerY + 21);
    ctx.fillText('ACTION', colAction, headerY + 21);

    // Table Rows
    const rowStartY = headerY + 42;
    const rowH = 46;

    if (this.openRooms.length === 0) {
      ctx.fillStyle = '#7EC8FF';
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('No open games waiting for a partner.', L.x + L.w / 2, L.y + 240);
      ctx.font = '13px monospace';
      ctx.fillStyle = '#AFC7E8';
      ctx.fillText('Click Refresh to scan for waiting hosts or enter a room code.', L.x + L.w / 2, L.y + 270);
    } else {
      for (let i = 0; i < this.openRooms.length; i++) {
        const room = this.openRooms[i];
        const rowY = rowStartY + i * rowH;

        ctx.fillStyle = i % 2 === 0 ? 'rgba(26, 34, 52, 0.55)' : 'rgba(18, 24, 38, 0.55)';
        ctx.fillRect(L.x + 24, rowY, L.w - 48, rowH - 6);
        ctx.strokeStyle = '#3A4A66';
        ctx.lineWidth = 1;
        ctx.strokeRect(L.x + 24, rowY, L.w - 48, rowH - 6);

        ctx.fillStyle = '#00E5FF';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(room.hostTag, colHost, rowY + 26);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '13px monospace';
        ctx.fillText(this.formatMap(room.mapType), colMap, rowY + 26);

        const diffColor = room.difficulty === 'easy' ? '#56D364' : (room.difficulty === 'medium' ? '#FFD700' : '#FF7A7A');
        ctx.fillStyle = diffColor;
        ctx.font = 'bold 13px monospace';
        ctx.fillText(this.formatDifficulty(room.difficulty), colDiff, rowY + 26);

        ctx.fillStyle = '#AFC7E8';
        ctx.font = '12px monospace';
        ctx.fillText(room.id, colRoom, rowY + 26);

        // Join button
        ctx.fillStyle = '#2EA043';
        ctx.fillRect(colAction, rowY + 4, 110, 32);
        ctx.strokeStyle = '#56D364';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(colAction, rowY + 4, 110, 32);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('JOIN', colAction + 55, rowY + 25);
      }
    }

    // Bottom Action Buttons
    const btnRefresh = { x: 420, y: L.y + L.h - 70, w: 170, h: 48 };
    ctx.fillStyle = '#1F6FEB';
    ctx.fillRect(btnRefresh.x, btnRefresh.y, btnRefresh.w, btnRefresh.h);
    ctx.strokeStyle = '#58A6FF';
    ctx.lineWidth = 2;
    ctx.strokeRect(btnRefresh.x, btnRefresh.y, btnRefresh.w, btnRefresh.h);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('🔄 REFRESH', btnRefresh.x + btnRefresh.w / 2, btnRefresh.y + 30);

    const btnBack = { x: 630, y: L.y + L.h - 70, w: 150, h: 48 };
    ctx.fillStyle = '#30363D';
    ctx.fillRect(btnBack.x, btnBack.y, btnBack.w, btnBack.h);
    ctx.strokeStyle = '#8B949E';
    ctx.lineWidth = 1;
    ctx.strokeRect(btnBack.x, btnBack.y, btnBack.w, btnBack.h);

    ctx.fillStyle = '#E6EDF3';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('BACK', btnBack.x + btnBack.w / 2, btnBack.y + 30);

    ctx.textAlign = 'left';
  }

  /** Draws Waiting Room Lobby */
  renderMultiplayerWaitingRoom(ctx: CanvasRenderingContext2D): void {
    const topBar = 50;
    const bottomBar = 80;
    const areaY = topBar;
    const areaH = this.canvas.height - topBar - bottomBar;

    ctx.fillStyle = 'rgba(10, 14, 26, 0.96)';
    ctx.fillRect(0, areaY, this.canvas.width, areaH);

    const L = { x: 220, y: areaY + 30, w: 840, h: 560 };

    ctx.fillStyle = '#1C2234';
    ctx.fillRect(L.x, L.y, L.w, L.h);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.strokeRect(L.x, L.y, L.w, L.h);

    const roomId = this.multiplayerRoom?.id || 'ROOM-LOBBY';
    const mapName = this.formatMap(this.multiplayerRoom?.mapType || 'space');
    const diffName = this.formatDifficulty(this.multiplayerRoom?.difficulty || 'easy');

    // Title & Info
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`CO-OP LOBBY: ${roomId}`, L.x + L.w / 2, L.y + 45);

    ctx.fillStyle = '#7EC8FF';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`MAP: ${mapName.toUpperCase()}  |  DIFFICULTY: ${diffName.toUpperCase()}`, L.x + L.w / 2, L.y + 75);

    // --- Slot 1: Host (Player 1) ---
    const slot1 = { x: 260, y: L.y + 100, w: 360, h: 250 };
    ctx.fillStyle = 'rgba(0, 229, 255, 0.1)';
    ctx.fillRect(slot1.x, slot1.y, slot1.w, slot1.h);
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 2;
    ctx.strokeRect(slot1.x, slot1.y, slot1.w, slot1.h);

    ctx.fillStyle = '#00E5FF';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('👑 PLAYER 1 (HOST)', slot1.x + slot1.w / 2, slot1.y + 40);

    const hostTag = this.multiplayerRoom?.hostTag || this.p1Tag;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px monospace';
    ctx.fillText(hostTag, slot1.x + slot1.w / 2, slot1.y + 110);

    const hostReady = this.multiplayerRoom?.hostReady ?? false;
    ctx.fillStyle = hostReady ? '#56D364' : '#FFD700';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(hostReady ? 'READY ✓' : 'SETTING UP...', slot1.x + slot1.w / 2, slot1.y + 180);

    // --- Slot 2: Guest (Player 2) ---
    const slot2 = { x: 660, y: L.y + 100, w: 360, h: 250 };
    ctx.fillStyle = 'rgba(255, 0, 127, 0.1)';
    ctx.fillRect(slot2.x, slot2.y, slot2.w, slot2.h);
    ctx.strokeStyle = '#FF007F';
    ctx.lineWidth = 2;
    ctx.strokeRect(slot2.x, slot2.y, slot2.w, slot2.h);

    ctx.fillStyle = '#FF007F';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('🚀 PLAYER 2 (GUEST)', slot2.x + slot2.w / 2, slot2.y + 40);

    const guestTag = this.multiplayerRoom?.guestTag;
    if (guestTag) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 24px monospace';
      ctx.fillText(guestTag, slot2.x + slot2.w / 2, slot2.y + 110);

      const guestReady = this.multiplayerRoom?.guestReady ?? false;
      ctx.fillStyle = guestReady ? '#56D364' : '#E06666';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(guestReady ? 'READY ✓' : 'NOT READY', slot2.x + slot2.w / 2, slot2.y + 180);
    } else {
      // Pulsing radar waiting animation
      const pulse = 10 + Math.sin(Date.now() / 200) * 6;
      ctx.strokeStyle = '#FF007F';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(slot2.x + slot2.w / 2, slot2.y + 110, 24 + pulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#AFC7E8';
      ctx.font = 'bold 13px monospace';
      ctx.fillText('WAITING FOR PARTNER...', slot2.x + slot2.w / 2, slot2.y + 180);
    }

    // Bottom Controls
    const isHost = this.localPlayerRole === 'p1';
    const myReady = isHost ? Boolean(this.multiplayerRoom?.hostReady) : Boolean(this.multiplayerRoom?.guestReady);

    const btnReady = { x: 380, y: L.y + 380, w: 260, h: 55 };
    ctx.fillStyle = myReady ? '#D29922' : '#2EA043';
    ctx.fillRect(btnReady.x, btnReady.y, btnReady.w, btnReady.h);
    ctx.strokeStyle = myReady ? '#E3B341' : '#56D364';
    ctx.lineWidth = 2;
    ctx.strokeRect(btnReady.x, btnReady.y, btnReady.w, btnReady.h);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(myReady ? 'CANCEL READY' : 'I AM READY', btnReady.x + btnReady.w / 2, btnReady.y + btnReady.h / 2 + 6);

    const btnLeave = { x: 670, y: L.y + 380, w: 170, h: 55 };
    ctx.fillStyle = '#DA3633';
    ctx.fillRect(btnLeave.x, btnLeave.y, btnLeave.w, btnLeave.h);
    ctx.strokeStyle = '#F85149';
    ctx.lineWidth = 2;
    ctx.strokeRect(btnLeave.x, btnLeave.y, btnLeave.w, btnLeave.h);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LEAVE ROOM', btnLeave.x + btnLeave.w / 2, btnLeave.y + btnLeave.h / 2 + 6);

    // Launch Countdown overlay
    if (this.matchCountdown !== null) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(L.x, L.y, L.w, L.h);

      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 72px monospace';
      ctx.textAlign = 'center';
      const label = this.matchCountdown === 0 ? 'LAUNCH!' : `${this.matchCountdown}`;
      ctx.fillText(label, L.x + L.w / 2, L.y + L.h / 2 + 25);
    }

    ctx.textAlign = 'left';
  }

  /** Draws Tactical Map Pings on the grid */
  renderMultiplayerPings(ctx: CanvasRenderingContext2D): void {
    for (const ping of this.activePings) {
      const isP1 = ping.role === 'p1';
      const color = isP1 ? '#00E5FF' : '#FF007F';
      const progress = (2.0 - ping.timer) / 2.0; // 0 to 1
      const radius = 10 + progress * 26;
      const alpha = Math.max(0, 1 - progress);

      ctx.save();
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ping.x, ping.y, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`PING! ${isP1 ? 'P1' : 'P2'}`, ping.x, ping.y - radius - 4);
      ctx.restore();
    }
  }

  /** Draws Remote Partner Cursor */
  renderRemoteCursor(ctx: CanvasRenderingContext2D): void {
    if (!this.remoteCursor || !this.remoteCursor.visible) return;

    const { canvasX, canvasY, tag } = this.remoteCursor;
    const isP1 = this.localPlayerRole === 'p2'; // remote player is the other one
    const color = isP1 ? '#00E5FF' : '#FF007F';

    ctx.save();
    // Neon Crosshair
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(canvasX - 8, canvasY);
    ctx.lineTo(canvasX + 8, canvasY);
    ctx.moveTo(canvasX, canvasY - 8);
    ctx.lineTo(canvasX, canvasY + 8);
    ctx.stroke();

    // Name chip
    ctx.fillStyle = 'rgba(10, 14, 26, 0.85)';
    ctx.fillRect(canvasX + 8, canvasY - 18, 64, 16);
    ctx.strokeStyle = color;
    ctx.strokeRect(canvasX + 8, canvasY - 18, 64, 16);

    ctx.fillStyle = color;
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(tag || 'PARTNER', canvasX + 40, canvasY - 6);
    ctx.restore();
  }

  handleDamageStatsModalClick(x: number, y: number): boolean {
    if (!this.showDamageStatsModal) return false;
    const L = this.getDamageStatsModalRect();

    // Close button (X) in header
    const closeX = L.x + L.w - 38;
    const closeY = L.y + 12;
    if (x >= closeX && x <= closeX + 26 && y >= closeY && y <= closeY + 26) {
      this.showDamageStatsModal = false;
      return true;
    }

    // Bottom Close button
    const btnW = 160;
    const btnH = 36;
    const btnX = L.x + (L.w - btnW) / 2;
    const btnY = L.y + L.h - 48;
    if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
      this.showDamageStatsModal = false;
      return true;
    }

    // Clicks inside consume event, clicks outside close modal
    if (x >= L.x && x <= L.x + L.w && y >= L.y && y <= L.y + L.h) {
      return true;
    }

    this.showDamageStatsModal = false;
    return true;
  }

  renderDamageStatsModal(ctx: CanvasRenderingContext2D): void {
    if (!this.showDamageStatsModal) return;
    const L = this.getDamageStatsModalRect();

    // Dim background
    ctx.fillStyle = 'rgba(10, 14, 26, 0.75)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Modal card background
    ctx.fillStyle = 'rgba(18, 26, 44, 0.96)';
    ctx.fillRect(L.x, L.y, L.w, L.h);
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 2;
    ctx.strokeRect(L.x, L.y, L.w, L.h);

    // Header
    ctx.fillStyle = 'rgba(0, 229, 255, 0.12)';
    ctx.fillRect(L.x, L.y, L.w, 48);
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(L.x, L.y + 48);
    ctx.lineTo(L.x + L.w, L.y + 48);
    ctx.stroke();

    ctx.fillStyle = '#00E5FF';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚔️ COMBAT CONTRIBUTION & DAMAGE STATS', L.x + 20, L.y + 24);

    // Close X
    ctx.fillStyle = '#FF7A7A';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('✕', L.x + L.w - 25, L.y + 24);

    const stats = this.onGetCombatStats?.();
    const p1 = stats?.p1 || { totalDamage: 0, waveDamage: 0, kills: 0, damageByTowerType: { archer: 0, cannon: 0, sniper: 0, ice: 0, flamethrower: 0 } };
    const p2 = stats?.p2 || { totalDamage: 0, waveDamage: 0, kills: 0, damageByTowerType: { archer: 0, cannon: 0, sniper: 0, ice: 0, flamethrower: 0 } };
    const split = stats?.split || { p1Percent: 50, p2Percent: 50, p1Total: 0, p2Total: 0 };

    // Player 1 Column (Host)
    const colW = 300;
    const p1ColX = L.x + 24;
    const p2ColX = L.x + L.w - colW - 24;
    const contentY = L.y + 64;

    // P1 Box
    ctx.fillStyle = 'rgba(0, 229, 255, 0.08)';
    ctx.fillRect(p1ColX, contentY, colW, 140);
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(p1ColX, contentY, colW, 140);

    ctx.fillStyle = '#00E5FF';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`[P1 HOST] ${this.p1Tag}`, p1ColX + 12, contentY + 18);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px monospace';
    ctx.fillText(`Total Damage:`, p1ColX + 12, contentY + 45);
    ctx.fillStyle = '#00E5FF';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(p1.totalDamage).toLocaleString()} (${split.p1Percent}%)`, p1ColX + colW - 12, contentY + 45);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px monospace';
    ctx.fillText(`Wave Damage:`, p1ColX + 12, contentY + 72);
    ctx.fillStyle = '#7EC8FF';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(p1.waveDamage).toLocaleString()}`, p1ColX + colW - 12, contentY + 72);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px monospace';
    ctx.fillText(`Enemies Destroyed:`, p1ColX + 12, contentY + 99);
    ctx.fillStyle = '#6EEA8A';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${p1.kills}`, p1ColX + colW - 12, contentY + 99);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px monospace';
    ctx.fillText(`Current Gold:`, p1ColX + 12, contentY + 124);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${this.p1Gold}g`, p1ColX + colW - 12, contentY + 124);

    // P2 Box
    ctx.fillStyle = 'rgba(255, 0, 127, 0.08)';
    ctx.fillRect(p2ColX, contentY, colW, 140);
    ctx.strokeStyle = '#FF007F';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(p2ColX, contentY, colW, 140);

    ctx.fillStyle = '#FF007F';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`[P2 GUEST] ${this.p2Tag}`, p2ColX + 12, contentY + 18);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px monospace';
    ctx.fillText(`Total Damage:`, p2ColX + 12, contentY + 45);
    ctx.fillStyle = '#FF007F';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(p2.totalDamage).toLocaleString()} (${split.p2Percent}%)`, p2ColX + colW - 12, contentY + 45);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px monospace';
    ctx.fillText(`Wave Damage:`, p2ColX + 12, contentY + 72);
    ctx.fillStyle = '#FFA6D5';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(p2.waveDamage).toLocaleString()}`, p2ColX + colW - 12, contentY + 72);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px monospace';
    ctx.fillText(`Enemies Destroyed:`, p2ColX + 12, contentY + 99);
    ctx.fillStyle = '#6EEA8A';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${p2.kills}`, p2ColX + colW - 12, contentY + 99);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px monospace';
    ctx.fillText(`Current Gold:`, p2ColX + 12, contentY + 124);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${this.p2Gold}g`, p2ColX + colW - 12, contentY + 124);

    // Tower Archetype Breakdown Section
    const archY = contentY + 155;
    ctx.fillStyle = '#AFC7E8';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('DAMAGE BY TOWER ARCHETYPE', L.x + 24, archY);

    const towerList: TowerType[] = ['archer', 'cannon', 'sniper', 'ice', 'flamethrower'];
    const barAreaW = L.w - 48;
    const barStartY = archY + 16;
    const rowH = 26;

    for (let i = 0; i < towerList.length; i++) {
      const type = towerList[i];
      const rowY = barStartY + i * rowH;
      const p1Dmg = p1.damageByTowerType[type] || 0;
      const p2Dmg = p2.damageByTowerType[type] || 0;
      const typeTotal = p1Dmg + p2Dmg;

      const p1Share = typeTotal > 0 ? (p1Dmg / typeTotal) : 0.5;

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(type.toUpperCase(), L.x + 24, rowY + 10);

      // Bar
      const bX = L.x + 130;
      const bW = barAreaW - 110;
      const bH = 14;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(bX, rowY, bW, bH);
      ctx.strokeStyle = '#445577';
      ctx.lineWidth = 1;
      ctx.strokeRect(bX, rowY, bW, bH);

      if (typeTotal > 0) {
        const p1W = Math.round(bW * p1Share);
        if (p1W > 0) {
          ctx.fillStyle = '#00E5FF';
          ctx.fillRect(bX, rowY, p1W, bH);
        }
        if (bW - p1W > 0) {
          ctx.fillStyle = '#FF007F';
          ctx.fillRect(bX + p1W, rowY, bW - p1W, bH);
        }
      }

      ctx.fillStyle = '#AFC7E8';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`P1: ${Math.round(p1Dmg).toLocaleString()} | P2: ${Math.round(p2Dmg).toLocaleString()}`, bX + bW, rowY + 11);
    }

    // Close Button
    const btnW = 160;
    const btnH = 36;
    const btnX = L.x + (L.w - btnW) / 2;
    const btnY = L.y + L.h - 48;

    ctx.fillStyle = 'rgba(0, 229, 255, 0.2)';
    ctx.fillRect(btnX, btnY, btnW, btnH);
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 2;
    ctx.strokeRect(btnX, btnY, btnW, btnH);

    ctx.fillStyle = '#00E5FF';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('✕ CLOSE', btnX + btnW / 2, btnY + 22);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
}
