/**
 * Capturas rápidas de cada fase para revisão visual (arte, HUD, efeitos).
 * Uso: node scripts/shots.mjs [fase...]   (gera em ./screenshots/fases)
 * Variáveis: WAIT_MS (espera antes da captura, padrão 4000), QS (query extra, ex.: "fx=1").
 */
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const EXEC = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
const OUT = 'screenshots/fases';
fs.mkdirSync(OUT, { recursive: true });

const ALL = {
  tutorial: 'TutorialLevel', climb: 'TrailLevel', canyon: 'TrailLevel', medal: 'MedalLevel', bread: 'MotoLevel',
  itacolomi: 'TrailLevel', italiano: 'KitchenLevel', junina: 'FishingLevel', roca: 'MotoLevel',
  topo: 'TrailLevel', lapinha: 'TrailLevel', volta: 'MotoLevel', farm: 'FarmLevel', storm: 'BossLevel', amazon: 'AmazonLevel',
};
const pick = process.argv.slice(2);
const levels = pick.length ? pick : Object.keys(ALL);
const WAIT = Number(process.env.WAIT_MS || 4000);

const server = await createServer({ server: { port: 5177, strictPort: false }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0] + (process.env.QS ? `?${process.env.QS}` : '');
const browser = await chromium.launch({ executablePath: EXEC, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url);
await page.waitForFunction(() => window.__game && window.__game.scene.isActive('Menu'), null, { timeout: 30000 });
for (const id of levels) {
  await page.evaluate(([k, lid]) => {
    const g = window.__game;
    g.scene.getScenes(true).forEach((s) => g.scene.stop(s.scene.key));
    g.scene.start(k, { levelId: lid });
  }, [ALL[id], id]);
  await page.waitForTimeout(WAIT);
  await page.screenshot({ path: `${OUT}/${id}.png` });
  console.log('ok', id);
}
await browser.close();
await server.close();
if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
