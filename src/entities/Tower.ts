import { BaseEntity } from './BaseEntity';
import { TowerType, TowerStats, Position } from '../types';
import { SpaceSprites } from '../visuals/SpaceSprites';

export interface TowerData extends TowerStats {
  type: TowerType;
  level: number;
  fireCooldown: number;
  targetId: string | null;
}

export const TOWER_STATS: Record<TowerType, TowerStats> = {
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

  getRangeCircle(): { x: number; y: number; radius: number } {
    return { x: this.centerX, y: this.centerY, radius: this.data.range };
  }
}
