/**
 * ============================================================
 *  APARÊNCIA DOS PROTAGONISTAS
 * ============================================================
 *  Estes são os valores PADRÃO dos dois personagens. Para deixá-los
 *  parecidos com vocês, edite as cores/estilos abaixo (ou use a tela
 *  "Personagens" dentro do jogo — as escolhas ficam salvas no navegador).
 *
 *  Todas as cores são hexadecimais (#rrggbb). Os sprites são gerados
 *  por código em src/art/CharacterArt.ts, então nenhuma imagem externa
 *  precisa ser substituída.
 */

export type HairStyle = 'curto' | 'topete' | 'longo' | 'ondulado' | 'cacheado' | 'rabo' | 'coque' | 'raspado';
export type Accessory = 'nenhum' | 'flor' | 'laco' | 'tiara' | 'bone' | 'chapeu' | 'brinco' | 'colar_sol';

export interface CharacterLook {
  name: string;
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  eyes: string;
  shirt: string;
  pants: string;
  shoes: string;
  beard: 'nenhuma' | 'rala' | 'cheia';
  /** Cor da barba (pode ser diferente do cabelo). */
  beardColor: string;
  /** Mechas/luzes nas pontas do cabelo ('' = sem mechas). */
  highlights: string;
  /** Cílios/delineado marcados. */
  lashes: boolean;
  glasses: boolean;
  accessory: Accessory;
  accessoryColor: string;
}

/**
 * Jogador 1 — o Guardião (força, espada, empurra pedras, corta ingredientes).
 * Baseado na foto: pele clara rosada, cabelo raspado castanho-claro, barba cheia,
 * olhos azul-acinzentados, moletom preto.
 */
export const DEFAULT_P1: CharacterLook = {
  name: 'Jota',
  skin: '#f0c2a2',
  hair: '#9a7656',
  hairStyle: 'raspado',
  eyes: '#5f8296',
  shirt: '#3a3844',
  pants: '#3f5a8a',
  shoes: '#4a3a30',
  beard: 'cheia',
  beardColor: '#8a6240',
  highlights: '',
  lashes: false,
  glasses: false,
  accessory: 'nenhum',
  accessoryColor: '#ffd25e',
};

/**
 * Jogador 2 — a Maga (magia: fogo, jacarés, runas; cozinha e abre caminhos).
 * Baseada na foto: pele morena dourada, cabelo longo ondulado castanho-escuro com
 * mechas claras nas pontas, olhos castanho-escuros com delineado, blusa preta e colar de sol.
 */
export const DEFAULT_P2: CharacterLook = {
  name: 'Mel',
  skin: '#c98d62',
  hair: '#3a2419',
  hairStyle: 'ondulado',
  eyes: '#2e1c12',
  shirt: '#3a3440',
  pants: '#3a4a70',
  shoes: '#5a3a3a',
  beard: 'nenhuma',
  beardColor: '#3a2419',
  highlights: '#8a6046',
  lashes: true,
  glasses: false,
  accessory: 'colar_sol',
  accessoryColor: '#c8a060',
};

/** Paletas oferecidas na tela de personalização. */
export const SKIN_TONES = ['#f6d3b8', '#f0c2a2', '#ecc19c', '#e8b48f', '#d9a07a', '#c98d62', '#c68a5f', '#a86e47', '#8a5634', '#6b3f24', '#4e2c18'];
export const HAIR_COLORS = ['#1c1414', '#3a2419', '#3b2a20', '#9a7656', '#8a6240', '#5a3a24', '#6b3e26', '#8a5a34', '#b07a3a', '#d6a85a', '#f0d48a', '#b83a2a', '#e06a8a', '#7a5ad6', '#d8d8e0'];
export const EYE_COLORS = ['#2e1c12', '#5f8296', '#3a2a1e', '#4a2f1e', '#1c1c2a', '#3a6a3a', '#3a5a9a', '#6a8aa0'];
export const CLOTH_COLORS = ['#3a3844', '#3a4a70', '#3f7fd6', '#2a9d8f', '#4fa35a', '#e9c46a', '#f4a261', '#e76f51', '#d64545', '#b25bd6', '#ff7aa8', '#f0f0f0', '#3b3f5c', '#5b3f8c', '#2a2a2a', '#7a5a3a'];
export const HAIR_STYLES: HairStyle[] = ['curto', 'topete', 'longo', 'ondulado', 'cacheado', 'rabo', 'coque', 'raspado'];
export const ACCESSORIES: Accessory[] = ['nenhum', 'flor', 'laco', 'tiara', 'bone', 'chapeu', 'brinco', 'colar_sol'];
export const HIGHLIGHT_COLORS = ['', '#8a6046', '#b07a3a', '#d6a85a', '#f0d48a', '#e06a8a', '#7a5ad6'];
export const BEARDS: CharacterLook['beard'][] = ['nenhuma', 'rala', 'cheia'];

export const HAIR_STYLE_LABEL: Record<HairStyle, string> = {
  curto: 'Curto', topete: 'Topete', longo: 'Longo liso', ondulado: 'Longo ondulado',
  cacheado: 'Cacheado', rabo: 'Rabo de cavalo', coque: 'Coque', raspado: 'Raspado',
};
export const ACCESSORY_LABEL: Record<Accessory, string> = {
  nenhum: 'Nenhum', flor: 'Flor', laco: 'Laço', tiara: 'Tiara', bone: 'Boné', chapeu: 'Chapéu', brinco: 'Brincos', colar_sol: 'Colar de sol',
};
