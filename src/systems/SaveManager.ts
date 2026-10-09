import { CharacterLook, DEFAULT_P1, DEFAULT_P2 } from '../data/characters';

export interface LevelRecord {
  done: boolean;
  stars: number;
  best: number;
}

export interface Upgrades {
  speed: number; // Botas velozes (ambos)
  hearts: number; // Corações extras (ambos)
  blade: number; // Lâmina afiada (Jogador 1)
  spark: number; // Faísca mágica (Jogador 2)
}

export interface Settings {
  music: number;
  sfx: number;
  padSwap: boolean;
}

export interface SaveData {
  version: 1;
  looks: [CharacterLook, CharacterLook];
  levels: Record<string, LevelRecord>;
  coins: number;
  upgrades: Upgrades;
  settings: Settings;
  seenIntro: boolean;
}

export const SAVE_KEY = 'juntos-save-v1';

export function defaultSave(): SaveData {
  return {
    version: 1,
    looks: [{ ...DEFAULT_P1 }, { ...DEFAULT_P2 }],
    levels: {},
    coins: 0,
    upgrades: { speed: 0, hearts: 0, blade: 0, spark: 0 },
    settings: { music: 0.5, sfx: 0.7, padSwap: false },
    seenIntro: false,
  };
}

/** Mescla dados salvos (possivelmente antigos/incompletos) com os padrões. */
export function sanitize(raw: unknown): SaveData {
  const base = defaultSave();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<SaveData>;
  const looks = Array.isArray(r.looks) && r.looks.length === 2
    ? ([{ ...DEFAULT_P1, ...r.looks[0] }, { ...DEFAULT_P2, ...r.looks[1] }] as [CharacterLook, CharacterLook])
    : base.looks;
  const levels: Record<string, LevelRecord> = {};
  if (r.levels && typeof r.levels === 'object') {
    for (const [k, v] of Object.entries(r.levels)) {
      if (v && typeof v === 'object') {
        levels[k] = {
          done: !!v.done,
          stars: clampInt(v.stars, 0, 3),
          best: Number.isFinite(v.best) ? Number(v.best) : 0,
        };
      }
    }
  }
  return {
    version: 1,
    looks,
    levels,
    coins: Math.max(0, Number.isFinite(r.coins) ? Math.floor(Number(r.coins)) : 0),
    upgrades: { ...base.upgrades, ...(r.upgrades ?? {}) },
    settings: { ...base.settings, ...(r.settings ?? {}) },
    seenIntro: !!r.seenIntro,
  };
}

function clampInt(v: unknown, min: number, max: number): number {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

class SaveManagerImpl {
  data: SaveData = defaultSave();

  load(): SaveData {
    try {
      const txt = localStorage.getItem(SAVE_KEY);
      this.data = txt ? sanitize(JSON.parse(txt)) : defaultSave();
    } catch {
      this.data = defaultSave();
    }
    return this.data;
  }

  save(): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch {
      /* armazenamento indisponível (aba anônima, etc.) — o jogo segue sem salvar */
    }
  }

  reset(): void {
    const looks = this.data.looks;
    const settings = this.data.settings;
    this.data = defaultSave();
    this.data.looks = looks;
    this.data.settings = settings;
    this.save();
  }

  record(levelId: string, stars: number, score: number): { newBest: boolean } {
    const prev = this.data.levels[levelId] ?? { done: false, stars: 0, best: 0 };
    const newBest = score > prev.best;
    this.data.levels[levelId] = {
      done: prev.done || stars > 0,
      stars: Math.max(prev.stars, stars),
      best: Math.max(prev.best, score),
    };
    this.save();
    return { newBest };
  }

  get totalStars(): number {
    return Object.values(this.data.levels).reduce((s, l) => s + l.stars, 0);
  }
}

export const Save = new SaveManagerImpl();
