/**
 * Testa o piloto automático (modo admin): abre cada fase e espera os personagens
 * terminarem sozinhos (cena de resultado). Uso: node scripts/autopilot.mjs [fase...]
 */
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const EXEC = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
const OUT = 'screenshots/autopilot';
fs.mkdirSync(OUT, { recursive: true });

const ALL = {
  tutorial: 'TutorialLevel', climb: 'TrailLevel', canyon: 'TrailLevel', medal: 'MedalLevel', bread: 'MotoLevel',
  itacolomi: 'TrailLevel', italiano: 'KitchenLevel', junina: 'FishingLevel', roca: 'MotoLevel',
  topo: 'TrailLevel', lapinha: 'TrailLevel', volta: 'MotoLevel', farm: 'FarmLevel',
};
const pick = process.argv.slice(2);
const levels = pick.length ? pick : Object.keys(ALL);
const LIMIT = Number(process.env.LIMIT_S || 420);

const server = await createServer({ server: { port: 5175, strictPort: false }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0] + '?admin=1';
const browser = await chromium.launch({ executablePath: EXEC, args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });

let failures = 0;
async function run(id) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}\n${e.stack}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  await page.goto(url);
  await page.waitForFunction(() => window.__game && window.__game.scene.isActive('Menu'), null, { timeout: 30000 });
  const key = ALL[id];
  await page.evaluate(([k, lid]) => {
    const g = window.__game;
    g.scene.getScenes(true).forEach((s) => g.scene.stop(s.scene.key));
    g.scene.start(k, { levelId: lid });
  }, [key, id]);
  const t0 = Date.now();
  let shots = 0;
  let result = null;
  let lastLog = 0;
  while ((Date.now() - t0) / 1000 < LIMIT) {
    await page.waitForTimeout(1000);
    const st = await page.evaluate((k) => { try {
      const g = window.__game;
      if (g.scene.isActive('Result')) {
        const r = g.scene.getScene('Result');
        return { done: true, texts: r.children.list.filter((o) => o.type === 'Text').map((o) => o.text).slice(0, 12) };
      }
      const s = g.scene.getScene(k);
      const p = s.players?.map((pl) => `${Math.floor(pl.x / 16)},${Math.floor(pl.y / 16)}${pl.locked ? 'L' : ''}`).join(' ');
      return { done: false, info: [s.state, s.step, s.dist?.toFixed?.(0), p, s.elapsed?.toFixed?.(0), s.timeLeft?.toFixed?.(0)].filter((x) => x !== undefined).join(' | ') };
    } catch (e) { return { done: false, info: 'transição' }; } }, key);
    if (st.done) { result = st; break; }
    const el = Math.round((Date.now() - t0) / 1000);
    if (el - lastLog < 5) continue;
    lastLog = el;
    console.log(`  [${id}] ${el}s  ${st.info}`);
    if (shots < 6 && el % 20 < 5) { await page.screenshot({ path: `${OUT}/${id}-${shots++}.png` }); }
  }
  const el = Math.round((Date.now() - t0) / 1000);
  if (result) {
    await page.screenshot({ path: `${OUT}/${id}-result.png` });
    console.log(`PASS  ${id} terminou sozinho em ${el}s — ${result.texts.join(' / ').slice(0, 300)}`);
  } else {
    await page.screenshot({ path: `${OUT}/${id}-timeout.png` });
    console.log(`FAIL  ${id} não terminou em ${LIMIT}s`);
    failures++;
  }
  if (errors.length) { console.log(errors.slice(0, 5).join('\n')); failures++; }
  await page.close();
}

const PAR = Number(process.env.PAR || 2);
const queue = [...levels];
await Promise.all(Array.from({ length: PAR }, async () => { while (queue.length) await run(queue.shift()); }));
await browser.close();
await server.close();
console.log(failures ? `${failures} falha(s)` : 'Piloto automático: tudo certo!');
process.exit(failures ? 1 : 0);
