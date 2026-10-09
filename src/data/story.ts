/**
 * Diálogos da história. {p1} e {p2} viram os nomes dos personagens.
 * who: 0 = Jogador 1, 1 = Jogador 2, 'n' = narração, 'nimbo' = o vilão, 'vovo' = Vovó Rosa, 'mae' = Mamãe Jacaré.
 */
export type Speaker = 0 | 1 | 'n' | 'nimbo' | 'vovo' | 'mae';

export interface Line {
  who: Speaker;
  text: string;
}

export const STORY: Record<string, Line[]> = {
  intro: [
    { who: 'n', text: 'Era uma vez um sábado perfeito.' },
    { who: 'n', text: 'Tudo começou numa pedra bem grande: {p1} e {p2} se conheceram descendo de rapel.' },
    { who: 0, text: 'Lembra? Você olhou lá pra baixo e eu falei: "confia, que eu seguro".' },
    { who: 1, text: 'E segura até hoje. Feliz aniversário de namoro, amor!' },
    { who: 0, text: 'Plano do dia: Pedra Grande, moto amarela até a cachoeira, piquenique, trilha, jantar no restaurante...' },
    { who: 1, text: '...e à noite, a Chuva de Estrelas lá do alto da Torre da Colina!' },
    { who: 'nimbo', text: 'HMPF! Casais felizes... Que coisa mais irritante!' },
    { who: 'nimbo', text: 'Eu, Nimbo, a nuvem mais rabugenta do céu, vou cobrir TODAS as estrelas esta noite!' },
    { who: 0, text: 'Ué... aquela nuvem acabou de falar?' },
    { who: 1, text: 'E ameaçar o nosso encontro! Ah, mas não vai mesmo.' },
    { who: 'n', text: 'E assim começou a aventura mais romântica (e bagunçada) de todas.' },
  ],
  tutorial: [
    { who: 'n', text: 'Pedra Grande. O lugar onde tudo começou.' },
    { who: 1, text: 'Bora relembrar como é descer de rapel?' },
    { who: 0, text: 'Relembrar? Eu sou praticamente um profissional!' },
    { who: 1, text: 'Amor, no dia em que a gente se conheceu você quase desceu de cabeça pra baixo.' },
    { who: 0, text: '...Foi charme. Bora treinar.' },
  ],
  moto: [
    { who: 'n', text: 'Hora de pegar a estrada!' },
    { who: 0, text: 'A moto amarela está brilhando! Sobe aí, amor.' },
    { who: 1, text: 'Eu cuido das fotos. Você cuida de não cair em buraco.' },
    { who: 0, text: 'E se aparecer capivara na pista?' },
    { who: 1, text: 'Eu buzino. E se aparecer pedra... eu explodo com magia.' },
    { who: 0, text: 'Às vezes eu esqueço que namoro uma maga.' },
    { who: 'nimbo', text: 'Vou espalhar pedras pela estrada inteira! Hehehe!' },
  ],
  picnic: [
    { who: 'n', text: 'A cachoeira. 10 da manhã. O barulhinho da água é perfeito.' },
    { who: 1, text: 'Que lugar lindo! Bora cozinhar juntos aqui?' },
    { who: 'vovo', text: 'Ah, jovens! Vocês cozinham? Meus netinhos estão famintos e eu estou sem fôlego!' },
    { who: 0, text: 'Pode deixar, Vovó Rosa! A gente ama cozinhar juntos. Eu corto, {p2} cozinha.' },
    { who: 1, text: 'E nós dois servimos. Trabalho em equipe!' },
    { who: 'nimbo', text: '(lá do alto) Vamos ver se aguentam um ventinho... hehehe.' },
  ],
  forest: [
    { who: 'n', text: 'A Trilha da Cachoeira. O caminho até a vila.' },
    { who: 0, text: 'Esses espinhos não estavam aqui antes...' },
    { who: 'nimbo', text: 'Presentinho meu! Boa sorte atravessando, pombinhos!' },
    { who: 1, text: 'Espinhos queimam. E pedras se empurram. A gente dá conta.' },
    { who: 0, text: 'Dizem que tem três Cristais do Coração escondidos... e uma cachoeira secreta no final!' },
  ],
  festival: [
    { who: 'n', text: 'Restaurante da Vila. Noite de casa cheia!' },
    { who: 'vovo', text: 'Vocês de novo! O Nimbo assustou meus cozinheiros e o restaurante está lotado!' },
    { who: 1, text: 'A gente ama restaurante... e hoje vamos trabalhar em um!' },
    { who: 0, text: 'O riacho corta a cozinha no meio. Eu fico com os ingredientes, você com o fogo.' },
    { who: 1, text: 'Combinado. E cuidado com as carroças, hein!' },
    { who: 'vovo', text: 'Se der tudo certo, o jantar de vocês é por conta da casa!' },
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
    { who: 1, text: 'Amazônia! Ano que vem! Eu PRECISO ver um jacaré de pertinho!' },
    { who: 0, text: 'Combinado. Sempre juntos.' },
    { who: 'n', text: '(Um novo destino apareceu no mapa...)' },
  ],
  amazon: [
    { who: 'n', text: 'Um ano depois...' },
    { who: 'n', text: 'A Amazônia! Rios enormes, árvores gigantes e araras por todo lado.' },
    { who: 1, text: 'AMOR. OLHA. UM JACARÉ DE VERDADE. Eu vou chorar.' },
    { who: 0, text: 'Sonho realizado! E eu ganhei uma namorada encantadora de jacarés.' },
    { who: 'mae', text: 'Por favor, me ajudem... meus três filhotes se perderam na floresta!' },
    { who: 1, text: 'Uma mamãe jacaré pedindo ajuda?! É claro que a gente ajuda!' },
    { who: 0, text: 'Os jacarés só confiam em você, amor. Eu abro caminho com a espada.' },
  ],
  amazon_end: [
    { who: 'mae', text: 'Meus bebês estão em casa! Obrigada, obrigada!' },
    { who: 1, text: 'A mamãe jacaré piscou pra mim. PISCOU, amor.' },
    { who: 0, text: 'Eu vi. Acho que você tem um fã-clube agora.' },
    { who: 1, text: 'Melhor viagem da vida.' },
    { who: 0, text: 'Da pedra do rapel até a Amazônia... e ainda é só o começo.' },
    { who: 1, text: 'Sempre juntos?' },
    { who: 0, text: 'Sempre juntos. ♥' },
    { who: 'n', text: 'FIM... por enquanto. Obrigado por jogarem juntos!' },
  ],
};
