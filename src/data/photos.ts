import rapel from '../assets/photos/rapel-pedra-grande.jpg';
import escalada from '../assets/photos/escalada-indoor.jpg';
import mirante from '../assets/photos/mirante-por-do-sol.jpg';

/** Uma foto real do casal, mostrada na fase (no momento marcante) e no mapa. */
export interface Photo {
  /** Chave da textura no Phaser. */
  key: string;
  /** Caminho do arquivo (importado pelo Vite, que acerta o endereço no site). */
  src: string;
  /** Legenda escrita na polaroid. */
  caption: string;
  /** Momento da fase em que a foto é ganha (a fase chama `showPhoto(moment)`). */
  moment: string;
}

/**
 * Fotos reais de cada fase. Para acrescentar uma: salve o JPG em `src/assets/photos/`
 * (lado maior ~1400 px), importe aqui e coloque na lista da fase, com o `moment` em que ela
 * aparece na fase (rapel, escalada, mirante, cachoeira, decolagem...).
 */
export const PHOTOS: Record<string, Photo[]> = {
  tutorial: [{ key: 'photo_rapel', src: rapel, caption: 'O dia do rapel na Pedra Grande, Caeté · Jul 2025', moment: 'rapel' }],
  climb: [
    { key: 'photo_escalada', src: escalada, caption: 'Escalada indoor, juntos · Jan 2026', moment: 'escalada' },
    { key: 'photo_mirante', src: mirante, caption: 'Pôr do sol no mirante · Jan 2026', moment: 'mirante' },
  ],
};

export function photosOf(levelId: string): Photo[] {
  return PHOTOS[levelId] ?? [];
}
