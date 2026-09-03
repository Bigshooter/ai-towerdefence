import { EnemyType, MapType, ProjectileType, TowerType } from '../types';
import { TileType } from '../map/TileMap';

export class SpaceSprites {
  private static tileCache = new Map<string, HTMLCanvasElement>();
  private static enemyCache = new Map<string, HTMLCanvasElement>();
  private static towerCache = new Map<string, HTMLCanvasElement>();
  private static projectileCache = new Map<string, HTMLCanvasElement>();
  private static starfield: HTMLCanvasElement | null = null;
  private static dungeonBackdrop: HTMLCanvasElement | null = null;
  private static militaryBackdrop: HTMLCanvasElement | null = null;

  static getTowerCacheKeys(): string[] {
    return Array.from(this.towerCache.keys());
  }

  static getProjectileCacheKeys(): string[] {
    return Array.from(this.projectileCache.keys());
  }

  static drawBackdrop(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number,
    mapType: MapType = 'space',
  ): void {
    let backdropCanvas: HTMLCanvasElement;
    let speedX = 4;
    let speedY = 2;

    if (mapType === 'dungeon') {
      if (!this.dungeonBackdrop) this.dungeonBackdrop = this.createDungeonBackdrop();
      backdropCanvas = this.dungeonBackdrop;
      speedX = 0.5;
      speedY = 0.2;
    } else if (mapType === 'military') {
      if (!this.militaryBackdrop) this.militaryBackdrop = this.createMilitaryBackdrop();
      backdropCanvas = this.militaryBackdrop;
      speedX = 1;
      speedY = 0.5;
    } else {
      if (!this.starfield) this.starfield = this.createStarfield();
      backdropCanvas = this.starfield;
    }

    const pattern = ctx.createPattern(backdropCanvas, 'repeat');
    if (!pattern) return;

    const offsetX = (time * speedX) % backdropCanvas.width;
    const offsetY = (time * speedY) % backdropCanvas.height;

    ctx.save();
    ctx.translate(-offsetX, -offsetY);
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width + backdropCanvas.width, height + backdropCanvas.height);
    ctx.restore();
  }

  static drawTile(
    ctx: CanvasRenderingContext2D,
    type: TileType,
    x: number,
    y: number,
    size: number,
    variant: number,
    connectionMask: number = 0,
    mapType: MapType = 'space',
  ): void {
    const key = `${mapType}:${type}:${variant}:${connectionMask}`;
    let sprite = this.tileCache.get(key);
    if (!sprite) {
      sprite = this.createTileSprite(type, variant, connectionMask, mapType);
      this.tileCache.set(key, sprite);
    }

    ctx.drawImage(sprite, x, y, size, size);
  }

  static drawEnemy(
    ctx: CanvasRenderingContext2D,
    type: EnemyType,
    x: number,
    y: number,
    size: number,
    frame: number,
    time: number,
  ): void {
    const key = `${type}:${size}:${frame}`;
    let sprite = this.enemyCache.get(key);
    if (!sprite) {
      sprite = this.createEnemySprite(type, size, frame);
      this.enemyCache.set(key, sprite);
    }

    ctx.drawImage(sprite, x, y, size, size);

    // A subtle engine glow under moving units sells the sci-fi look.
    if (type === 'speed' || type === 'boss') {
      const glow = 0.16 + Math.sin(time * 8) * 0.05;
      ctx.fillStyle = `rgba(88, 234, 255, ${glow.toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(x + size / 2, y + size + 2, size * 0.35, size * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  static drawTower(
    ctx: CanvasRenderingContext2D,
    type: TowerType,
    x: number,
    y: number,
    size: number,
    frame: number,
    hasTarget: boolean,
    time: number,
    level: number = 1,
  ): void {
    const tier = level >= 4 ? 3 : level >= 2 ? 2 : 1;
    const key = `${type}:t${tier}:${size}:${frame}:${hasTarget ? 1 : 0}`;
    let sprite = this.towerCache.get(key);
    if (!sprite) {
      sprite = this.createTowerSprite(type, size, frame, hasTarget, tier);
      this.towerCache.set(key, sprite);
    }

    ctx.drawImage(sprite, x, y, size, size);

    // Pedestal Level Pips
    const pipColor = level >= 4 ? '#FFD700' : level >= 2 ? '#58EAFF' : '#7D9BB8';
    const totalPips = Math.min(5, Math.max(1, level));
    const pipStartX = x + size / 2 - ((totalPips - 1) * 4) / 2;
    ctx.fillStyle = pipColor;
    for (let i = 0; i < totalPips; i++) {
      ctx.fillRect(pipStartX + i * 4 - 1, y + size - 4, 2, 2);
    }

    // Dynamic Real-Time Archetype Overlays
    if (type === 'archer') {
      if (hasTarget) {
        const sparkAlpha = tier === 3 ? 0.6 + Math.sin(time * 30) * 0.3 : tier === 2 ? 0.45 : 0.3;
        ctx.fillStyle = `rgba(113, 239, 149, ${sparkAlpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x + size * 0.75, y + size * 0.22, tier === 3 ? 3.5 : 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      if (tier === 3) {
        const pulse = 0.2 + Math.sin(time * 8) * 0.1;
        ctx.fillStyle = `rgba(0, 255, 120, ${pulse.toFixed(3)})`;
        ctx.fillRect(x + 10, y + 11, 12, 5);
      }
    }

    if (type === 'cannon') {
      if (hasTarget) {
        const alpha = 0.35 + Math.sin(time * 16) * 0.15;
        ctx.fillStyle = `rgba(255, 177, 101, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x + size * 0.88, y + size * 0.36, tier === 3 ? 4.5 : tier === 2 ? 3.5 : 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      if (tier >= 2) {
        const ventGlow = 0.25 + Math.sin(time * 6) * 0.15;
        ctx.fillStyle = `rgba(255, 110, 30, ${ventGlow.toFixed(3)})`;
        ctx.fillRect(x + 10, y + 13, 12, tier === 3 ? 4 : 2);
      }
    }

    if (type === 'sniper') {
      if (tier === 1) {
        const alpha = hasTarget ? 0.35 : 0.18;
        const radius = size * (0.2 + Math.sin(time * 5) * 0.03);
        ctx.fillStyle = `rgba(120, 242, 255, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size * 0.28, radius, 0, Math.PI * 2);
        ctx.fill();
      } else if (tier === 2) {
        const alpha = hasTarget ? 0.5 : 0.25;
        ctx.strokeStyle = `rgba(88, 234, 255, ${alpha.toFixed(3)})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size * 0.38, 6 + Math.sin(time * 4) * 1, 0, Math.PI * 2);
        ctx.stroke();
        if (hasTarget) {
          ctx.fillStyle = '#C8FAFF';
          ctx.fillRect(x + size / 2 - 1, y + size * 0.38 - 1, 2, 2);
        }
      } else {
        const ringRot = time * 2;
        ctx.save();
        ctx.translate(x + size / 2, y + size * 0.4);
        ctx.rotate(ringRot);
        ctx.strokeStyle = 'rgba(136, 244, 255, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-6, -6, 12, 12);
        ctx.restore();

        const halo = 0.3 + Math.sin(time * 8) * 0.15;
        ctx.fillStyle = `rgba(200, 250, 255, ${halo.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size * 0.2, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (type === 'ice') {
      const shardCount = tier === 3 ? 4 : tier === 2 ? 2 : 0;
      if (shardCount > 0) {
        const orbitRadius = size * 0.36;
        for (let i = 0; i < shardCount; i++) {
          const angle = time * 2.5 + (i * (Math.PI * 2 / shardCount));
          const sx = x + size / 2 + Math.cos(angle) * orbitRadius;
          const sy = y + size * 0.45 + Math.sin(angle) * (orbitRadius * 0.45);
          ctx.fillStyle = '#DFF7FF';
          ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
        }
      }
      if (tier === 3) {
        const fog = 0.15 + Math.sin(time * 4) * 0.08;
        ctx.fillStyle = `rgba(160, 230, 255, ${fog.toFixed(3)})`;
        ctx.beginPath();
        ctx.ellipse(x + size / 2, y + size - 5, size * 0.38, size * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (type === 'flamethrower') {
      if (tier === 1 && hasTarget) {
        const alpha = 0.2 + Math.sin(time * 14) * 0.08;
        ctx.fillStyle = `rgba(255, 146, 76, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x + size * 0.76, y + size * 0.4, size * 0.22, 0, Math.PI * 2);
        ctx.fill();
      } else if (tier === 2) {
        const flicker = hasTarget ? 0.35 + Math.sin(time * 18) * 0.12 : 0.18;
        ctx.fillStyle = `rgba(255, 130, 40, ${flicker.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x + size * 0.8, y + size * 0.3, 3.5, 0, Math.PI * 2);
        ctx.arc(x + size * 0.8, y + size * 0.48, 3.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (tier === 3) {
        const heat = 0.25 + Math.sin(time * 10) * 0.1;
        ctx.fillStyle = `rgba(255, 70, 0, ${heat.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x + size * 0.5, y + size * 0.45, size * 0.3, 0, Math.PI * 2);
        ctx.fill();
        if (hasTarget) {
          const plasma = 0.5 + Math.sin(time * 25) * 0.2;
          ctx.fillStyle = `rgba(255, 230, 150, ${plasma.toFixed(3)})`;
          ctx.fillRect(x + size * 0.78, y + size * 0.25, 8, 8);
        }
      }
    }
  }

  static drawProjectile(
    ctx: CanvasRenderingContext2D,
    type: ProjectileType,
    x: number,
    y: number,
    dirX: number,
    dirY: number,
    time: number,
    level: number = 1,
  ): void {
    const angle = Math.atan2(dirY, dirX);
    const tier = level >= 4 ? 3 : level >= 2 ? 2 : 1;
    const key = `${type}:t${tier}:16`;

    let sprite = this.projectileCache.get(key);
    if (!sprite) {
      sprite = this.createProjectileSprite(type, 16, tier);
      this.projectileCache.set(key, sprite);
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    if (type === 'laser') {
      const basePulse = 0.4 + Math.sin(time * 25) * 0.2;
      if (tier === 1) {
        ctx.fillStyle = `rgba(130, 232, 255, ${basePulse.toFixed(3)})`;
        ctx.fillRect(-16, -3, 18, 6);
        ctx.fillStyle = '#E6FCFF';
        ctx.fillRect(-14, -1, 14, 2);
      } else if (tier === 2) {
        ctx.fillStyle = `rgba(88, 234, 255, ${(basePulse + 0.2).toFixed(3)})`;
        ctx.fillRect(-18, -4, 22, 8);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-16, -1.5, 18, 3);
      } else {
        ctx.fillStyle = `rgba(180, 245, 255, 0.85)`;
        ctx.fillRect(-22, -6, 28, 12);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-20, -2, 24, 4);
        ctx.strokeStyle = 'rgba(100, 230, 255, 0.7)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-18, -7, 10, 14);
      }
    } else {
      ctx.drawImage(sprite, -8, -8, 16, 16);
    }

    ctx.restore();
  }

  private static createStarfield(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const g = c.getContext('2d')!;

    const bg = g.createLinearGradient(0, 0, 512, 512);
    bg.addColorStop(0, '#050915');
    bg.addColorStop(0.4, '#0A1022');
    bg.addColorStop(1, '#081427');
    g.fillStyle = bg;
    g.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 8; i++) {
      const cx = (i * 79) % 512;
      const cy = (i * 137) % 512;
      const nebula = g.createRadialGradient(cx, cy, 6, cx, cy, 130);
      nebula.addColorStop(0, i % 2 === 0 ? 'rgba(66, 173, 255, 0.20)' : 'rgba(255, 114, 197, 0.18)');
      nebula.addColorStop(1, 'rgba(0, 0, 0, 0)');
      g.fillStyle = nebula;
      g.fillRect(cx - 130, cy - 130, 260, 260);
    }

    for (let i = 0; i < 220; i++) {
      const x = (i * 97 + 31) % 512;
      const y = (i * 67 + 13) % 512;
      const r = (i % 9 === 0) ? 1.6 : (i % 5 === 0 ? 1.1 : 0.7);
      g.fillStyle = i % 7 === 0 ? '#B5F4FF' : '#EAF2FF';
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }

    return c;
  }

  private static createDungeonBackdrop(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const g = c.getContext('2d')!;

    const bg = g.createLinearGradient(0, 0, 512, 512);
    bg.addColorStop(0, '#0E0B12');
    bg.addColorStop(0.5, '#16121C');
    bg.addColorStop(1, '#1A1422');
    g.fillStyle = bg;
    g.fillRect(0, 0, 512, 512);

    // Stone flagstone grid
    g.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    g.lineWidth = 1;
    for (let x = 0; x < 512; x += 64) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, 512);
      g.stroke();
    }
    for (let y = 0; y < 512; y += 64) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(512, y);
      g.stroke();
    }

    // Warm ambient torch light pools
    for (let i = 0; i < 6; i++) {
      const cx = (i * 97 + 45) % 512;
      const cy = (i * 123 + 60) % 512;
      const torch = g.createRadialGradient(cx, cy, 4, cx, cy, 90);
      torch.addColorStop(0, 'rgba(255, 140, 40, 0.12)');
      torch.addColorStop(0.5, 'rgba(255, 70, 10, 0.05)');
      torch.addColorStop(1, 'rgba(0, 0, 0, 0)');
      g.fillStyle = torch;
      g.fillRect(cx - 90, cy - 90, 180, 180);
    }

    return c;
  }

  private static createMilitaryBackdrop(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const g = c.getContext('2d')!;

    const bg = g.createLinearGradient(0, 0, 512, 512);
    bg.addColorStop(0, '#1E1911');
    bg.addColorStop(0.5, '#282117');
    bg.addColorStop(1, '#2E271C');
    g.fillStyle = bg;
    g.fillRect(0, 0, 512, 512);

    // Tactical coordinate grid
    g.strokeStyle = 'rgba(255, 220, 150, 0.04)';
    g.lineWidth = 1;
    for (let x = 0; x < 512; x += 64) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, 512);
      g.stroke();
    }
    for (let y = 0; y < 512; y += 64) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(512, y);
      g.stroke();
    }

    // Sand drift & dust patches
    for (let i = 0; i < 12; i++) {
      const cx = (i * 73 + 20) % 512;
      const cy = (i * 109 + 35) % 512;
      g.fillStyle = i % 2 === 0 ? 'rgba(180, 150, 100, 0.05)' : 'rgba(120, 100, 70, 0.06)';
      g.beginPath();
      g.ellipse(cx, cy, 40, 20, (i * 0.4), 0, Math.PI * 2);
      g.fill();
    }

    return c;
  }

  private static createTileSprite(type: TileType, variant: number, connectionMask: number, mapType: MapType = 'space'): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 32;
    const g = c.getContext('2d')!;

    const up = (connectionMask & 1) !== 0;
    const right = (connectionMask & 2) !== 0;
    const down = (connectionMask & 4) !== 0;
    const left = (connectionMask & 8) !== 0;
    let hasHorizontal = left || right;
    let hasVertical = up || down;
    if (!hasHorizontal && !hasVertical) {
      hasHorizontal = true;
    }

    if (mapType === 'dungeon') {
      const stonePanel = (base: string, edge: string) => {
        g.fillStyle = base;
        g.fillRect(0, 0, 32, 32);
        g.strokeStyle = edge;
        g.lineWidth = 2;
        g.strokeRect(1, 1, 30, 30);
        g.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        g.strokeRect(3, 3, 26, 26);
      };

      switch (type) {
        case 'grass': {
          stonePanel('#1A1622', '#2D2638');
          // Cracked stone accents
          g.strokeStyle = '#3E344E';
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(6 + (variant % 3) * 3, 8);
          g.lineTo(14, 16);
          g.lineTo(24 - (variant % 2) * 4, 18);
          g.stroke();

          // Moss specks
          g.fillStyle = 'rgba(74, 120, 74, 0.4)';
          g.fillRect(4 + (variant * 5) % 20, 20 + (variant * 3) % 8, 3, 2);
          g.fillRect(20 - (variant * 4) % 12, 6 + (variant * 7) % 10, 2, 3);
          break;
        }
        case 'path': {
          stonePanel('#2A2234', '#483B56');

          g.fillStyle = '#3D324A';
          if (hasHorizontal) {
            const startX = left ? 0 : 16;
            const endX = right ? 32 : 16;
            g.fillRect(startX, 8, endX - startX, 16);
          }
          if (hasVertical) {
            const startY = up ? 0 : 16;
            const endY = down ? 32 : 16;
            g.fillRect(8, startY, 16, endY - startY);
          }

          // Cobblestone stones
          g.fillStyle = '#C29B38';
          if (hasHorizontal) {
            const startX = (left ? 0 : 16) + 2;
            const endX = (right ? 32 : 16) - 2;
            g.fillRect(startX, 15, Math.max(2, endX - startX), 2);
          }
          if (hasVertical) {
            const startY = (up ? 0 : 16) + 2;
            const endY = (down ? 32 : 16) - 2;
            g.fillRect(15, startY, 2, Math.max(2, endY - startY));
          }
          break;
        }
        case 'wall': {
          stonePanel('#100C16', '#352A42');
          // Brick column pattern with iron rivets
          g.fillStyle = '#221B2C';
          g.fillRect(4, 4, 24, 10);
          g.fillRect(4, 18, 24, 10);
          g.strokeStyle = '#5A4A6E';
          g.lineWidth = 1;
          g.strokeRect(4, 4, 24, 10);
          g.strokeRect(4, 18, 24, 10);
          g.fillStyle = '#B8A2D4';
          g.fillRect(6, 8, 2, 2);
          g.fillRect(24, 8, 2, 2);
          g.fillRect(6, 22, 2, 2);
          g.fillRect(24, 22, 2, 2);
          break;
        }
        case 'water': {
          // Molten lava pool
          stonePanel('#2A0A04', '#551508');
          g.fillStyle = '#7A1C0A';
          g.beginPath();
          g.arc(16, 16, 12, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = '#FF5500';
          g.beginPath();
          g.arc(16, 16, 8, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = '#FFAA00';
          g.beginPath();
          g.arc(14, 14, 4, 0, Math.PI * 2);
          g.fill();
          break;
        }
        case 'tree': {
          // Torch braziers / crypt pillars
          stonePanel('#14101B', '#332742');
          g.fillStyle = '#3E324E';
          g.fillRect(10, 12, 12, 16);
          g.fillStyle = '#65527E';
          g.fillRect(8, 10, 16, 4);

          // Flame head
          g.fillStyle = '#FF8800';
          g.beginPath();
          g.arc(16, 8, 5, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = '#FFEE55';
          g.beginPath();
          g.arc(16, 7, 2.5, 0, Math.PI * 2);
          g.fill();
          break;
        }
        case 'road_edge': {
          stonePanel('#221B2C', '#3F3350');
          break;
        }
      }
      return c;
    }

    if (mapType === 'military') {
      const desertPanel = (base: string, edge: string) => {
        g.fillStyle = base;
        g.fillRect(0, 0, 32, 32);
        g.strokeStyle = edge;
        g.lineWidth = 2;
        g.strokeRect(1, 1, 30, 30);
        g.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        g.strokeRect(3, 3, 26, 26);
      };

      switch (type) {
        case 'grass': {
          desertPanel('#2C2419', '#463B2A');
          // Sand texture & pebbles
          g.fillStyle = 'rgba(200, 170, 120, 0.15)';
          g.beginPath();
          g.ellipse(8 + (variant % 3) * 4, 10, 6, 3, 0.2, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = '#5A4B35';
          g.fillRect(6 + (variant * 7) % 20, 20 + (variant * 5) % 8, 2, 2);
          g.fillRect(22 - (variant * 3) % 10, 14 + (variant * 9) % 12, 2, 2);
          break;
        }
        case 'path': {
          desertPanel('#262B30', '#3E454C');

          g.fillStyle = '#353C44';
          if (hasHorizontal) {
            const startX = left ? 0 : 16;
            const endX = right ? 32 : 16;
            g.fillRect(startX, 8, endX - startX, 16);
          }
          if (hasVertical) {
            const startY = up ? 0 : 16;
            const endY = down ? 32 : 16;
            g.fillRect(8, startY, 16, endY - startY);
          }

          // Dashed road line
          g.fillStyle = '#E5C058';
          if (hasHorizontal) {
            const startX = (left ? 0 : 16) + 3;
            const endX = (right ? 32 : 16) - 3;
            g.fillRect(startX, 15, Math.max(2, endX - startX), 2);
          }
          if (hasVertical) {
            const startY = (up ? 0 : 16) + 3;
            const endY = (down ? 32 : 16) - 3;
            g.fillRect(15, startY, 2, Math.max(2, endY - startY));
          }
          break;
        }
        case 'wall': {
          // Sandbags barricade
          desertPanel('#282D20', '#4A5239');
          g.fillStyle = '#555C3E';
          g.fillRect(4, 6, 11, 8);
          g.fillRect(17, 6, 11, 8);
          g.fillRect(10, 16, 12, 8);
          g.strokeStyle = '#2D321F';
          g.lineWidth = 1;
          g.strokeRect(4, 6, 11, 8);
          g.strokeRect(17, 6, 11, 8);
          g.strokeRect(10, 16, 12, 8);
          break;
        }
        case 'water': {
          // Muddy trench
          desertPanel('#1F261D', '#323D2E');
          g.fillStyle = '#2A3528';
          g.fillRect(4, 4, 24, 24);
          // Wooden trench planks
          g.fillStyle = '#4E3A26';
          g.fillRect(6, 8, 20, 3);
          g.fillRect(6, 15, 20, 3);
          g.fillRect(6, 22, 20, 3);
          break;
        }
        case 'tree': {
          // Camo outpost tower / radio dish
          desertPanel('#262D1F', '#444F38');
          g.fillStyle = '#3E4933';
          g.fillRect(12, 10, 8, 18);
          g.fillStyle = '#6E7D5C';
          g.beginPath();
          g.arc(16, 10, 7, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = '#A8B993';
          g.fillRect(15, 2, 2, 6);
          break;
        }
        case 'road_edge': {
          desertPanel('#2A3036', '#424B54');
          break;
        }
      }
      return c;
    }

    // Default: Space Theme
    const panel = (base: string, edge: string) => {
      g.fillStyle = base;
      g.fillRect(0, 0, 32, 32);
      g.strokeStyle = edge;
      g.lineWidth = 2;
      g.strokeRect(1, 1, 30, 30);
      g.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      g.strokeRect(3, 3, 26, 26);
      g.fillStyle = 'rgba(120, 220, 255, 0.22)';
      g.fillRect(4, 4, 2, 2);
      g.fillRect(26, 24, 2, 2);
    };

    switch (type) {
      case 'grass': {
        panel('#070C1B', '#1B2D4A');
        g.fillStyle = 'rgba(120, 176, 255, 0.12)';
        g.beginPath();
        g.ellipse(6 + (variant % 3) * 4, 7 + (variant % 2) * 3, 8, 5, 0, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(24 - (variant % 4) * 2, 22, 9, 6, 0, 0, Math.PI * 2);
        g.fill();

        for (let i = 0; i < 7; i++) {
          const sx = (variant * 13 + i * 11) % 26 + 3;
          const sy = (variant * 5 + i * 7) % 26 + 3;
          const s = i % 3 === 0 ? 2 : 1;
          g.fillStyle = i % 4 === 0 ? '#BFE9FF' : '#E7F3FF';
          g.fillRect(sx, sy, s, s);
        }
        break;
      }
      case 'path': {
        panel('#172D43', '#31557A');

        g.fillStyle = '#2C567C';
        if (hasHorizontal) {
          const startX = left ? 0 : 16;
          const endX = right ? 32 : 16;
          g.fillRect(startX, 10, endX - startX, 12);
        }
        if (hasVertical) {
          const startY = up ? 0 : 16;
          const endY = down ? 32 : 16;
          g.fillRect(10, startY, 12, endY - startY);
        }

        g.fillStyle = '#58EAFF';
        if (hasHorizontal) {
          const startX = (left ? 0 : 16) + 2;
          const endX = (right ? 32 : 16) - 2;
          g.fillRect(startX, 15, Math.max(2, endX - startX), 2);
        }
        if (hasVertical) {
          const startY = (up ? 0 : 16) + 2;
          const endY = (down ? 32 : 16) - 2;
          g.fillRect(15, startY, 2, Math.max(2, endY - startY));
        }

        if (variant % 2 === 0) {
          g.fillRect(6, 12, 4, 1);
          g.fillRect(22, 18, 4, 1);
        }
        break;
      }
      case 'wall': {
        panel('#0A1020', '#263756');
        for (let i = 0; i < 9; i++) {
          const sx = (variant * 9 + i * 7) % 24 + 4;
          const sy = (variant * 11 + i * 5) % 24 + 4;
          const r = i % 3 === 0 ? 1.8 : 1.1;
          g.fillStyle = i % 2 === 0 ? '#FFF5C4' : '#DFF1FF';
          g.beginPath();
          g.arc(sx, sy, r, 0, Math.PI * 2);
          g.fill();

          if (i % 3 === 0) {
            g.strokeStyle = 'rgba(255, 248, 186, 0.7)';
            g.lineWidth = 1;
            g.beginPath();
            g.moveTo(sx - 3, sy);
            g.lineTo(sx + 3, sy);
            g.moveTo(sx, sy - 3);
            g.lineTo(sx, sy + 3);
            g.stroke();
          }
        }
        break;
      }
      case 'water': {
        panel('#0B1222', '#243A5A');
        for (let i = 0; i < 3; i++) {
          const mx = (variant * 8 + i * 10) % 22 + 5;
          const my = (variant * 5 + i * 9) % 22 + 5;
          const rot = ((variant + i) % 6) * 0.4;

          g.save();
          g.translate(mx, my);
          g.rotate(rot);

          g.fillStyle = '#6C7487';
          g.beginPath();
          g.moveTo(-4, -3);
          g.lineTo(3, -5);
          g.lineTo(6, 0);
          g.lineTo(2, 5);
          g.lineTo(-5, 3);
          g.closePath();
          g.fill();

          g.fillStyle = '#9AA3B7';
          g.fillRect(-1, -1, 3, 2);

          g.strokeStyle = 'rgba(255, 169, 102, 0.45)';
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(-9, 0);
          g.lineTo(-5, 0);
          g.stroke();

          g.restore();
        }
        break;
      }
      case 'tree': {
        panel('#0B1224', '#2A3E62');

        const moonX = 16 + (variant % 3) - 1;
        const moonY = 15 + (variant % 2) - 1;
        g.fillStyle = 'rgba(182, 212, 255, 0.25)';
        g.beginPath();
        g.arc(moonX, moonY, 11, 0, Math.PI * 2);
        g.fill();

        g.fillStyle = '#C9D6EA';
        g.beginPath();
        g.arc(moonX, moonY, 9, 0, Math.PI * 2);
        g.fill();

        g.fillStyle = '#A7B4CA';
        g.beginPath();
        g.arc(moonX - 3, moonY - 2, 2.2, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(moonX + 3, moonY + 2, 1.8, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(moonX + 1, moonY - 4, 1.3, 0, Math.PI * 2);
        g.fill();
        break;
      }
      case 'road_edge': {
        panel('#142A40', '#2E4B69');

        g.fillStyle = '#2D5D88';
        if (hasHorizontal) {
          const startX = left ? 0 : 16;
          const endX = right ? 32 : 16;
          g.fillRect(startX, 11, endX - startX, 10);
        }
        if (hasVertical) {
          const startY = up ? 0 : 16;
          const endY = down ? 32 : 16;
          g.fillRect(11, startY, 10, endY - startY);
        }

        g.fillStyle = '#58EAFF';
        if (hasHorizontal) {
          const startX = (left ? 0 : 16) + 3;
          const endX = (right ? 32 : 16) - 3;
          g.fillRect(startX, 15, Math.max(2, endX - startX), 2);
        }
        if (hasVertical) {
          const startY = (up ? 0 : 16) + 3;
          const endY = (down ? 32 : 16) - 3;
          g.fillRect(15, startY, 2, Math.max(2, endY - startY));
        }

        g.fillStyle = '#152A40';
        if (hasVertical && !hasHorizontal) {
          if (variant % 2 === 0) {
            g.fillRect(0, 0, 32, 9);
          } else {
            g.fillRect(0, 23, 32, 9);
          }
        } else {
          if (variant % 2 === 0) {
            g.fillRect(0, 0, 9, 32);
          } else {
            g.fillRect(23, 0, 9, 32);
          }
        }
        break;
      }
    }

    return c;
  }

  private static createEnemySprite(type: EnemyType, size: number, frame: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const g = c.getContext('2d')!;

    const cx = size / 2;
    const cy = size / 2;

    switch (type) {
      case 'normal':
        g.fillStyle = '#44D7FF';
        g.beginPath();
        g.moveTo(8, 5);
        g.lineTo(size - 8, 5);
        g.quadraticCurveTo(size - 3, 5, size - 3, 10);
        g.lineTo(size - 3, size - 10);
        g.quadraticCurveTo(size - 3, size - 5, size - 8, size - 5);
        g.lineTo(8, size - 5);
        g.quadraticCurveTo(3, size - 5, 3, size - 10);
        g.lineTo(3, 10);
        g.quadraticCurveTo(3, 5, 8, 5);
        g.closePath();
        g.fill();
        g.fillStyle = '#A3F3FF';
        g.fillRect(6, 8, size - 12, 5);
        g.fillStyle = '#0B1E33';
        g.fillRect(8 + frame, 9, 3, 2);
        g.fillRect(size - 11 + frame, 9, 3, 2);
        break;
      case 'speed':
        g.fillStyle = '#FFA95A';
        g.beginPath();
        g.ellipse(cx, cy, size * 0.42, size * 0.3, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#FFD7AE';
        g.fillRect(6, cy - 3, size - 12, 4);
        g.strokeStyle = 'rgba(255, 220, 170, 0.7)';
        g.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          g.beginPath();
          g.moveTo(2, 6 + i * 5);
          g.lineTo(-4 - i * 2, 6 + i * 5 + frame);
          g.stroke();
        }
        break;
      case 'armored':
        g.fillStyle = '#8C96A9';
        g.fillRect(3, 5, size - 6, size - 10);
        g.fillStyle = '#616B7B';
        g.fillRect(6, 8, size - 12, 5);
        g.fillRect(7, cy - 2, size - 14, 4);
        g.fillStyle = '#C9D3E6';
        g.fillRect(5, 5, 2, 2);
        g.fillRect(size - 7, size - 7, 2, 2);
        break;
      case 'regenerating':
        g.fillStyle = '#C37BFF';
        g.beginPath();
        g.ellipse(cx, cy, size * 0.4 + frame, size * 0.36, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#E8C5FF';
        g.beginPath();
        g.ellipse(cx - 3, cy - 4, size * 0.15, size * 0.1, -0.2, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#2A173F';
        g.fillRect(cx - 6, cy - 1, 3, 2);
        g.fillRect(cx + 3, cy - 1, 3, 2);
        break;
      case 'boss':
        g.fillStyle = '#FF6363';
        g.fillRect(4, 6, size - 8, size - 12);
        g.fillStyle = '#B33636';
        g.fillRect(8, 3, size - 16, 8);
        g.fillStyle = '#FFE08A';
        g.fillRect(10, 7, 4, 3);
        g.fillRect(size - 14, 7, 4, 3);
        g.fillStyle = '#E8ECF4';
        g.fillRect(3, cy - 2 + frame, 5, 8);
        g.fillRect(size - 8, cy - 2 - frame, 5, 8);
        break;
    }

    return c;
  }

  private static createTowerSprite(type: TowerType, size: number, frame: number, hasTarget: boolean, tier: number = 1): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const g = c.getContext('2d')!;

    // Pedestal Base Ring / Trim
    g.fillStyle = '#121E30';
    g.beginPath();
    g.ellipse(size / 2, size - 3, size * 0.35, size * 0.12, 0, 0, Math.PI * 2);
    g.fill();

    if (tier === 2) {
      g.strokeStyle = '#58EAFF';
      g.lineWidth = 1;
      g.strokeRect(6, size - 7, 20, 5);
      g.fillStyle = '#A3E3FF';
      g.fillRect(5, size - 7, 2, 5);
      g.fillRect(25, size - 7, 2, 5);
    } else if (tier === 3) {
      g.strokeStyle = '#FFD700';
      g.lineWidth = 1.5;
      g.strokeRect(5, size - 8, 22, 6);
      g.fillStyle = '#FFE57F';
      g.fillRect(4, size - 9, 3, 3);
      g.fillRect(25, size - 9, 3, 3);
    }

    switch (type) {
      case 'archer':
        if (tier === 1) {
          g.fillStyle = '#314B2C';
          g.fillRect(7, 11, 18, 17);
          g.fillStyle = '#71EF95';
          g.fillRect(6, 8, 20, 5);
          g.strokeStyle = '#D5FFE1';
          g.lineWidth = 2;
          g.beginPath();
          g.moveTo(20, 7);
          g.lineTo(26 + (frame ? 1 : -1), 5);
          g.stroke();
        } else if (tier === 2) {
          g.fillStyle = '#223B20';
          g.fillRect(6, 10, 20, 18);
          g.fillStyle = '#4CD675';
          g.fillRect(5, 7, 22, 5);
          g.fillStyle = '#1BFF79';
          g.fillRect(13, 14, 6, 6); // Energy capacitor
          g.strokeStyle = '#D5FFE1';
          g.lineWidth = 2;
          // Dual rail emitters
          g.beginPath();
          g.moveTo(18, 5);
          g.lineTo(27 + (frame ? 1 : -1), 4);
          g.moveTo(18, 9);
          g.lineTo(27 + (frame ? 1 : -1), 8);
          g.stroke();
        } else {
          // Tier 3: Triple gatling rail array with rotating hub and gold trim
          g.fillStyle = '#183018';
          g.fillRect(5, 9, 22, 19);
          g.strokeStyle = '#FFD700';
          g.lineWidth = 1;
          g.strokeRect(5, 9, 22, 19);
          g.fillStyle = '#39E86E';
          g.fillRect(4, 6, 24, 6);
          g.fillStyle = '#00FF9D';
          g.beginPath();
          g.arc(16, 17, 4, 0, Math.PI * 2);
          g.fill();
          // Triple rail emitters
          g.strokeStyle = '#E8FFF1';
          g.lineWidth = 2;
          g.beginPath();
          g.moveTo(18, 4);
          g.lineTo(28 + (frame ? 1 : 0), 3);
          g.moveTo(20, 7);
          g.lineTo(29 + (frame ? -1 : 1), 7);
          g.moveTo(18, 10);
          g.lineTo(28 + (frame ? 0 : -1), 11);
          g.stroke();
        }
        break;

      case 'cannon':
        if (tier === 1) {
          g.fillStyle = '#3F4856';
          g.fillRect(5, 12, 22, 15);
          g.fillStyle = '#9FAAC0';
          g.fillRect(11, 9, 10, 5);
          g.fillStyle = '#FFB165';
          g.fillRect(17 + (frame ? -2 : 0), 10, 12, 4);
          if (hasTarget) {
            g.fillStyle = 'rgba(255, 202, 96, 0.45)';
            g.beginPath();
            g.arc(30, 12, 3, 0, Math.PI * 2);
            g.fill();
          }
        } else if (tier === 2) {
          g.fillStyle = '#2C3442';
          g.fillRect(4, 11, 24, 16);
          g.fillStyle = '#65738C';
          // Heavy blast shields
          g.fillRect(2, 13, 4, 13);
          g.fillRect(26, 13, 4, 13);
          g.fillStyle = '#B0BDD4';
          g.fillRect(9, 8, 14, 6);
          // Widened thermo-exhaust bore
          g.fillStyle = '#FF9036';
          g.fillRect(15 + (frame ? -2 : 0), 8, 14, 6);
          g.fillStyle = '#FF4500';
          g.fillRect(12, 18, 8, 3);
          if (hasTarget) {
            g.fillStyle = 'rgba(255, 160, 50, 0.55)';
            g.beginPath();
            g.arc(31, 11, 4, 0, Math.PI * 2);
            g.fill();
          }
        } else {
          // Tier 3: Dual heavy howitzer barrels with magma reactor
          g.fillStyle = '#202632';
          g.fillRect(3, 10, 26, 17);
          g.fillStyle = '#FFD700';
          g.fillRect(2, 12, 4, 14);
          g.fillRect(26, 12, 4, 14);
          g.fillStyle = '#7C8BA6';
          g.fillRect(7, 7, 18, 7);
          // Dual heavy howitzer barrels
          g.fillStyle = '#FFA742';
          g.fillRect(14 + (frame ? -2 : 0), 6, 16, 4);
          g.fillRect(14 + (frame ? -2 : 0), 12, 16, 4);
          // Magma reactor core
          g.fillStyle = '#FF3B00';
          g.fillRect(10, 16, 12, 5);
          g.fillStyle = '#FFE600';
          g.fillRect(13, 17, 6, 3);
          if (hasTarget) {
            g.fillStyle = 'rgba(255, 120, 0, 0.65)';
            g.beginPath();
            g.arc(32, 8, 4, 0, Math.PI * 2);
            g.arc(32, 14, 4, 0, Math.PI * 2);
            g.fill();
          }
        }
        break;

      case 'sniper':
        if (tier === 1) {
          g.fillStyle = '#2E274B';
          g.fillRect(12, 12, 8, 16);
          g.fillStyle = '#66EAFF';
          g.beginPath();
          g.arc(16, 10, 7, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = '#C8FAFF';
          g.fillRect(14, 7, 2, 6);
        } else if (tier === 2) {
          g.fillStyle = '#201A38';
          g.fillRect(11, 11, 10, 17);
          // Telescoping long barrel with coils
          g.fillStyle = '#483B75';
          g.fillRect(14, 3, 4, 14);
          g.fillStyle = '#58EAFF';
          g.fillRect(13, 5, 6, 2);
          g.fillRect(13, 9, 6, 2);
          g.fillRect(13, 13, 6, 2);
          g.fillStyle = '#8CF4FF';
          g.beginPath();
          g.arc(16, 8, 6, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = '#FFFFFF';
          g.fillRect(15, 1, 2, 6);
        } else {
          // Tier 3: Dual quantum rails with central prism
          g.fillStyle = '#18122C';
          g.fillRect(10, 10, 12, 18);
          g.strokeStyle = '#FFD700';
          g.lineWidth = 1;
          g.strokeRect(10, 10, 12, 18);
          // Dual quantum rails
          g.fillStyle = '#58EAFF';
          g.fillRect(11, 2, 3, 15);
          g.fillRect(18, 2, 3, 15);
          // Floating plasma prism
          g.fillStyle = '#C8FAFF';
          g.beginPath();
          g.moveTo(16, 4);
          g.lineTo(19, 10);
          g.lineTo(13, 10);
          g.closePath();
          g.fill();
          g.fillStyle = '#FFFFFF';
          g.fillRect(15, 0, 2, 8);
        }
        break;

      case 'ice':
        if (tier === 1) {
          g.fillStyle = '#243755';
          g.fillRect(9, 16, 14, 12);
          g.fillStyle = '#88D9FF';
          g.beginPath();
          g.moveTo(16, 3 + (frame ? 1 : -1));
          g.lineTo(10, 16);
          g.lineTo(22, 16);
          g.closePath();
          g.fill();
          g.fillStyle = '#DFF7FF';
          g.fillRect(15, 6, 2, 7);
        } else if (tier === 2) {
          g.fillStyle = '#1A2A44';
          g.fillRect(8, 15, 16, 13);
          // Multi-faceted sapphire crystal + side shards
          g.fillStyle = '#56C4FF';
          g.beginPath();
          g.moveTo(16, 2 + (frame ? 1 : -1));
          g.lineTo(9, 15);
          g.lineTo(23, 15);
          g.closePath();
          g.fill();
          g.fillStyle = '#9CE2FF';
          g.beginPath();
          g.moveTo(16, 2 + (frame ? 1 : -1));
          g.lineTo(13, 15);
          g.lineTo(19, 15);
          g.closePath();
          g.fill();
          // Side cryo shards
          g.fillStyle = '#DFF7FF';
          g.fillRect(5, 12, 3, 6);
          g.fillRect(24, 12, 3, 6);
        } else {
          // Tier 3: Grand multi-tiered glacial spire
          g.fillStyle = '#121F33';
          g.fillRect(7, 14, 18, 14);
          g.strokeStyle = '#FFD700';
          g.lineWidth = 1;
          g.strokeRect(7, 14, 18, 14);
          // Main Spire
          g.fillStyle = '#38B6FF';
          g.beginPath();
          g.moveTo(16, 0 + (frame ? 1 : -1));
          g.lineTo(8, 14);
          g.lineTo(24, 14);
          g.closePath();
          g.fill();
          // Inner glow core
          g.fillStyle = '#B8EFFF';
          g.beginPath();
          g.moveTo(16, 2 + (frame ? 1 : -1));
          g.lineTo(12, 14);
          g.lineTo(20, 14);
          g.closePath();
          g.fill();
          // Radiant base ice spikes
          g.fillStyle = '#E8FAFF';
          g.beginPath();
          g.moveTo(4, 18);
          g.lineTo(7, 12);
          g.lineTo(8, 18);
          g.moveTo(28, 18);
          g.lineTo(25, 12);
          g.lineTo(24, 18);
          g.fill();
        }
        break;

      case 'flamethrower':
        if (tier === 1) {
          g.fillStyle = '#4A2C20';
          g.fillRect(7, 13, 18, 14);
          g.fillStyle = '#C96E36';
          g.fillRect(6, 10, 20, 5);
          g.fillStyle = '#FFB165';
          g.fillRect(16, 11, 12, 4);
          g.fillStyle = '#FFE0A3';
          g.fillRect(24 + (frame ? 1 : -1), 12, 5, 2);
        } else if (tier === 2) {
          g.fillStyle = '#3B2117';
          g.fillRect(6, 12, 20, 15);
          // Twin copper pressurized canisters
          g.fillStyle = '#D97736';
          g.fillRect(6, 7, 7, 6);
          g.fillRect(19, 7, 7, 6);
          // Twin industrial nozzles
          g.fillStyle = '#FFA050';
          g.fillRect(16, 9, 13, 3);
          g.fillRect(16, 15, 13, 3);
          g.fillStyle = '#FFE2A8';
          g.fillRect(26 + (frame ? 1 : -1), 9, 4, 3);
          g.fillRect(26 + (frame ? -1 : 1), 15, 4, 3);
        } else {
          // Tier 3: Tri-nozzle furnace with superheated white-hot core
          g.fillStyle = '#2E170F';
          g.fillRect(5, 11, 22, 16);
          g.strokeStyle = '#FFD700';
          g.lineWidth = 1;
          g.strokeRect(5, 11, 22, 16);
          // Superheated furnace window
          g.fillStyle = '#FF4500';
          g.fillRect(8, 14, 8, 8);
          g.fillStyle = '#FFFFFF';
          g.fillRect(10, 16, 4, 4);
          // Heavy Tri-nozzle array
          g.fillStyle = '#FFA85C';
          g.fillRect(15, 7, 14, 3);
          g.fillRect(16, 12, 14, 3);
          g.fillRect(15, 17, 14, 3);
          g.fillStyle = '#FFF5DE';
          g.fillRect(26 + (frame ? 1 : 0), 7, 4, 3);
          g.fillRect(27 + (frame ? 0 : 1), 12, 4, 3);
          g.fillRect(26 + (frame ? -1 : 0), 17, 4, 3);
        }
        break;
    }

    return c;
  }

  private static createProjectileSprite(type: ProjectileType, size: number, tier: number = 1): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const g = c.getContext('2d')!;

    switch (type) {
      case 'arrow':
        if (tier === 1) {
          g.fillStyle = '#8CF4B3';
          g.fillRect(2, 7, 9, 2);
          g.fillStyle = '#E8FFF1';
          g.beginPath();
          g.moveTo(11, 8);
          g.lineTo(15, 6);
          g.lineTo(15, 10);
          g.closePath();
          g.fill();
        } else if (tier === 2) {
          // Double-pronged energized green bolt
          g.fillStyle = '#42FF85';
          g.fillRect(1, 5, 10, 2);
          g.fillRect(1, 9, 10, 2);
          g.fillStyle = '#E8FFF1';
          g.fillRect(8, 6, 6, 4);
        } else {
          // Triple-pronged hyper-velocity bolt
          g.fillStyle = '#00FF7F';
          g.fillRect(0, 4, 11, 2);
          g.fillRect(2, 7, 11, 2);
          g.fillRect(0, 10, 11, 2);
          g.fillStyle = '#FFFFFF';
          g.fillRect(8, 6, 7, 4);
        }
        break;

      case 'cannonball':
        if (tier === 1) {
          g.fillStyle = '#FF9E4D';
          g.beginPath();
          g.arc(8, 8, 5, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = '#FFD29D';
          g.beginPath();
          g.arc(6, 6, 2, 0, Math.PI * 2);
          g.fill();
        } else if (tier === 2) {
          // Incendiary shell
          g.fillStyle = '#FF6A00';
          g.beginPath();
          g.arc(8, 8, 6, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = '#FFAE66';
          g.beginPath();
          g.arc(6, 6, 3, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = '#FFE6CC';
          g.fillRect(7, 4, 2, 2);
        } else {
          // Magma core shell
          g.fillStyle = '#FF2B00';
          g.beginPath();
          g.arc(8, 8, 7, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = '#FFA600';
          g.beginPath();
          g.arc(8, 8, 4.5, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = '#FFFFB8';
          g.beginPath();
          g.arc(7, 7, 2, 0, Math.PI * 2);
          g.fill();
        }
        break;

      case 'laser':
        g.fillStyle = '#D4F8FF';
        g.fillRect(2, 7, 12, 2);
        break;

      case 'ice':
        if (tier === 1) {
          g.fillStyle = '#A3E3FF';
          g.beginPath();
          g.moveTo(8, 2);
          g.lineTo(12, 8);
          g.lineTo(8, 14);
          g.lineTo(4, 8);
          g.closePath();
          g.fill();
          g.fillStyle = '#ECFBFF';
          g.fillRect(7, 5, 2, 6);
        } else if (tier === 2) {
          // Cluster of sharp shards
          g.fillStyle = '#78D5FF';
          g.beginPath();
          g.moveTo(9, 1);
          g.lineTo(14, 8);
          g.lineTo(9, 15);
          g.lineTo(4, 8);
          g.closePath();
          g.fill();
          g.fillStyle = '#D6F4FF';
          g.fillRect(2, 6, 3, 4);
          g.fillRect(12, 6, 3, 4);
        } else {
          // Glacial comet
          g.fillStyle = '#38B6FF';
          g.beginPath();
          g.arc(8, 8, 6, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = '#A8EBFF';
          g.beginPath();
          g.moveTo(8, 0);
          g.lineTo(16, 8);
          g.lineTo(8, 16);
          g.lineTo(0, 8);
          g.closePath();
          g.fill();
          g.fillStyle = '#FFFFFF';
          g.fillRect(6, 6, 4, 4);
        }
        break;

      case 'flame':
        if (tier === 1) {
          g.fillStyle = '#FF8A3D';
          g.beginPath();
          g.moveTo(3, 8);
          g.quadraticCurveTo(8, 1, 13, 8);
          g.quadraticCurveTo(8, 15, 3, 8);
          g.fill();
          g.fillStyle = '#FFD37A';
          g.beginPath();
          g.moveTo(5, 8);
          g.quadraticCurveTo(8, 4, 11, 8);
          g.quadraticCurveTo(8, 12, 5, 8);
          g.fill();
        } else if (tier === 2) {
          // Dense dual-tone high-pressure stream
          g.fillStyle = '#FF5900';
          g.beginPath();
          g.moveTo(2, 8);
          g.quadraticCurveTo(8, 0, 15, 8);
          g.quadraticCurveTo(8, 16, 2, 8);
          g.fill();
          g.fillStyle = '#FFE073';
          g.beginPath();
          g.moveTo(4, 8);
          g.quadraticCurveTo(8, 3, 13, 8);
          g.quadraticCurveTo(8, 13, 4, 8);
          g.fill();
        } else {
          // Superheated blue/white plasma stream
          g.fillStyle = '#0084FF';
          g.beginPath();
          g.moveTo(1, 8);
          g.quadraticCurveTo(8, -1, 16, 8);
          g.quadraticCurveTo(8, 17, 1, 8);
          g.fill();
          g.fillStyle = '#6EE7FF';
          g.beginPath();
          g.moveTo(3, 8);
          g.quadraticCurveTo(8, 2, 14, 8);
          g.quadraticCurveTo(8, 14, 3, 8);
          g.fill();
          g.fillStyle = '#FFFFFF';
          g.fillRect(6, 6, 5, 4);
        }
        break;
    }

    return c;
  }
}
