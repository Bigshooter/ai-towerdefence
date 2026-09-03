import { BaseEntity } from './BaseEntity';
import { TowerType, TowerStats, Position } from '../types';
import { SpaceSprites } from '../visuals/SpaceSprites';

export interface TowerData extends TowerStats {
  type: TowerType;
  level: number;
  fireCooldown: number;
  targetId: string | null;
}

const TOWER_STATS: Record<TowerType, TowerStats> = {
  archer:   { damage: 10, range: 120, fireRate: 2.5, cost: 50 },
  cannon:   { damage: 30, range: 100, fireRate: 0.8, cost: 100, splashRadius: 40 },
  sniper:   { damage: 50, range: 200, fireRate: 0.5, cost: 150 },
  ice:      { damage: 5, range: 90, fireRate: 1.5, cost: 75, slowFactor: 0.5, slowDuration: 2 },
  flamethrower: { damage: 100, range: 100, fireRate: 1.2, cost: 250 },
};

export class Tower extends BaseEntity {
  data: TowerData;
  private animTimer: number = 0;
  private animFrame: number = 0;

  constructor(type: TowerType, x: number, y: number) {
    const stats = TOWER_STATS[type];
    super(`tower_${type}_${Math.random().toString(36).substr(2, 9)}`, x - 16, y - 16, 32, 32);

    this.data = {
      ...stats,
      type,
      level: 1,
      fireCooldown: 0,
      targetId: null,
    };
  }

  update(dt: number): void {
    if (!this.alive) return;

    // Update fire cooldown
    this.data.fireCooldown -= dt;

    // Animation
    this.animTimer += dt;
    if (this.animTimer >= 0.3) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 2;
    }
  }

  findTarget(enemies: { id: string; position: Position; size?: { width: number; height: number }; alive?: boolean }[]): string | null {
    const center = { x: this.centerX, y: this.centerY };
    let closestDist = Infinity;
    let targetId: string | null = null;

    for (const enemy of enemies) {
      if (!enemy.id || !this.alive || enemy.alive === false) continue;

      const enemyCenterX = enemy.position.x + ((enemy.size?.width ?? 0) / 2);
      const enemyCenterY = enemy.position.y + ((enemy.size?.height ?? 0) / 2);
      const dist = Math.sqrt(
        Math.pow(enemyCenterX - center.x, 2) +
        Math.pow(enemyCenterY - center.y, 2)
      );

      if (dist <= this.data.range && dist < closestDist) {
        closestDist = dist;
        targetId = enemy.id;
      }
    }

    this.data.targetId = targetId;
    return targetId;
  }

  upgrade(): boolean {
    if (this.data.level >= 5) return false;
    const cost = this.getUpgradeCost();
    this.data.level++;
    this.data.damage *= 1.2;
    this.data.range *= 1.1;
    this.data.fireRate *= 1.1;
    return true;
  }

  getUpgradeCost(): number {
    return Math.floor(this.data.cost * (0.5 + this.data.level * 0.3));
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;

    const x = this.position.x;
    const y = this.position.y;

    SpaceSprites.drawTower(
      ctx,
      this.data.type,
      x,
      y,
      this.size.width,
      this.animFrame,
      Boolean(this.data.targetId),
      Date.now() / 1000,
    );

    // Level indicator
    ctx.fillStyle = '#FFD700';
    ctx.font = '10px monospace';
    ctx.fillText(`Lv.${this.data.level}`, x + 8, y - 4);
  }

  private renderArcher(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    // Tower base
    ctx.fillStyle = '#8B5E2A';
    ctx.fillRect(x + 6, y + 10, 20, 20);
    ctx.fillStyle = '#6E6E6E';
    ctx.fillRect(x + 4, y + 26, 24, 4);

    // Roof
    ctx.fillStyle = '#3DC83D';
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 10);
    ctx.lineTo(x + 16, y + 2);
    ctx.lineTo(x + 28, y + 10);
    ctx.fill();

    // Archer figure
    const armAngle = this.animFrame === 0 ? -0.3 : 0.3;
    ctx.fillStyle = '#F5E6CC';
    ctx.fillRect(x + 12, y + 4, 8, 8);

    // Bow
    ctx.strokeStyle = '#8B5E2A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + 20, y + 6, 6, armAngle - Math.PI / 2, armAngle + Math.PI / 2);
    ctx.stroke();

    // Arrow (if aiming)
    if (this.data.targetId) {
      ctx.strokeStyle = '#C8C8C8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 24, y + 6);
      ctx.lineTo(x + 30, y + 4);
      ctx.stroke();
    }
  }

  private renderCannon(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    // Bastion base
    ctx.fillStyle = '#9E9E9E';
    ctx.fillRect(x + 2, y + 12, 28, 18);

    // Cannon mount
    ctx.fillStyle = '#6E6E6E';
    ctx.fillRect(x + 8, y + 8, 16, 8);

    // Cannon barrel
    const recoil = this.animFrame === 0 ? -2 : 0;
    ctx.fillStyle = '#3A3A3A';
    ctx.fillRect(x + 14 + recoil, y + 6, 16, 6);

    // Flag
    ctx.fillStyle = '#CC2200';
    ctx.fillRect(x + 24, y + 2, 8, 6);
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(x + 26, y + 3, 4, 4);

    // Smoke (if just fired)
    if (this.animFrame === 1) {
      ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
      ctx.beginPath();
      ctx.arc(x + 32, y + 8, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderSniper(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    // Spire base
    ctx.fillStyle = '#4B0082';
    ctx.fillRect(x + 12, y + 16, 8, 14);

    // Crystal lens
    const glow = Math.sin(Date.now() / 300) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(126, 200, 255, ${glow})`;
    ctx.beginPath();
    ctx.arc(x + 16, y + 8, 8, 0, Math.PI * 2);
    ctx.fill();

    // Energy swirls
    ctx.strokeStyle = '#A855F7';
    ctx.lineWidth = 1;
    const time = Date.now() / 500;
    for (let i = 0; i < 3; i++) {
      const angle = time + (i * Math.PI * 2) / 3;
      const px = x + 16 + Math.cos(angle) * 10;
      const py = y + 8 + Math.sin(angle) * 10;
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Laser beam (if targeting)
    if (this.data.targetId) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 16, y + 8);
      ctx.lineTo(x + 50, y - 10);
      ctx.stroke();

      ctx.strokeStyle = '#7EC8FF';
      ctx.lineWidth = 4;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.moveTo(x + 16, y + 8);
      ctx.lineTo(x + 50, y - 10);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  private renderIce(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    // Base
    ctx.fillStyle = '#1A3A6E';
    ctx.fillRect(x + 8, y + 18, 16, 12);

    // Ice crystal formation
    const pulse = Math.sin(Date.now() / 400) * 2;
    ctx.fillStyle = '#7EC8FF';
    ctx.beginPath();
    ctx.moveTo(x + 16, y - 2 + pulse);
    ctx.lineTo(x + 10, y + 10);
    ctx.lineTo(x + 22, y + 10);
    ctx.fill();

    // Snowflakes falling
    const time = Date.now() / 600;
    for (let i = 0; i < 4; i++) {
      const fx = x + 8 + Math.sin(time + i) * 12;
      const fy = y + 12 + ((time * 20 + i * 30) % 20);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(fx, fy, 2, 2);
    }

    // Frost on ground
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.ellipse(x + 16, y + 30, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  getRangeCircle(): { x: number; y: number; radius: number } {
    return { x: this.centerX, y: this.centerY, radius: this.data.range };
  }
}
