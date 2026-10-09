import { T } from '../art/tiles';
import { CANYON_MAP, CLIMB_MAP, ITACOLOMI_MAP, TOPO_MAP } from './maps';

export interface TrailConfig {
  map: string[];
  floor: number;
  /** Textos das placas de aviso, na ordem em que aparecem no mapa (linha a linha). */
  signs: string[];
  collect: { tex: string; name: string; plural: string };
  intro: string;
  finishTitle: string;
  /** Final especial ao chegar na saída. */
  ending?: 'proposal' | 'mirante' | 'cachoeira';
  ambience: 'fireflies' | 'leaves' | 'paragliders' | 'petals';
  /** Tempo (s) para a estrela de rapidez; sem isso, a estrela é por não desmaiar. */
  parTime?: number;
}

/**
 * Legenda (além dos objetos de enigma do PuzzleLevel):
 *  U parede de escalada (sobe com segurança) · R corda de rapel (desce) · S ancoragem
 *  V cipó · k pedra grande · n casinha colorida · m mirante · I Pedra do Itacolomi · W cachoeira
 */
export const TRAILS: Record<string, TrailConfig> = {
  climb: {
    map: CLIMB_MAP,
    floor: T.SAND,
    signs: [
      'Escalada! Um SEGURA AÇÃO na ancoragem (segurança) e o outro aperta AÇÃO na parede de agarras para subir.',
      'Quem subiu primeiro faz a segurança lá de cima para o outro.',
      'Pedra grande na placa = portão aberto pra sempre. Só {p1} empurra!',
    ],
    collect: { tex: 'item_carabiner', name: 'Mosquetão dourado', plural: 'mosquetões' },
    intro: 'Janeiro de 2026: escalada de parede e, lá no alto, um mirante.',
    finishTitle: 'Que vista do mirante!',
    ending: 'mirante',
    ambience: 'leaves',
  },
  canyon: {
    map: CANYON_MAP,
    floor: T.DARK_GRASS,
    signs: [
      'O Cânion! Espinhos? A MAGIA de {p2} queima! Pedras rachadas? A ESPADA de {p1} quebra!',
      'Placa amarela: segura o portão aberto só enquanto alguém (ou algo) estiver em cima.',
      'Pedras grandes podem ficar em cima de placas para sempre. Só {p1} consegue empurrar!',
      'Runas rosas só respondem a {p2}. Alavancas gêmeas: puxem JUNTOS! Contem: 3, 2, 1...',
      'Lavras Novas! As casinhas coloridas estão logo ali. Pisem juntos no coração.',
    ],
    collect: { tex: 'item_crystal', name: 'Cristal do Cânion', plural: 'cristais' },
    intro: 'Fevereiro de 2026: um cânion de pedras, água corrente e quedas d\'água... e depois Lavras Novas!',
    finishTitle: 'Chegaram em Lavras Novas!',
    ambience: 'fireflies',
  },
  itacolomi: {
    map: ITACOLOMI_MAP,
    floor: T.GRASS,
    signs: [
      'Trilha a pé até o Pico do Itacolomi. A moto ficou lá embaixo... agora é perna!',
      'Portão com duas placas: um segura de um lado, o outro passa e segura do outro.',
      'Parede de pedra: escalada com segurança, igual em janeiro!',
      'Quase no topo! A runa rosa só obedece a {p2}.',
    ],
    collect: { tex: 'item_flower', name: 'Flor do campo', plural: 'flores' },
    intro: 'Abril de 2026: viagem de moto e trilha a pé até o Pico do Itacolomi.',
    finishTitle: 'Ela disse SIM! ♥',
    ending: 'proposal',
    ambience: 'petals',
  },
  topo: {
    map: TOPO_MAP,
    floor: T.GRASS,
    signs: [
      'Topo do Mundo! Olhem pra cima: os parapentes decolando!',
      'Pedra grande na placa abre o portão de vez. Força, {p1}!',
      'Desçam de rapel até a Lapinha da Serra: um segura, o outro desce.',
    ],
    collect: { tex: 'photo_spot', name: 'Foto dos parapentes', plural: 'fotos' },
    intro: 'Agosto de 2026: decolagens de parapente no Topo do Mundo e, finalmente, a Lapinha da Serra.',
    finishTitle: 'Cachoeira da Lapinha!',
    ending: 'cachoeira',
    ambience: 'paragliders',
    parTime: 300,
  },
};
