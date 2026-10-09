/** Índices do tileset gerado em Textures.ts (sem dependência do Phaser). */
export const T = {
  GRASS: 0, GRASS_FLOWERS: 1, GRASS_TUFT: 2, PATH: 3, WATER: 4, TREE: 5, HEDGE: 6, STONE_WALL: 7,
  WOOD_FLOOR: 8, DARK_GRASS: 9, CLIFF: 10, BRIDGE: 11, SAND: 12, FENCE: 13, FLOWERBED: 14,
  STONE_FLOOR: 15, SKY: 16, CLOUD_EDGE: 17, CARPET: 18,
} as const;
export const TILE_COUNT = 19;
export const SOLID_TILES = [T.WATER, T.TREE, T.HEDGE, T.STONE_WALL, T.CLIFF, T.FENCE, T.SKY];
