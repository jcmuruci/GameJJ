import type { TrackName } from '../systems/Audio';

export interface LevelInfo {
  id: string;
  /** Mês da lembrança (rótulo na linha do tempo). */
  month: string;
  name: string;
  /** Nome curto para o mapa. */
  short: string;
  subtitle: string;
  scene: 'TutorialLevel' | 'KitchenLevel' | 'TrailLevel' | 'BossLevel' | 'MotoLevel' | 'AmazonLevel' | 'FarmLevel' | 'FishingLevel';
  story: string;
  /** História exibida depois de vencer. */
  endStory?: string;
  music: TrackName;
  map: { x: number; y: number };
  icon: { key: string; scale: number };
  /** Moedas de recompensa por estrela. */
  coinsPerStar: number;
  goal: string;
  /** Capítulo futuro: aparece bloqueado ("em breve"). */
  soon?: boolean;
  /** Lembrança ganha ao vencer. */
  reward?: 'medalha' | 'aliancas';
}

const R1 = 112;
const R2 = 228;
const R3 = 340;

/** A história do casal, capítulo por capítulo (julho/2025 → setembro/2026). */
export const LEVELS: LevelInfo[] = [
  {
    id: 'tutorial', month: 'Jul 2025', name: 'O Rapel', short: 'O Rapel', subtitle: 'Onde tudo começou (tutorial)', scene: 'TutorialLevel', story: 'tutorial', music: 'map',
    map: { x: 110, y: R1 }, icon: { key: 'big_rock', scale: 0.45 }, coinsPerStar: 10, goal: 'Aprendam a jogar juntos e desçam de rapel na Pedra Grande, em Caeté.',
  },
  {
    id: 'climb', month: 'Jan 2026', name: 'Escalada e Mirante', short: 'Escalada', subtitle: 'Escalada indoor com segurança', scene: 'TrailLevel', story: 'climb', music: 'forest',
    map: { x: 255, y: R1 }, icon: { key: 'holds', scale: 1.4 }, coinsPerStar: 15, goal: 'Subam a parede revezando a segurança e tirem a foto no mirante.',
  },
  {
    id: 'canyon', month: 'Fev 2026', name: 'Cânion e Lavras Novas', short: 'Cânion', subtitle: 'Pedras, água corrente e casas coloridas', scene: 'TrailLevel', story: 'canyon', music: 'forest',
    map: { x: 400, y: R1 }, icon: { key: 'house_c0', scale: 0.5 }, coinsPerStar: 15, goal: 'Atravessem o cânion e cheguem em Lavras Novas.',
  },
  {
    id: 'bread', month: 'Mar 2026', name: 'O Pão de Moto', short: 'Pão de Moto', subtitle: 'Uma noite, um pão e a carne de lata da família', scene: 'MotoLevel', story: 'bread', endStory: 'bread_end', music: 'road',
    map: { x: 545, y: R1 }, icon: { key: 'bakery', scale: 0.45 }, coinsPerStar: 15, goal: 'À noite, de moto: pão da padaria, carne de lata da família e direto pro condomínio dela.', reward: 'medalha',
  },
  {
    id: 'itacolomi', month: 'Abr 2026', name: 'Pico do Itacolomi', short: 'Itacolomi', subtitle: 'Trilha a pé... e o pedido de namoro', scene: 'TrailLevel', story: 'itacolomi', endStory: 'itacolomi_end', music: 'forest',
    map: { x: 690, y: R1 }, icon: { key: 'itacolomi', scale: 0.4 }, coinsPerStar: 20, goal: 'Subam até o pico. Lá em cima tem uma pergunta importante.',
  },
  {
    id: 'italiano', month: 'Mai 2026', name: 'O Italiano', short: 'O Italiano', subtitle: 'Alinhamentos, alianças e muita massa', scene: 'KitchenLevel', story: 'italiano', endStory: 'italiano_end', music: 'kitchen',
    map: { x: 835, y: R1 }, icon: { key: 'flag_italy', scale: 1 }, coinsPerStar: 20, goal: 'Salvem a cozinha do restaurante O Italiano.', reward: 'aliancas',
  },
  {
    id: 'junina', month: 'Jun 2026', name: 'Juiz de Fora e Festa Junina', short: 'Pescaria', subtitle: 'Os pais do João, a pescaria e o arraiá', scene: 'FishingLevel', story: 'junina', music: 'festival',
    map: { x: 835, y: R2 }, icon: { key: 'bobber', scale: 2 }, coinsPerStar: 20, goal: 'A Juliana aprende a pescar com o João... e de noite tem quadrilha!',
  },
  {
    id: 'roca', month: 'Jul 2026', name: 'Pneu Furado e Roça', short: 'Pneu e Roça', subtitle: 'O pneu fura, o caminho muda e o almoço é na roça', scene: 'MotoLevel', story: 'roca', endStory: 'roca_end', music: 'road',
    map: { x: 690, y: R2 }, icon: { key: 'moto_map', scale: 1.4 }, coinsPerStar: 20, goal: 'Consertem o pneu juntos e sigam pela estrada de terra até o restaurante de roça.',
  },
  {
    id: 'topo', month: 'Ago 2026', name: 'Topo do Mundo', short: 'Topo do Mundo', subtitle: 'As decolagens de parapente', scene: 'TrailLevel', story: 'topo', music: 'forest',
    map: { x: 545, y: R2 }, icon: { key: 'paraglider', scale: 0.8 }, coinsPerStar: 25, goal: 'Fotografem os parapentes e vejam uma decolagem de pertinho.',
  },
  {
    id: 'lapinha', month: 'Ago 2026', name: 'Lapinha da Serra', short: 'Lapinha', subtitle: 'Trilha, rio de pedra em pedra e cachoeira', scene: 'TrailLevel', story: 'lapinha', music: 'forest',
    map: { x: 400, y: R2 }, icon: { key: 'waterfall', scale: 0.5 }, coinsPerStar: 25, goal: 'Atravessem o rio pelas pedras e curtam a cachoeira.',
  },
  {
    id: 'farm', month: 'Set 2026', name: 'Hotel Fazenda', short: 'Hotel Fazenda', subtitle: 'A avestruz brava e o pedalinho', scene: 'FarmLevel', story: 'farm', endStory: 'farm_end', music: 'map',
    map: { x: 255, y: R2 }, icon: { key: 'ostrich', scale: 0.8 }, coinsPerStar: 25, goal: 'Carinho nos bichos, fuja da avestruz e mandem bem no pedalinho.',
  },
  {
    id: 'storm', month: 'Em breve', name: 'Próximo capítulo', short: '???', subtitle: 'Ainda vai acontecer...', scene: 'BossLevel', story: 'storm', endStory: 'ending', music: 'boss',
    map: { x: 110, y: R2 }, icon: { key: 'boss', scale: 0.4 }, coinsPerStar: 40, goal: 'Este capítulo ainda está sendo vivido.', soon: true,
  },
  {
    id: 'amazon', month: 'Em breve', name: 'Amazônia', short: 'Amazônia', subtitle: 'O sonho dos jacarés', scene: 'AmazonLevel', story: 'amazon', endStory: 'amazon_end', music: 'jungle',
    map: { x: 110, y: R3 }, icon: { key: 'gator', scale: 1.4 }, coinsPerStar: 40, goal: 'A viagem dos sonhos da Juliana. Em breve!', soon: true,
  },
];

/** Quantos capítulos estão liberados (sequencial, nunca libera os "em breve"). */
export function unlockedCount(done: (id: string) => boolean): number {
  let n = 1;
  for (let i = 0; i < LEVELS.length - 1; i++) {
    if (done(LEVELS[i].id)) n = i + 2;
    else break;
  }
  const firstSoon = LEVELS.findIndex((l) => l.soon);
  return Math.min(n, firstSoon < 0 ? LEVELS.length : firstSoon);
}

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
