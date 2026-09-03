import { BaseEntity } from './BaseEntity';
import { Position, ProjectileType } from '../types';
import { CollisionSystem } from '../engine/CollisionSystem';
import { SpaceSprites } from '../visuals/SpaceSprites';

export interface ProjectileData {
  type: ProjectileType;
  damage: number;
  speed: number;
  splashRadius?: number;
  slowFactor?: number;
  slowDuration?: number;
  level?: number;
}

export interface ProjectileOptions {
  splashRadius?: number;
  slowFactor?: number;
  slowDuration?: number;
  level?: number;
}

export class Projectile extends BaseEntity {
  data: ProjectileData;
  direction: Position;
  private trailTimer: number = 0;

  constructor(type: ProjectileType, x: number, y: number, targetX: number, targetY: number, damage: number, options?: ProjectileOptions) {
    // Store projectile position as top-left while x/y inputs are center points.
    super(`proj_${type}_${Math.random().toString(36).substr(2, 9)}`, x - 8, y - 8, 16, 16);

    const dx = targetX - x;
    const dy = targetY - y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    this.data = {
      type,
      damage,
      speed: type === 'laser' ? 800 : type === 'ice' ? 200 : type === 'cannonball' ? 150 : type === 'flame' ? 260 : 300,
      splashRadius: options?.splashRadius ?? (type === 'cannonball' ? 40 : undefined),
      slowFactor: options?.slowFactor ?? (type === 'ice' ? 0.5 : undefined),
      slowDuration: options?.slowDuration ?? (type === 'ice' ? 2 : undefined),
      level: options?.level ?? 1,
    };

    this.direction = { x: dx / dist, y: dy / dist };
  }

  update(dt: number): void {
    if (!this.alive) return;

    const speed = this.data.speed * dt;
    this.position.x += this.direction.x * speed;
    this.position.y += this.direction.y * speed;

    // Check bounds
    if (this.position.x < -50 || this.position.x > 1330 || 
        this.position.y < -50 || this.position.y > 1010) {
      this.kill();
      return;
    }

    // Trail effect
    this.trailTimer += dt;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;

    const x = this.centerX;
    const y = this.centerY;

    SpaceSprites.drawProjectile(
      ctx,
      this.data.type,
      x,
      y,
      this.direction.x,
      this.direction.y,
      Date.now() / 1000,
      this.data.level ?? 1,
    );
  }

  checkCollision(enemies: { id: string; position: Position; size: { width: number; height: number }; alive: boolean }[]): { hitId: string | null; damage: number } {
    for (const enemy of enemies) {
      if (!enemy.alive) continue;

      const hit = CollisionSystem.circlesOverlap(
        this,
        { position: enemy.position, size: enemy.size }
      );

      if (hit) {
        return { hitId: enemy.id, damage: this.data.damage };
      }
    }
    return { hitId: null, damage: 0 };
  }
}
