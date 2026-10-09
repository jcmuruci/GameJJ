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
export type Accessory = 'nenhum' | 'flor' | 'laco' | 'tiara' | 'bone' | 'chapeu' | 'brinco';

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
  glasses: boolean;
  accessory: Accessory;
  accessoryColor: string;
}

/** Jogador 1 — o Guardião (força, espada, empurra pedras, corta ingredientes). */
export const DEFAULT_P1: CharacterLook = {
  name: 'Jota',
  skin: '#d9a07a',
  hair: '#3b2a20',
  hairStyle: 'topete',
  eyes: '#3a2a1e',
  shirt: '#3f7fd6',
  pants: '#3b3f5c',
  shoes: '#5a3a2a',
  beard: 'rala',
  glasses: false,
  accessory: 'nenhum',
  accessoryColor: '#ffd25e',
};

/** Jogador 2 — a Maga (magia: fogo, luz, runas; cozinha e abre caminhos). */
export const DEFAULT_P2: CharacterLook = {
  name: 'Mel',
  skin: '#e8b48f',
  hair: '#6b3e26',
  hairStyle: 'ondulado',
  eyes: '#4a2f1e',
  shirt: '#b25bd6',
  pants: '#5b3f8c',
  shoes: '#7a3a5a',
  beard: 'nenhuma',
  glasses: false,
  accessory: 'flor',
  accessoryColor: '#ff7aa8',
};

/** Paletas oferecidas na tela de personalização. */
export const SKIN_TONES = ['#f6d3b8', '#ecc19c', '#e8b48f', '#d9a07a', '#c68a5f', '#a86e47', '#8a5634', '#6b3f24', '#4e2c18'];
export const HAIR_COLORS = ['#1c1414', '#3b2a20', '#5a3a24', '#6b3e26', '#8a5a34', '#b07a3a', '#d6a85a', '#f0d48a', '#b83a2a', '#e06a8a', '#7a5ad6', '#d8d8e0'];
export const EYE_COLORS = ['#3a2a1e', '#4a2f1e', '#1c1c2a', '#3a6a3a', '#3a5a9a', '#6a8aa0'];
export const CLOTH_COLORS = ['#3f7fd6', '#2a9d8f', '#4fa35a', '#e9c46a', '#f4a261', '#e76f51', '#d64545', '#b25bd6', '#ff7aa8', '#f0f0f0', '#3b3f5c', '#5b3f8c', '#2a2a2a', '#7a5a3a'];
export const HAIR_STYLES: HairStyle[] = ['curto', 'topete', 'longo', 'ondulado', 'cacheado', 'rabo', 'coque', 'raspado'];
export const ACCESSORIES: Accessory[] = ['nenhum', 'flor', 'laco', 'tiara', 'bone', 'chapeu', 'brinco'];
export const BEARDS: CharacterLook['beard'][] = ['nenhuma', 'rala', 'cheia'];

export const HAIR_STYLE_LABEL: Record<HairStyle, string> = {
  curto: 'Curto', topete: 'Topete', longo: 'Longo liso', ondulado: 'Longo ondulado',
  cacheado: 'Cacheado', rabo: 'Rabo de cavalo', coque: 'Coque', raspado: 'Raspado',
};
export const ACCESSORY_LABEL: Record<Accessory, string> = {
  nenhum: 'Nenhum', flor: 'Flor', laco: 'Laço', tiara: 'Tiara', bone: 'Boné', chapeu: 'Chapéu', brinco: 'Brincos',
};
