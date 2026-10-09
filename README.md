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
- **Maga:** só ela acende fogueiras/fornos, queima espinhos, ativa runas mágicas e estilhaça cristais.
- **Juntos:** placas de pressão, alavancas gêmeas (puxem ao mesmo tempo!), saída só com os dois.
- **Abraço:** juntinhos e de mãos vazias, apertem AÇÃO quase ao mesmo tempo → +1 coração.
- **Desmaio:** se alguém cair, o outro fica perto e **segura AÇÃO** para reviver. Se os dois caírem, perdem a fase.

### Fases
0. **Quintal de Casa** — tutorial interativo.
1. **Piquenique no Bosque** — cozinha cooperativa com tempo (vento apaga o fogo, corvos roubam comida).
2. **Floresta Sussurrante** — exploração, enigmas, gelecas e 3 cristais escondidos.
3. **Festival da Vila** — cozinha dividida por um rio, chuva e carroças atravessando.
4. **Torre da Tempestade** — chefe final: o Nimbo, a nuvem rabugenta.

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

Os sprites são gerados por código, então não há imagens para substituir:

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
