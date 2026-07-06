import { Position, Size } from '../types';

export abstract class BaseEntity {
  id: string;
  position: Position;
  size: Size;
  alive: boolean = true;

  constructor(id: string, x: number, y: number, width: number, height: number) {
    this.id = id;
    this.position = { x, y };
    this.size = { width, height };
  }

  abstract update(dt: number): void;
  abstract render(ctx: CanvasRenderingContext2D): void;

  kill(): void {
    this.alive = false;
  }

  get centerX(): number {
    return this.position.x + this.size.width / 2;
  }

  get centerY(): number {
    return this.position.y + this.size.height / 2;
  }

  distanceTo(other: { position: Position }): number {
    const dx = this.centerX - other.position.x;
    const dy = this.centerY - other.position.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
