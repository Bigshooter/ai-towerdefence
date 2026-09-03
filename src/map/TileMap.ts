import { MapType, Position } from '../types';
import { SpaceSprites } from '../visuals/SpaceSprites';

export type TileType = 'grass' | 'path' | 'wall' | 'water' | 'tree' | 'road_edge';

const TILE_SIZE = 32;
const MAP_WIDTH = 40;
const MAP_HEIGHT = 30;

// 0=grass, 1=path, 2=wall, 3=water/hazard, 4=tree/prop, 5=road_edge

// Map 1: Space Station (Winding Serpentine Orbital Conduits)
const SPACE_MAP_LAYOUT: number[][] = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0],
  [0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,3,3,3,3,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,3,3,3,3,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,3,3,3,3,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,2,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

// Map 2: Dungeon Catacombs (Subterranean Crypt Switchbacks & Chokepoints)
const DUNGEON_MAP_LAYOUT: number[][] = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,2,2,0,0,0,0,0,0,0,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0],
  [0,0,2,2,0,0,0,0,0,0,0,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,1,1,1,1,1],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0],
  [0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0],
  [0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0],
  [0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0],
  [0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0],
  [0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,0,0,3,3,3,0,0,0,0,0,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,0,0,3,3,3,0,0,0,0,0,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,0,0,3,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

// Map 3: Military Trench & Outpost (Northern Perimeter Sweep to Southern Runway Sprint)
const MILITARY_MAP_LAYOUT: number[][] = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

const MAP_DEFINITIONS: Record<MapType, number[][]> = {
  space: SPACE_MAP_LAYOUT,
  dungeon: DUNGEON_MAP_LAYOUT,
  military: MILITARY_MAP_LAYOUT,
};

export class TileMap {
  private tiles: number[][];
  private currentMapType: MapType = 'space';
  public readonly width: number = MAP_WIDTH;
  public readonly height: number = MAP_HEIGHT;
  public readonly tileSize: number = TILE_SIZE;

  constructor(mapType: MapType = 'space') {
    this.currentMapType = mapType;
    this.tiles = (MAP_DEFINITIONS[mapType] ?? SPACE_MAP_LAYOUT).map(row => [...row]);
  }

  setMap(mapType: MapType): void {
    this.currentMapType = mapType;
    this.tiles = (MAP_DEFINITIONS[mapType] ?? SPACE_MAP_LAYOUT).map(row => [...row]);
  }

  getMapType(): MapType {
    return this.currentMapType;
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
    SpaceSprites.drawBackdrop(ctx, this.getPixelWidth(), this.getPixelHeight(), Date.now() / 1000, this.currentMapType);

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
    ctx.fillStyle = this.currentMapType === 'dungeon' ? '#FFAA44' : this.currentMapType === 'military' ? '#FFE57F' : '#FFE08A';
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

    const startColor = this.currentMapType === 'dungeon' ? '#4ADE80' : this.currentMapType === 'military' ? '#22C55E' : '#3DC83D';
    const startDark = this.currentMapType === 'dungeon' ? '#064E3B' : this.currentMapType === 'military' ? '#14532D' : '#0F6F0F';
    const exitColor = this.currentMapType === 'dungeon' ? '#F87171' : this.currentMapType === 'military' ? '#EF4444' : '#FF6B6B';
    const exitDark = this.currentMapType === 'dungeon' ? '#7F1D1D' : this.currentMapType === 'military' ? '#991B1B' : '#8B1A1A';

    this.drawPortal(ctx, start.x, start.y, startColor, startDark, 'START', t);
    this.drawPortal(ctx, end.x, end.y, exitColor, exitDark, 'EXIT', t + Math.PI);
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

    // Direction arrow (travel is left-to-right at boundary endpoints)
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
    SpaceSprites.drawTile(ctx, type, px, py, this.tileSize, variant, connectionMask, this.currentMapType);
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

  /** Get the start position of the path (first walkable boundary tile) */
  getStartPosition(): Position {
    // Check left boundary first
    for (let y = 0; y < this.height; y++) {
      if (this.isWalkable(0, y)) {
        return { x: this.tileSize / 2, y: y * this.tileSize + this.tileSize / 2 };
      }
    }
    // Check top boundary
    for (let x = 0; x < this.width; x++) {
      if (this.isWalkable(x, 0)) {
        return { x: x * this.tileSize + this.tileSize / 2, y: this.tileSize / 2 };
      }
    }
    return { x: 16, y: 96 }; // fallback
  }

  /** Get the end position of the path (last walkable boundary tile) */
  getEndPosition(): Position {
    // Check right boundary first
    for (let y = this.height - 1; y >= 0; y--) {
      if (this.isWalkable(this.width - 1, y)) {
        return { x: (this.width - 1) * this.tileSize + this.tileSize / 2, y: y * this.tileSize + this.tileSize / 2 };
      }
    }
    // Check bottom boundary
    for (let x = this.width - 1; x >= 0; x--) {
      if (this.isWalkable(x, this.height - 1)) {
        return { x: x * this.tileSize + this.tileSize / 2, y: (this.height - 1) * this.tileSize + this.tileSize / 2 };
      }
    }
    return this.getStartPosition();
  }

  /** Get waypoints along the path for enemy movement */
  getWaypoints(): Position[] {
    const waypoints: Position[] = [];
    const start = this.getStartPosition();
    const startCol = this.toCol(start.x);
    const startRow = this.toRow(start.y);

    const visited = new Set<string>();
    let cx = startCol;
    let cy = startRow;

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
