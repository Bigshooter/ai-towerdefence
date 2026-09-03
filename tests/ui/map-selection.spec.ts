import { test, expect } from '@playwright/test';
import { TowerDefencePage } from '../helpers/game-page';

test.describe('Map Selection and Themed Environments', () => {
  let gamePage: TowerDefencePage;

  test.beforeEach(async ({ page }) => {
    gamePage = new TowerDefencePage(page);
    await gamePage.goto();
  });

  test('should default to space map on launch', async () => {
    expect(await gamePage.getSelectedMap()).toBe('space');
    expect(await gamePage.isMapDropdownOpen()).toBe(false);
  });

  test('should open, close, and select different map types', async ({ page }) => {
    // Open Map dropdown
    await gamePage.clickMapDropdown();
    expect(await gamePage.isMapDropdownOpen()).toBe(true);
    expect(await gamePage.isDifficultyDropdownOpen()).toBe(false);

    // Select Dungeon map
    await gamePage.selectMapOption('dungeon');
    expect(await gamePage.getSelectedMap()).toBe('dungeon');
    expect(await gamePage.isMapDropdownOpen()).toBe(false);

    // Reopen and select Military map
    await gamePage.clickMapDropdown();
    expect(await gamePage.isMapDropdownOpen()).toBe(true);
    await gamePage.selectMapOption('military');
    expect(await gamePage.getSelectedMap()).toBe('military');
    expect(await gamePage.isMapDropdownOpen()).toBe(false);

    // Reopen and select Space map
    await gamePage.clickMapDropdown();
    expect(await gamePage.isMapDropdownOpen()).toBe(true);
    await gamePage.selectMapOption('space');
    expect(await gamePage.getSelectedMap()).toBe('space');
    expect(await gamePage.isMapDropdownOpen()).toBe(false);
  });

  test('should close map dropdown when opening difficulty dropdown and vice versa', async () => {
    await gamePage.clickMapDropdown();
    expect(await gamePage.isMapDropdownOpen()).toBe(true);

    // Clicking difficulty dropdown should close map dropdown and open difficulty
    await gamePage.clickDifficultyDropdown();
    expect(await gamePage.isMapDropdownOpen()).toBe(false);
    expect(await gamePage.isDifficultyDropdownOpen()).toBe(true);

    // Clicking map dropdown should close difficulty dropdown and open map
    await gamePage.clickMapDropdown();
    expect(await gamePage.isDifficultyDropdownOpen()).toBe(false);
    expect(await gamePage.isMapDropdownOpen()).toBe(true);
  });

  test('should start game on Dungeon map with unique layout & waypoints', async ({ page }) => {
    await gamePage.clickMapDropdown();
    await gamePage.selectMapOption('dungeon');
    await gamePage.clickStart();

    expect(await gamePage.getGameState()).toBe('playing');

    const activeMap = await page.evaluate(() => (window as any).game?.tileMap?.getMapType?.());
    expect(activeMap).toBe('dungeon');

    // On Dungeon map, start position is at col 0, row 24 (path entrance)
    const startPos = await page.evaluate(() => (window as any).game?.tileMap?.getStartPosition?.());
    expect(startPos.y).toBe(24 * 32 + 16);

    // Tile (0, 24) is path -> not buildable
    await gamePage.selectTowerTypeButton(0);
    await gamePage.clickTile(0, 24);
    expect(await gamePage.getTowersCount()).toBe(0);

    // Tile (2, 2) is wall on dungeon -> not buildable
    await gamePage.clickTile(2, 2);
    expect(await gamePage.getTowersCount()).toBe(0);

    // Tile (10, 2) is grass on dungeon -> buildable
    await gamePage.clickTile(10, 2);
    expect(await gamePage.getTowersCount()).toBe(1);
  });

  test('should start game on Military map with unique layout & waypoints', async ({ page }) => {
    await gamePage.clickMapDropdown();
    await gamePage.selectMapOption('military');
    await gamePage.clickStart();

    expect(await gamePage.getGameState()).toBe('playing');

    const activeMap = await page.evaluate(() => (window as any).game?.tileMap?.getMapType?.());
    expect(activeMap).toBe('military');

    // On Military map, start position is at col 0, row 2 (northern perimeter entrance)
    const startPos = await page.evaluate(() => (window as any).game?.tileMap?.getStartPosition?.());
    expect(startPos.y).toBe(2 * 32 + 16);

    // Tile (0, 2) is path on military -> not buildable
    await gamePage.selectTowerTypeButton(0);
    await gamePage.clickTile(0, 2);
    expect(await gamePage.getTowersCount()).toBe(0);

    // Tile (2, 2) is path on military -> not buildable
    await gamePage.clickTile(2, 2);
    expect(await gamePage.getTowersCount()).toBe(0);

    // Tile (2, 4) is grass on military -> buildable
    await gamePage.clickTile(2, 4);
    expect(await gamePage.getTowersCount()).toBe(1);
  });
});
