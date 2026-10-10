/**
 * Teste ponta-a-ponta: abre o jogo no Chromium, navega pelas cenas, simula os
 * dois jogadores no mesmo teclado e verifica a lógica principal.
 * Uso: npm run test:e2e   (gera capturas em ./screenshots)
 */
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const EXEC = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
const OUT = 'screenshots';
fs.mkdirSync(OUT, { recursive: true });

const server = await createServer({ server: { port: 5174, strictPort: false }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0] + (process.env.E2E_RES ? `?res=${process.env.E2E_RES}` : '');

const browser = await chromium.launch({ executablePath: EXEC, args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}\n${e.stack}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

let failures = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
  if (!ok) failures++;
};
const wait = (ms) => page.waitForTimeout(ms);
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });
const press = async (key, ms = 60) => { await page.keyboard.down(key); await wait(ms); await page.keyboard.up(key); await wait(50); };
const evalG = (fn, arg) => page.evaluate(fn, arg);
const activeScenes = () => evalG(() => window.__game.scene.getScenes(true).map((s) => s.scene.key));
const startScene = async (key, data) => {
  await evalG(([k, d]) => {
    const g = window.__game;
    g.scene.getScenes(true).forEach((s) => { if (s.scene.key !== k) g.scene.stop(s.scene.key); });
    g.scene.start(k, d);
  }, [key, data]);
  await wait(900);
};
/** Teleporta um jogador para o centro de um tile e o vira para uma direção. */
const place = (id, tx, ty, fx, fy, scene) => evalG(([id, tx, ty, fx, fy, scene]) => {
  const s = window.__game.scene.getScene(scene);
  const p = s.players[id];
  p.teleport(tx * 16 + 8, ty * 16 + 8);
  p.face = { x: fx, y: fy };
}, [id, tx, ty, fx, fy, scene]);

try {
  await page.goto(url);
  await page.waitForFunction(() => window.__game && window.__game.scene.isActive('Menu'), null, { timeout: 20000 });
  await wait(800);
  await shot('01-menu');
  check('Menu abriu', (await activeScenes()).includes('Menu'));

  // navegação de menu com teclado: Jogar -> intro
  await press('Enter');
  await page.waitForFunction(() => window.__game.scene.isActive('Story'), null, { timeout: 6000 }).catch(() => undefined);
  check('Jogar leva à história de introdução', (await activeScenes()).includes('Story'));
  await wait(1500);
  await shot('02-story');
  await press('Escape');
  await page.waitForFunction(() => window.__game.scene.isActive('Map'), null, { timeout: 5000 }).catch(() => undefined);
  await wait(400);
  check('Pular história leva ao mapa', (await activeScenes()).includes('Map'));
  await shot('03-map');

  // botões clicáveis do mapa: "Menu principal" volta ao menu; tocar na fase seleciona
  const clickGame = async (gx, gy) => {
    const r = await page.evaluate(() => { const c = document.querySelector('canvas').getBoundingClientRect(); return { x: c.x, y: c.y, w: c.width, h: c.height }; });
    await page.mouse.click(r.x + (gx / 960) * r.w, r.y + (gy / 540) * r.h);
  };
  await wait(400);
  await clickGame(770, 540 - 40);
  await page.waitForFunction(() => window.__game.scene.isActive('Menu'), null, { timeout: 4000 }).catch(() => undefined);
  check('Mapa: botão "Menu principal" volta ao menu', (await activeScenes()).includes('Menu'));
  await evalG(() => { const g = window.__game; g.scene.stop('Menu'); g.scene.start('Map'); });
  await wait(900);
  await shot('03b-map-buttons');

  // loja no mapa
  await press('KeyG');
  await wait(400);
  await shot('04-shop');
  await press('Escape');
  await wait(300);

  // personalização
  await startScene('Customize');
  await press('KeyD'); // muda nome? não: seleção começa no Nome; D não altera
  await press('KeyS');
  await press('KeyD'); // pele do J1
  await press('ArrowDown');
  await press('ArrowDown');
  await press('ArrowRight'); // cabelo da J2
  await wait(300);
  await shot('05-customize');
  const looks = await evalG(() => JSON.parse(localStorage.getItem('juntos-save-v1')).looks.map((l) => l.skin + '/' + l.hair));
  check('Personalização salva no localStorage', looks.length === 2, looks.join(' | '));

  // ---------------------------------------------------------------- TUTORIAL
  await startScene('TutorialLevel', { levelId: 'tutorial' });
  await wait(600);
  await shot('06-tutorial');
  // movimento simultâneo: J1 para a direita, J2 para baixo
  const before = await evalG(() => { const s = window.__game.scene.getScene('TutorialLevel'); return s.players.map((p) => [p.x, p.y]); });
  await page.keyboard.down('KeyD');
  await page.keyboard.down('ArrowDown');
  await wait(500);
  await page.keyboard.up('KeyD');
  await page.keyboard.up('ArrowDown');
  const after = await evalG(() => { const s = window.__game.scene.getScene('TutorialLevel'); return s.players.map((p) => [p.x, p.y]); });
  check('Controles simultâneos: J1 andou para a direita', after[0][0] > before[0][0] + 10, `${before[0][0].toFixed(0)} -> ${after[0][0].toFixed(0)}`);
  check('Controles simultâneos: J2 andou para baixo', after[1][1] > before[1][1] + 10, `${before[1][1].toFixed(0)} -> ${after[1][1].toFixed(0)}`);
  // passos do tutorial: bandeiras
  await place(0, 3, 7, 0, 1, 'TutorialLevel');
  await place(1, 8, 7, 0, 1, 'TutorialLevel');
  await wait(300);
  // tronco (3,11): J1 acima, golpe
  await place(0, 3, 10, 0, 1, 'TutorialLevel');
  await wait(100);
  await press('KeyG');
  await wait(200);
  const logCut = await evalG(() => window.__game.scene.getScene('TutorialLevel').logCut);
  check('Espada corta o tronco', logCut === true);
  await press('KeyF'); // pega lenha do chão
  await wait(100);
  const held = await evalG(() => window.__game.scene.getScene('TutorialLevel').players[0].held?.kind);
  check('Pegar item do chão com AÇÃO', held === 'firewood', String(held));
  await place(0, 7, 11, 1, 0, 'TutorialLevel');
  await wait(100);
  await press('KeyF');
  await place(1, 8, 10, 0, 1, 'TutorialLevel');
  await wait(100);
  await press('KeyL');
  await wait(300);
  const lit = await evalG(() => window.__game.scene.getScene('TutorialLevel').lit);
  check('Magia da J2 acende a fogueira', lit === true);
  // abraço
  await place(0, 10, 8, 1, 0, 'TutorialLevel');
  await place(1, 11, 8, -1, 0, 'TutorialLevel');
  await wait(150);
  await page.keyboard.down('KeyF');
  await page.keyboard.down('KeyK');
  await wait(80);
  await page.keyboard.up('KeyF');
  await page.keyboard.up('KeyK');
  await wait(300);
  const hugs = await evalG(() => window.__game.scene.getScene('TutorialLevel').stats.hugs);
  check('Abraço com AÇÃO simultânea', hugs >= 1, `abraços=${hugs}`);
  // comando secreto do João (B)
  await evalG(() => { const s = window.__game.scene.getScene('TutorialLevel'); s.players[1].teleport(s.players[0].x + 14, s.players[0].y); });
  await wait(100);
  await press('KeyB');
  await wait(400);
  await shot('07b-segredo');
  check('Comando secreto do João (B)', (await evalG(() => window.__game.scene.getScene('TutorialLevel').squeezes)) === 1);
  await wait(1800);
  await press('KeyP');
  await wait(400);
  await shot('07c-segredo-juliana');
  check('Comando secreto da Juliana (P)', (await evalG(() => window.__game.scene.getScene('TutorialLevel').grabs)) === 1);
  check('P não pausa mais o jogo', !(await activeScenes()).includes('Pause'));
  await shot('07-tutorial-hug');

  // rapel: J2 dá segurança na ancoragem de cima, J1 desce pela corda
  await place(1, 36, 7, 0, 1, 'TutorialLevel');
  await place(0, 38, 8, 0, 1, 'TutorialLevel');
  await wait(150);
  await page.keyboard.down('KeyK');
  await wait(100);
  await press('KeyF');
  await wait(400);
  await shot('07b-rapel');
  await wait(1500);
  await page.keyboard.up('KeyK');
  const y1 = await evalG(() => window.__game.scene.getScene('TutorialLevel').players[0].y);
  check('Rapel: desce com o parceiro na segurança', y1 > 10 * 16, `y=${y1.toFixed(0)}`);
  // sem segurança não desce
  await place(1, 38, 8, 0, 1, 'TutorialLevel');
  await place(0, 30, 12, 0, 1, 'TutorialLevel');
  await wait(100);
  await press('KeyK');
  await wait(1700);
  const y2 = await evalG(() => window.__game.scene.getScene('TutorialLevel').players[1].y);
  check('Rapel: sem segurança não desce', y2 < 9 * 16, `y=${y2.toFixed(0)}`);

  // pausa
  await press('Escape');
  await wait(400);
  check('Pausa abre', (await activeScenes()).includes('Pause'));
  await shot('08-pause');
  await press('Escape');
  await wait(400);
  check('Pausa fecha', !(await activeScenes()).includes('Pause'));
  // "Menu principal" na pausa
  await press('Escape');
  await wait(300);
  for (let i = 0; i < 4; i++) await press('ArrowDown');
  await press('Enter');
  await page.waitForFunction(() => window.__game.scene.isActive('Menu'), null, { timeout: 4000 }).catch(() => undefined);
  const sc0 = await activeScenes();
  check('Pausa: "Menu principal" volta ao menu', sc0.includes('Menu') && !sc0.includes('TutorialLevel') && !sc0.includes('HUD'), sc0.join(','));
  await startScene('TutorialLevel', { levelId: 'tutorial' });
  // pausa pelo botão clicável e "Menu principal"
  await clickGame(480, 540 - 20);
  await wait(400);
  check('Botão de pausa clicável na fase', (await activeScenes()).includes('Pause'));
  await press('Escape');
  await wait(300);

  // reiniciar pela pausa
  await press('Escape');
  await wait(300);
  await press('ArrowDown');
  await press('Enter');
  await wait(1200);
  const sc = await activeScenes();
  const hugsAfter = await evalG(() => window.__game.scene.getScene('TutorialLevel').stats.hugs);
  check('Reiniciar fase pela pausa', sc.includes('TutorialLevel') && sc.includes('HUD') && !sc.includes('Pause') && hugsAfter === 0, sc.join(','));

  // ---------------------------------------------------------------- O ITALIANO (cozinha)
  const K = 'KitchenLevel';
  await startScene(K, { levelId: 'italiano' });
  await wait(500);
  await shot('09-kitchen-intro');
  await press('KeyF');
  await press('KeyK');
  await wait(2800);
  const started = await evalG(() => window.__game.scene.getScene('KitchenLevel').started);
  check('Cozinha inicia quando os dois confirmam', started === true);
  // J1: tomate -> tábua -> corta
  const cut = async (srcX, boardX) => {
    await place(0, srcX, 3, 0, -1, K); await wait(80); await press('KeyF');
    await place(0, boardX, 8, 0, -1, K); await wait(80); await press('KeyF');
    await page.keyboard.down('KeyF'); await wait(1900); await page.keyboard.up('KeyF');
  };
  await cut(2, 4);
  const boardItem = await evalG(() => window.__game.scene.getScene('KitchenLevel').surfaces.find((s) => s.tx === 4 && s.ty === 7)?.item?.kind);
  check('J1 pica tomate na tábua (segurando AÇÃO)', boardItem === 'tomato_cut', String(boardItem));
  // J2 pega prato e o tomate picado
  await place(0, 2, 12, 0, 1, K);
  await place(1, 14, 11, 0, -1, K); await wait(80); await press('KeyK');
  await place(1, 4, 8, 0, -1, K); await wait(80); await press('KeyK');
  let contents = await evalG(() => window.__game.scene.getScene('KitchenLevel').players[1].held?.contents);
  check('Montar prato com ingrediente da bancada', Array.isArray(contents) && contents.includes('tomato_cut'), JSON.stringify(contents));
  // fogo: J2 acende a panela com magia
  await evalG(() => window.__game.scene.getScene('KitchenLevel').cookers.forEach((c) => c.extinguish()));
  await place(1, 7, 8, 0, -1, K); await wait(80); await press('KeyL'); await wait(200);
  const fire = await evalG(() => window.__game.scene.getScene('KitchenLevel').cookers[0].fire);
  check('Magia acende o fogo', fire > 10, `fogo=${fire.toFixed(1)}`);
  const orders = await evalG(() => window.__game.scene.getScene('KitchenLevel').orders.map((o) => o.recipe));
  // massa na panela
  await place(1, 14, 12, 0, 1, K);
  await place(0, 4, 3, 0, -1, K); await wait(80); await press('KeyF');
  await place(0, 7, 8, 0, -1, K); await wait(80); await press('KeyF');
  const pot = await evalG(() => window.__game.scene.getScene('KitchenLevel').cookers[0].contents);
  check('Massa vai para a panela', JSON.stringify(pot) === '["pasta"]', JSON.stringify(pot));
  await place(0, 2, 12, 0, 1, K);
  await page.waitForFunction(() => window.__game.scene.getScene('KitchenLevel').cookers[0].done, null, { timeout: 16000 }).catch(() => undefined);
  const done = await evalG(() => window.__game.scene.getScene('KitchenLevel').cookers[0].done);
  check('Macarrão cozinha com o fogo aceso', done === 'pasta_cooked', String(done));
  if (orders.includes('sugo')) {
    await place(1, 7, 8, 0, -1, K); await wait(80); await press('KeyK');
  } else {
    await cut(8, 5);
    await place(0, 2, 12, 0, 1, K);
    await place(1, 5, 8, 0, -1, K); await wait(80); await press('KeyK');
  }
  contents = await evalG(() => window.__game.scene.getScene('KitchenLevel').players[1].held?.contents);
  await place(1, 26, 8, 1, 0, K); await wait(80); await press('KeyK'); await wait(200);
  const score = await evalG(() => window.__game.scene.getScene('KitchenLevel').score);
  check('Entrega de pedido pontua', score > 0, `pedidos=${orders.join(',')} prato=${JSON.stringify(contents)} pontos=${score}`);
  await evalG(() => { const s = window.__game.scene.getScene('KitchenLevel'); s.cartT = 0.1; });
  await wait(900);
  await shot('10-kitchen-play');
  // alianças: aparecem na mesa, o João pega e entrega com um abraço
  await evalG(() => { const s = window.__game.scene.getScene('KitchenLevel'); s.timeLeft = s.cfg.duration - 71; });
  await wait(300);
  check('Alianças aparecem na mesa', (await evalG(() => window.__game.scene.getScene('KitchenLevel').rings.state)) === 'table');
  await evalG(() => {
    const s = window.__game.scene.getScene('KitchenLevel');
    const t = s.tables[0];
    s.players.forEach((p) => { if (p.held) { p.held.destroy(); p.held = null; } });
    s.players[0].teleport(t.x, t.y + 16);
    s.players[0].face = { x: 0, y: -1 };
    s.players[1].teleport(t.x + 60, t.y + 60);
  });
  await wait(100);
  await press('KeyF');
  check('João pega a caixinha das alianças', (await evalG(() => window.__game.scene.getScene('KitchenLevel').rings.state)) === 'carried');
  await evalG(() => {
    const s = window.__game.scene.getScene('KitchenLevel');
    const t = s.tables[0];
    s.players[0].teleport(t.x - 8, t.y + 40); s.players[0].face = { x: 1, y: 0 };
    s.players[1].teleport(t.x + 8, t.y + 40); s.players[1].face = { x: -1, y: 0 };
  });
  await wait(100);
  await page.keyboard.down('KeyF'); await page.keyboard.down('KeyK');
  await wait(80);
  await page.keyboard.up('KeyF'); await page.keyboard.up('KeyK');
  await wait(400);
  await shot('10b-aliancas');
  check('Abraço entrega as alianças', (await evalG(() => window.__game.scene.getScene('KitchenLevel').rings.state)) === 'done');
  // simula o fim do tempo
  await evalG(() => { window.__game.scene.getScene('KitchenLevel').timeLeft = 0.05; });
  await wait(3600);
  check('Fim de tempo leva à tela de resultado', (await activeScenes()).includes('Result'));
  await shot('11-result');
  await wait(800);
  await press('ArrowUp'); // última opção
  await press('Enter');
  await page.waitForFunction(() => window.__game.scene.isActive('Menu'), null, { timeout: 4000 }).catch(() => undefined);
  check('Resultado: "Menu principal" volta ao menu', (await activeScenes()).includes('Menu'));

  // ---------------------------------------------------------------- CÂNION
  const TL = 'TrailLevel';
  await startScene(TL, { levelId: 'canyon' });
  await wait(500);
  await shot('13-canyon');
  await place(1, 14, 7, 1, 0, TL);
  await place(0, 13, 8, 1, 0, TL);
  await wait(100);
  await press('KeyL');
  await wait(900);
  const thorn = await evalG(() => window.__game.scene.getScene('TrailLevel').occupied.has('15,7'));
  check('Magia queima os espinhos', thorn === false);
  // J1 empurra a pedra grande para baixo
  await place(0, 40, 5, 0, 1, TL);
  await place(1, 38, 5, 0, 1, TL);
  await wait(100);
  await page.keyboard.down('KeyS');
  await wait(2200);
  await page.keyboard.up('KeyS');
  const by = await evalG(() => window.__game.scene.getScene('TrailLevel').boulders.find((b) => b.tx === 40)?.ty);
  check('J1 empurra pedra', by > 6, `linha=${by}`);
  // J2 não consegue empurrar
  await place(0, 30, 3, 0, 1, TL);
  await place(1, 45, 2, 1, 0, TL);
  await wait(100);
  await page.keyboard.down('ArrowRight');
  await wait(900);
  await page.keyboard.up('ArrowRight');
  const nook = await evalG(() => window.__game.scene.getScene('TrailLevel').boulders.find((b) => b.ty === 2)?.tx);
  check('J2 não empurra pedra (só o João)', nook === 46, `coluna=${nook}`);
  await shot('14-canyon-push');
  // desmaio e reviver
  await evalG(() => { const s = window.__game.scene.getScene('TrailLevel'); s.players[1].hp = 1; s.damagePlayer(s.players[1], 1, 0, 0); });
  await place(0, 44, 2, 1, 0, TL);
  await wait(100);
  await page.keyboard.down('KeyF');
  await wait(1700);
  await page.keyboard.up('KeyF');
  const fainted = await evalG(() => window.__game.scene.getScene('TrailLevel').players[1].fainted);
  check('Reviver o parceiro segurando AÇÃO', fainted === false);

  // ---------------------------------------------------------------- ESCALADA / ITACOLOMI / TOPO
  await startScene(TL, { levelId: 'climb' });
  await wait(400);
  await shot('15-climb');
  check('Escalada abre sem erros', (await activeScenes()).includes('TrailLevel'));
  check('Escalada tem tarefas do capítulo', (await evalG(() => window.__game.scene.getScene('TrailLevel').tasks?.total)) === 4);
  await evalG(() => window.__game.scene.getScene('TrailLevel').rockfall());
  await wait(500);
  await shot('15b-pedra-solta');
  await wait(900);
  const rock = await evalG(() => { const s = window.__game.scene.getScene('TrailLevel'); return { d: s.dodges, hp: s.players.map((p) => p.hp).join(',') }; });
  check('Pedra solta cai perto do casal', rock.d === 1 || rock.hp !== '3,3', JSON.stringify(rock));
  await startScene(TL, { levelId: 'topo' });
  await wait(400);
  await shot('16-topo');
  check('Topo do Mundo abre sem erros', (await activeScenes()).includes('TrailLevel'));
  await evalG(() => window.__game.scene.getScene('TrailLevel').spawnPhotoTarget());
  await wait(1600);
  await shot('16b-parapente');
  await press('KeyL');
  await wait(200);
  check('Juliana fotografa o parapente', (await evalG(() => window.__game.scene.getScene('TrailLevel').photos)) === 1);
  await startScene(TL, { levelId: 'itacolomi' });
  await wait(400);
  await shot('17-itacolomi');
  await evalG(() => window.__game.scene.getScene('TrailLevel').startGust());
  await page.keyboard.down('KeyF'); await page.keyboard.down('KeyK');
  await wait(2500);
  await shot('17b-rajada');
  await wait(2000);
  await page.keyboard.up('KeyF'); await page.keyboard.up('KeyK');
  check('Seguram firme na rajada de vento', (await evalG(() => window.__game.scene.getScene('TrailLevel').gustsOk)) === 1);
  await evalG(() => { const s = window.__game.scene.getScene('TrailLevel'); s.players[1].teleport(s.players[0].x + 20, s.players[0].y); s.onExit(); });
  await wait(4200);
  await shot('18-poem');
  await page.waitForFunction(() => window.__game.scene.getScene('TrailLevel').awaitingYes, null, { timeout: 15000 }).catch(() => undefined);
  check('Poema completo leva à pergunta', await evalG(() => window.__game.scene.getScene('TrailLevel').awaitingYes));
  await wait(300);
  await shot('18-proposal');
  await press('KeyK');
  await wait(800);
  await shot('19-proposal-yes');
  await page.waitForFunction(() => window.__game.scene.isActive('Result'), null, { timeout: 6000 }).catch(() => undefined);
  check('Pedido de namoro aceito leva ao resultado', (await activeScenes()).includes('Result'));

  // ---------------------------------------------------------------- MOTO (pão)
  const M = 'MotoLevel';
  await startScene(M, { levelId: 'bread' });
  await shot('20-moto-intro');
  await press('KeyF');
  await press('KeyK');
  await wait(300);
  await page.keyboard.down('KeyD');
  await page.keyboard.down('KeyW');
  await wait(1500);
  await page.keyboard.up('KeyW');
  await press('KeyL');
  await press('KeyG');
  await wait(1500);
  await page.keyboard.up('KeyD');
  const mdist = await evalG(() => window.__game.scene.getScene('MotoLevel').dist);
  check('Moto anda pela estrada', mdist > 300, `dist=${mdist.toFixed(0)}`);
  await evalG(() => { const s = window.__game.scene.getScene('MotoLevel'); s.dist = s.cfg.total * 0.2; s.invuln = 99; });
  await page.waitForFunction(() => { const s = window.__game.scene.getScene('MotoLevel'); const o = s.objs.find((x) => x.kind === 'spot'); return o && o.x < s.mx + 160; }, null, { timeout: 5000 });
  await shot('21-moto');
  await press('KeyK');
  await wait(200);
  const photos = await evalG(() => window.__game.scene.getScene('MotoLevel').photos);
  check('Parada na padaria: Juliana compra o pão', photos === 1 && (await evalG(() => window.__game.scene.getScene('MotoLevel').breadOn)), `paradas=${photos}`);
  await evalG(() => { window.__game.scene.getScene('MotoLevel').catchT = 1.2; });
  await press('KeyK');
  check('Juliana segura o pão que pulou', (await evalG(() => window.__game.scene.getScene('MotoLevel').catches)) === 1);
  await evalG(() => { const s = window.__game.scene.getScene('MotoLevel'); s.dist = s.cfg.total; });
  await wait(3200);
  check('Entregar o pão à noite leva ao resultado', (await activeScenes()).includes('Result'));

  // ---------------------------------------------------------------- PNEU FURADO E ROÇA (moto na terra)
  await startScene(M, { levelId: 'roca' });
  await press('KeyF');
  await press('KeyK');
  await page.waitForFunction(() => window.__game.scene.getScene('MotoLevel').started, null, { timeout: 5000 }).catch(() => undefined);
  await evalG(() => { const s = window.__game.scene.getScene('MotoLevel'); s.dist = s.cfg.total * 0.21; s.invuln = 99; s.curveT = 99; });
  await page.waitForFunction(() => window.__game.scene.getScene('MotoLevel').repair >= 0, null, { timeout: 8000 }).catch(() => undefined);
  const flat = await evalG(() => window.__game.scene.getScene('MotoLevel').repair);
  check('Pneu fura antes da roça', flat >= 0, `repair=${flat}`);
  await shot('22-flat-tire');
  await page.keyboard.down('KeyF');
  for (let i = 0; i < 14; i++) await press('KeyK', 40);
  await page.keyboard.up('KeyF');
  await wait(200);
  check('Conserto do pneu em dupla', (await evalG(() => window.__game.scene.getScene('MotoLevel').flatDone)) === true);
  await evalG(() => { const s = window.__game.scene.getScene('MotoLevel'); s.dist = s.cfg.total * 0.43; s.curveT = 99; });
  await page.waitForFunction(() => { const s = window.__game.scene.getScene('MotoLevel'); return s.gate && s.gate.warned; }, null, { timeout: 30000 }).catch(() => undefined);
  await shot('22b-porteira');
  await press('KeyK');
  await page.waitForFunction(() => window.__game.scene.getScene('MotoLevel').gate?.state === 'closing', null, { timeout: 30000 }).catch(() => undefined);
  await press('KeyK');
  await wait(200);
  check('Porteira: ela abre e fecha', (await evalG(() => window.__game.scene.getScene('MotoLevel').gatesDone)) === 1);
  await evalG(() => { window.__game.scene.getScene('MotoLevel').curveT = 0.01; });
  await page.waitForFunction(() => !!window.__game.scene.getScene('MotoLevel').curve, null, { timeout: 8000 }).catch(() => undefined);
  await wait(400);
  await shot('22c-curva');
  check('Curva na estrada de terra', !!(await evalG(() => window.__game.scene.getScene('MotoLevel').curve)));

  // ---------------------------------------------------------------- PESCARIA (Juiz de Fora) + ARRAIÁ
  const FI = 'FishingLevel';
  const fs_ = (f) => evalG(f);
  await startScene(FI, { levelId: 'junina' });
  await shot('12-pescaria-intro');
  await press('KeyF');
  await press('KeyK');
  await page.waitForFunction(() => window.__game.scene.getScene('FishingLevel').state === 'aim', null, { timeout: 5000 }).catch(() => undefined);
  await wait(700);
  check('Pescaria: o "pronto" não lança a linha sozinho', (await fs_(() => window.__game.scene.getScene('FishingLevel').state)) === 'aim');
  await press('KeyK');
  await page.waitForFunction(() => window.__game.scene.getScene('FishingLevel').state === 'wait', null, { timeout: 8000 }).catch(() => undefined);
  await fs_(() => { window.__game.scene.getScene('FishingLevel').t = 0.01; });
  await page.waitForFunction(() => window.__game.scene.getScene('FishingLevel').state === 'bite', null, { timeout: 8000 }).catch(() => undefined);
  await press('KeyK');
  check('Juliana fisga quando a boia afunda', (await fs_(() => window.__game.scene.getScene('FishingLevel').state)) === 'reel');
  for (let i = 0; i < 4; i++) await press('KeyK', 40);
  await shot('12a-pescaria-recolher');
  await fs_(() => { window.__game.scene.getScene('FishingLevel').dist = -0.01; });
  await page.waitForFunction(() => { const s = window.__game.scene.getScene('FishingLevel'); return s.state === 'land' && s.ringT < 0.4; }, null, { timeout: 8000 }).catch(() => undefined);
  await press('KeyF', 30);
  await wait(300);
  await shot('12b-pescaria-peixe');
  check('João pega o peixe com o puçá', (await fs_(() => window.__game.scene.getScene('FishingLevel').caught)) === 1);
  await fs_(() => { const s = window.__game.scene.getScene('FishingLevel'); s.state = 'aim'; s.timeLeft = 0.05; });
  await page.waitForFunction(() => { const s = window.__game.scene.getScene('FishingLevel'); return s.state === 'party' && s.callWin > 0.6; }, null, { timeout: 15000 }).catch(() => undefined);
  await page.keyboard.down('KeyF'); await page.keyboard.down('KeyK');
  await wait(80);
  await page.keyboard.up('KeyF'); await page.keyboard.up('KeyK');
  await wait(300);
  await shot('12c-arraia');
  check('Quadrilha no arraiá: BALANCÊ com os dois', (await fs_(() => window.__game.scene.getScene('FishingLevel').dances)) === 1);

  // ---------------------------------------------------------------- LAPINHA DA SERRA
  await startScene(TL, { levelId: 'lapinha' });
  await wait(400);
  const sink = await evalG(() => {
    const s = window.__game.scene.getScene('TrailLevel');
    const st = s.stones.find((x) => x.sinks);
    s.players[0].teleport(st.tx * 16 + 8, st.ty * 16 + 8);
    return { tx: st.tx };
  });
  await page.waitForFunction(() => window.__game.scene.getScene('TrailLevel').splashes > 0, null, { timeout: 8000 }).catch(() => undefined);
  await shot('16c-lapinha-pedra');
  check('Lapinha: pedra escura afunda e devolve pra margem', (await evalG(() => window.__game.scene.getScene('TrailLevel').splashes)) === 1, JSON.stringify(sink));
  await evalG(() => { const s = window.__game.scene.getScene('TrailLevel'); s.players.forEach((p, i) => p.teleport(26 * 16 + i * 16, 15 * 16 + 8)); });
  await wait(500);
  check('Lapinha: atravessar o rio marca a tarefa', !!(await evalG(() => window.__game.scene.getScene('TrailLevel').tasks?.isDone('river'))));

  // ---------------------------------------------------------------- HOTEL FAZENDA
  const F = 'FarmLevel';
  await startScene(F, { levelId: 'farm' });
  await wait(500);
  await shot('23-farm');
  const pet = await evalG(() => { const s = window.__game.scene.getScene('FarmLevel'); const a = s.animals[0]; s.players[0].teleport(a.x, a.y + 14); a.interact(s.players[0]); return a.petted; });
  check('Carinho nos bichos', pet === true);
  await evalG(() => { const s = window.__game.scene.getScene('FarmLevel'); const o = s.ostrich; s.players[0].teleport(o.x - 40, o.y); });
  await wait(2500);
  await shot('24-ostrich');
  await evalG(() => window.__game.scene.getScene('FarmLevel').onExit());
  await wait(400);
  const bx0 = await evalG(() => window.__game.scene.getScene('FarmLevel').boat?.x);
  for (let i = 0; i < 6; i++) { await page.keyboard.down('KeyF'); await page.keyboard.down('KeyK'); await wait(60); await page.keyboard.up('KeyF'); await page.keyboard.up('KeyK'); await wait(120); }
  await wait(600);
  const bx1 = await evalG(() => window.__game.scene.getScene('FarmLevel').boat?.x);
  check('Pedalinho anda pedalando juntos', bx0 !== undefined && Math.abs(bx1 - bx0) > 10, `${bx0} -> ${bx1}`);
  await shot('25-pedalinho');

  // ---------------------------------------------------------------- HISTÓRIA ESTILO ANIME
  await startScene('Story', { id: 'itacolomi_end', next: 'Map' });
  await wait(1800);
  await shot('26-story-anime');
  check('Cena de história abre', (await activeScenes()).includes('Story'));

  // ---------------------------------------------------------------- AMAZÔNIA
  await startScene('AmazonLevel', { levelId: 'amazon' });
  await wait(500);
  await shot('23-amazon');
  await place(1, 23, 4, 1, 0, 'AmazonLevel');
  await place(0, 22, 5, 1, 0, 'AmazonLevel');
  await wait(100);
  await press('KeyL');
  await wait(400);
  const up = await evalG(() => window.__game.scene.getScene('AmazonLevel').gators.find((g) => g.tx === 24 && g.ty === 4).up);
  check('Magia chama o jacaré (vira ponte)', up === true);
  await shot('24-amazon-gator');
  await page.keyboard.down('ArrowRight');
  await wait(700);
  await page.keyboard.up('ArrowRight');
  const ax = await evalG(() => window.__game.scene.getScene('AmazonLevel').players[1].x);
  check('Atravessar o rio pelo jacaré', ax > 24 * 16 + 8, `x=${ax.toFixed(0)}`);
  // cipó: só a espada corta
  await place(0, 14, 6, 1, 0, 'AmazonLevel');
  await place(1, 13, 7, 1, 0, 'AmazonLevel');
  await wait(100);
  await press('KeyG');
  await wait(400);
  const vine = await evalG(() => window.__game.scene.getScene('AmazonLevel').occupied.has('15,6'));
  check('Espada corta o cipó', vine === false);
  // tronco no rio vira ponte
  await place(0, 20, 9, 1, 0, 'AmazonLevel');
  await place(1, 19, 10, 1, 0, 'AmazonLevel');
  await wait(100);
  await page.keyboard.down('KeyD');
  await wait(2400);
  await page.keyboard.up('KeyD');
  const bridge = await evalG(() => window.__game.scene.getScene('AmazonLevel').layer.getTileAt(24, 9).index);
  check('Tronco empurrado no rio vira ponte', bridge === 11, `tile=${bridge}`);
  // entregar filhote à mamãe jacaré
  await evalG(() => { const s = window.__game.scene.getScene('AmazonLevel'); s.give(s.players[0], 'baby'); });
  await place(0, 22, 21, 0, -1, 'AmazonLevel');
  await place(1, 25, 21, 0, -1, 'AmazonLevel');
  await wait(100);
  await press('KeyF');
  await wait(300);
  const deliv = await evalG(() => window.__game.scene.getScene('AmazonLevel').delivered);
  check('Entregar filhote à mamãe jacaré', deliv === 1, `entregues=${deliv}`);
  await shot('25-amazon-nest');
  await evalG(() => { const s = window.__game.scene.getScene('AmazonLevel'); s.delivered = 3; s.onExit(); });
  await wait(3500);
  check('Amazônia concluída leva ao resultado', (await activeScenes()).includes('Result'));
  await shot('26-amazon-result');

  // ---------------------------------------------------------------- CHEFE
  await startScene('BossLevel', { levelId: 'storm' });
  await wait(3500);
  await shot('15-boss');
  // racha e estilhaça um cristal
  const cr = await evalG(() => { const c = window.__game.scene.getScene('BossLevel').crystals[0]; return [Math.floor(c.x / 16), Math.floor(c.y / 16)]; });
  await evalG(() => { window.__game.scene.getScene('BossLevel').players.forEach((p) => { p.invuln = 999; }); });
  await place(0, cr[0] - 1, cr[1], 1, 0, 'BossLevel');
  await place(1, cr[0], cr[1] + 1, 0, -1, 'BossLevel');
  await wait(100);
  await press('KeyG');
  await wait(400);
  await press('KeyG');
  await wait(200);
  await press('KeyL');
  await wait(300);
  const state = await evalG(() => window.__game.scene.getScene('BossLevel').crystals[0].state);
  check('Cristal: espada racha + magia estilhaça', state === 'gone', state);
  await evalG(() => { const s = window.__game.scene.getScene('BossLevel'); s.crystals.forEach((c) => { c.state = 'gone'; }); s.onCrystalShattered(); });
  await wait(900);
  await shot('16-boss-stunned');
  const hp0 = await evalG(() => window.__game.scene.getScene('BossLevel').bossHp);
  await evalG(() => { const s = window.__game.scene.getScene('BossLevel'); s.players[0].teleport(s.boss.x, s.boss.y + 26); s.players[0].face = { x: 0, y: -1 }; });
  await wait(100);
  await press('KeyG');
  await wait(100);
  const hp1 = await evalG(() => window.__game.scene.getScene('BossLevel').bossHp);
  check('Chefe atordoado recebe dano', hp1 < hp0, `${hp0} -> ${hp1}`);
  await evalG(() => { const s = window.__game.scene.getScene('BossLevel'); s.bossHp = 1; s.hitBoss(1); });
  await wait(3500);
  check('Vencer o chefe leva ao resultado', (await activeScenes()).includes('Result'));
  await shot('17-boss-result');
  await press('Enter');
  await wait(1500);
  await shot('18-ending');
  check('Final da história', (await activeScenes()).includes('Story'));

  // ---------------------------------------------------------------- CELULAR (toque)
  const mob = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const mp = await mob.newPage();
  mp.on('pageerror', (e) => errors.push(`mobile pageerror: ${e.message}`));
  await mp.goto(url);
  await mp.waitForFunction(() => window.__game && window.__game.scene.isActive('Menu'), null, { timeout: 20000 });
  check('Celular: controles de toque aparecem', await mp.evaluate(() => !!document.querySelector('#touch .stick.p0') && !!document.querySelector('#touch .btns.p1')));
  const tap = (sel) => mp.evaluate((s) => {
    const el = document.querySelector(s); const r = el.getBoundingClientRect();
    const o = { pointerId: 7, pointerType: 'touch', clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, bubbles: true, cancelable: true };
    el.dispatchEvent(new PointerEvent('pointerdown', o));
    setTimeout(() => el.dispatchEvent(new PointerEvent('pointerup', o)), 80);
  }, sel);
  await mp.evaluate(() => { const g = window.__game; g.scene.stop('Menu'); g.scene.start('TutorialLevel', { levelId: 'tutorial' }); });
  await mp.waitForTimeout(900);
  const bx = await mp.evaluate(() => window.__game.scene.getScene('TutorialLevel').players[0].x);
  await mp.evaluate(() => {
    const z = document.querySelector('#touch .stick.p0'); const r = z.getBoundingClientRect();
    const o = (x) => ({ pointerId: 3, pointerType: 'touch', clientX: x, clientY: r.y + r.height / 2, bubbles: true, cancelable: true });
    z.dispatchEvent(new PointerEvent('pointerdown', o(r.x + 40)));
    z.dispatchEvent(new PointerEvent('pointermove', o(r.x + 120)));
    setTimeout(() => z.dispatchEvent(new PointerEvent('pointerup', o(r.x + 120))), 1400);
  });
  await mp.waitForTimeout(1600);
  const ax2 = await mp.evaluate(() => window.__game.scene.getScene('TutorialLevel').players[0].x);
  check('Celular: joystick move o João', ax2 > bx + 10, `${bx.toFixed(0)} -> ${ax2.toFixed(0)}`);
  await mp.evaluate(() => { const s = window.__game.scene.getScene('TutorialLevel'); const p = s.players[1]; p.teleport(8 * 16 + 8, 10 * 16 + 8); p.face = { x: 0, y: 1 }; s.fuel = true; });
  await mp.waitForTimeout(100);
  await tap('#touch .btns.p1 .btn:not(.big)');
  await mp.waitForTimeout(400);
  check('Celular: botão Magia da Juliana funciona', await mp.evaluate(() => window.__game.scene.getScene('TutorialLevel').lit === true));
  await mp.screenshot({ path: `${OUT}/27-mobile.png` });
  await tap('#touch .top .small');
  await mp.waitForTimeout(400);
  check('Celular: botão de pausa', await mp.evaluate(() => window.__game.scene.isActive('Pause')));
  await mob.close();
} catch (e) {
  failures++;
  console.error('Erro no teste:', e);
  await shot('error');
}

if (errors.length) {
  console.log('\nErros do navegador:');
  errors.forEach((e) => console.log('  ' + e));
}
check('Sem erros no console do navegador', errors.length === 0, `${errors.length} erro(s)`);
await browser.close();
await server.close();
console.log(failures ? `\n${failures} falha(s)` : '\nTudo certo!');
process.exit(failures ? 1 : 0);
