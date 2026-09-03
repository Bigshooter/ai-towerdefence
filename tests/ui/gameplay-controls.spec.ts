import { test, expect } from '@playwright/test';
import { TowerDefencePage } from '../helpers/game-page';

test.describe('Gameplay Controls and State Transitions', () => {
  let gamePage: TowerDefencePage;

  test.beforeEach(async ({ page }) => {
    gamePage = new TowerDefencePage(page);
    await gamePage.goto();
  });

  test('should transition from menu to playing when START is clicked', async ({ page }) => {
    expect(await gamePage.getGameState()).toBe('menu');

    await gamePage.clickStart();
    expect(await gamePage.getGameState()).toBe('playing');

    const gameData = await gamePage.getGameData();
    expect(gameData.lives).toBe(20);
    expect(gameData.gold).toBe(150);
    expect(gameData.wave).toBe(1);
  });

  test('should toggle pause and resume during gameplay', async ({ page }) => {
    await gamePage.clickStart();
    expect(await gamePage.getGameState()).toBe('playing');

    // Pause the game
    await gamePage.clickPause();
    expect(await gamePage.getGameState()).toBe('paused');

    // Resume the game
    await gamePage.clickPause();
    expect(await gamePage.getGameState()).toBe('playing');
  });

  test('should reset game back to menu when Reset button is clicked', async ({ page }) => {
    await gamePage.clickStart();
    expect(await gamePage.getGameState()).toBe('playing');

    // Click Reset
    await gamePage.clickReset();
    expect(await gamePage.getGameState()).toBe('menu');

    const gameData = await gamePage.getGameData();
    expect(gameData.lives).toBe(20);
    expect(gameData.gold).toBe(150);
    expect(gameData.wave).toBe(1);
  });

  test('should select tower types using keyboard hotkeys 1-4', async ({ page }) => {
    await gamePage.clickStart();

    // Press '1' for Archer
    await page.keyboard.press('1');
    expect(await gamePage.getSelectedTowerType()).toBe('archer');

    // Press '2' for Cannon
    await page.keyboard.press('2');
    expect(await gamePage.getSelectedTowerType()).toBe('cannon');

    // Press '3' for Sniper
    await page.keyboard.press('3');
    expect(await gamePage.getSelectedTowerType()).toBe('sniper');

    // Press '4' for Ice
    await page.keyboard.press('4');
    expect(await gamePage.getSelectedTowerType()).toBe('ice');

    // Press 'Escape' to cancel tower selection
    await page.keyboard.press('Escape');
    expect(await gamePage.getSelectedTowerType()).toBeNull();
  });
});
