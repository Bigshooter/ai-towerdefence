import { Position, Size } from '../types';

export class CollisionSystem {
  /** Check if two axis-aligned bounding boxes overlap */
  static checkOverlap(
    a: { position: Position; size: Size },
    b: { position: Position; size: Size }
  ): boolean {
    return (
      a.position.x < b.position.x + b.size.width &&
      a.position.x + a.size.width > b.position.x &&
      a.position.y < b.position.y + b.size.height &&
      a.position.y + a.size.height > b.position.y
    );
  }

  /** Check if a point is inside a circle */
  static pointInCircle(
    point: Position,
    center: Position,
    radius: number
  ): boolean {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    return dx * dx + dy * dy <= radius * radius;
  }

  /** Check if a circle overlaps with another circle */
  static circlesOverlap(
    a: { position: Position; size: Size },
    b: { position: Position; size: Size }
  ): boolean {
    const ra = Math.max(a.size.width, a.size.height) / 2;
    const rb = Math.max(b.size.width, b.size.height) / 2;

    const centerA = {
      x: a.position.x + a.size.width / 2,
      y: a.position.y + a.size.height / 2,
    };
    const centerB = {
      x: b.position.x + b.size.width / 2,
      y: b.position.y + b.size.height / 2,
    };

    return this.pointInCircle(centerB, centerA, ra + rb);
  }

  /** Get distance between two positions */
  static distance(a: Position, b: Position): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
