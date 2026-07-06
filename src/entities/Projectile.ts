import { BaseEntity } from './BaseEntity';
import { Position, ProjectileType } from '../types';
import { CollisionSystem } from '../engine/CollisionSystem';

export interface ProjectileData {
  type: ProjectileType;
  damage: number;
  speed: number;
  splashRadius?: number;
  slowFactor?: number;
  slowDuration?: number;
}

export class Projectile extends BaseEntity {
  data: ProjectileData;
  targetId: string | null;
  direction: Position;
  private trailTimer: number = 0;

  constructor(type: ProjectileType, x: number, y: number, targetX: number, targetY: number, damage: number) {
    super(`proj_${type}_${Math.random().toString(36).substr(2, 9)}`, x, y, 8, 8);

    const dx = targetX - x;
    const dy = targetY - y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    this.data = {
      type,
      damage,
      speed: type === 'laser' ? 800 : type === 'ice' ? 200 : type === 'cannonball' ? 150 : 300,
      splashRadius: type === 'cannonball' ? 40 : undefined,
      slowFactor: type === 'ice' ? 0.5 : undefined,
      slowDuration: type === 'ice' ? 2 : undefined,
    };

    this.direction = { x: dx / dist, y: dy / dist };
    this.targetId = null; // Will be resolved on update
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

    const x = this.position.x;
    const y = this.position.y;

    switch (this.data.type) {
      case 'arrow':
        ctx.fillStyle = '#8B5E2A';
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.atan2(this.direction.y, this.direction.x));
        ctx.fillRect(-6, -1, 10, 2);
        ctx.fillStyle = '#C8C8C8';
        ctx.beginPath();
        ctx.moveTo(4, 0);
        ctx.lineTo(8, -2);
        ctx.lineTo(8, 2);
        ctx.fill();
        ctx.restore();
        break;

      case 'cannonball':
        ctx.fillStyle = '#3A3A3A';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#6E6E6E';
        ctx.beginPath();
        ctx.arc(x - 1, y - 1, 2, 0, Math.PI * 2);
        ctx.fill();
        // Smoke trail
        for (let i = 1; i <= 3; i++) {
          const tx = x - this.direction.x * i * 8;
          const ty = y - this.direction.y * i * 8;
          ctx.fillStyle = `rgba(200, 200, 200, ${0.5 - i * 0.15})`;
          ctx.beginPath();
          ctx.arc(tx, ty, 3 - i * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
        break;

      case 'laser':
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - this.direction.x * 15, y - this.direction.y * 15);
        ctx.stroke();
        ctx.strokeStyle = '#7EC8FF';
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - this.direction.x * 15, y - this.direction.y * 15);
        ctx.stroke();
        ctx.globalAlpha = 1;
        break;

      case 'ice':
        ctx.fillStyle = '#7EC8FF';
        ctx.beginPath();
        ctx.moveTo(x, y - 4);
        ctx.lineTo(x + 3, y);
        ctx.lineTo(x, y + 4);
        ctx.lineTo(x - 3, y);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x - 1, y - 2, 2, 4);
        // Frost particles
        const time = Date.now() / 300;
        for (let i = 0; i < 3; i++) {
          const px = x + Math.cos(time + i * 2) * 6;
          const py = y + Math.sin(time + i * 2) * 6;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.fillRect(px, py, 1, 1);
        }
        break;
    }
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
