import { test, expect } from '@playwright/test';
import { TowerDefencePage } from '../helpers/game-page';

test.describe('Tower Selection, Upgrade, and Sell', () => {
  let gamePage: TowerDefencePage;

  test.beforeEach(async ({ page }) => {
    gamePage = new TowerDefencePage(page);
    await gamePage.goto();
    await gamePage.clickStart();
  });

  test('should select placed tower when clicked and deselect on right click', async ({ page }) => {
    // Place Archer tower at col: 2, row: 2
    await gamePage.selectTowerTypeButton(0);
    await gamePage.clickTile(2, 2);

    expect(await gamePage.getTowersCount()).toBe(1);

    // Deselect tower placement mode
    await page.keyboard.press('Escape');

    // Click placed tower to select it
    await gamePage.clickTile(2, 2);
    const selectedId = await gamePage.getSelectedTowerId();
    expect(selectedId).toBeTruthy();

    // Right-click canvas to deselect
    await gamePage.rightClickCanvasAt(100, 100);
    expect(await gamePage.getSelectedTowerId()).toBeNull();
  });

  test('should upgrade a selected tower and update level & gold', async ({ page }) => {
    // Place Archer tower (cost 50, remaining gold 100)
    await gamePage.selectTowerTypeButton(0);
    await gamePage.clickTile(2, 2);

    // Deselect tower placement mode
    await page.keyboard.press('Escape');

    // Select the tower
    await gamePage.clickTile(2, 2);
    expect(await gamePage.getSelectedTowerId()).toBeTruthy();

    const towerInfoBefore = await page.evaluate(() => (window as any).uiManager?.onGetTowerInfo?.());
    expect(towerInfoBefore?.level).toBe(1);
    expect(towerInfoBefore?.canUpgrade).toBe(true);
    const upgradeCost = towerInfoBefore?.upgradeCost ?? 0;
    expect(upgradeCost).toBeGreaterThan(0);

    const goldBefore = (await gamePage.getGameData()).gold;

    // Click Upgrade
    await gamePage.clickUpgradeButton();

    const goldAfter = (await gamePage.getGameData()).gold;
    expect(goldAfter).toBe(goldBefore - upgradeCost);

    const towerInfoAfter = await page.evaluate(() => (window as any).uiManager?.onGetTowerInfo?.());
    expect(towerInfoAfter?.level).toBe(2);
  });

  test('should sell a selected tower, refund gold, and remove tower', async ({ page }) => {
    // Place Archer tower (cost 50, remaining gold 100)
    await gamePage.selectTowerTypeButton(0);
    await gamePage.clickTile(2, 2);

    // Deselect tower placement mode
    await page.keyboard.press('Escape');

    // Select the tower
    await gamePage.clickTile(2, 2);
    const towerInfo = await page.evaluate(() => (window as any).uiManager?.onGetTowerInfo?.());
    const sellValue = towerInfo?.sellValue ?? 0;
    expect(sellValue).toBeGreaterThan(0);

    const goldBeforeSell = (await gamePage.getGameData()).gold;

    // Click Sell
    await gamePage.clickSellButton();

    expect(await gamePage.getTowersCount()).toBe(0);
    expect(await gamePage.getSelectedTowerId()).toBeNull();

    const goldAfterSell = (await gamePage.getGameData()).gold;
    expect(goldAfterSell).toBe(goldBeforeSell + sellValue);
  });
});
