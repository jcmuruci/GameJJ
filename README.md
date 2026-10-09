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

**Controles físicos (opcional):** conecte 1 ou 2 controles. `A` = ação, `B`/`X` = habilidade,
`Start` = pausa. Com um único controle, escolha em *Opções* qual jogador o usa.

**Cada um é indispensável:**
- **Guardião:** só ele corta ingredientes na tábua, empurra pedras grandes, quebra pedras rachadas e racha os cristais do chefe.
- **Maga:** só ela acende fogueiras/fornos, queima espinhos, ativa runas mágicas, estilhaça cristais e chama os jacarés.
- **Juntos:** placas de pressão, alavancas gêmeas (puxem ao mesmo tempo!), saída só com os dois.
- **Abraço:** juntinhos e de mãos vazias, apertem AÇÃO quase ao mesmo tempo → +1 coração.
- **Desmaio:** se alguém cair, o outro fica perto e **segura AÇÃO** para reviver. Se os dois caírem, perdem a fase.

### Fases (inspiradas na história do casal)
0. **Pedra Grande** — tutorial onde tudo começou: inclui **rapel em dupla** (um segura AÇÃO na ancoragem dando segurança, o outro desce pela corda).
1. **Moto Amarela** — passeio na estrada: ele pilota (desvia, acelera, pula buracos), ela vai na garupa (magia nas pedras, buzina para capivaras e tira as fotos do passeio).
2. **Piquenique na Cachoeira** — cozinha cooperativa com tempo (vento apaga o fogo, corvos roubam comida).
3. **Trilha da Cachoeira** — exploração, enigmas, gelecas, 3 cristais e uma cachoeira secreta.
4. **Restaurante da Vila** — cozinha dividida por um riacho, chuva e carroças atravessando.
5. **Torre da Tempestade** — chefe final: o Nimbo, a nuvem rabugenta.
6. **Amazônia (epílogo, um ano depois)** — os jacarés só aparecem para ela e viram ponte; ele corta cipós e empurra troncos no rio; juntos levam 3 filhotes até a mamãe jacaré.

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

Os personagens padrão já foram desenhados a partir da foto do casal (ele: cabelo raspado, barba cheia,
olhos azul-acinzentados, moletom preto; ela: cabelo longo ondulado com mechas, delineado, blusa preta e
colar de sol). Os sprites são gerados por código — nenhuma foto vai para o jogo. Para ajustar:

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
  art/                    geração da pixel art (tiles, itens, personagens)
  entities/               jogador, itens, inimigos
  scenes/                 boot, menu, mapa, história, personalização, HUD, pausa, resultado
  scenes/levels/          BaseLevel (núcleo), KitchenLevel, PuzzleLevel, Tutorial, Floresta, Chefe
tests/                    testes unitários (vitest)
scripts/e2e.mjs           teste ponta-a-ponta no navegador
```
