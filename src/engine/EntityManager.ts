import { Entity } from '../types';

export class EntityManager {
  private entities: Map<string, Entity> = new Map();
  private nextId: number = 0;

  add(entity: Entity): void {
    this.entities.set(entity.id, entity);
  }

  remove(id: string): void {
    this.entities.delete(id);
  }

  get(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  getAll(): Entity[] {
    return Array.from(this.entities.values());
  }

  update(dt: number): void {
    for (const entity of this.entities.values()) {
      if (!entity.alive) continue;
      // Entities can implement their own update logic
    }
  }

  cleanup(): void {
    for (const [id, entity] of this.entities) {
      if (!entity.alive) {
        this.entities.delete(id);
      }
    }
  }

  get count(): number {
    return this.entities.size;
  }
}
