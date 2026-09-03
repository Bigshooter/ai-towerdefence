import { test, expect } from '@playwright/test';
import { TowerDefencePage } from '../helpers/game-page';

test.describe('Tower Placement and Economy', () => {
  let gamePage: TowerDefencePage;

  test.beforeEach(async ({ page }) => {
    gamePage = new TowerDefencePage(page);
    await gamePage.goto();
    await gamePage.clickStart();
  });

  test('should select and place an Archer tower on buildable tile', async () => {
    // Select Archer tower (50 gold)
    await gamePage.selectTowerTypeButton(0);
    expect(await gamePage.getSelectedTowerType()).toBe('archer');

    const initialGold = (await gamePage.getGameData()).gold;
    expect(initialGold).toBe(150);

    // Place at tile col: 2, row: 2 (Grass / buildable)
    await gamePage.clickTile(2, 2);

    expect(await gamePage.getTowersCount()).toBe(1);
    const updatedGold = (await gamePage.getGameData()).gold;
    expect(updatedGold).toBe(100);
  });

  test('should not place tower on unbuildable path tile', async () => {
    // Select Archer tower
    await gamePage.selectTowerTypeButton(0);
    expect(await gamePage.getSelectedTowerType()).toBe('archer');

    // Attempt to place on path (col: 0, row: 4 is enemy path)
    await gamePage.clickTile(0, 4);

    expect(await gamePage.getTowersCount()).toBe(0);
    expect((await gamePage.getGameData()).gold).toBe(150);
  });

  test('should not place tower when player does not have enough gold', async () => {
    // Select Archer once; placement mode stays active for placing multiple towers
    await gamePage.selectTowerTypeButton(0);
    await gamePage.clickTile(2, 2); // gold: 150 -> 100
    await gamePage.clickTile(3, 2); // gold: 100 -> 50
    await gamePage.clickTile(4, 2); // gold: 50 -> 0

    expect(await gamePage.getTowersCount()).toBe(3);
    expect((await gamePage.getGameData()).gold).toBe(0);

    // Attempt to place 4th tower without gold
    await gamePage.clickTile(5, 2);

    expect(await gamePage.getTowersCount()).toBe(3);
    expect((await gamePage.getGameData()).gold).toBe(0);
  });

  test('should not place second tower on top of an already occupied tile', async () => {
    await gamePage.selectTowerTypeButton(0);
    await gamePage.clickTile(2, 2);
    expect(await gamePage.getTowersCount()).toBe(1);
    expect((await gamePage.getGameData()).gold).toBe(100);

    // Try placing another tower on tile 2, 2
    await gamePage.selectTowerTypeButton(1); // Cannon (100 gold)
    await gamePage.clickTile(2, 2);

    expect(await gamePage.getTowersCount()).toBe(1);
    expect((await gamePage.getGameData()).gold).toBe(100);
  });

  test('should toggle tower selection off when clicking selected button again', async () => {
    await gamePage.selectTowerTypeButton(0);
    expect(await gamePage.getSelectedTowerType()).toBe('archer');

    // Click again to toggle off
    await gamePage.selectTowerTypeButton(0);
    expect(await gamePage.getSelectedTowerType()).toBeNull();
  });

  test('should receive periodic income through the economy system', async ({ page }) => {
    const startGold = (await gamePage.getGameData()).gold;
    // Fast forward economy timer by simulating update cycle
    await page.evaluate(() => {
      (window as any).game?.economySystem?.update(10.5);
    });

    const income = await page.evaluate(() => (window as any).game?.economySystem?.getGold?.());
    expect(income).toBeGreaterThanOrEqual(startGold + 10);
  });
});
