import rapel from '../assets/photos/rapel-pedra-grande.jpg';

/** Uma foto real do casal, mostrada na fase (no momento marcante) e no mapa. */
export interface Photo {
  /** Chave da textura no Phaser. */
  key: string;
  /** Caminho do arquivo (importado pelo Vite, que acerta o endereço no site). */
  src: string;
  /** Legenda escrita na polaroid. */
  caption: string;
}

/**
 * Fotos reais de cada fase. Para acrescentar uma: salve o JPG em `src/assets/photos/`
 * (lado maior ~1400 px), importe aqui e coloque na lista da fase.
 */
export const PHOTOS: Record<string, Photo[]> = {
  tutorial: [{ key: 'photo_rapel', src: rapel, caption: 'O dia do rapel na Pedra Grande, Caeté · Jul 2025' }],
};

export function photosOf(levelId: string): Photo[] {
  return PHOTOS[levelId] ?? [];
}
