/** Índices do tileset gerado em Textures.ts (sem dependência do Phaser). */
export const T = {
  GRASS: 0, GRASS_FLOWERS: 1, GRASS_TUFT: 2, PATH: 3, WATER: 4, TREE: 5, HEDGE: 6, STONE_WALL: 7,
  WOOD_FLOOR: 8, DARK_GRASS: 9, CLIFF: 10, BRIDGE: 11, SAND: 12, FENCE: 13, FLOWERBED: 14,
  STONE_FLOOR: 15, SKY: 16, CLOUD_EDGE: 17, CARPET: 18,
  /** Topo da pedra grande (granito claro com líquen). */
  GRANITE: 19,
  /** Face vertical de rocha (rapel / paredão). */
  ROCK_FACE: 20,
  /** Piso emborrachado da academia de escalada. */
  GYM_FLOOR: 21,
  /** Parede de escalada indoor com agarras coloridas. */
  CLIMB_WALL: 22,
  /** Parede interna pintada. */
  INDOOR_WALL: 23,
  /** Paredão de pedra do cânion. */
  CANYON_WALL: 24,
  /** Campo rupestre: grama baixa com pedrinhas. */
  ROCKY_GRASS: 25,
  /** Afloramento de rocha com arbustos (borda das trilhas de montanha). */
  SHRUB_ROCK: 26,
} as const;
export const TILE_COUNT = 27;
export const SOLID_TILES: number[] = [T.WATER, T.TREE, T.HEDGE, T.STONE_WALL, T.CLIFF, T.FENCE, T.SKY, T.ROCK_FACE, T.CLIMB_WALL, T.INDOOR_WALL, T.CANYON_WALL, T.SHRUB_ROCK];
/** Tiles de "penhasco": dá para descer de rapel ou subir escalando. */
export const CLIFF_TILES: number[] = [T.CLIFF, T.ROCK_FACE, T.CLIMB_WALL];
