import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import app from '../src/app.js';
import prisma from '../src/lib/prisma.js';

const file = process.env.QA_CREDENTIALS_FILE;
if (!file || !process.env.DATABASE_URL?.includes('mfn_e2e_')) throw new Error('Use únicamente la base aislada y un archivo privado de cuentas de prueba');
const accounts = JSON.parse(await readFile(file, 'utf8')).accounts;
const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}/api/v1`;
const routes = {
  proyectos: '/proyectos', arc: '/arc', financiero: '/financiero/balance', gobernanza: '/gobernanza/actas',
  convenios: '/convenios', estadisticas: '/estadisticas/censos', inteligencia: '/inteligencia/dictamen',
  estructura: '/colaboradores', reclutamiento: '/convocatorias', evaluaciones: '/evaluaciones',
  ausencias: '/ausencias', disciplina: '/disciplina', capacitacion: '/capacitaciones',
};
async function request(path, cookie) {
  const response = await fetch(base + path, { headers: cookie ? { Cookie: cookie } : {} });
  const body = await response.json().catch(() => null);
  return { status: response.status, body, cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
try {
  for (const account of accounts) {
    const loginResponse = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo: account.email, contrasena: account.password }) });
    const login = await loginResponse.json();
    assert.equal(loginResponse.status, 200, `${account.role}: ingreso`);
    const cookie = loginResponse.headers.get('set-cookie')?.split(';')[0];
    assert.ok(cookie, `${account.role}: cookie de sesión`);
    const me = await request('/auth/me', cookie);
    assert.equal(me.status, 200, `${account.role}: perfil`);
    assert.equal(me.body.rol, account.role, `${account.role}: rol`);
    assert.deepEqual(me.body.municipios.sort(), account.municipalities.sort(), `${account.role}: municipios`);
    assert.equal(me.body.mustChangePassword, false, `${account.role}: cuenta QA lista`);
    const dashboard = await request('/dashboard', cookie);
    assert.equal(dashboard.status, 200, `${account.role}: tablero`);
    assert.equal(dashboard.body.vista, me.body.permisos.alcance.tablero, `${account.role}: tablero configurado`);
    const results = await Promise.all(Object.entries(routes).map(async ([module, path]) => {
      const result = await request(path, cookie);
      const expected = me.body.permisos.modulos.includes(module) ? 200 : 403;
      assert.equal(result.status, expected, `${account.role}: ${module}`);
      return result;
    }));
    assert.equal((await request('/admin/overview', cookie)).status, 403, `${account.role}: administración separada`);
    assert.equal((await request('/transparencia/publico', cookie)).status, 200, `${account.role}: portal público`);
    console.log(`${account.role}: ingreso, tablero, ${results.length} módulos y aislamiento administrativo correctos`);
  }
} finally {
  await prisma.$disconnect();
  await new Promise(resolve => server.close(resolve));
}
