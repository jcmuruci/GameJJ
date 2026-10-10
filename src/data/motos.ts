import type { ChapterTask } from '../ui/TaskList';

/** Ponto no caminho: foto do casal ou parada obrigatória (ex.: comprar o pão). */
export interface MotoSpot {
  /** Fração da viagem em que a placa aparece. */
  at: number;
  label: string;
  decor: string;
  /** 'photo' = ela tira a foto; 'stop' = a moto para e ela resolve (pega um item). */
  kind?: 'photo' | 'stop';
  /** Item que aparece na parada. */
  item?: string;
  /** Texto ao concluir a parada. */
  doneText?: string;
  /** Tarefa marcada ao concluir a parada. */
  task?: string;
}

export interface MotoConfig {
  title: string;
  subtitle: string;
  /** Distância da viagem (px). */
  total: number;
  spots: MotoSpot[];
  /** Ícone no fim da barra de progresso. */
  goalIcon: string;
  arriveText: string;
  finishTitle: string;
  /** Estrada de terra. */
  dirt: boolean;
  /** Viagem à noite (escuro, farol e postes). */
  night?: boolean;
  /** Em que ponto da viagem o pneu fura (conserto cooperativo). */
  flatTireAt?: number;
  /** Lembrete na tela de resultado. */
  memory: string;
  /** Bicho que senta na estrada (buzina para sair). */
  animal: 'capy' | 'cow';
  /** Leva o pão quentinho: esfria com o tempo e pula da garupa nos saltos (depois da padaria). */
  bread?: boolean;
  /** Poças de lama que atrasam a moto (pulo passa por cima). */
  mud?: boolean;
  /** Porteiras na estrada: ela desce, abre e fecha depois que a moto passa. */
  gates?: number[];
  /** Curvas na terra: ela se inclina (setas) para equilibrar a moto. */
  curves?: boolean;
  /**
   * Tarefas do capítulo. Ids: photos, warm (pão quentinho na entrega), catch (pegar o pão no pulo),
   * repair (pneu), honk (bichos que saíram com a buzina), gates (porteiras fechadas), curves (curvas
   * equilibradas), arrive, e os ids próprios das paradas (spot.task).
   */
  tasks: ChapterTask[];
}

export const MOTOS: Record<string, MotoConfig> = {
  bread: {
    title: 'O Pão de Moto',
    subtitle: 'À noite: pão na padaria, carne de lata da família e direto pro condomínio dela!',
    total: 13000,
    night: true,
    spots: [
      { at: 0.12, label: 'Padaria', decor: 'bakery', kind: 'stop', item: 'item_bread', doneText: 'Pão quentinho na sacola!', task: 'padaria' },
      { at: 0.48, label: 'Casa da família', decor: 'house_c3', kind: 'stop', item: 'item_lata', doneText: 'Carne de lata da família no pão!', task: 'lata' },
    ],
    goalIcon: 'condo',
    arriveText: 'Pão com carne de lata entregue! ♥',
    finishTitle: 'Uma noite que mudou tudo',
    dirt: false,
    memory: 'Depois daquela noite, voltaram a ficar juntos. ♥',
    animal: 'capy',
    bread: true,
    tasks: [
      { id: 'padaria', text: 'Comprar o pão na padaria' },
      { id: 'lata', text: 'Pegar a carne de lata da família' },
      { id: 'catch', text: 'Segurar o pão nos pulos', goal: 2 },
      { id: 'warm', text: 'Pão ainda quentinho (50%+)' },
      { id: 'arrive', text: 'Entregar no condomínio dela' },
    ],
  },
  tire: {
    title: 'Pneu Furado',
    subtitle: 'Rumo à Lapinha da Serra... e se o pneu furar, consertem juntos!',
    total: 14000,
    spots: [
      { at: 0.16, label: 'Serra no horizonte', decor: 'big_rock' },
      { at: 0.62, label: 'Ipê na beira da estrada', decor: 'tree_ipe' },
      { at: 0.86, label: 'Placa: São José da Serra', decor: 'farmhouse' },
    ],
    goalIcon: 'farmhouse',
    arriveText: 'Mudança de planos: São José da Serra!',
    finishTitle: 'Pneu consertado, dupla imbatível!',
    dirt: false,
    flatTireAt: 0.42,
    memory: 'O pneu furou, mas a dupla consertou junta.',
    animal: 'capy',
    tasks: [
      { id: 'photos', text: 'Fotos da viagem', goal: 3 },
      { id: 'honk', text: 'Buzinar pras capivaras', goal: 3 },
      { id: 'repair', text: 'Consertar o pneu juntos' },
      { id: 'arrive', text: 'Chegar em São José da Serra' },
    ],
  },
  roca: {
    title: 'Estrada de Terra',
    subtitle: 'Porteiras, curvas, lama e vacas até o restaurante de roça!',
    total: 15000,
    spots: [
      { at: 0.2, label: 'Curral', decor: 'farmhouse' },
      { at: 0.55, label: 'Estrada de terra', decor: 'tree_ipe' },
      { at: 0.88, label: 'Lagoa com peixes', decor: 'big_rock' },
    ],
    goalIcon: 'farmhouse',
    arriveText: 'Restaurante da roça: lagoa, peixes e fogão a lenha!',
    finishTitle: 'Almoço na roça!',
    dirt: true,
    memory: 'Estrada de terra, porteiras e um almoço na roça. ♥',
    animal: 'cow',
    mud: true,
    gates: [0.3, 0.52, 0.74],
    curves: true,
    tasks: [
      { id: 'gates', text: 'Abrir e fechar as porteiras', goal: 3 },
      { id: 'curves', text: 'Equilibrar nas curvas', goal: 3 },
      { id: 'photos', text: 'Fotos da roça', goal: 3 },
      { id: 'arrive', text: 'Chegar no restaurante da roça' },
    ],
  },
};
