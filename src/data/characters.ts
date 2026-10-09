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

export type HairStyle = 'careca' | 'curto' | 'topete' | 'longo' | 'ondulado' | 'cacheado' | 'rabo' | 'coque' | 'raspado';
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
  /** Tipo de corpo. */
  build: 'magro' | 'medio' | 'forte';
  sleeves: 'curtas' | 'longas';
  /** Tatuagem fechando um braço (vista de frente). */
  tattoo: 'nenhuma' | 'braco_direito' | 'braco_esquerdo' | 'dois_bracos';
  tattooColor: string;
  glasses: boolean;
  accessory: Accessory;
  accessoryColor: string;
}

/**
 * Jogador 1 — o Guardião (força, espada, empurra pedras, corta ingredientes).
 * Baseado na foto e na descrição: careca, barba loira, olhos azuis, corpo médio,
 * tatuagem tribal (preta) fechando o braço direito inteiro, camiseta preta.
 */
export const DEFAULT_P1: CharacterLook = {
  name: 'João',
  skin: '#f0c2a2',
  hair: '#d8b468',
  hairStyle: 'careca',
  eyes: '#3f8ad8',
  shirt: '#3a3844',
  pants: '#3f5a8a',
  shoes: '#4a3a30',
  beard: 'cheia',
  beardColor: '#d8ae5a',
  highlights: '',
  lashes: false,
  build: 'medio',
  sleeves: 'curtas',
  tattoo: 'braco_direito',
  tattooColor: '#18161e',
  glasses: false,
  accessory: 'nenhum',
  accessoryColor: '#ffd25e',
};

/**
 * Jogador 2 — a Maga (magia: fogo, jacarés, runas; cozinha e abre caminhos).
 * Baseada na foto e na descrição: magra e elegante, cabelos compridos e escuros (ondulados),
 * pele morena dourada, olhos castanho-escuros com delineado, blusa preta e colar de sol.
 */
export const DEFAULT_P2: CharacterLook = {
  name: 'Juliana',
  skin: '#c98d62',
  hair: '#2a1a12',
  hairStyle: 'ondulado',
  eyes: '#2e1c12',
  shirt: '#3a3440',
  pants: '#3a4a70',
  shoes: '#5a3a3a',
  beard: 'nenhuma',
  beardColor: '#2a1a12',
  highlights: '#4e3222',
  lashes: true,
  build: 'magro',
  sleeves: 'longas',
  tattoo: 'nenhuma',
  tattooColor: '#2f3a5a',
  glasses: false,
  accessory: 'colar_sol',
  accessoryColor: '#c8a060',
};

/** Paletas oferecidas na tela de personalização. */
export const SKIN_TONES = ['#f6d3b8', '#f0c2a2', '#ecc19c', '#e8b48f', '#d9a07a', '#c98d62', '#c68a5f', '#a86e47', '#8a5634', '#6b3f24', '#4e2c18'];
export const HAIR_COLORS = ['#1c1414', '#2a1a12', '#3a2419', '#d8ae5a', '#d8b468', '#3b2a20', '#9a7656', '#8a6240', '#5a3a24', '#6b3e26', '#8a5a34', '#b07a3a', '#d6a85a', '#f0d48a', '#b83a2a', '#e06a8a', '#7a5ad6', '#d8d8e0'];
export const EYE_COLORS = ['#2e1c12', '#3f8ad8', '#5f8296', '#3a2a1e', '#4a2f1e', '#1c1c2a', '#3a6a3a', '#3a5a9a', '#6a8aa0'];
export const CLOTH_COLORS = ['#3a3844', '#3a4a70', '#3f7fd6', '#2a9d8f', '#4fa35a', '#e9c46a', '#f4a261', '#e76f51', '#d64545', '#b25bd6', '#ff7aa8', '#f0f0f0', '#3b3f5c', '#5b3f8c', '#2a2a2a', '#7a5a3a'];
export const HAIR_STYLES: HairStyle[] = ['careca', 'curto', 'topete', 'longo', 'ondulado', 'cacheado', 'rabo', 'coque', 'raspado'];
export const ACCESSORIES: Accessory[] = ['nenhum', 'flor', 'laco', 'tiara', 'bone', 'chapeu', 'brinco', 'colar_sol'];
export const HIGHLIGHT_COLORS = ['', '#8a6046', '#b07a3a', '#d6a85a', '#f0d48a', '#e06a8a', '#7a5ad6'];
export const BEARDS: CharacterLook['beard'][] = ['nenhuma', 'rala', 'cheia'];

export const HAIR_STYLE_LABEL: Record<HairStyle, string> = {
  careca: 'Careca', curto: 'Curto', topete: 'Topete', longo: 'Longo liso', ondulado: 'Longo ondulado',
  cacheado: 'Cacheado', rabo: 'Rabo de cavalo', coque: 'Coque', raspado: 'Raspado',
};
export const ACCESSORY_LABEL: Record<Accessory, string> = {
  nenhum: 'Nenhum', flor: 'Flor', laco: 'Laço', tiara: 'Tiara', bone: 'Boné', chapeu: 'Chapéu', brinco: 'Brincos', colar_sol: 'Colar de sol',
};

export const BUILDS: CharacterLook['build'][] = ['magro', 'medio', 'forte'];
export const BUILD_LABEL: Record<CharacterLook['build'], string> = { magro: 'Magro(a)', medio: 'Médio', forte: 'Forte' };
export const TATTOOS: CharacterLook['tattoo'][] = ['nenhuma', 'braco_direito', 'braco_esquerdo', 'dois_bracos'];
export const TATTOO_LABEL: Record<CharacterLook['tattoo'], string> = { nenhuma: 'Nenhuma', braco_direito: 'Tribal braço direito', braco_esquerdo: 'Tribal braço esquerdo', dois_bracos: 'Tribal dois braços' };
export const TATTOO_COLORS = ['#18161e', '#2f3a5a', '#1c1c24', '#3a5a3a', '#6a2a3a'];
