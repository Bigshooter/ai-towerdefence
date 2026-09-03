import { BaseEntity } from './BaseEntity';
import { EnemyType, EnemyStats, Position } from '../types';
import { SpaceSprites } from '../visuals/SpaceSprites';

export interface EnemyData extends EnemyStats {
  type: EnemyType;
  currentHp: number;
  waypointIndex: number;
  slowFactor: number; // 1 = normal, <1 = slowed
  slowTimer: number;
  regenTimer: number;
  reachedEnd: boolean;
}

const ENEMY_STATS: Record<EnemyType, EnemyStats> = {
  normal:   { hp: 30, speed: 60, reward: 5 },
  speed:    { hp: 15, speed: 120, reward: 7 },
  armored:  { hp: 80, speed: 35, reward: 15, armor: 2 },
  regenerating: { hp: 50, speed: 45, reward: 12, regenRate: 3 },
  boss:     { hp: 500, speed: 25, reward: 100 },
};

export class Enemy extends BaseEntity {
  data: EnemyData;
  waypoints: Position[];
  private currentWaypoint: Position | null = null;
  private animFrame: number = 0;
  private animTimer: number = 0;
  private hpMultiplier: number;

  constructor(type: EnemyType, waypointIndex: number, waypoints: Position[], hpMultiplier: number, customId?: string) {
    const stats = ENEMY_STATS[type];
    const size = type === 'boss' ? 32 : 24;
    const startX = waypoints[0]?.x ?? 16;
    const startY = waypoints[0]?.y ?? 96;

    const id = customId || `enemy_${type}_${Math.random().toString(36).substr(2, 9)}`;
    super(id, startX, startY, size, size);

    this.hpMultiplier = hpMultiplier;
    this.data = {
      ...stats,
      type,
      currentHp: stats.hp * hpMultiplier,
      waypointIndex,
      slowFactor: 1,
      slowTimer: 0,
      regenTimer: 0,
      reachedEnd: false,
    };

    this.waypoints = waypoints;
    if (waypoints.length > 0) {
      this.currentWaypoint = waypoints[0];
    }
  }

  update(dt: number): void {
    if (!this.alive) return;

    // Handle slow timer
    if (this.data.slowTimer > 0) {
      this.data.slowTimer -= dt;
      if (this.data.slowTimer <= 0) {
        this.data.slowFactor = 1;
      }
    }

    // Handle regeneration
    if (this.data.regenRate && this.data.currentHp < this.data.hp * this.getHpMultiplier()) {
      this.data.regenTimer += dt;
      if (this.data.regenTimer >= 1) {
        this.data.regenTimer = 0;
        const maxHp = this.data.hp * this.getHpMultiplier();
        this.data.currentHp = Math.min(this.data.currentHp + this.data.regenRate, maxHp);
      }
    }

    // Move toward next waypoint
    if (this.currentWaypoint && this.waypoints.length > 0) {
      const dx = this.currentWaypoint.x - this.centerX;
      const dy = this.currentWaypoint.y - this.centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 4) {
        // Reached waypoint, move to next
        this.data.waypointIndex++;
        if (this.data.waypointIndex >= this.waypoints.length) {
          // Enemy reached the end!
          this.data.reachedEnd = true;
          this.kill();
          return;
        }
        this.currentWaypoint = this.waypoints[this.data.waypointIndex];
      } else {
        const speed = this.data.speed * this.data.slowFactor;
        const moveX = (dx / dist) * speed * dt;
        const moveY = (dy / dist) * speed * dt;
        this.position.x += moveX;
        this.position.y += moveY;
      }
    }

    // Animation
    this.animTimer += dt;
    if (this.animTimer >= 0.2) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 2;
    }
  }

  getHpMultiplier(): number {
    return this.hpMultiplier;
  }

  takeDamage(amount: number): number {
    const armor = this.data.armor || 0;
    const actualDamage = Math.max(1, amount - armor);
    this.data.currentHp -= actualDamage;

    if (this.data.currentHp <= 0) {
      this.kill();
    }

    return actualDamage;
  }

  applySlow(factor: number, duration: number): void {
    this.data.slowFactor = Math.min(this.data.slowFactor, factor);
    this.data.slowTimer = duration;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;

    const x = this.position.x;
    const y = this.position.y;
    const s = this.size.width;

    SpaceSprites.drawEnemy(ctx, this.data.type, x, y, s, this.animFrame, Date.now() / 1000);

    // Draw HP bar
    this.renderHpBar(ctx);

    // Draw slow indicator
    if (this.data.slowFactor < 1) {
      ctx.fillStyle = '#7EC8FF';
      ctx.font = '10px monospace';
      ctx.fillText('❄', x + s / 2 - 5, y - 4);
    }
  }

  private renderHpBar(ctx: CanvasRenderingContext2D): void {
    const barWidth = this.size.width;
    const barHeight = 3;
    const x = this.position.x;
    const y = this.position.y - 6;
    const hpRatio = Math.max(0, this.data.currentHp / (this.data.hp * this.getHpMultiplier()));

    // Background
    ctx.fillStyle = '#1A1A2E';
    ctx.fillRect(x, y, barWidth, barHeight);

    // HP fill
    const hpColor = hpRatio > 0.5 ? '#3DC83D' : hpRatio > 0.25 ? '#FFD700' : '#FF4444';
    ctx.fillStyle = hpColor;
    ctx.fillRect(x, y, barWidth * hpRatio, barHeight);

    // Border
    ctx.strokeStyle = '#6E6E6E';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, barWidth, barHeight);
  }

}
