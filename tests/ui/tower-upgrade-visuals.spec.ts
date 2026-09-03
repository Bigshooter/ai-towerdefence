import { test, expect } from '@playwright/test';
import { TowerDefencePage } from '../helpers/game-page';

test.describe('Tower Upgrade Visual Evolution', () => {
  let gamePage: TowerDefencePage;

  test.beforeEach(async ({ page }) => {
    gamePage = new TowerDefencePage(page);
    await gamePage.goto();
    await gamePage.clickStart();
  });

  test('should create tier 1 sprite cache key when tower is placed at level 1', async ({ page }) => {
    // Place Archer tower (index 0)
    await gamePage.selectTowerTypeButton(0);
    await gamePage.clickTile(2, 2);

    // Give a small moment for render pass
    await page.waitForTimeout(200);

    const cacheKeys = await gamePage.getTowerCacheKeys();
    const hasArcherTier1 = cacheKeys.some(k => k.startsWith('archer:t1:'));
    expect(hasArcherTier1).toBe(true);
  });

  test('should evolve sprite cache keys to tier 2 and tier 3 as tower is upgraded', async ({ page }) => {
    // Give player plenty of gold for multiple upgrades
    await page.evaluate(() => {
      (window as any).gameData.gold = 5000;
    });

    // Place Archer tower
    await gamePage.selectTowerTypeButton(0);
    await gamePage.clickTile(2, 2);

    // Deselect placement mode and select placed tower
    await page.keyboard.press('Escape');
    await gamePage.clickTile(2, 2);

    // Verify initial level 1
    let towerInfo = await page.evaluate(() => (window as any).uiManager?.onGetTowerInfo?.());
    expect(towerInfo?.level).toBe(1);

    // Upgrade to Level 2 (Tier 2 transition)
    await page.evaluate(() => {
      (window as any).game?.economySystem?.setGold?.(5000);
      (window as any).game?.upgradeSelectedTower?.();
    });
    await page.waitForTimeout(100);

    towerInfo = await page.evaluate(() => (window as any).uiManager?.onGetTowerInfo?.());
    expect(towerInfo?.level).toBe(2);

    let cacheKeys = await gamePage.getTowerCacheKeys();
    const hasArcherTier2 = cacheKeys.some(k => k.startsWith('archer:t2:'));
    expect(hasArcherTier2).toBe(true);

    // Upgrade to Level 3 (Still Tier 2)
    await page.evaluate(() => {
      (window as any).game?.economySystem?.setGold?.(5000);
      (window as any).game?.upgradeSelectedTower?.();
    });
    await page.waitForTimeout(100);

    towerInfo = await page.evaluate(() => (window as any).uiManager?.onGetTowerInfo?.());
    expect(towerInfo?.level).toBe(3);

    // Upgrade to Level 4 (Tier 3 transition)
    await page.evaluate(() => {
      (window as any).game?.economySystem?.setGold?.(5000);
      (window as any).game?.upgradeSelectedTower?.();
    });
    await page.waitForTimeout(100);

    towerInfo = await page.evaluate(() => (window as any).uiManager?.onGetTowerInfo?.());
    expect(towerInfo?.level).toBe(4);

    cacheKeys = await gamePage.getTowerCacheKeys();
    const hasArcherTier3 = cacheKeys.some(k => k.startsWith('archer:t3:'));
    expect(hasArcherTier3).toBe(true);
  });

  test('should generate distinct tier sprites across different tower archetypes', async ({ page }) => {
    // Give player plenty of gold
    await page.evaluate(() => {
      (window as any).gameData.gold = 10000;
    });

    // Place Cannon (index 1) at (2, 2) and Sniper (index 2) at (4, 2)
    await gamePage.selectTowerTypeButton(1);
    await gamePage.clickTile(2, 2);
    await page.keyboard.press('Escape');

    await gamePage.selectTowerTypeButton(2);
    await gamePage.clickTile(4, 2);
    await page.keyboard.press('Escape');

    // Upgrade Cannon to Level 4 (Tier 3)
    await gamePage.clickTile(2, 2);
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        (window as any).game?.economySystem?.setGold?.(10000);
        (window as any).game?.upgradeSelectedTower?.();
      });
      await page.waitForTimeout(50);
    }

    // Right-click deselect
    await gamePage.rightClickCanvasAt(100, 100);

    // Sniper remains Level 1 (Tier 1)
    await page.waitForTimeout(200);

    const cacheKeys = await gamePage.getTowerCacheKeys();
    expect(cacheKeys.some(k => k.startsWith('cannon:t3:'))).toBe(true);
    expect(cacheKeys.some(k => k.startsWith('sniper:t1:'))).toBe(true);
  });
});
