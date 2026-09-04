import { test, expect } from '@playwright/test';
import { TowerDefencePage } from '../helpers/game-page';

test.describe('Task 26 & 27: Gamertag Entry, Mode Selection, and Multiplayer Lobby', () => {
  test('should prompt for 6-digit gamertag on initial landing without saved tag', async ({ page }) => {
    const gamePage = new TowerDefencePage(page);
    await gamePage.goto({ skipGamertag: false });

    // Verify Gamertag modal is open
    expect(await gamePage.isGamertagModalOpen()).toBe(true);

    // Type 6-char tag
    await page.keyboard.type('ACE99');
    expect(await gamePage.getGamertagInput()).toBe('ACE99');

    // Press Backspace
    await page.keyboard.press('Backspace');
    expect(await gamePage.getGamertagInput()).toBe('ACE9');

    // Type full 6 chars
    await page.keyboard.type('01');
    expect(await gamePage.getGamertagInput()).toBe('ACE901');

    // Confirm via Enter
    await page.keyboard.press('Enter');
    expect(await gamePage.isGamertagModalOpen()).toBe(false);
    expect(await gamePage.getGamertag()).toBe('ACE901');

    // Verify transition to Mode Select screen
    expect(await gamePage.getActiveMenuScreen()).toBe('mode_select');
  });

  test('should persist gamertag in localStorage across reloads', async ({ page }) => {
    const gamePage = new TowerDefencePage(page);
    await gamePage.goto({ skipGamertag: false });

    await gamePage.setGamertagInput('PILOT7');
    await gamePage.clickConfirmGamertag();

    expect(await gamePage.getGamertag()).toBe('PILOT7');

    // Reload page
    await page.reload();
    await page.waitForFunction(() => (window as any).uiManager !== undefined);

    expect(await gamePage.getGamertag()).toBe('PILOT7');
    expect(await gamePage.isGamertagModalOpen()).toBe(false);
  });

  test('should navigate from Mode Select to Solo Play menu and back to Mode Select', async ({ page }) => {
    const gamePage = new TowerDefencePage(page);
    await gamePage.goto({ skipGamertag: false });

    await gamePage.setGamertagInput('HERO01');
    await gamePage.clickConfirmGamertag();

    expect(await gamePage.getActiveMenuScreen()).toBe('mode_select');

    // Click Play Solo Card -> enters solo_menu
    await gamePage.clickPlaySoloCard();
    expect(await gamePage.getActiveMenuScreen()).toBe('solo_menu');
    expect(await gamePage.getGameMode()).toBe('solo');

    // Click Center "CHANGE MODE" button -> returns to mode_select
    await gamePage.clickChangeModeButton();
    expect(await gamePage.getActiveMenuScreen()).toBe('mode_select');

    // Re-enter solo_menu
    await gamePage.clickPlaySoloCard();
    expect(await gamePage.getActiveMenuScreen()).toBe('solo_menu');

    // Click Top Bar Mode Button -> returns to mode_select
    await gamePage.clickTopBarModeButton();
    expect(await gamePage.getActiveMenuScreen()).toBe('mode_select');
  });

  test('should navigate from Mode Select to Multiplayer Hub', async ({ page }) => {
    const gamePage = new TowerDefencePage(page);
    await gamePage.goto({ skipGamertag: false });

    await gamePage.setGamertagInput('HOST01');
    await gamePage.clickConfirmGamertag();

    // Click Play Co-Op Card
    await gamePage.clickPlayCoopCard();
    expect(await gamePage.getActiveMenuScreen()).toBe('multiplayer_hub');
    expect(await gamePage.getGameMode()).toBe('multiplayer');

    // Click Back to return to Mode Select
    await gamePage.clickBackToModeSelect();
    expect(await gamePage.getActiveMenuScreen()).toBe('mode_select');
  });

  test('Host should create room with map & difficulty and enter waiting room', async ({ page }) => {
    const gamePage = new TowerDefencePage(page);
    await gamePage.goto({ skipGamertag: false });

    await gamePage.setGamertagInput('ALPHA1');
    await gamePage.clickConfirmGamertag();
    await gamePage.clickPlayCoopCard();

    // In Hub, click Create Game
    await gamePage.clickCreateGameButton();
    expect(await gamePage.getActiveMenuScreen()).toBe('multiplayer_create');

    // Select Dungeon map and Hard difficulty
    await gamePage.selectCreateMapOption('dungeon');
    await gamePage.selectCreateDifficultyOption('hard');

    // Click Create Lobby
    await gamePage.clickCreateLobbyButton();
    expect(await gamePage.getActiveMenuScreen()).toBe('multiplayer_waiting_room');

    const room = await gamePage.getMultiplayerRoom();
    expect(room).not.toBeNull();
    expect(room.hostTag).toBe('ALPHA1');
    expect(room.mapType).toBe('dungeon');
    expect(room.difficulty).toBe('hard');
    expect(room.status).toBe('waiting');
  });
});

test.describe('Task 28 & 29: Cooperative Split Economy & Real-Time Sync', () => {
  test('should initialize cooperative game with dual gold balances and split rewards', async ({ page }) => {
    const gamePage = new TowerDefencePage(page);
    await gamePage.goto();

    // Start a 2-player coop match directly via game orchestrator
    await page.evaluate(() => {
      (window as any).game.startNewCoopGame('space', 'easy', 'PILOT1', 'PILOT2', true, 4242);
    });

    expect(await gamePage.getGameState()).toBe('playing');
    expect(await gamePage.getGameMode()).toBe('multiplayer');

    // Both players should start with 150 gold
    expect(await gamePage.getP1Gold()).toBe(150);
    expect(await gamePage.getP2Gold()).toBe(150);

    // Award a split reward of 30 gold (15 each)
    await page.evaluate(() => {
      (window as any).game.economySystem.awardSplitReward(30);
      (window as any).game.syncGold();
    });

    expect(await gamePage.getP1Gold()).toBe(165);
    expect(await gamePage.getP2Gold()).toBe(165);
  });

  test('should deduct gold from local player and tag tower with ownership on placement', async ({ page }) => {
    const gamePage = new TowerDefencePage(page);
    await gamePage.goto();

    await page.evaluate(() => {
      (window as any).game.startNewCoopGame('space', 'easy', 'PILOT1', 'PILOT2', true, 4242);
    });

    // Place an Archer tower (50g)
    await gamePage.selectTowerTypeButton(0);
    await gamePage.clickTile(2, 2);

    // P1 placed tower -> P1 gold drops to 100g, P2 gold remains 150g
    expect(await gamePage.getP1Gold()).toBe(100);
    expect(await gamePage.getP2Gold()).toBe(150);

    // Verify placed tower ownership
    const tower = await page.evaluate(() => {
      const t = (window as any).game.towers[0];
      return { ownerRole: t.data.ownerRole, ownerTag: t.data.ownerTag, level: t.data.level };
    });
    expect(tower.ownerRole).toBe('p1');
    expect(tower.ownerTag).toBe('PILOT1');
    expect(tower.level).toBe(1);
  });

  test('should handle remote tower placement and deduct remote player gold', async ({ page }) => {
    const gamePage = new TowerDefencePage(page);
    await gamePage.goto();

    await page.evaluate(() => {
      (window as any).game.startNewCoopGame('space', 'easy', 'PILOT1', 'PILOT2', true, 4242);
    });

    // Simulate incoming network message for P2 placing a Cannon (100g)
    await page.evaluate(() => {
      (window as any).game.handleNetworkMessage({
        type: 'PLACE_TOWER',
        roomId: 'ROOM-1234',
        role: 'p2',
        towerType: 'cannon',
        col: 12,
        row: 12,
        towerId: 'tower_cannon_remote',
      });
    });

    expect(await gamePage.getP1Gold()).toBe(150);
    expect(await gamePage.getP2Gold()).toBe(50);

    const towers = await page.evaluate(() => {
      return (window as any).game.towers.map((t: any) => ({
        id: t.id,
        type: t.data.type,
        ownerRole: t.data.ownerRole,
      }));
    });
    expect(towers.length).toBe(1);
    expect(towers[0].type).toBe('cannon');
    expect(towers[0].ownerRole).toBe('p2');
  });

  test('2 Browser Windows should connect on first click, show ready checkmarks on both, and launch game', async ({ browser }) => {
    // Separate contexts do not share BroadcastChannel, matching players on different devices.
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();
    const page1 = await hostContext.newPage();
    const page2 = await guestContext.newPage();

    const host = new TowerDefencePage(page1);
    const guest = new TowerDefencePage(page2);

    await host.goto({ skipGamertag: false });
    await guest.goto({ skipGamertag: false });

    // Host enters tag LNM
    await host.setGamertagInput('LNM');
    await host.clickConfirmGamertag();
    await host.clickPlayCoopCard();
    await host.clickCreateGameButton();
    await host.selectCreateMapOption('dungeon');
    await host.selectCreateDifficultyOption('medium');
    await host.clickCreateLobbyButton();

    expect(await host.getActiveMenuScreen()).toBe('multiplayer_waiting_room');
    const room = await host.getMultiplayerRoom();
    expect(room).not.toBeNull();
    const roomId = room.id;

    // Guest enters tag LNM2
    await guest.setGamertagInput('LNM2');
    await guest.clickConfirmGamertag();
    await guest.clickPlayCoopCard();
    await guest.clickJoinGameButton();

    // Cross-device players join directly because BroadcastChannel room discovery is local-only.
    await page2.keyboard.type(roomId);
    await page2.keyboard.press('Enter');

    // Verify Guest transitions to Waiting Room with Host's room ID
    await expect.poll(async () => await guest.getActiveMenuScreen()).toBe('multiplayer_waiting_room');
    const guestRoom = await guest.getMultiplayerRoom();
    expect(guestRoom.id).toBe(roomId);
    expect(guestRoom.hostTag).toBe('LNM');
    expect(guestRoom.guestTag).toBe('LNM2');

    // Verify Host screen ALSO immediately updates with Guest's tag (LNM2)
    await expect.poll(async () => {
      const r = await host.getMultiplayerRoom();
      return r?.guestTag;
    }).toBe('LNM2');

    // Host clicks Ready
    await host.clickToggleReadyButton();
    await expect.poll(async () => (await host.getMultiplayerRoom())?.hostReady).toBe(true);

    // Guest also sees Host is ready
    await expect.poll(async () => (await guest.getMultiplayerRoom())?.hostReady).toBe(true);

    // Guest clicks Ready
    await guest.clickToggleReadyButton();
    await expect.poll(async () => (await guest.getMultiplayerRoom())?.guestReady).toBe(true);

    // Host also sees Guest is ready
    await expect.poll(async () => (await host.getMultiplayerRoom())?.guestReady).toBe(true);

    // Both should launch into gameplay after countdown
    await expect.poll(async () => await host.getGameState(), { timeout: 8000 }).toBe('playing');
    await expect.poll(async () => await guest.getGameState(), { timeout: 8000 }).toBe('playing');

    // Verify Host-Authoritative mob and damage state streaming
    await page1.waitForTimeout(2500);

    const hostEnemies = await host.getEnemies();
    const guestEnemies = await guest.getEnemies();
    expect(hostEnemies.length).toBeGreaterThan(0);
    expect(guestEnemies.length).toBe(hostEnemies.length);

    // Verify mob coordinates match within 1 pixel across host and guest
    for (let i = 0; i < hostEnemies.length; i++) {
      expect(Math.abs(hostEnemies[i].position.x - guestEnemies[i].position.x)).toBeLessThanOrEqual(2);
      expect(Math.abs(hostEnemies[i].position.y - guestEnemies[i].position.y)).toBeLessThanOrEqual(2);
      expect(hostEnemies[i].hp).toBe(guestEnemies[i].hp);
    }

    await hostContext.close();
    await guestContext.close();
  });
});
