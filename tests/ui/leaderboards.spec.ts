import { test, expect } from '@playwright/test';
import { TowerDefencePage } from '../helpers/game-page';

test.describe('Persisted Map High Scores & Leaderboards', () => {
  let gamePage: TowerDefencePage;

  test.beforeEach(async ({ page }) => {
    gamePage = new TowerDefencePage(page);
    await gamePage.goto();
    await gamePage.clearAllLeaderboards();
  });

  test('HUD leaderboard button opens and closes leaderboard modal', async ({ page }) => {
    expect(await gamePage.isLeaderboardOpen()).toBe(false);

    // Click HUD leaderboard button
    await gamePage.clickLeaderboardHUDButton();
    expect(await gamePage.isLeaderboardOpen()).toBe(true);

    // Switch tabs to Dungeon
    await gamePage.selectLeaderboardTab('dungeon');
    expect(await gamePage.getActiveLeaderboardTab()).toBe('dungeon');

    // Switch tabs to Military
    await gamePage.selectLeaderboardTab('military');
    expect(await gamePage.getActiveLeaderboardTab()).toBe('military');

    // Switch tabs back to Space
    await gamePage.selectLeaderboardTab('space');
    expect(await gamePage.getActiveLeaderboardTab()).toBe('space');

    // Close modal via top-right close
    await gamePage.clickLeaderboardClose();
    expect(await gamePage.isLeaderboardOpen()).toBe(false);

    // Reopen and close with bottom close button
    await gamePage.clickLeaderboardHUDButton();
    expect(await gamePage.isLeaderboardOpen()).toBe(true);
    await gamePage.clickLeaderboardBottomClose();
    expect(await gamePage.isLeaderboardOpen()).toBe(false);
  });

  test('Arcade name entry clamps input to max 6 uppercase alphanumeric characters', async ({ page }) => {
    // Open high score entry modal directly or via game evaluation
    await page.evaluate(() => {
      (window as any).uiManager.openHighScoreEntry(2500, 10, 'medium', 'space');
    });

    expect(await gamePage.isHighScoreEntryOpen()).toBe(true);

    // Type 10 characters: should clamp to 6 and uppercase
    await page.keyboard.type('cyberpunk99');
    expect(await gamePage.getHighScoreInput()).toBe('CYBERP');

    // Press Backspace: should delete last character
    await page.keyboard.press('Backspace');
    expect(await gamePage.getHighScoreInput()).toBe('CYBER');

    // Type '7': should become 'CYBER7'
    await page.keyboard.type('7');
    expect(await gamePage.getHighScoreInput()).toBe('CYBER7');

    // Submit via Enter
    await page.keyboard.press('Enter');

    // High score modal should close, leaderboard modal opens
    expect(await gamePage.isHighScoreEntryOpen()).toBe(false);
    expect(await gamePage.isLeaderboardOpen()).toBe(true);

    // Verify entry in HighScoreSystem
    const spaceScores = await gamePage.getLeaderboardScores('space');
    expect(spaceScores.length).toBe(1);
    expect(spaceScores[0].name).toBe('CYBER7');
    expect(spaceScores[0].score).toBe(2500);
    expect(spaceScores[0].wave).toBe(10);
    expect(spaceScores[0].difficulty).toBe('medium');
    expect(spaceScores[0].mapType).toBe('space');
  });

  test('Per-map leaderboard isolation', async ({ page }) => {
    // Add score to space map
    await page.evaluate(() => {
      (window as any).highScoreSystem.addScore('space', 'ASTRO', 5000, 15, 'hard');
    });

    // Add score to dungeon map
    await page.evaluate(() => {
      (window as any).highScoreSystem.addScore('dungeon', 'KNIGHT', 3200, 12, 'medium');
    });

    // Add score to military map
    await page.evaluate(() => {
      (window as any).highScoreSystem.addScore('military', 'SNIPER', 1800, 8, 'easy');
    });

    const spaceScores = await gamePage.getLeaderboardScores('space');
    const dungeonScores = await gamePage.getLeaderboardScores('dungeon');
    const militaryScores = await gamePage.getLeaderboardScores('military');

    expect(spaceScores.length).toBe(1);
    expect(spaceScores[0].name).toBe('ASTRO');

    expect(dungeonScores.length).toBe(1);
    expect(dungeonScores[0].name).toBe('KNIGHT');

    expect(militaryScores.length).toBe(1);
    expect(militaryScores[0].name).toBe('SNIPER');
  });

  test('Leaderboards persist across browser reloads from localStorage', async ({ page }) => {
    // Add two scores
    await page.evaluate(() => {
      (window as any).highScoreSystem.addScore('space', 'PILOT', 4200, 14, 'medium');
      (window as any).highScoreSystem.addScore('space', 'ROOKIE', 1200, 5, 'easy');
    });

    let scoresBefore = await gamePage.getLeaderboardScores('space');
    expect(scoresBefore.length).toBe(2);

    // Reload browser page
    await page.reload();
    await page.waitForFunction(() => (window as any).highScoreSystem !== undefined);

    let scoresAfter = await gamePage.getLeaderboardScores('space');
    expect(scoresAfter.length).toBe(2);
    expect(scoresAfter[0].name).toBe('PILOT');
    expect(scoresAfter[0].score).toBe(4200);
    expect(scoresAfter[1].name).toBe('ROOKIE');
    expect(scoresAfter[1].score).toBe(1200);
  });

  test('Top 10 truncation and descending score sorting', async ({ page }) => {
    // Insert 12 scores
    await page.evaluate(() => {
      const scores = [100, 500, 300, 1200, 800, 200, 950, 400, 1100, 600, 50, 1500];
      for (let i = 0; i < scores.length; i++) {
        (window as any).highScoreSystem.addScore('space', `P${i + 1}`, scores[i], i + 1, 'easy');
      }
    });

    const spaceScores = await gamePage.getLeaderboardScores('space');
    expect(spaceScores.length).toBe(10);

    // Verify scores are in strict descending order
    for (let i = 0; i < spaceScores.length - 1; i++) {
      expect(spaceScores[i].score).toBeGreaterThanOrEqual(spaceScores[i + 1].score);
    }

    // Top score should be 1500
    expect(spaceScores[0].score).toBe(1500);
    // 10th score should be 200 (scores 50 and 100 were pruned)
    expect(spaceScores[9].score).toBe(200);
  });

  test('Game Over triggers High Score modal for qualifying scores', async ({ page }) => {
    // Start game
    await gamePage.clickStart();
    expect(await gamePage.getGameState()).toBe('playing');

    // Simulate game over with qualifying score
    await page.evaluate(() => {
      const g = (window as any).game;
      g.gameData.score = 750;
      g.gameOver();
    });

    expect(await gamePage.getGameState()).toBe('gameOver');
    expect(await gamePage.isHighScoreEntryOpen()).toBe(true);

    // Type name and click Submit button on canvas
    await gamePage.setHighScoreInput('WINNER');
    await gamePage.clickHighScoreSubmit();

    expect(await gamePage.isHighScoreEntryOpen()).toBe(false);
    expect(await gamePage.isLeaderboardOpen()).toBe(true);

    const scores = await gamePage.getLeaderboardScores('space');
    expect(scores.length).toBe(1);
    expect(scores[0].name).toBe('WINNER');
    expect(scores[0].score).toBe(750);
  });
});
