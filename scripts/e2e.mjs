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
const url = server.resolvedUrls.local[0];

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
  await wait(1300);
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

  // ---------------------------------------------------------------- COZINHA
  await startScene('KitchenLevel', { levelId: 'picnic' });
  await wait(500);
  await shot('09-kitchen-intro');
  await press('KeyF');
  await press('KeyK');
  await wait(2800);
  const started = await evalG(() => window.__game.scene.getScene('KitchenLevel').started);
  check('Cozinha inicia quando os dois confirmam', started === true);
  // J1: maçã -> tábua -> corta
  await place(0, 3, 4, 0, -1, 'KitchenLevel');
  await wait(80);
  await press('KeyF');
  await place(0, 10, 7, 0, 1, 'KitchenLevel');
  await wait(80);
  await press('KeyF');
  await page.keyboard.down('KeyF');
  await wait(1900);
  await page.keyboard.up('KeyF');
  const boardItem = await evalG(() => window.__game.scene.getScene('KitchenLevel').surfaces.find((s) => s.tx === 10 && s.ty === 8)?.item?.kind);
  check('J1 corta maçã na tábua (segurando AÇÃO)', boardItem === 'apple_cut', String(boardItem));
  // J2 tenta cortar: não pode
  await place(0, 4, 12, 0, 1, 'KitchenLevel');
  await place(1, 17, 7, 0, 1, 'KitchenLevel');
  await wait(80);
  await press('KeyK'); // prato
  await place(1, 10, 9, 0, -1, 'KitchenLevel');
  await wait(80);
  await press('KeyK'); // prato + maçã cortada
  let contents = await evalG(() => window.__game.scene.getScene('KitchenLevel').players[1].held?.contents);
  check('Montar prato com ingrediente da bancada', Array.isArray(contents) && contents.includes('apple_cut'), JSON.stringify(contents));
  const orders = await evalG(() => window.__game.scene.getScene('KitchenLevel').orders.map((o) => o.recipe));
  if (!orders.includes('apple_slices') && orders.includes('fruit_salad')) {
    await place(1, 6, 4, 0, -1, 'KitchenLevel');
    await wait(80);
    await press('KeyK'); // amoras direto no prato
  }
  contents = await evalG(() => window.__game.scene.getScene('KitchenLevel').players[1].held?.contents);
  await place(1, 24, 8, 1, 0, 'KitchenLevel');
  await wait(80);
  await press('KeyK');
  await wait(200);
  const score = await evalG(() => window.__game.scene.getScene('KitchenLevel').score);
  check('Entrega de pedido pontua', score > 0, `pedidos=${orders.join(',')} prato=${JSON.stringify(contents)} pontos=${score}`);
  // fogo: apaga e J2 reacende
  await evalG(() => window.__game.scene.getScene('KitchenLevel').cookers.forEach((c) => c.extinguish()));
  await place(1, 13, 7, 0, 1, 'KitchenLevel');
  await wait(80);
  await press('KeyL');
  await wait(200);
  const fire = await evalG(() => window.__game.scene.getScene('KitchenLevel').cookers[0].fire);
  check('Magia reacende a fogueira', fire > 10, `fogo=${fire.toFixed(1)}`);
  // cogumelo -> corta -> panela -> sopa
  await place(0, 9, 4, 0, -1, 'KitchenLevel');
  await wait(80);
  await press('KeyF');
  await place(0, 11, 7, 0, 1, 'KitchenLevel');
  await wait(80);
  await press('KeyF');
  await page.keyboard.down('KeyF');
  await wait(1900);
  await page.keyboard.up('KeyF');
  await press('KeyF'); // pega cogumelo picado
  await place(0, 13, 9, 0, -1, 'KitchenLevel');
  await wait(80);
  await press('KeyF'); // coloca na panela
  const pot = await evalG(() => window.__game.scene.getScene('KitchenLevel').cookers[0].contents);
  check('Cogumelo picado vai para a panela', JSON.stringify(pot) === '["mushroom_cut"]', JSON.stringify(pot));
  await wait(8600);
  const done = await evalG(() => window.__game.scene.getScene('KitchenLevel').cookers[0].done);
  check('Sopa cozinha com o fogo aceso', done === 'soup', String(done));
  await shot('10-kitchen-play');
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

  // ---------------------------------------------------------------- FESTIVAL
  await startScene('KitchenLevel', { levelId: 'festival' });
  await press('KeyF');
  await press('KeyK');
  await wait(2600);
  await evalG(() => { const s = window.__game.scene.getScene('KitchenLevel'); s.cartT = 0.1; s.crowT = 0.1; });
  await wait(1200);
  await shot('12-festival');
  check('Festival roda sem erros', (await activeScenes()).includes('KitchenLevel'));

  // ---------------------------------------------------------------- FLORESTA
  await startScene('ForestLevel', { levelId: 'forest' });
  await wait(500);
  await shot('13-forest');
  await place(1, 14, 7, 1, 0, 'ForestLevel');
  await place(0, 13, 8, 1, 0, 'ForestLevel');
  await wait(100);
  await press('KeyL');
  await wait(900);
  const thorn = await evalG(() => window.__game.scene.getScene('ForestLevel').occupied.has('15,7'));
  check('Magia queima os espinhos', thorn === false);
  // J1 empurra a pedra grande para baixo
  await place(0, 40, 5, 0, 1, 'ForestLevel');
  await place(1, 38, 5, 0, 1, 'ForestLevel');
  await wait(100);
  await page.keyboard.down('KeyS');
  await wait(2200);
  await page.keyboard.up('KeyS');
  const by = await evalG(() => window.__game.scene.getScene('ForestLevel').boulders.find((b) => b.tx === 40)?.ty);
  check('J1 empurra pedra', by > 6, `linha=${by}`);
  // J2 não consegue empurrar
  await place(0, 30, 3, 0, 1, 'ForestLevel');
  await place(1, 45, 2, 1, 0, 'ForestLevel');
  await wait(100);
  await page.keyboard.down('ArrowRight');
  await wait(900);
  await page.keyboard.up('ArrowRight');
  const nook = await evalG(() => window.__game.scene.getScene('ForestLevel').boulders.find((b) => b.ty === 2)?.tx);
  check('J2 não empurra pedra (só o Guardião)', nook === 46, `coluna=${nook}`);
  await shot('14-forest-push');
  // desmaio e reviver
  await evalG(() => { const s = window.__game.scene.getScene('ForestLevel'); s.players[1].hp = 1; s.damagePlayer(s.players[1], 1, 0, 0); });
  await place(0, 44, 2, 1, 0, 'ForestLevel');
  await wait(100);
  await page.keyboard.down('KeyF');
  await wait(1700);
  await page.keyboard.up('KeyF');
  const fainted = await evalG(() => window.__game.scene.getScene('ForestLevel').players[1].fainted);
  check('Reviver o parceiro segurando AÇÃO', fainted === false);

  // ---------------------------------------------------------------- MOTO
  await startScene('MotoLevel', { levelId: 'moto' });
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
  await evalG(() => { const s = window.__game.scene.getScene('MotoLevel'); s.dist = 15000 * 0.22; s.invuln = 99; });
  await page.waitForFunction(() => { const s = window.__game.scene.getScene('MotoLevel'); const o = s.objs.find((x) => x.kind === 'spot'); return o && o.x < s.mx + 160; }, null, { timeout: 5000 });
  await shot('21-moto');
  await press('KeyK');
  await wait(200);
  const photos = await evalG(() => window.__game.scene.getScene('MotoLevel').photos);
  check('Garupa tira foto na placa', photos === 1, `fotos=${photos}`);
  await wait(300);
  await shot('22-moto-photo');
  await evalG(() => { window.__game.scene.getScene('MotoLevel').dist = 15000; });
  await wait(3200);
  check('Chegar na cachoeira leva ao resultado', (await activeScenes()).includes('Result'));

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
    setTimeout(() => z.dispatchEvent(new PointerEvent('pointerup', o(r.x + 120))), 600);
  });
  await mp.waitForTimeout(800);
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
