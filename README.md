# Juntos — uma aventura a dois 💕

RPG cooperativo 2D em pixel art para **duas pessoas no mesmo computador**. Cozinha caótica no estilo
Overcooked, enigmas de exploração, chefe final e uma historinha romântica — tudo no navegador,
sem instalar nada para jogar.

## Como jogar

| | Jogador 1 — **Guardião** | Jogador 2 — **Maga** |
|---|---|---|
| Mover | `W A S D` | `Setas` |
| Ação (pegar, largar, usar, segurar p/ cortar) | `F` (ou `Espaço`) | `K` (ou `Numpad 1`) |
| Habilidade | `G` — Espada | `L` — Magia |
| Pausa | `Esc` ou `P` | `Esc` ou `P` |

**Celular / tablet:** abram o link com o aparelho na horizontal. A tela se divide ao meio: João à
esquerda e Juliana à direita, cada um com joystick + botões **Ação** e **Espada/Magia**. Há botões de
**Pausa** e **Tela cheia** no canto. Tablet é o mais confortável; no celular, joguem lado a lado.
(Para testar os controles de toque no computador, abra o link com `?toque` no final.)

**Controles físicos (opcional):** conecte 1 ou 2 controles. `A` = ação, `B`/`X` = habilidade,
`Start` = pausa. Com um único controle, escolha em *Opções* qual jogador o usa.

**Cada um é indispensável:**
- **Guardião:** só ele corta ingredientes na tábua, empurra pedras grandes, quebra pedras rachadas e racha os cristais do chefe.
- **Maga:** só ela acende fogueiras/fornos, queima espinhos, ativa runas mágicas, estilhaça cristais e chama os jacarés.
- **Juntos:** placas de pressão, alavancas gêmeas (puxem ao mesmo tempo!), saída só com os dois.
- **Abraço:** juntinhos e de mãos vazias, apertem AÇÃO quase ao mesmo tempo → +1 coração.
- **Desmaio:** se alguém cair, o outro fica perto e **segura AÇÃO** para reviver. Se os dois caírem, perdem a fase.

### Capítulos — a nossa linha do tempo
O mapa é uma linha do tempo, mês a mês. Cada capítulo abre com uma cena de história em estilo anime e tem um painel de **tarefas do capítulo** (canto da tela) ligado ao que aconteceu naquele mês.

| Mês | Capítulo | Jogo |
|---|---|---|
| Jul 2025 | **O Rapel** | tutorial; rapel em dupla (um dá segurança na ancoragem, o outro desce) |
| Jan 2026 | **Escalada e Mirante** | escalar com segurança, mosquetões dourados e **pedras soltas** caindo (fujam da sombra!); foto no mirante |
| Fev 2026 | **Cânion e Lavras Novas** | fotos das quedas d'água, **nuvens de borrachudos** (a magia dela é o repelente) e as casinhas coloridas |
| Mar 2026 | **O Pão de Moto** | o **pão esfria** e pula da sacola nos saltos (ela segura!); ganha a **medalha de São Bento** |
| Abr 2026 | **Pico do Itacolomi** | flores do campo, gralhas e **rajadas de vento** (segurem AÇÃO); sob o arco de pedra, o resto do poema e o **pedido de namoro** (versos em `src/data/poem.ts`) |
| Mai 2026 | **O Italiano** | bruschetta, sugo e pizza; garçom apressado; no meio do jantar, **ele entrega as alianças com um abraço** |
| Jun 2026 | **Juiz de Fora e Festa Junina** | os pais dele comentam tudo; **só ela pesca**; no "Anarriê!" os dois **dançam a quadrilha** juntos |
| Jul 2026 | **Pneu Furado** | estrada de terra com **vacas** (buzina!) e **lama**; pneu fura: ele segura a moto e ela conserta |
| Jul 2026 | **Restaurante da Roça** | tilápia pescada na lagoa, tropeiro e **galinhas ladras** |
| Ago 2026 | **Topo do Mundo e Lapinha** | ela **fotografa os parapentes** (HABILIDADE), fujam dos **quero-queros**, rapel e cachoeira |
| Set 2026 | **Hotel Fazenda** | carinho nos bichos, espantem a **avestruz** e pedalinho (pedalem juntos!) |
| em breve | próximos capítulos | bloqueados por enquanto |

Estrelas e moedas ficam salvas no navegador (localStorage); moedas compram melhorias na
**Loja da Vovó Rosa** (no mapa, aperte `G`/`L`).

## Rodar localmente

Requer [Node.js](https://nodejs.org) 18+.

```bash
npm install
npm run dev        # abre em http://localhost:5173
```

Outros comandos:

```bash
npm run build      # gera a versão final em dist/
npm run preview    # serve a versão final localmente
npm test           # testes de lógica (receitas, save, mapas)
npm run test:e2e   # teste no navegador (Chromium) + capturas em screenshots/
```

## Publicar

A pasta `dist/` é um site estático — funciona em qualquer hospedagem.

- **GitHub Pages:** já existe o workflow `.github/workflows/deploy.yml`. No repositório, vá em
  *Settings → Pages → Source: GitHub Actions* e faça push na `main`. O link sai na aba *Actions*.
- **itch.io:** `npm run build`, compacte o *conteúdo* de `dist/` num .zip e envie como projeto HTML.
- **Netlify / Vercel:** comando de build `npm run build`, pasta de saída `dist`.

## Deixar os personagens parecidos com vocês

Os personagens padrão já foram desenhados a partir da foto e da descrição do casal (ele: careca, barba
loira, olhos azuis, corpo médio, tatuagem tribal fechando o braço direito; ela: magra e elegante, cabelos longos
e escuros, delineado, blusa preta e colar de sol). Os sprites são gerados por código — nenhuma foto vai para o jogo. Para ajustar:

1. **No jogo:** menu → *Personagens*. Cada um ajusta nome, pele, cabelo, penteado, olhos, roupas,
   barba, óculos e acessório. Fica salvo no navegador.
2. **No código (padrão para todos):** edite `DEFAULT_P1` e `DEFAULT_P2` em
   [`src/data/characters.ts`](src/data/characters.ts).

## Tecnologia e estrutura

**Phaser 3 + TypeScript + Vite.** Arte (pixel art), músicas e efeitos sonoros são todos procedurais
(canvas + WebAudio), sem arquivos externos. A fonte Pixelify Sans (licença OFL) vai embutida no build.

```
src/
  main.ts                 configuração do Phaser e registro das cenas
  config.ts               resolução, cores, constantes
  data/                   personagens, receitas, cozinhas, mapas, fases, história (lógica pura)
  systems/                entrada (teclado + controles), áudio sintetizado, save
  art/                    geração da pixel art (tiles, itens, personagens, retratos anime)
  entities/               jogador, itens, inimigos
  scenes/                 boot, menu, mapa, história, personalização, HUD, pausa, resultado
  scenes/levels/          BaseLevel (núcleo), Kitchen, Puzzle, Trail, Moto, Farm, Tutorial, Chefe, Amazônia
tests/                    testes unitários (vitest)
scripts/e2e.mjs           teste ponta-a-ponta no navegador
```
