import { EnemyType, ProjectileType, TowerType } from '../types';
import { TileType } from '../map/TileMap';

export class SpaceSprites {
  private static tileCache = new Map<string, HTMLCanvasElement>();
  private static enemyCache = new Map<string, HTMLCanvasElement>();
  private static towerCache = new Map<string, HTMLCanvasElement>();
  private static projectileCache = new Map<string, HTMLCanvasElement>();
  private static starfield: HTMLCanvasElement | null = null;

  static drawBackdrop(ctx: CanvasRenderingContext2D, width: number, height: number, time: number): void {
    if (!this.starfield) {
      this.starfield = this.createStarfield();
    }

    const pattern = ctx.createPattern(this.starfield, 'repeat');
    if (!pattern) return;

    const offsetX = (time * 4) % this.starfield.width;
    const offsetY = (time * 2) % this.starfield.height;

    ctx.save();
    ctx.translate(-offsetX, -offsetY);
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width + this.starfield.width, height + this.starfield.height);
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
  ): void {
    const key = `${type}:${variant}:${connectionMask}`;
    let sprite = this.tileCache.get(key);
    if (!sprite) {
      sprite = this.createTileSprite(type, variant, connectionMask);
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
  ): void {
    const key = `${type}:${size}:${frame}:${hasTarget ? 1 : 0}`;
    let sprite = this.towerCache.get(key);
    if (!sprite) {
      sprite = this.createTowerSprite(type, size, frame, hasTarget);
      this.towerCache.set(key, sprite);
    }

    ctx.drawImage(sprite, x, y, size, size);

    if (type === 'sniper') {
      const alpha = hasTarget ? 0.35 : 0.18;
      const radius = size * (0.2 + Math.sin(time * 5) * 0.03);
      ctx.fillStyle = `rgba(120, 242, 255, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size * 0.28, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    if (type === 'flamethrower' && hasTarget) {
      const alpha = 0.2 + Math.sin(time * 14) * 0.08;
      ctx.fillStyle = `rgba(255, 146, 76, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x + size * 0.76, y + size * 0.4, size * 0.22, 0, Math.PI * 2);
      ctx.fill();
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
  ): void {
    const angle = Math.atan2(dirY, dirX);
    const key = `${type}:16`;

    let sprite = this.projectileCache.get(key);
    if (!sprite) {
      sprite = this.createProjectileSprite(type, 16);
      this.projectileCache.set(key, sprite);
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    if (type === 'laser') {
      const pulse = 0.4 + Math.sin(time * 25) * 0.2;
      ctx.fillStyle = `rgba(130, 232, 255, ${pulse.toFixed(3)})`;
      ctx.fillRect(-16, -3, 18, 6);
      ctx.fillStyle = '#E6FCFF';
      ctx.fillRect(-14, -1, 14, 2);
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

  private static createTileSprite(type: TileType, variant: number, connectionMask: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 32;
    const g = c.getContext('2d')!;

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

        const up = (connectionMask & 1) !== 0;
        const right = (connectionMask & 2) !== 0;
        const down = (connectionMask & 4) !== 0;
        const left = (connectionMask & 8) !== 0;
        let hasHorizontal = left || right;
        let hasVertical = up || down;

        // If there is no connectivity data, default to horizontal for legacy calls.
        if (!hasHorizontal && !hasVertical) {
          hasHorizontal = true;
        }

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

        const up = (connectionMask & 1) !== 0;
        const right = (connectionMask & 2) !== 0;
        const down = (connectionMask & 4) !== 0;
        const left = (connectionMask & 8) !== 0;
        let hasHorizontal = left || right;
        let hasVertical = up || down;

        if (!hasHorizontal && !hasVertical) {
          hasHorizontal = true;
        }

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

  private static createTowerSprite(type: TowerType, size: number, frame: number, hasTarget: boolean): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const g = c.getContext('2d')!;

    g.fillStyle = '#121E30';
    g.beginPath();
    g.ellipse(size / 2, size - 3, size * 0.35, size * 0.12, 0, 0, Math.PI * 2);
    g.fill();

    switch (type) {
      case 'archer':
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
        break;
      case 'cannon':
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
        break;
      case 'sniper':
        g.fillStyle = '#2E274B';
        g.fillRect(12, 12, 8, 16);
        g.fillStyle = '#66EAFF';
        g.beginPath();
        g.arc(16, 10, 7, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#C8FAFF';
        g.fillRect(14, 7, 2, 6);
        break;
      case 'ice':
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
        break;
      case 'flamethrower':
        g.fillStyle = '#4A2C20';
        g.fillRect(7, 13, 18, 14);
        g.fillStyle = '#C96E36';
        g.fillRect(6, 10, 20, 5);
        g.fillStyle = '#FFB165';
        g.fillRect(16, 11, 12, 4);
        g.fillStyle = '#FFE0A3';
        g.fillRect(24 + (frame ? 1 : -1), 12, 5, 2);
        break;
    }

    return c;
  }

  private static createProjectileSprite(type: ProjectileType, size: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const g = c.getContext('2d')!;

    switch (type) {
      case 'arrow':
        g.fillStyle = '#8CF4B3';
        g.fillRect(2, 7, 9, 2);
        g.fillStyle = '#E8FFF1';
        g.beginPath();
        g.moveTo(11, 8);
        g.lineTo(15, 6);
        g.lineTo(15, 10);
        g.closePath();
        g.fill();
        break;
      case 'cannonball':
        g.fillStyle = '#FF9E4D';
        g.beginPath();
        g.arc(8, 8, 5, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#FFD29D';
        g.beginPath();
        g.arc(6, 6, 2, 0, Math.PI * 2);
        g.fill();
        break;
      case 'laser':
        g.fillStyle = '#D4F8FF';
        g.fillRect(2, 7, 12, 2);
        break;
      case 'ice':
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
        break;
      case 'flame':
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
        break;
    }

    return c;
  }
}
