import { Position } from '../types';
import { SpaceSprites } from '../visuals/SpaceSprites';

export type TileType = 'grass' | 'path' | 'wall' | 'water' | 'tree' | 'road_edge';

const TILE_SIZE = 32;
const MAP_WIDTH = 40;
const MAP_HEIGHT = 30;

// Map layout: 0=grass, 1=path, 2=wall, 3=water, 4=tree, 5=road_edge
// A single-width serpentine path. Enemies ENTER at the left edge (row 4) and
// EXIT at the right edge (row 26). The path never runs parallel to itself
// within one tile, so the direction of travel is always unambiguous.
const MAP_LAYOUT: number[][] = [
  // Row 0
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // Row 1
  [0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // Row 2
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // Row 3
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0],
  // Row 4 - ENTRY: path enters from the left edge and heads right
  [1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // Row 5 - path turns down
  [0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // Row 6
  [0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // Row 7
  [0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // Row 8 - decorative wall cluster to the right
  [0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // Row 9
  [0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // Row 10 - path turns left
  [0,0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // Row 11 - path turns down
  [0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // Row 12
  [0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // Row 13
  [0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0],
  // Row 14
  [0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // Row 15
  [0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // Row 16 - long stretch to the right
  [0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // Row 17 - path turns down
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // Row 18
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // Row 19 - decorative water pool to the right
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,3,3,3,3,0,0,0,0,0,0],
  // Row 20
  [0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,3,3,3,3,0,0,0,0,0,0],
  // Row 21
  [0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,3,3,3,3,0,0,0,0,0,0],
  // Row 22 - path turns left
  [0,0,0,0,0,0,0,0,0,2,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // Row 23 - path turns down
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // Row 24
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // Row 25
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // Row 26 - EXIT: path heads right and leaves at the right edge
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  // Row 27
  [0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,0],
  // Row 28
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // Row 29
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

export class TileMap {
  private tiles: number[][];
  public readonly width: number = MAP_WIDTH;
  public readonly height: number = MAP_HEIGHT;
  public readonly tileSize: number = TILE_SIZE;

  constructor() {
    this.tiles = MAP_LAYOUT.map(row => [...row]);
  }

  getTile(x: number, y: number): TileType {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 'grass';
    const tile = this.tiles[y][x];
    switch (tile) {
      case 0: return 'grass';
      case 1: return 'path';
      case 2: return 'wall';
      case 3: return 'water';
      case 4: return 'tree';
      case 5: return 'road_edge';
      default: return 'grass';
    }
  }

  isWalkable(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    return tile === 'path' || tile === 'road_edge';
  }

  isBuildable(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    return tile === 'grass' || tile === 'road_edge';
  }

  toPixelX(col: number): number {
    return col * this.tileSize;
  }

  toPixelY(row: number): number {
    return row * this.tileSize;
  }

  toCol(x: number): number {
    return Math.floor(x / this.tileSize);
  }

  toRow(y: number): number {
    return Math.floor(y / this.tileSize);
  }

  getPixelWidth(): number {
    return this.width * this.tileSize;
  }

  getPixelHeight(): number {
    return this.height * this.tileSize;
  }

  /** Render the tile map to a canvas context */
  render(ctx: CanvasRenderingContext2D): void {
    SpaceSprites.drawBackdrop(ctx, this.getPixelWidth(), this.getPixelHeight(), Date.now() / 1000);

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.getTile(x, y);
        this.renderTile(ctx, x, y, tile);
      }
    }

    // Overlay directional flow arrows and the entry/exit portals so it is
    // always clear where enemies come from and where they are headed.
    this.renderPathFlow(ctx);
    this.renderEndpoints(ctx);
  }

  /** Draw faint chevrons along the path indicating the direction of travel */
  private renderPathFlow(ctx: CanvasRenderingContext2D): void {
    const waypoints = this.getWaypoints();
    if (waypoints.length < 2) return;

    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#FFE08A';
    for (let i = 0; i < waypoints.length - 1; i += 2) {
      const a = waypoints[i];
      const b = waypoints[i + 1];
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const angle = Math.atan2(b.y - a.y, b.x - a.x);

      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(-5, -6);
      ctx.lineTo(5, 0);
      ctx.lineTo(-5, 6);
      ctx.lineTo(-1, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  /** Draw clearly labelled entry (START) and exit (EXIT) portals */
  private renderEndpoints(ctx: CanvasRenderingContext2D): void {
    const start = this.getStartPosition();
    const end = this.getEndPosition();
    const t = Date.now() / 300;

    this.drawPortal(ctx, start.x, start.y, '#3DC83D', '#0F6F0F', 'START', t);
    this.drawPortal(ctx, end.x, end.y, '#FF6B6B', '#8B1A1A', 'EXIT', t + Math.PI);
  }

  private drawPortal(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    dark: string,
    label: string,
    t: number,
  ): void {
    const pulse = 2 + Math.sin(t) * 2;

    ctx.save();

    // Pulsing glow ring
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 15 + pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Portal body
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fill();

    // Direction arrow (travel is left-to-right at both endpoints)
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 5);
    ctx.lineTo(x + 5, y);
    ctx.lineTo(x - 4, y + 5);
    ctx.closePath();
    ctx.fill();

    // Label banner above the portal
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    const tw = ctx.measureText(label).width;
    const bx = Math.max(2, Math.min(x - tw / 2 - 4, this.getPixelWidth() - tw - 10));
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(bx, y - 36, tw + 8, 15);
    ctx.fillStyle = color;
    ctx.fillText(label, bx + tw / 2 + 4, y - 25);
    ctx.textAlign = 'left';

    ctx.restore();
  }

  private renderTile(ctx: CanvasRenderingContext2D, col: number, row: number, type: TileType): void {
    const px = col * this.tileSize;
    const py = row * this.tileSize;

    const variant = (col * 17 + row * 31) % 4;
    const connectionMask = this.getPathConnectionMask(col, row, type);
    SpaceSprites.drawTile(ctx, type, px, py, this.tileSize, variant, connectionMask);
  }

  private getPathConnectionMask(col: number, row: number, type: TileType): number {
    if (type !== 'path' && type !== 'road_edge') {
      return 0;
    }

    let mask = 0;
    if (this.isWalkable(col, row - 1)) mask |= 1; // up
    if (this.isWalkable(col + 1, row)) mask |= 2; // right
    if (this.isWalkable(col, row + 1)) mask |= 4; // down
    if (this.isWalkable(col - 1, row)) mask |= 8; // left
    return mask;
  }

  /** Get all path tiles as a set of coordinates for rendering */
  getPathTiles(): Position[] {
    const result: Position[] = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.isWalkable(x, y)) {
          result.push({ x: x * this.tileSize + this.tileSize / 2, y: y * this.tileSize + this.tileSize / 2 });
        }
      }
    }
    return result;
  }

  /** Get the start position of the path (first walkable tile) */
  getStartPosition(): Position {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.isWalkable(x, y)) {
          return { x: x * this.tileSize + this.tileSize / 2, y: y * this.tileSize + this.tileSize / 2 };
        }
      }
    }
    return { x: 16, y: 96 }; // fallback
  }

  /** Get the end position of the path (last walkable tile) */
  getEndPosition(): Position {
    let lastPos = this.getStartPosition();
    for (let y = this.height - 1; y >= 0; y--) {
      for (let x = this.width - 1; x >= 0; x--) {
        if (this.isWalkable(x, y)) {
          lastPos = { x: x * this.tileSize + this.tileSize / 2, y: y * this.tileSize + this.tileSize / 2 };
          return lastPos;
        }
      }
    }
    return lastPos;
  }

  /** Get waypoints along the path for enemy movement */
  getWaypoints(): Position[] {
    const waypoints: Position[] = [];
    let currentCol = -1;
    let currentRow = -1;

    // Find start
    for (let y = 0; y < this.height && currentCol === -1; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.isWalkable(x, y)) {
          currentRow = y;
          currentCol = x;
          break;
        }
      }
    }

    if (currentCol === -1) return [this.getStartPosition()];

    // Follow the path using a simple approach: trace connected walkable tiles
    const visited = new Set<string>();
    let cx = currentCol;
    let cy = currentRow;

    waypoints.push({ x: cx * this.tileSize + this.tileSize / 2, y: cy * this.tileSize + this.tileSize / 2 });
    visited.add(`${cx},${cy}`);

    const maxSteps = this.width * this.height;
    let steps = 0;

    while (steps < maxSteps) {
      // Check all 4 neighbors for next walkable tile
      const neighbors = [
        { dx: 1, dy: 0 },   // right
        { dx: 0, dy: 1 },   // down
        { dx: -1, dy: 0 },  // left
        { dx: 0, dy: -1 },  // up
      ];

      let found = false;
      for (const { dx, dy } of neighbors) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
          const key = `${nx},${ny}`;
          if (!visited.has(key) && this.isWalkable(nx, ny)) {
            cx = nx;
            cy = ny;
            waypoints.push({ x: cx * this.tileSize + this.tileSize / 2, y: cy * this.tileSize + this.tileSize / 2 });
            visited.add(key);
            found = true;
            break;
          }
        }
      }

      if (!found) break;
      steps++;
    }

    return waypoints;
  }
}
