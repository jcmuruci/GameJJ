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
| Pausa | `Esc` | `Esc` |

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
| Jul 2025 | **O Rapel** | tutorial ao pé da **Pedra Grande, em Caeté**; o rapel desce do topo da pedrona |
| Jan 2026 | **Escalada e Mirante** | academia de escalada **indoor** (segurança em dupla, agarras soltas caindo) e depois o mirante |
| Fev 2026 | **Cânion e Lavras Novas** | paredões de rocha, quedas d'água, **borrachudos** (a magia dela é o repelente) e as casinhas coloridas |
| Mar 2026 | **O Pão de Moto** | **à noite**: pão na padaria, **carne de lata da família** e direto pro condomínio dela; o pão esfria e pula da sacola. Ganha a **medalha de São Bento** |
| Abr 2026 | **Pico do Itacolomi** | rajadas de vento e gralhas; sentados no **arco de pedra**, o resto do poema e o **pedido de namoro** |
| Mai 2026 | **O Italiano** | cozinha do restaurante; no meio do jantar, **as alianças entregues com um abraço** |
| Jun 2026 | **Juiz de Fora e Festa Junina** | **pescaria**: ela lança, fisga e recolhe; ele afrouxa a linha e pega com o puçá; os pais comentam. À noite, **quadrilha** no arraiá de BH |
| Jul 2026 | **Pneu Furado e Roça** | de moto rumo à Lapinha, o **pneu fura** e os dois consertam juntos; mudança de planos para São José da Serra: **porteiras** (ela abre e fecha), **curvas** (ela se inclina junto), vacas e lama, até o restaurante de roça |
| Ago 2026 | **Topo do Mundo** | ela **fotografa os parapentes**, quero-queros e uma decolagem de pertinho |
| Ago 2026 | **Lapinha da Serra** | rio de **pedra em pedra** (as escuras afundam) e a cachoeira |
| Set 2026 | **Hotel Fazenda** | carinho nos bichos, a **avestruz** brava e o pedalinho em dupla |
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
