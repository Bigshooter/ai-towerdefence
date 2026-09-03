import { test, expect } from '@playwright/test';
import { TowerDefencePage } from '../helpers/game-page';

test.describe('Canvas and UI Rendering', () => {
  let gamePage: TowerDefencePage;

  test.beforeEach(async ({ page }) => {
    gamePage = new TowerDefencePage(page);
    await gamePage.goto();
  });

  test('should render canvas with 1280x960 native dimensions and no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const canvas = page.locator('#game-canvas');
    await expect(canvas).toBeVisible();

    const width = await canvas.getAttribute('width');
    const height = await canvas.getAttribute('height');
    expect(width).toBe('1280');
    expect(height).toBe('960');

    const container = page.locator('#game-container');
    await expect(container).toBeVisible();

    const overlay = page.locator('#ui-overlay');
    await expect(overlay).toBeAttached();

    expect(errors).toHaveLength(0);
  });

  test('should keep canvas responsive to mouse interactions', async ({ page }) => {
    const canvas = page.locator('#game-canvas');
    const boundingBox = await canvas.boundingBox();
    expect(boundingBox).not.toBeNull();
    expect(boundingBox!.width).toBeGreaterThan(0);
    expect(boundingBox!.height).toBeGreaterThan(0);

    // Hover over tile (col 5, row 5 => x: 176, y: 176)
    await canvas.hover({ position: { x: 176, y: 176 } });
    const hoveredTile = await page.evaluate(() => (window as any).uiManager?.getHoveredTile?.());
    expect(hoveredTile).toEqual({ col: 5, row: 5 });
  });
});
