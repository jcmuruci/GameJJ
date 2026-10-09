export interface MotoConfig {
  title: string;
  subtitle: string;
  /** Distância da viagem (px). */
  total: number;
  /** Pontos de foto no caminho (fração da viagem, texto, decoração). */
  spots: { at: number; label: string; decor: string }[];
  /** Ícone no fim da barra de progresso. */
  goalIcon: string;
  arriveText: string;
  finishTitle: string;
  /** Estrada de terra. */
  dirt: boolean;
  /** Em que ponto da viagem o pneu fura (conserto cooperativo). */
  flatTireAt?: number;
  /** Lembrete na tela de resultado. */
  memory: string;
}

export const MOTOS: Record<string, MotoConfig> = {
  bread: {
    title: 'O Pão de Moto',
    subtitle: 'Levem o pão quentinho até o condomínio dela! E tirem 3 fotos no caminho.',
    total: 13000,
    spots: [
      { at: 0.2, label: 'Padaria', decor: 'bakery' },
      { at: 0.5, label: 'Ipê amarelo', decor: 'tree_ipe' },
      { at: 0.82, label: 'Portaria do condomínio', decor: 'condo' },
    ],
    goalIcon: 'condo',
    arriveText: 'Pão entregue, quentinho! ♥',
    finishTitle: 'O pão chegou quentinho!',
    dirt: false,
    memory: 'Depois de 40 dias, um pão quentinho de moto.',
  },
  tire: {
    title: 'Estrada de Terra',
    subtitle: 'Rumo à Lapinha da Serra pela estrada de terra... e se o pneu furar, consertem juntos!',
    total: 15000,
    spots: [
      { at: 0.18, label: 'Serra no horizonte', decor: 'big_rock' },
      { at: 0.62, label: 'Estrada de terra', decor: 'tree_ipe' },
      { at: 0.86, label: 'Lagoa da roça', decor: 'farmhouse' },
    ],
    goalIcon: 'farmhouse',
    arriveText: 'São José da Serra! Hora do almoço na roça.',
    finishTitle: 'Chegaram em São José da Serra!',
    dirt: true,
    flatTireAt: 0.42,
    memory: 'O pneu furou, mas a dupla consertou junta.',
  },
};
