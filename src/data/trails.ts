import { T } from '../art/tiles';
import { CANYON_MAP, CLIMB_MAP, ITACOLOMI_MAP, TOPO_MAP } from './maps';
import type { FoeConfig } from '../scenes/levels/PuzzleLevel';
import type { ChapterTask } from '../ui/TaskList';

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
  /** Bicho do capítulo nos 's' do mapa (null = nenhum). */
  foe: FoeConfig | null;
  /**
   * Acontecimento dinâmico do capítulo:
   *  rockfall pedras soltas caem na escalada · swarm nuvens de borrachudos
   *  wind rajadas de vento (segurem AÇÃO) · photos parapentes para fotografar
   */
  event: 'rockfall' | 'swarm' | 'wind' | 'photos';
  /**
   * Tarefas do capítulo. Ids reconhecidos: collect, climb, rappel, foes, dodge, gusts, finish.
   */
  tasks: ChapterTask[];
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
      'Escalada! Um SEGURA AÇÃO na ancoragem e o outro aperta AÇÃO na parede para subir. Pedra solta: fujam da sombra no chão!',
      'Quem subiu primeiro faz a segurança lá de cima para o outro.',
      'Pedra grande na placa = portão aberto pra sempre. Só {p1} empurra!',
    ],
    collect: { tex: 'item_carabiner', name: 'Mosquetão dourado', plural: 'mosquetões' },
    intro: 'Janeiro de 2026: escalada de parede e, lá no alto, um mirante.',
    finishTitle: 'Que vista do mirante!',
    ending: 'mirante',
    ambience: 'leaves',
    foe: null,
    event: 'rockfall',
    tasks: [
      { id: 'climb', text: 'Escalar com segurança', goal: 3 },
      { id: 'collect', text: 'Mosquetões dourados', goal: 3 },
      { id: 'dodge', text: 'Desviar das pedras soltas', goal: 5 },
      { id: 'finish', text: 'Foto juntos no mirante' },
    ],
  },
  canyon: {
    map: CANYON_MAP,
    floor: T.DARK_GRASS,
    signs: [
      'O Cânion! Borrachudos? A MAGIA de {p2} é repelente! Espinhos ela queima; pedras rachadas a ESPADA de {p1} quebra.',
      'Placa amarela: segura o portão aberto só enquanto alguém (ou algo) estiver em cima.',
      'Pedras grandes podem ficar em cima de placas para sempre. Só {p1} consegue empurrar!',
      'Runas rosas só respondem a {p2}. Alavancas gêmeas: puxem JUNTOS! Contem: 3, 2, 1...',
      'Lavras Novas! As casinhas coloridas estão logo ali. Pisem juntos no coração.',
    ],
    collect: { tex: 'photo_spot', name: 'Foto da queda d\'água', plural: 'fotos' },
    intro: 'Fevereiro de 2026: um cânion de pedras, água corrente e quedas d\'água... e depois Lavras Novas!',
    finishTitle: 'Chegaram em Lavras Novas!',
    ambience: 'fireflies',
    foe: { tex: 'mosquito', name: 'Borrachudo', hp: 1, speed: 44, aggro: 85 },
    event: 'swarm',
    tasks: [
      { id: 'collect', text: 'Fotos das quedas d\'água', goal: 3 },
      { id: 'foes', text: 'Espantar borrachudos', goal: 10 },
      { id: 'finish', text: 'Chegar em Lavras Novas' },
    ],
  },
  itacolomi: {
    map: ITACOLOMI_MAP,
    floor: T.GRASS,
    signs: [
      'Trilha até o Pico do Itacolomi! Lá em cima venta forte: quando vier a rajada, SEGUREM AÇÃO pra não voar.',
      'Portão com duas placas: um segura de um lado, o outro passa e segura do outro.',
      'Parede de pedra: escalada com segurança, igual em janeiro!',
      'Quase no topo! A runa rosa só obedece a {p2}.',
    ],
    collect: { tex: 'item_flower', name: 'Flor do campo', plural: 'flores' },
    intro: 'Abril de 2026: viagem de moto e trilha a pé até o Pico do Itacolomi.',
    finishTitle: 'Ela disse SIM! ♥',
    ending: 'proposal',
    ambience: 'petals',
    foe: { tex: 'crow', name: 'Gralha', hp: 1, speed: 48, aggro: 95 },
    event: 'wind',
    tasks: [
      { id: 'collect', text: 'Flores do campo pra ela', goal: 3 },
      { id: 'gusts', text: 'Segurar firme nas rajadas', goal: 3 },
      { id: 'finish', text: 'Chegar ao arco de pedra' },
    ],
  },
  topo: {
    map: TOPO_MAP,
    floor: T.GRASS,
    signs: [
      'Topo do Mundo! Quando um parapente passar com a câmera piscando, {p2} usa a HABILIDADE para fotografar!',
      'Pedra grande na placa abre o portão de vez. Força, {p1}!',
      'Desçam de rapel até a Lapinha da Serra: um segura, o outro desce.',
    ],
    collect: { tex: 'paraglider', name: 'Foto de parapente', plural: 'fotos' },
    intro: 'Agosto de 2026: decolagens de parapente no Topo do Mundo e, finalmente, a Lapinha da Serra.',
    finishTitle: 'Cachoeira da Lapinha!',
    ending: 'cachoeira',
    ambience: 'paragliders',
    parTime: 300,
    foe: { tex: 'quero', name: 'Quero-quero', hp: 2, speed: 52, aggro: 80 },
    event: 'photos',
    tasks: [
      { id: 'collect', text: 'Fotografar parapentes', goal: 3 },
      { id: 'foes', text: 'Fugir dos quero-queros', goal: 3 },
      { id: 'rappel', text: 'Rapel até a Lapinha', goal: 1 },
      { id: 'finish', text: 'Banho de cachoeira' },
    ],
  },
};
