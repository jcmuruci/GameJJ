import type { TrackName } from '../systems/Audio';

export interface LevelInfo {
  id: string;
  name: string;
  subtitle: string;
  scene: 'TutorialLevel' | 'KitchenLevel' | 'ForestLevel' | 'BossLevel';
  story: string;
  music: TrackName;
  map: { x: number; y: number };
  /** Moedas de recompensa por estrela. */
  coinsPerStar: number;
  goal: string;
}

export const LEVELS: LevelInfo[] = [
  {
    id: 'tutorial', name: 'Quintal de Casa', subtitle: 'Tutorial', scene: 'TutorialLevel', story: 'tutorial', music: 'map',
    map: { x: 160, y: 330 }, coinsPerStar: 10, goal: 'Aprendam a jogar juntos.',
  },
  {
    id: 'picnic', name: 'Piquenique no Bosque', subtitle: 'Fase 1 · Cozinha cooperativa', scene: 'KitchenLevel', story: 'picnic', music: 'kitchen',
    map: { x: 320, y: 250 }, coinsPerStar: 15, goal: 'Preparem pedidos antes que o tempo acabe.',
  },
  {
    id: 'forest', name: 'Floresta Sussurrante', subtitle: 'Fase 2 · Exploração e enigmas', scene: 'ForestLevel', story: 'forest', music: 'forest',
    map: { x: 480, y: 330 }, coinsPerStar: 20, goal: 'Atravessem a floresta e achem os 3 cristais.',
  },
  {
    id: 'festival', name: 'Festival da Vila', subtitle: 'Fase 3 · Cozinha caótica', scene: 'KitchenLevel', story: 'festival', music: 'festival',
    map: { x: 640, y: 240 }, coinsPerStar: 25, goal: 'Salvem o banquete do festival!',
  },
  {
    id: 'storm', name: 'Torre da Tempestade', subtitle: 'Fase final · Chefe', scene: 'BossLevel', story: 'storm', music: 'boss',
    map: { x: 820, y: 150 }, coinsPerStar: 40, goal: 'Derrotem o Nimbo e salvem a noite!',
  },
];

export function levelById(id: string): LevelInfo {
  const l = LEVELS.find((x) => x.id === id);
  if (!l) throw new Error(`Fase desconhecida: ${id}`);
  return l;
}

export function levelIndex(id: string): number {
  return LEVELS.findIndex((x) => x.id === id);
}

export interface UpgradeInfo {
  key: 'speed' | 'hearts' | 'blade' | 'spark';
  name: string;
  desc: string;
  costs: number[];
  who: string;
}

export const UPGRADES: UpgradeInfo[] = [
  { key: 'speed', name: 'Botas Saltitantes', desc: '+8% de velocidade para os dois', costs: [30, 60, 100], who: 'Ambos' },
  { key: 'hearts', name: 'Coração Extra', desc: '+1 coração máximo para os dois', costs: [50, 110], who: 'Ambos' },
  { key: 'blade', name: 'Lâmina Afiada', desc: 'Corta mais rápido e bate mais forte', costs: [40, 90], who: '{p1}' },
  { key: 'spark', name: 'Faísca Eterna', desc: 'Fogo dura mais e magia recarrega rápido', costs: [40, 90], who: '{p2}' },
];
