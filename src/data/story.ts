import { POEM_FIRST } from './poem';

/**
 * Diálogos da história. {p1} e {p2} viram os nomes dos personagens.
 * who: 0 = Jogador 1 (João), 1 = Jogador 2 (Juliana), 'n' = narração, e personagens secundários.
 */
export type Speaker = 0 | 1 | 'n' | 'poema' | 'nimbo' | 'vovo' | 'mae' | 'paiJ' | 'maeJ' | 'garcom' | 'avestruz';

export interface Line {
  who: Speaker;
  text: string;
}

export const STORY: Record<string, Line[]> = {
  intro: [
    { who: 'n', text: 'Esta é a história de {p1} e {p2}.' },
    { who: 'n', text: 'Uma história contada em capítulos... e em aventuras.' },
    { who: 0, text: 'Tudo começou em julho de 2025, pendurado numa corda de rapel.' },
    { who: 1, text: 'Na Pedra Grande, em Caeté! Eu lembro direitinho.' },
    { who: 0, text: 'Cada fase é uma lembrança nossa. Bora reviver juntos?' },
    { who: 1, text: 'Bora! E os próximos capítulos a gente escreve depois.' },
    { who: 'n', text: '(Os capítulos futuros aparecem no mapa como "em breve".)' },
  ],
  tutorial: [
    { who: 'n', text: 'Julho de 2025. A Pedra Grande, em Caeté. Cordas, mosquetões... e dois desconhecidos.' },
    { who: 0, text: 'Primeira vez fazendo rapel?' },
    { who: 1, text: 'É a minha primeira vez... e tô tremendo! Você faz a minha segurança?' },
    { who: 0, text: 'Pode confiar: eu seguro a corda.' },
    { who: 'n', text: 'Ninguém ali sabia, mas aquela descida era o começo de tudo.' },
  ],
  climb: [
    { who: 'n', text: 'Janeiro de 2026. Escalada indoor!' },
    { who: 1, text: 'Hoje eu subo primeiro. Você faz minha segurança?' },
    { who: 0, text: 'Sempre. E depois tem um mirante esperando a gente.' },
    { who: 1, text: 'Então a foto no mirante é obrigatória!' },
  ],
  canyon: [
    { who: 'n', text: 'Fevereiro de 2026. Uma passarela suspensa no meio do cânion.' },
    { who: 'n', text: 'À esquerda, o desfiladeiro e o rio lá embaixo. À direita, um córrego entre as pedras.' },
    { who: 0, text: 'Não olha pra baixo, hein!' },
    { who: 1, text: 'Se eu escorregar você me segura. E os espinhos eu queimo!' },
    { who: 'n', text: 'E no fim da passarela: Lavras Novas, uma cidadezinha de casas coloridas.' },
    { who: 1, text: 'Parece cenário de anime!' },
  ],
  medal: [
    { who: 'n', text: 'Março de 2026. Quase 40 dias sem se falar.' },
    { who: 1, text: '(O aniversário dele tá chegando... e eu não paro de pensar nele.)' },
    { who: 1, text: 'Já sei: uma medalha de São Bento, pra proteger ele. E uma carta, escrita por mim.' },
    { who: 'n', text: 'Nesta lembrança, só a {p2} joga. O {p1} nem imagina... mas pode torcer do sofá!' },
  ],
  medal_end: [
    { who: 'n', text: 'No aniversário dele, um motoboy tocou a campainha com um presente: um cordão com a medalha de São Bento... e uma carta dela.' },
    { who: 0, text: 'Ela lembrou de mim...' },
    { who: 'n', text: 'Lembrança desbloqueada: a Medalha de São Bento. Ela protege o {p1} do primeiro golpe em cada fase.' },
  ],
  bread: [
    { who: 0, text: 'A medalha no peito... e ela não sai da minha cabeça.' },
    { who: 0, text: 'Tá decidido. Pão da padaria com a carne de lata da minha família. E vou levar hoje, de moto.' },
    { who: 0, text: 'Mandei mensagem pra ela: "Me espera na portaria?"' },
    { who: 'n', text: 'Era noite. Coração acelerado. Nesta lembrança, só o {p1} joga (a {p2} torce do sofá).' },
  ],
  bread_end: [
    { who: 'n', text: 'Uma noite de março. Ela esperava na portaria do condomínio.' },
    { who: 1, text: 'Você veio mesmo... e trouxe pão com carne de lata da sua família!' },
    { who: 0, text: 'Eu só queria te ver.' },
    { who: 'n', text: 'Depois daquela noite, eles voltaram a ficar juntos. ♥' },
  ],
  itacolomi: [
    { who: 'n', text: 'Abril de 2026. Viagem de moto até o Pico do Itacolomi.' },
    { who: 'n', text: 'Na noite anterior à trilha, ele entregou a ela um poema de oito estrofes...' },
    ...POEM_FIRST.map((stanza): Line => ({ who: 'poema', text: stanza.join('\n') })),
    { who: 1, text: 'Oito estrofes lindas... e termina assim, sem final?!' },
    { who: 0, text: 'Vai ver o final ainda não foi escrito...' },
    { who: 1, text: 'Você tá quieto hoje... tá tudo bem?' },
    { who: 0, text: 'Eu? Tô ótimo! É só o cansaço da subida.' },
    { who: 'n', text: '(No bolso dele: a nona estrofe e uma pergunta muito importante.)' },
  ],
  itacolomi_end: [
    { who: 1, text: 'O poema finalmente terminou... e a nona estrofe virou um pedido. ♥' },
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
    { who: 'n', text: 'Junho de 2026. Viagem a Juiz de Fora para conhecer os pais do {p1}, os dois com 68 anos.' },
    { who: 'paiJ', text: 'Então essa é a famosa {p2}!' },
    { who: 'maeJ', text: 'Seja bem-vinda, minha filha! Entra, a casa é sua.' },
    { who: 1, text: '(Que nervoso!) Prazer! Ouvi dizer que aqui eu vou aprender a pescar?' },
    { who: 'paiJ', text: 'Vai sim! E depois tem festa junina em BH. Arraiá!' },
    { who: 0, text: 'Milho cozido, canjica e o peixe que ela pescar!' },
  ],
  roca: [
    { who: 'n', text: 'Julho de 2026. De moto pela estrada de terra, rumo à Lapinha da Serra!' },
    { who: 1, text: 'Porteira aberta, porteira fechada! Regra da roça.' },
    { who: 0, text: 'E segura firme nas curvas, que a terra é solta.' },
    { who: 1, text: 'Pode deixar: eu me inclino junto! Só não vai furar o pneu, hein?' },
  ],
  roca_end: [
    { who: 'n', text: 'Mudança de planos: São José da Serra e um restaurante de roça, com lagoa cheia de peixes e fogão a lenha.' },
    { who: 1, text: 'O pneu furou, a gente mudou o caminho... e o dia ficou perfeito.' },
    { who: 0, text: 'Com você, até estrada de terra vira passeio.' },
  ],
  topo: [
    { who: 'n', text: 'Agosto de 2026. O Topo do Mundo, pertinho de BH.' },
    { who: 1, text: 'Olha os parapentes decolando! Que coragem!' },
    { who: 0, text: 'Um dia a gente voa também?' },
    { who: 1, text: 'Só se for de mãos dadas!' },
  ],
  lapinha: [
    { who: 'n', text: 'Agosto de 2026. De moto, pela estrada de terra: finalmente, a Lapinha da Serra!' },
    { who: 0, text: 'Depois do pneu furado, a gente prometeu voltar. E voltou!' },
    { who: 1, text: 'Trilha, rio de pedra em pedra... e cachoeira no final!' },
    { who: 0, text: 'Cuidado nas pedras do rio: algumas afundam!' },
  ],
  volta: [
    { who: 'n', text: 'Hora de voltar da Lapinha, de moto, pela mesma estrada de terra.' },
    { who: 1, text: 'Que dia! Trilha, rio, cachoeira... e agora poeira de novo!' },
    { who: 0, text: 'Segura firme que eu levo a gente pra casa.' },
  ],
  volta_end: [
    { who: 'n', text: 'No meio da estrada de terra, a moto morreu. E não ligava de jeito nenhum.' },
    { who: 1, text: 'E a gente empurrando a moto no meio do nada! Hahaha' },
    { who: 0, text: 'Mas pegou no tranco. Juntos a gente dá um jeito em tudo.' },
    { who: 'n', text: 'E voltaram pra casa, cheios de poeira e de histórias. ♥' },
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
