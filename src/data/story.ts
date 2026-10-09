/**
 * Diálogos da história. {p1} e {p2} viram os nomes dos personagens.
 * who: 0 = Jogador 1 (João), 1 = Jogador 2 (Juliana), 'n' = narração, e personagens secundários.
 */
export type Speaker = 0 | 1 | 'n' | 'nimbo' | 'vovo' | 'mae' | 'paiJ' | 'maeJ' | 'garcom' | 'avestruz';

export interface Line {
  who: Speaker;
  text: string;
}

export const STORY: Record<string, Line[]> = {
  intro: [
    { who: 'n', text: 'Esta é a história de {p1} e {p2}.' },
    { who: 'n', text: 'Uma história contada em capítulos... e em aventuras.' },
    { who: 0, text: 'Tudo começou em julho de 2025, pendurado numa corda de rapel.' },
    { who: 1, text: 'Numa pedra bem grande! Eu lembro direitinho.' },
    { who: 0, text: 'Cada fase é uma lembrança nossa. Bora reviver juntos?' },
    { who: 1, text: 'Bora! E os próximos capítulos a gente escreve depois.' },
    { who: 'n', text: '(Os capítulos futuros aparecem no mapa como "em breve".)' },
  ],
  tutorial: [
    { who: 'n', text: 'Julho de 2025. Uma pedra bem grande, cordas, mosquetões... e dois desconhecidos.' },
    { who: 1, text: 'Primeira vez fazendo rapel?' },
    { who: 0, text: 'Que nada! ...Tá, é. Me dá uma segurança aí?' },
    { who: 1, text: 'Confia que eu seguro.' },
    { who: 'n', text: 'Ninguém ali sabia, mas aquela descida era o começo de tudo.' },
  ],
  climb: [
    { who: 'n', text: 'Janeiro de 2026. Escalada de parede!' },
    { who: 1, text: 'Hoje eu subo primeiro. Você faz minha segurança?' },
    { who: 0, text: 'Sempre. E lá no alto tem um mirante esperando a gente.' },
    { who: 1, text: 'Então a foto no mirante é obrigatória!' },
  ],
  canyon: [
    { who: 'n', text: "Fevereiro de 2026. Um cânion de pedras, vegetação, água corrente e quedas d'água." },
    { who: 0, text: 'Cuidado nas pedras, tá escorregadio!' },
    { who: 1, text: 'Se eu escorregar você me segura. E os espinhos eu queimo!' },
    { who: 'n', text: 'E no fim da trilha: Lavras Novas, uma cidadezinha de casas coloridas.' },
    { who: 1, text: 'Parece cenário de anime!' },
  ],
  bread: [
    { who: 'n', text: 'Março de 2026. Quase 40 dias sem se falar.' },
    { who: 'n', text: 'No aniversário dele, chegou um presente: um cordão com a medalha de São Bento.' },
    { who: 0, text: 'Ela lembrou de mim...' },
    { who: 0, text: 'Tá decidido. Vou levar um pão quentinho pra ela. De moto.' },
    { who: 1, text: 'Nessa lembrança eu vou na garupa, cuidando do pão! Acelera, mas sem derrubar!' },
    { who: 'n', text: 'Às vezes, um pão quentinho diz mais que mil palavras.' },
  ],
  itacolomi: [
    { who: 'n', text: 'Abril de 2026. Viagem de moto e trilha a pé até o Pico do Itacolomi.' },
    { who: 1, text: 'Você tá quieto hoje... tá tudo bem?' },
    { who: 0, text: 'Eu? Tô ótimo! É só o cansaço da subida.' },
    { who: 'n', text: '(Ele estava levando uma pergunta muito importante.)' },
  ],
  itacolomi_end: [
    { who: 1, text: 'Lá em cima do Itacolomi, eu disse SIM!' },
    { who: 0, text: 'A vista mais bonita do pico era você sorrindo.' },
    { who: 'n', text: 'Abril de 2026: o começo oficial do namoro. ♥' },
  ],
  italiano: [
    { who: 'n', text: 'Maio de 2026. Jantar no restaurante O Italiano.' },
    { who: 'garcom', text: 'Buona sera! Mesa para o casal?' },
    { who: 0, text: 'Hoje é noite de conversa séria... e de uma surpresa.' },
    { who: 1, text: 'Surpresa? Agora eu quero saber!' },
    { who: 'garcom', text: 'Scusate... a cozinha está um caos hoje. Vocês cozinham?' },
    { who: 0, text: 'Melhor ainda: a gente ama cozinhar juntos!' },
  ],
  italiano_end: [
    { who: 'n', text: 'Entre massas e pizzas, vieram os alinhamentos: sonhos, planos e combinados.' },
    { who: 0, text: 'Eu tenho uma coisa pra você.' },
    { who: 1, text: 'São... alianças?! ♥' },
    { who: 'n', text: 'Lembrança desbloqueada: as Alianças. Agora os abraços curam ainda mais.' },
  ],
  junina: [
    { who: 'n', text: 'Junho de 2026. Viagem a Juiz de Fora para conhecer os pais do {p1}.' },
    { who: 'paiJ', text: 'Então essa é a famosa {p2}!' },
    { who: 'maeJ', text: 'Seja bem-vinda, minha filha! Entra, a casa é sua.' },
    { who: 1, text: '(Que nervoso!) Prazer! Ouvi dizer que aqui eu vou aprender a pescar?' },
    { who: 'paiJ', text: 'Vai sim! E depois tem festa junina em BH. Arraiá!' },
    { who: 0, text: 'Milho cozido, canjica e o peixe que ela pescar!' },
  ],
  tire: [
    { who: 'n', text: 'Julho de 2026. Rumo à Lapinha da Serra... pela estrada de terra.' },
    { who: 0, text: 'Que barulho é esse? ...Ah, não. O pneu.' },
    { who: 1, text: 'Calma! A gente conserta juntos: eu bombeio, você segura.' },
    { who: 'n', text: 'Depois: São José da Serra e um almoço na roça, com lagoa e peixes.' },
  ],
  roca: [
    { who: 'n', text: 'Um restaurante de roça, com lagoa cheia de peixes e fogão a lenha.' },
    { who: 1, text: 'Agora eu sei pescar, hein! Deixa comigo.' },
    { who: 0, text: 'Você pesca, eu limpo. Time perfeito.' },
  ],
  topo: [
    { who: 'n', text: 'Agosto de 2026. O Topo do Mundo, pertinho de BH.' },
    { who: 1, text: 'Olha os parapentes decolando! Que coragem!' },
    { who: 0, text: 'E depois... finalmente, a Lapinha da Serra!' },
    { who: 1, text: 'Com cachoeira no final? Melhor dia!' },
  ],
  farm: [
    { who: 'n', text: 'Setembro de 2026. Um hotel fazenda!' },
    { who: 1, text: 'Cabra, cavalo, cachorro, galinhas... que fofos!' },
    { who: 0, text: 'E aquela avestruz ali... por que ela tá olhando assim pra gente?' },
    { who: 'avestruz', text: 'QUÉÉÉÉ!' },
    { who: 1, text: 'CORRE!!!' },
    { who: 'n', text: 'Depois do susto, o pedalinho. E nos comandos dele, os dois mandaram muito bem.' },
  ],
  farm_end: [
    { who: 0, text: 'Do rapel em julho até o pedalinho em setembro...' },
    { who: 1, text: 'Quanta aventura, né? E a gente nem tá no meio ainda.' },
    { who: 0, text: 'Ainda falta a Amazônia. E os seus jacarés.' },
    { who: 1, text: 'Os próximos capítulos a gente escreve juntos.' },
    { who: 'n', text: 'Continua... ♥  (novos capítulos em breve)' },
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
