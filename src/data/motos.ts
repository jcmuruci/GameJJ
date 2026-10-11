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
  /** Só o piloto joga: ele mesmo buzina, faz as paradas e segura o pão (a garupa vazia; ela só torce). */
  solo?: boolean;
  /** Chegada com cena: ela esperando na portaria do condomínio. */
  arrival?: 'portaria';
  /** Em que ponto da viagem o pneu fura (conserto cooperativo). */
  flatTireAt?: number;
  /** Aviso depois do conserto do pneu. */
  repairText?: string;
  /** Em que ponto a moto morre e só pega no tranco (os dois empurram). */
  stallAt?: number;
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
   * repair (pneu), pushstart (pegar no tranco), honk (bichos que saíram com a buzina), gates (porteiras fechadas), curves (curvas
   * equilibradas), arrive, e os ids próprios das paradas (spot.task).
   */
  tasks: ChapterTask[];
}

export const MOTOS: Record<string, MotoConfig> = {
  bread: {
    title: 'O Pão de Moto',
    subtitle: 'À noite, sozinho: pão na padaria, carne de lata da família e direto pro condomínio dela!',
    total: 13000,
    night: true,
    solo: true,
    arrival: 'portaria',
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
  roca: {
    title: 'Pneu Furado e Roça',
    subtitle: 'Rumo à Lapinha... o pneu fura! Consertem juntos e sigam pela terra até a roça.',
    total: 16000,
    flatTireAt: 0.2,
    repairText: 'Mudança de planos: São José da Serra!',
    spots: [
      { at: 0.32, label: 'Placa: São José da Serra', decor: 'tree_ipe' },
      { at: 0.6, label: 'Curral', decor: 'farmhouse' },
      { at: 0.9, label: 'Lagoa com peixes', decor: 'big_rock' },
    ],
    goalIcon: 'farmhouse',
    arriveText: 'Restaurante da roça: lagoa, peixes e fogão a lenha!',
    finishTitle: 'Almoço na roça!',
    dirt: true,
    memory: 'O pneu furou, o caminho mudou e o dia acabou num almoço na roça. ♥',
    animal: 'cow',
    mud: true,
    gates: [0.44, 0.67, 0.8],
    curves: true,
    tasks: [
      { id: 'repair', text: 'Consertar o pneu juntos' },
      { id: 'gates', text: 'Abrir e fechar as porteiras', goal: 3 },
      { id: 'curves', text: 'Equilibrar nas curvas', goal: 3 },
      { id: 'photos', text: 'Fotos da viagem', goal: 3 },
      { id: 'arrive', text: 'Chegar no restaurante da roça' },
    ],
  },
  volta: {
    title: 'A Volta da Lapinha',
    subtitle: 'Estrada de terra de volta pra casa... e a moto morre no meio do caminho!',
    total: 14000,
    stallAt: 0.42,
    spots: [
      { at: 0.16, label: 'Serra no horizonte', decor: 'big_rock' },
      { at: 0.62, label: 'Ipê florido na estrada', decor: 'tree_ipe' },
      { at: 0.86, label: 'Vendinha da estrada', decor: 'farmhouse' },
    ],
    goalIcon: 'house_c2',
    arriveText: 'Em casa, cheios de poeira e de histórias!',
    finishTitle: 'Pegou no tranco!',
    dirt: true,
    memory: 'A moto morreu, mas pegou no tranco. Juntos a gente dá um jeito. ♥',
    animal: 'cow',
    mud: true,
    curves: true,
    tasks: [
      { id: 'pushstart', text: 'Pegar a moto no tranco (empurrar juntos)' },
      { id: 'curves', text: 'Equilibrar nas curvas', goal: 3 },
      { id: 'photos', text: 'Fotos da volta', goal: 3 },
      { id: 'arrive', text: 'Chegar em casa' },
    ],
  },
};
