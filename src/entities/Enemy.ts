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

  constructor(type: EnemyType, waypointIndex: number, waypoints: Position[], hpMultiplier: number) {
    const stats = ENEMY_STATS[type];
    const size = type === 'boss' ? 32 : 24;
    const startX = waypoints[0]?.x ?? 16;
    const startY = waypoints[0]?.y ?? 96;

    super(`enemy_${type}_${Math.random().toString(36).substr(2, 9)}`, startX, startY, size, size);

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

  private renderNormal(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
    // Body
    ctx.fillStyle = '#3DC83D';
    ctx.beginPath();
    ctx.arc(x + s / 2, y + s / 2 + 2, s / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    // Face
    ctx.fillStyle = '#F5E6CC';
    ctx.fillRect(x + 4, y + 6, s - 8, s / 3);

    // Eyes
    ctx.fillStyle = '#1A1A2E';
    const eyeOffset = this.animFrame === 0 ? 2 : -2;
    ctx.fillRect(x + 6 + eyeOffset, y + 7, 3, 3);
    ctx.fillRect(x + s - 9 + eyeOffset, y + 7, 3, 3);

    // Arms raised
    ctx.fillStyle = '#3DC83D';
    ctx.fillRect(x + 2, y + s / 2 - 2, 4, 6);
    ctx.fillRect(x + s - 6, y + s / 2 - 2, 4, 6);

    // Legs
    const legOffset = this.animFrame === 0 ? 2 : -2;
    ctx.fillRect(x + 5 + legOffset, y + s - 8, 4, 6);
    ctx.fillRect(x + s - 9 - legOffset, y + s - 8, 4, 6);
  }

  private renderSpeed(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
    // Streamlined body
    ctx.fillStyle = '#A0724A';
    ctx.beginPath();
    ctx.ellipse(x + s / 2, y + s / 2, s / 2 - 1, s / 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Belly
    ctx.fillStyle = '#D4B896';
    ctx.beginPath();
    ctx.ellipse(x + s / 2, y + s / 2 + 2, s / 3, s / 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.fillStyle = '#A0724A';
    const earDir = this.animFrame === 0 ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 4);
    ctx.lineTo(x + 8, y - 2);
    ctx.lineTo(x + 10, y + 4);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + s - 4, y + 4);
    ctx.lineTo(x + s - 8, y - 2);
    ctx.lineTo(x + s - 10, y + 4);
    ctx.fill();

    // Eyes (darting)
    ctx.fillStyle = '#FF4444';
    const eyeX = this.animFrame === 0 ? 3 : 5;
    ctx.fillRect(x + eyeX, y + s / 3, 3, 2);
    ctx.fillRect(x + s - 6 - eyeX, y + s / 3, 3, 2);

    // Tail
    ctx.strokeStyle = '#A0724A';
    ctx.lineWidth = 2;
    const tailWave = Math.sin(Date.now() / 200) * 3;
    ctx.beginPath();
    ctx.moveTo(x + s - 2, y + s / 2);
    ctx.quadraticCurveTo(x + s + 4, y + s / 2 + tailWave, x + s + 6, y + s / 2 - 2);
    ctx.stroke();

    // Motion lines
    ctx.strokeStyle = '#D4B896';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const ly = y + 6 + i * 6;
      ctx.beginPath();
      ctx.moveTo(x - 2, ly);
      ctx.lineTo(x - 8 - i * 2, ly);
      ctx.stroke();
    }
  }

  private renderArmored(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
    // Body (bulky)
    ctx.fillStyle = '#6E6E6E';
    ctx.fillRect(x + 2, y + 4, s - 4, s - 8);

    // Armor plates
    ctx.fillStyle = '#9E9E9E';
    ctx.fillRect(x + 4, y + 6, s - 8, 6);
    ctx.fillRect(x + 6, y + s / 2 - 2, s - 12, 4);

    // Helmet
    ctx.fillStyle = '#3A3A3A';
    ctx.fillRect(x + 6, y + 2, s - 12, 8);
    ctx.fillStyle = '#1A1A2E';
    ctx.fillRect(x + 9, y + 4, s - 18, 2); // visor

    // Cape
    ctx.fillStyle = '#8B0000';
    const capeWave = Math.sin(Date.now() / 300) * 2;
    ctx.beginPath();
    ctx.moveTo(x + 4, y + s - 6);
    ctx.lineTo(x + 2, y + s + 2 + capeWave);
    ctx.lineTo(x + s - 2, y + s + 2 - capeWave);
    ctx.lineTo(x + s - 4, y + s - 6);
    ctx.fill();

    // Shield
    ctx.fillStyle = '#C8C8C8';
    ctx.fillRect(x - 2, y + s / 2 - 4, 6, 10);
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(x, y + s / 2 - 2, 2, 6);

    // Legs (heavy stance)
    const legSpread = this.animFrame === 0 ? 3 : -3;
    ctx.fillStyle = '#6E6E6E';
    ctx.fillRect(x + 5 + legSpread, y + s - 8, 6, 8);
    ctx.fillRect(x + s - 11 - legSpread, y + s - 8, 6, 8);

    // Ground crack effect when walking
    if (this.animFrame === 1) {
      ctx.fillStyle = '#8B5E2A';
      ctx.fillRect(x + 3, y + s - 1, 4, 2);
      ctx.fillRect(x + s - 7, y + s - 1, 4, 2);
    }
  }

  private renderRegenerating(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
    const pulse = Math.sin(Date.now() / 300) * 2;

    // Blob body (amorphous)
    ctx.fillStyle = '#A855F7';
    ctx.beginPath();
    const bulgeX = this.animFrame === 0 ? -2 : 2;
    ctx.ellipse(x + s / 2 + bulgeX, y + s / 2 + pulse, s / 2 - 1, s / 2 - 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = '#D8B4FE';
    ctx.beginPath();
    ctx.ellipse(x + s / 2 - 3, y + s / 3 - 1, 5, 3, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#1A1A2E';
    ctx.beginPath();
    ctx.arc(x + 8, y + s / 2 - 2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + s - 8, y + s / 2 - 2, 2, 0, Math.PI * 2);
    ctx.fill();

    // Mouth
    ctx.strokeStyle = '#1A1A2E';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x + s / 2, y + s / 2 + 4, 3, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Healing particles (+ symbols)
    const time = Date.now() / 500;
    for (let i = 0; i < 3; i++) {
      const angle = time + (i * Math.PI * 2) / 3;
      const px = x + s / 2 + Math.cos(angle) * (s / 2 + 4);
      const py = y + s / 2 + Math.sin(angle) * (s / 2 - 2);
      ctx.fillStyle = '#3DC83D';
      ctx.font = '8px monospace';
      ctx.fillText('+', px, py);
    }

    // Bottom bulge animation
    const bottomBulge = this.animFrame === 0 ? 3 : -1;
    ctx.fillStyle = '#A855F7';
    ctx.beginPath();
    ctx.ellipse(x + s / 2 + bottomBulge, y + s - 4, s / 3, 4, 0, 0, Math.PI);
    ctx.fill();
  }

  private renderBoss(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
    // Body (large)
    ctx.fillStyle = '#CC2200';
    ctx.fillRect(x + 4, y + 8, s - 8, s - 16);

    // Wings
    const wingFlap = Math.sin(Date.now() / 250) * 3;
    ctx.fillStyle = '#FF4444';
    // Left wing
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 12);
    ctx.lineTo(x - 4, y + 4 + wingFlap);
    ctx.lineTo(x + 2, y + 8);
    ctx.fill();
    // Right wing
    ctx.beginPath();
    ctx.moveTo(x + s - 4, y + 12);
    ctx.lineTo(x + s + 4, y + 4 + wingFlap);
    ctx.lineTo(x + s - 2, y + 8);
    ctx.fill();

    // Head
    ctx.fillStyle = '#CC2200';
    ctx.fillRect(x + 6, y + 2, s - 12, 10);

    // Horns
    ctx.fillStyle = '#C8C8C8';
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 4);
    ctx.lineTo(x + 6, y - 2);
    ctx.lineTo(x + 12, y + 4);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + s - 8, y + 4);
    ctx.lineTo(x + s - 6, y - 2);
    ctx.lineTo(x + s - 12, y + 4);
    ctx.fill();

    // Eyes (glowing)
    const eyeGlow = Math.sin(Date.now() / 200) > 0 ? '#FFD700' : '#FFFACD';
    ctx.fillStyle = eyeGlow;
    ctx.fillRect(x + 10, y + 5, 4, 3);
    ctx.fillRect(x + s - 14, y + 5, 4, 3);

    // Mouth
    ctx.fillStyle = '#8B0000';
    ctx.fillRect(x + 10, y + 9, s - 20, 2);

    // Claws (raised)
    const clawDir = this.animFrame === 0 ? -3 : 3;
    ctx.fillStyle = '#C8C8C8';
    // Left claws
    ctx.fillRect(x + 2, y + s / 2 - 4 + clawDir, 6, 10);
    ctx.fillRect(x + 4, y + s / 2 - 6 + clawDir, 3, 6);
    // Right claws
    ctx.fillRect(x + s - 8, y + s / 2 - 4 - clawDir, 6, 10);
    ctx.fillRect(x + s - 7, y + s / 2 - 6 - clawDir, 3, 6);

    // Tail
    const tailSwing = Math.sin(Date.now() / 350) * 5;
    ctx.strokeStyle = '#CC2200';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + s / 2, y + s - 4);
    ctx.quadraticCurveTo(x + s / 2 + tailSwing, y + s + 4, x + s / 2 + tailSwing * 1.5, y + s + 8);
    ctx.stroke();

    // Ground tremor lines
    if (this.animFrame === 0) {
      ctx.strokeStyle = '#8B5E2A';
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const tx = x - 4 + i * (s + 8);
        ctx.beginPath();
        ctx.moveTo(tx, y + s + 2);
        ctx.lineTo(tx + 6, y + s + 4);
        ctx.lineTo(tx + 12, y + s + 2);
        ctx.stroke();
      }
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
