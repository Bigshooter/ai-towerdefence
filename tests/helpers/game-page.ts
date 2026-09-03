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
    await this.page.waitForFunction(() => (window as any).uiManager !== undefined);
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

  async clickSpeedButton() {
    await this.clickCanvasAt(990, 920);
  }

  async getGameSpeed(): Promise<number> {
    return await this.page.evaluate(() => (window as any).uiManager?.getGameSpeed?.() || (window as any).game?.getGameSpeed?.() || 1);
  }

  async setGameSpeed(speed: 1 | 2 | 3 | 5): Promise<void> {
    await this.page.evaluate((s) => {
      (window as any).uiManager?.setGameSpeed?.(s);
    }, speed);
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

  async clickMapDropdown() {
    await this.clickCanvasAt(795, 920);
  }

  async selectMapOption(map: 'space' | 'dungeon' | 'military') {
    const coords = {
      space: { x: 916, y: 920 },
      dungeon: { x: 992, y: 920 },
      military: { x: 1068, y: 920 },
    };
    await this.clickCanvasAt(coords[map].x, coords[map].y);
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
    const layout = await this.page.evaluate(() => {
      const um = (window as any).uiManager;
      if (um && typeof um.getUpgradeButtonLayout === 'function') {
        return um.getUpgradeButtonLayout();
      }
      return { upgradeX: 340, sellX: 430 };
    });
    await this.clickCanvasAt(layout.upgradeX + 40, 920);
  }

  async clickSellButton() {
    const layout = await this.page.evaluate(() => {
      const um = (window as any).uiManager;
      if (um && typeof um.getUpgradeButtonLayout === 'function') {
        return um.getUpgradeButtonLayout();
      }
      return { upgradeX: 340, sellX: 430 };
    });
    await this.clickCanvasAt(layout.sellX + 40, 920);
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

  async isMapDropdownOpen(): Promise<boolean> {
    return await this.page.evaluate(() => !!(window as any).uiManager?.getShowMapDropdown?.());
  }

  async getSelectedMap(): Promise<string> {
    return await this.page.evaluate(() => (window as any).uiManager?.getSelectedMap?.());
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

  // --- High Score & Leaderboard Helpers ---

  async clickLeaderboardHUDButton() {
    await this.clickCanvasAt(1160, 25);
  }

  async clickGameOverLeaderboardButton() {
    await this.clickCanvasAt(640, 580);
  }

  async clickLeaderboardClose() {
    await this.clickCanvasAt(1030, 168);
  }

  async clickLeaderboardBottomClose() {
    await this.clickCanvasAt(640, 784);
  }

  async selectLeaderboardTab(map: 'space' | 'dungeon' | 'military') {
    const coords = {
      space: { x: 418, y: 229 },
      dungeon: { x: 640, y: 229 },
      military: { x: 862, y: 229 },
    };
    await this.clickCanvasAt(coords[map].x, coords[map].y);
  }

  async clickHighScoreSubmit() {
    await this.clickCanvasAt(578, 561);
  }

  async clickHighScoreBackspace() {
    await this.clickCanvasAt(778, 561);
  }

  async clickHighScoreClose() {
    await this.clickCanvasAt(902, 298);
  }

  async isHighScoreEntryOpen(): Promise<boolean> {
    return await this.page.evaluate(() => !!(window as any).uiManager?.getShowHighScoreEntry?.());
  }

  async getHighScoreInput(): Promise<string> {
    return await this.page.evaluate(() => (window as any).uiManager?.getHighScoreInput?.() || '');
  }

  async setHighScoreInput(name: string): Promise<void> {
    await this.page.evaluate((n) => (window as any).uiManager?.setHighScoreInput?.(n), name);
  }

  async isLeaderboardOpen(): Promise<boolean> {
    return await this.page.evaluate(() => !!(window as any).uiManager?.getShowLeaderboardModal?.());
  }

  async getActiveLeaderboardTab(): Promise<string> {
    return await this.page.evaluate(() => (window as any).uiManager?.getActiveLeaderboardTab?.() || '');
  }

  async getLeaderboardScores(map: 'space' | 'dungeon' | 'military'): Promise<any[]> {
    return await this.page.evaluate((m) => (window as any).highScoreSystem?.getScores?.(m) || [], map);
  }

  async clearAllLeaderboards(): Promise<void> {
    await this.page.evaluate(() => (window as any).highScoreSystem?.clearScores?.());
  }

  async getTowerAt(col: number, row: number): Promise<{ id: string; type: string; level: number } | null> {
    return await this.page.evaluate(({ c, r }) => {
      const towers = (window as any).game?.towers || [];
      const x = c * 32;
      const y = r * 32;
      const found = towers.find((t: any) => {
        const tx = Math.floor((t.position.x + 16) / 32);
        const ty = Math.floor((t.position.y + 16) / 32);
        return tx === c && ty === r;
      });
      if (!found) return null;
      return {
        id: found.id,
        type: found.data.type,
        level: found.data.level,
      };
    }, { c: col, r: row });
  }

  async getTowerCacheKeys(): Promise<string[]> {
    return await this.page.evaluate(() => {
      return (window as any).SpaceSprites?.getTowerCacheKeys?.() || [];
    });
  }

  async getProjectileCacheKeys(): Promise<string[]> {
    return await this.page.evaluate(() => {
      return (window as any).SpaceSprites?.getProjectileCacheKeys?.() || [];
    });
  }
}
