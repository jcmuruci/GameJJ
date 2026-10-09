/** Constantes globais do jogo. */
export const GAME_W = 960;
export const GAME_H = 540;
/** Zoom da câmera do mundo: 960x540 / 2 = 480x270 pixels de "arte". */
export const ZOOM = 2;
export const TILE = 16;

/**
 * Fator de resolução: o jogo continua pensando em 960x540, mas desenha o canvas
 * em 960x540 × RES, de acordo com a tela (Full HD = 2, celular/retina = 3).
 * Assim pixel art, textos e contornos ficam nítidos em vez de esticados.
 */
export const RES = (() => {
  if (typeof window === 'undefined') return 1;
  const forced = Number(new URLSearchParams(window.location.search).get('res'));
  if (forced >= 1 && forced <= 4) return Math.round(forced);
  const dpr = window.devicePixelRatio || 1;
  const fit = Math.min((window.innerWidth * dpr) / 960, (window.innerHeight * dpr) / 540);
  return Math.max(1, Math.min(3, Math.round(fit)));
})();

export const FONT = '"Pixelify Sans", "Courier New", monospace';

export const COLORS = {
  bg: 0x1b1424,
  ink: '#2a1d2e',
  cream: '#fff4e0',
  pink: '#ff7aa8',
  pinkDark: '#c94a7a',
  blue: '#6cc4ff',
  blueDark: '#3a7bd5',
  gold: '#ffd25e',
  green: '#8be07a',
  red: '#ff5c5c',
  p1: 0x6cc4ff,
  p2: 0xff7aa8,
};

export const PLAYER_COLORS = ['#6cc4ff', '#ff9cc2'] as const;
export const PLAYER_TINTS = [0x6cc4ff, 0xff9cc2] as const;
