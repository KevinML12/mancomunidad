import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

if (!process.env.DATABASE_URL?.includes('mfn_e2e_') || !process.env.QA_CREDENTIALS_FILE || !process.env.PLAYWRIGHT_CHROMIUM_PATH) {
  throw new Error('La prueba de navegador requiere una base aislada, cuentas QA y Chromium local');
}
const { default: app } = await import('../../backend/src/app.js');
const { default: prisma } = await import('../../backend/src/lib/prisma.js');
const accounts = JSON.parse(await readFile(process.env.QA_CREDENTIALS_FILE, 'utf8')).accounts;
const backend = app.listen(0, '127.0.0.1');
await new Promise(resolve => backend.once('listening', resolve));
const frontend = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], {
  cwd: resolve('.'), env: { ...process.env, VITE_API_URL: `http://127.0.0.1:${backend.address().port}` }, stdio: 'ignore',
});
const site = 'http://127.0.0.1:4173';
let browser;
try {
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    try { ready = (await fetch(site + '/login')).ok; if (ready) break; } catch { /* Vite está iniciando. */ }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  assert.ok(ready, 'El portal local debe estar disponible');
  browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH });
  for (const account of process.argv.includes('--mobile-only') ? [] : accounts) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    try {
      const page = await context.newPage();
      await page.goto(site + '/login');
      await page.locator('#input-correo').fill(account.email);
      await page.locator('#input-contrasena').fill(account.password);
      await page.getByRole('button', { name: /ingresar|iniciar sesión/i }).first().click();
      await page.waitForURL('**/inicio', { timeout: 30_000 });
      const me = await page.evaluate(async api => (await fetch(api + '/api/v1/auth/me', { credentials: 'include' })).json(), `http://127.0.0.1:${backend.address().port}`);
      assert.equal(me.rol, account.role, `${account.role}: sesión de navegador`);
      const visibleAreas = me.permisos.prioritarios;
      for (const area of visibleAreas) {
        const route = { proyectos: '/proyectos', arc: '/arc', financiero: '/financiero', gobernanza: '/gobernanza', convenios: '/convenios', estadisticas: '/estadisticas', inteligencia: '/inteligencia', estructura: '/personal', reclutamiento: '/gestion-personal/reclutamiento', evaluaciones: '/gestion-personal/evaluaciones', ausencias: '/gestion-personal/ausencias', disciplina: '/gestion-personal/disciplina', capacitacion: '/gestion-personal/capacitacion', transparencia: '/transparencia' }[area];
        assert.ok(await page.locator(`a.mfn-home-area[href="${route}"]`).count(), `${account.role}: área principal ${area}`);
      }
      if (visibleAreas.length) {
        await page.locator('a.mfn-home-area').first().click();
        await page.waitForURL(url => url.pathname !== '/inicio', { timeout: 20_000 });
        assert.ok(!(await page.getByText('Acceso restringido').count()), `${account.role}: módulo accesible`);
      }
      console.log(`${account.role}: navegador, menú y primer módulo correctos`);
    } finally { await context.close(); }
  }
  for (const width of [390, 768]) {
    const context = await browser.newContext({ viewport: { width, height: 844 } });
    try {
      const page = await context.newPage();
      await page.goto(site + '/login');
      await page.locator('#input-correo').waitFor({ state: 'visible', timeout: 15_000 });
      const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: window.innerWidth }));
      assert.ok(dimensions.scroll <= dimensions.viewport + 2, `sin desbordamiento horizontal a ${width}px`);
    } finally { await context.close(); }
  }
} finally {
  await browser?.close();
  frontend.kill('SIGTERM');
  await prisma.$disconnect();
  await new Promise(resolve => backend.close(resolve));
}
