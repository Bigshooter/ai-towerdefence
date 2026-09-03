import { Page, Locator, expect } from '@playwright/test';

export class TowerDefencePage {
  readonly page: Page;
  readonly canvas: Locator;

  constructor(page: Page) {
    this.page = page;
    this.canvas = page.locator('#game-canvas');
  }

  async goto() {
    await this.page.goto('/');
    await expect(this.canvas).toBeVisible();
    // Wait for game initialization
    await this.page.waitForFunction(() => (window as any).game !== undefined);
  }

  async clickCanvasAt(x: number, y: number) {
    // Playwright click on canvas with position relative to top-left of canvas element
    await this.canvas.click({ position: { x, y } });
  }

  async rightClickCanvasAt(x: number, y: number) {
    await this.canvas.click({ button: 'right', position: { x, y } });
  }

  // --- Buttons & Controls ---

  async clickStart() {
    await this.clickCanvasAt(640, 920);
  }

  async clickPause() {
    await this.clickCanvasAt(1170, 920);
  }

  async clickReset() {
    await this.clickCanvasAt(1080, 920);
  }

  async clickHelpButton() {
    await this.clickCanvasAt(1240, 920);
  }

  async clickHelpClose() {
    await this.clickCanvasAt(1040, 145);
  }

  async clickSettingsGear() {
    await this.clickCanvasAt(1253, 25);
  }

  async clickSettingsClose() {
    await this.clickCanvasAt(842, 358);
  }

  async clickDifficultyDropdown() {
    await this.clickCanvasAt(485, 920);
  }

  async selectDifficultyOption(mode: 'easy' | 'medium' | 'hard') {
    const coords = {
      easy: { x: 247, y: 920 },
      medium: { x: 309, y: 920 },
      hard: { x: 371, y: 920 },
    };
    await this.clickCanvasAt(coords[mode].x, coords[mode].y);
  }

  async selectTowerTypeButton(index: 0 | 1 | 2 | 3 | 4) {
    // 0: Archer (80), 1: Cannon (150), 2: Sniper (220), 3: Ice (290), 4: Flame (360)
    const x = 80 + index * 70;
    await this.clickCanvasAt(x, 910);
  }

  async clickTile(col: number, row: number) {
    const x = col * 32 + 16;
    const y = row * 32 + 16;
    await this.clickCanvasAt(x, y);
  }

  async clickUpgradeButton() {
    await this.clickCanvasAt(380, 920);
  }

  async clickSellButton() {
    await this.clickCanvasAt(470, 920);
  }

  async setMusicSlider(fraction: number) {
    // trackX = 560, trackW = 260, musicY = 460
    const clamped = Math.max(0, Math.min(1, fraction));
    const targetX = 560 + clamped * 260;
    await this.clickCanvasAt(targetX, 460);
  }

  async setSfxSlider(fraction: number) {
    // trackX = 560, trackW = 260, sfxY = 530
    const clamped = Math.max(0, Math.min(1, fraction));
    const targetX = 560 + clamped * 260;
    await this.clickCanvasAt(targetX, 530);
  }

  // --- State Query Methods ---

  async getGameState(): Promise<string> {
    return await this.page.evaluate(() => (window as any).uiManager?.getGameState?.() || (window as any).game?.gameState);
  }

  async getGameData(): Promise<{ lives: number; gold: number; wave: number; score: number }> {
    return await this.page.evaluate(() => ({ ...(window as any).gameData }));
  }

  async getVolumes(): Promise<{ music: number; sfx: number }> {
    return await this.page.evaluate(() => (window as any).uiManager?.onGetVolumes?.() || { music: 0, sfx: 0 });
  }

  async isSettingsOpen(): Promise<boolean> {
    return await this.page.evaluate(() => !!(window as any).uiManager?.getShowSettings?.());
  }

  async isHelpOpen(): Promise<boolean> {
    return await this.page.evaluate(() => !!(window as any).uiManager?.getShowHelp?.());
  }

  async isDifficultyDropdownOpen(): Promise<boolean> {
    return await this.page.evaluate(() => !!(window as any).uiManager?.getShowDifficultyDropdown?.());
  }

  async getSelectedDifficulty(): Promise<string> {
    return await this.page.evaluate(() => (window as any).uiManager?.getSelectedDifficulty?.() || (window as any).gameState?.difficulty);
  }

  async getSelectedTowerType(): Promise<string | null> {
    return await this.page.evaluate(() => (window as any).uiManager?.getSelectedTowerType?.());
  }

  async getSelectedTowerId(): Promise<string | null> {
    return await this.page.evaluate(() => (window as any).uiManager?.getSelectedTowerId?.());
  }

  async getTowersCount(): Promise<number> {
    return await this.page.evaluate(() => (window as any).game?.towers?.length || 0);
  }
}
