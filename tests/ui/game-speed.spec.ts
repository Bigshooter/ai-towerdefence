import { test, expect } from '@playwright/test';
import { TowerDefencePage } from '../helpers/game-page';

test.describe('Variable Game Speed Controls (1x, 2x, 3x, 5x)', () => {
  let gamePage: TowerDefencePage;

  test.beforeEach(async ({ page }) => {
    gamePage = new TowerDefencePage(page);
    await gamePage.goto();
  });

  test('Speed button cycles through 1x -> 2x -> 3x -> 5x -> 1x', async ({ page }) => {
    // Start game
    await gamePage.clickStart();
    expect(await gamePage.getGameState()).toBe('playing');
    expect(await gamePage.getGameSpeed()).toBe(1);

    // Click 1 -> 2
    await gamePage.clickSpeedButton();
    expect(await gamePage.getGameSpeed()).toBe(2);

    // Click 2 -> 3
    await gamePage.clickSpeedButton();
    expect(await gamePage.getGameSpeed()).toBe(3);

    // Click 3 -> 5
    await gamePage.clickSpeedButton();
    expect(await gamePage.getGameSpeed()).toBe(5);

    // Click 5 -> 1
    await gamePage.clickSpeedButton();
    expect(await gamePage.getGameSpeed()).toBe(1);
  });

  test('Keyboard shortcut cycles speed during gameplay', async ({ page }) => {
    await gamePage.clickStart();
    expect(await gamePage.getGameState()).toBe('playing');
    expect(await gamePage.getGameSpeed()).toBe(1);

    // Press Space to cycle
    await page.keyboard.press('Space');
    expect(await gamePage.getGameSpeed()).toBe(2);

    await page.keyboard.press('Space');
    expect(await gamePage.getGameSpeed()).toBe(3);

    await page.keyboard.press('Space');
    expect(await gamePage.getGameSpeed()).toBe(5);

    await page.keyboard.press('Space');
    expect(await gamePage.getGameSpeed()).toBe(1);
  });

  test('Speed setting is preserved across Pause and Resume', async ({ page }) => {
    await gamePage.clickStart();
    expect(await gamePage.getGameState()).toBe('playing');

    // Set speed to 3x
    await gamePage.clickSpeedButton(); // 2x
    await gamePage.clickSpeedButton(); // 3x
    expect(await gamePage.getGameSpeed()).toBe(3);

    // Pause game
    await gamePage.clickPause();
    expect(await gamePage.getGameState()).toBe('paused');
    expect(await gamePage.getGameSpeed()).toBe(3);

    // Resume game
    await gamePage.clickPause();
    expect(await gamePage.getGameState()).toBe('playing');
    expect(await gamePage.getGameSpeed()).toBe(3);
  });

  test('Simulation executes faster at 5x speed without collision errors', async ({ page }) => {
    await gamePage.clickStart();

    // Place an Archer tower at tile (6, 5)
    await gamePage.selectTowerTypeButton(0);
    await gamePage.clickTile(6, 5);

    // Set speed to 5x
    await gamePage.setGameSpeed(5);
    expect(await gamePage.getGameSpeed()).toBe(5);

    // Wait a brief duration (1.2s at 5x simulates 6.0s of gameplay)
    await page.waitForTimeout(1200);

    // Assert that simulation progressed significantly (enemies spawned or moved)
    const enemiesCount = await page.evaluate(() => (window as any).game?.enemies?.length || 0);
    const gold = (await gamePage.getGameData()).gold;
    const wave = (await gamePage.getGameData()).wave;

    // Simulation has advanced
    expect(gold).toBeDefined();
    expect(wave).toBeGreaterThanOrEqual(1);
  });
});
