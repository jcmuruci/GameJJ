/**
 * Diálogos da história. {p1} e {p2} viram os nomes dos personagens.
 * who: 0 = Jogador 1, 1 = Jogador 2, 'n' = narração, 'nimbo' = o vilão.
 */
export type Speaker = 0 | 1 | 'n' | 'nimbo' | 'vovo';

export interface Line {
  who: Speaker;
  text: string;
}

export const STORY: Record<string, Line[]> = {
  intro: [
    { who: 'n', text: 'Era uma vez um sábado perfeito.' },
    { who: 'n', text: 'Hoje é o aniversário de namoro de {p1} e {p2}... e eles têm um plano.' },
    { who: 1, text: 'Piquenique no bosque, passeio na floresta, festival na vila...' },
    { who: 0, text: '...e à noite, a Chuva de Estrelas lá do alto da Torre da Colina!' },
    { who: 1, text: 'Dizem que, se um casal faz um pedido juntinho numa chuva de estrelas, ele se realiza.' },
    { who: 'nimbo', text: 'HMPF! Casais felizes... Que coisa mais irritante!' },
    { who: 'nimbo', text: 'Eu, Nimbo, a nuvem mais rabugenta do céu, vou cobrir TODAS as estrelas esta noite!' },
    { who: 0, text: 'Ué... aquela nuvem acabou de falar?' },
    { who: 1, text: 'E ameaçar o nosso encontro! Ah, mas não vai mesmo.' },
    { who: 'n', text: 'E assim começou a aventura mais romântica (e bagunçada) de todas.' },
  ],
  tutorial: [
    { who: 1, text: 'Antes de sair, bora treinar no quintal?' },
    { who: 0, text: 'Treinar? A gente já é uma dupla imbatível!' },
    { who: 1, text: 'Amor, ontem você queimou a pipoca de micro-ondas.' },
    { who: 0, text: '...Bora treinar.' },
  ],
  picnic: [
    { who: 'n', text: 'Bosque das Macieiras, 10 da manhã.' },
    { who: 1, text: 'Que lugar lindo! Vamos fazer o piquenique aqui.' },
    { who: 'vovo', text: 'Ah, jovens! Vocês cozinham? Meus netinhos estão famintos e eu estou sem fôlego!' },
    { who: 0, text: 'Pode deixar, Vovó Rosa! Eu corto, {p2} cozinha.' },
    { who: 1, text: 'E nós dois servimos. Trabalho em equipe!' },
    { who: 'nimbo', text: '(lá do alto) Vamos ver se aguentam um ventinho... hehehe.' },
  ],
  forest: [
    { who: 'n', text: 'A Floresta Sussurrante. O único caminho até a vila.' },
    { who: 0, text: 'Esses espinhos não estavam aqui antes...' },
    { who: 'nimbo', text: 'Presentinho meu! Boa sorte atravessando, pombinhos!' },
    { who: 1, text: 'Espinhos queimam. E pedras se empurram. A gente dá conta.' },
    { who: 0, text: 'E dizem que tem três Cristais do Coração escondidos por aqui...' },
  ],
  festival: [
    { who: 'n', text: 'Vila das Lanternas. Dia do grande festival!' },
    { who: 'vovo', text: 'Vocês de novo! O Nimbo assustou nossos cozinheiros e o banquete está um caos!' },
    { who: 1, text: 'O rio corta a cozinha no meio... vamos ter que passar as coisas pelas bancadas.' },
    { who: 0, text: 'Eu fico com os ingredientes, você com o fogo. Combinado?' },
    { who: 1, text: 'Combinado. E cuidado com as carroças, hein!' },
  ],
  storm: [
    { who: 'n', text: 'Torre da Colina. O sol se pôs. As estrelas estão quase chegando.' },
    { who: 'nimbo', text: 'Vocês chegaram até aqui?! Impossível!' },
    { who: 0, text: 'Nimbo, por que você quer tanto estragar a nossa noite?' },
    { who: 'nimbo', text: 'Porque... porque ninguém NUNCA olha para as nuvens! Só para as estrelas!' },
    { who: 1, text: 'Os cristais de tempestade estão protegendo ele!' },
    { who: 0, text: 'Eu racho os cristais, você estilhaça com magia. Juntos!' },
  ],
  ending: [
    { who: 'nimbo', text: 'Ai... ai... vocês venceram...' },
    { who: 'nimbo', text: 'Eu só... queria que alguém olhasse pra mim também. *snif*' },
    { who: 1, text: 'Ei, Nimbo... quer assistir a chuva de estrelas com a gente?' },
    { who: 'nimbo', text: 'S-sério? Comigo?' },
    { who: 0, text: 'Claro. Ninguém merece ver as estrelas sozinho.' },
    { who: 'n', text: 'O céu se abriu. E milhares de estrelas riscaram a noite.' },
    { who: 1, text: 'Já fez seu pedido?' },
    { who: 0, text: 'Não precisei. Ele já se realizou: você.' },
    { who: 1, text: '...Bobo. Eu te amo.' },
    { who: 0, text: 'Eu também te amo. Próxima aventura?' },
    { who: 1, text: 'Sempre juntos.' },
  ],
};
