import { test, expect } from '@playwright/test';
import { TowerDefencePage } from '../helpers/game-page';

test.describe('Task 31: Multiplayer Real-Time Damage Calculator & Contribution Stats', () => {
  test('should track damage dealt by Player 1 and Player 2 towers accurately', async ({ page }) => {
    const gamePage = new TowerDefencePage(page);
    await gamePage.goto();

    // Start a 2-player coop match
    await page.evaluate(() => {
      (window as any).game.startNewCoopGame('space', 'easy', 'PILOT1', 'PILOT2', true, 12345);
    });

    // Initial damage should be 0, 50/50 split
    expect(await gamePage.getP1TotalDamage()).toBe(0);
    expect(await gamePage.getP2TotalDamage()).toBe(0);
    expect(await gamePage.getP1ContributionPercent()).toBe(50);
    expect(await gamePage.getP2ContributionPercent()).toBe(50);

    // Simulate P1 tower dealing 30 damage and P2 tower dealing 70 damage
    await page.evaluate(() => {
      (window as any).damageCalculator.recordDamage('p1', 30, 'archer');
      (window as any).damageCalculator.recordDamage('p2', 70, 'cannon');
      (window as any).damageCalculator.recordKill('p2');
    });

    expect(await gamePage.getP1TotalDamage()).toBe(30);
    expect(await gamePage.getP2TotalDamage()).toBe(70);
    expect(await gamePage.getP1ContributionPercent()).toBe(30);
    expect(await gamePage.getP2ContributionPercent()).toBe(70);

    const stats = await gamePage.getCombatStats();
    expect(stats.p1.totalDamage).toBe(30);
    expect(stats.p1.damageByTowerType.archer).toBe(30);
    expect(stats.p2.totalDamage).toBe(70);
    expect(stats.p2.damageByTowerType.cannon).toBe(70);
    expect(stats.p2.kills).toBe(1);
  });

  test('should open and close Damage Stats modal using button and hotkey D', async ({ page }) => {
    const gamePage = new TowerDefencePage(page);
    await gamePage.goto();

    await page.evaluate(() => {
      (window as any).game.startNewCoopGame('space', 'easy', 'ALPHA', 'BRAVO', true, 12345);
    });

    expect(await gamePage.isDamageStatsModalOpen()).toBe(false);

    // Open via top HUD STATS button
    await gamePage.clickDamageStatsButton();
    expect(await gamePage.isDamageStatsModalOpen()).toBe(true);

    // Close via bottom close button
    await gamePage.clickDamageStatsClose();
    expect(await gamePage.isDamageStatsModalOpen()).toBe(false);

    // Open via 'd' hotkey
    await page.keyboard.press('d');
    expect(await gamePage.isDamageStatsModalOpen()).toBe(true);

    // Close via Escape key
    await page.keyboard.press('Escape');
    expect(await gamePage.isDamageStatsModalOpen()).toBe(false);
  });

  test('2 Browser Windows in multiplayer should spawn identical mobs across both screens', async ({ browser }) => {
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    const host = new TowerDefencePage(page1);
    const guest = new TowerDefencePage(page2);

    await host.goto({ skipGamertag: false });
    await guest.goto({ skipGamertag: false });

    // Host creates lobby
    await host.setGamertagInput('HOST01');
    await host.clickConfirmGamertag();
    await host.clickPlayCoopCard();
    await host.clickCreateGameButton();
    await host.selectCreateMapOption('dungeon');
    await host.selectCreateDifficultyOption('medium');
    await host.clickCreateLobbyButton();

    expect(await host.getActiveMenuScreen()).toBe('multiplayer_waiting_room');

    // Guest joins lobby
    await guest.setGamertagInput('GUEST1');
    await guest.clickConfirmGamertag();
    await guest.clickPlayCoopCard();
    await guest.clickJoinGameButton();

    await page2.waitForTimeout(400);
    await guest.clickRefreshRoomsButton();
    await page2.waitForTimeout(400);
    await guest.clickJoinFirstRoomButton();

    await expect.poll(async () => await guest.getActiveMenuScreen()).toBe('multiplayer_waiting_room');

    // Both click Ready
    await host.clickToggleReadyButton();
    await guest.clickToggleReadyButton();

    // Both transition to playing
    await expect.poll(async () => await host.getGameState(), { timeout: 8000 }).toBe('playing');
    await expect.poll(async () => await guest.getGameState(), { timeout: 8000 }).toBe('playing');

    // Wait for wave 1 enemies to spawn
    await page1.waitForTimeout(2500);

    // Check enemy lists on both screens
    const hostEnemies = await host.getEnemies();
    const guestEnemies = await guest.getEnemies();

    expect(hostEnemies.length).toBeGreaterThan(0);
    expect(hostEnemies.length).toBe(guestEnemies.length);

    // Verify each spawned enemy has matching type and max HP on both host and guest
    for (let i = 0; i < hostEnemies.length; i++) {
      expect(hostEnemies[i].type).toBe(guestEnemies[i].type);
      expect(hostEnemies[i].maxHp).toBe(guestEnemies[i].maxHp);
    }

    await context.close();
  });
});
