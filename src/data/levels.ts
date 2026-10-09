import type { TrackName } from '../systems/Audio';

export interface LevelInfo {
  id: string;
  name: string;
  subtitle: string;
  scene: 'TutorialLevel' | 'KitchenLevel' | 'ForestLevel' | 'BossLevel' | 'MotoLevel' | 'AmazonLevel';
  story: string;
  /** História exibida depois de vencer (final). */
  endStory?: string;
  music: TrackName;
  map: { x: number; y: number };
  /** Moedas de recompensa por estrela. */
  coinsPerStar: number;
  goal: string;
}

export const LEVELS: LevelInfo[] = [
  {
    id: 'tutorial', name: 'Pedra Grande', subtitle: 'Tutorial · Onde tudo começou', scene: 'TutorialLevel', story: 'tutorial', music: 'map',
    map: { x: 140, y: 330 }, coinsPerStar: 10, goal: 'Aprendam a jogar juntos e desçam de rapel.',
  },
  {
    id: 'moto', name: 'Moto Amarela', subtitle: 'Fase 1 · Passeio na estrada', scene: 'MotoLevel', story: 'moto', music: 'road',
    map: { x: 245, y: 225 }, coinsPerStar: 15, goal: 'Pilotem até a cachoeira e tirem 3 fotos.',
  },
  {
    id: 'picnic', name: 'Piquenique na Cachoeira', subtitle: 'Fase 2 · Cozinhando juntos', scene: 'KitchenLevel', story: 'picnic', music: 'kitchen',
    map: { x: 370, y: 310 }, coinsPerStar: 15, goal: 'Preparem os pedidos antes que o tempo acabe.',
  },
  {
    id: 'forest', name: 'Trilha da Cachoeira', subtitle: 'Fase 3 · Exploração e enigmas', scene: 'ForestLevel', story: 'forest', music: 'forest',
    map: { x: 495, y: 215 }, coinsPerStar: 20, goal: 'Atravessem a trilha e achem os 3 cristais.',
  },
  {
    id: 'festival', name: 'Restaurante da Vila', subtitle: 'Fase 4 · Cozinha caótica', scene: 'KitchenLevel', story: 'festival', music: 'festival',
    map: { x: 620, y: 310 }, coinsPerStar: 25, goal: 'Salvem o jantar do restaurante!',
  },
  {
    id: 'storm', name: 'Torre da Tempestade', subtitle: 'Fase 5 · Chefe', scene: 'BossLevel', story: 'storm', endStory: 'ending', music: 'boss',
    map: { x: 800, y: 150 }, coinsPerStar: 40, goal: 'Derrotem o Nimbo e salvem a noite!',
  },
  {
    id: 'amazon', name: 'Amazônia', subtitle: 'Epílogo · Um ano depois', scene: 'AmazonLevel', story: 'amazon', endStory: 'amazon_end', music: 'jungle',
    map: { x: 875, y: 330 }, coinsPerStar: 40, goal: 'Levem os 3 filhotes de jacaré até a mamãe.',
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
