import { test, expect } from '@playwright/test';
import { TowerDefencePage } from '../helpers/game-page';

test.describe('Menu and UI Navigation', () => {
  let gamePage: TowerDefencePage;

  test.beforeEach(async ({ page }) => {
    gamePage = new TowerDefencePage(page);
    await gamePage.goto();
  });

  test('should load in menu state with canvas ready', async ({ page }) => {
    const state = await gamePage.getGameState();
    expect(state).toBe('menu');

    const gameData = await gamePage.getGameData();
    expect(gameData.lives).toBe(20);
    expect(gameData.gold).toBe(150);
    expect(gameData.wave).toBe(1);
    expect(gameData.score).toBe(0);
  });

  test('should open and close Help modal', async ({ page }) => {
    expect(await gamePage.isHelpOpen()).toBe(false);

    // Open Help
    await gamePage.clickHelpButton();
    expect(await gamePage.isHelpOpen()).toBe(true);

    // Close Help via X button
    await gamePage.clickHelpClose();
    expect(await gamePage.isHelpOpen()).toBe(false);

    // Open and close with Escape key
    await gamePage.clickHelpButton();
    expect(await gamePage.isHelpOpen()).toBe(true);
    await page.keyboard.press('Escape');
    expect(await gamePage.isHelpOpen()).toBe(false);

    // Open and close by clicking outside the modal
    await gamePage.clickHelpButton();
    expect(await gamePage.isHelpOpen()).toBe(true);
    await gamePage.clickCanvasAt(50, 50); // Outside help modal bounds
    expect(await gamePage.isHelpOpen()).toBe(false);
  });

  test('should open and close Settings modal', async ({ page }) => {
    expect(await gamePage.isSettingsOpen()).toBe(false);

    // Open Settings via gear icon
    await gamePage.clickSettingsGear();
    expect(await gamePage.isSettingsOpen()).toBe(true);

    // Close Settings via close button
    await gamePage.clickSettingsClose();
    expect(await gamePage.isSettingsOpen()).toBe(false);

    // Open and close with Escape key
    await gamePage.clickSettingsGear();
    expect(await gamePage.isSettingsOpen()).toBe(true);
    await page.keyboard.press('Escape');
    expect(await gamePage.isSettingsOpen()).toBe(false);

    // Open and toggle off by clicking gear again
    await gamePage.clickSettingsGear();
    expect(await gamePage.isSettingsOpen()).toBe(true);
    await gamePage.clickSettingsGear();
    expect(await gamePage.isSettingsOpen()).toBe(false);
  });

  test('should adjust music and sfx volumes via settings sliders', async ({ page }) => {
    await gamePage.clickSettingsGear();
    expect(await gamePage.isSettingsOpen()).toBe(true);

    // Set Music volume to 80%
    await gamePage.setMusicSlider(0.8);
    let volumes = await gamePage.getVolumes();
    expect(volumes.music).toBeCloseTo(0.8, 1);

    // Set Music volume to 20%
    await gamePage.setMusicSlider(0.2);
    volumes = await gamePage.getVolumes();
    expect(volumes.music).toBeCloseTo(0.2, 1);

    // Set SFX volume to 50%
    await gamePage.setSfxSlider(0.5);
    volumes = await gamePage.getVolumes();
    expect(volumes.sfx).toBeCloseTo(0.5, 1);

    await gamePage.clickSettingsClose();
  });

  test('should toggle difficulty dropdown and select different modes', async ({ page }) => {
    expect(await gamePage.getSelectedDifficulty()).toBe('easy');
    expect(await gamePage.isDifficultyDropdownOpen()).toBe(false);

    // Open difficulty dropdown
    await gamePage.clickDifficultyDropdown();
    expect(await gamePage.isDifficultyDropdownOpen()).toBe(true);

    // Select Medium
    await gamePage.selectDifficultyOption('medium');
    expect(await gamePage.isDifficultyDropdownOpen()).toBe(false);
    expect(await gamePage.getSelectedDifficulty()).toBe('medium');

    // Open and select Hard
    await gamePage.clickDifficultyDropdown();
    await gamePage.selectDifficultyOption('hard');
    expect(await gamePage.isDifficultyDropdownOpen()).toBe(false);
    expect(await gamePage.getSelectedDifficulty()).toBe('hard');

    // Open and select Easy
    await gamePage.clickDifficultyDropdown();
    await gamePage.selectDifficultyOption('easy');
    expect(await gamePage.isDifficultyDropdownOpen()).toBe(false);
    expect(await gamePage.getSelectedDifficulty()).toBe('easy');
  });
});
