import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import http from 'node:http';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ROLE_PERMISSIONS } from '../../src/lib/roles.js';

const dir = await mkdtemp(join(tmpdir(), 'mfn-routes-'));
const db = join(dir, 'test.db'); await writeFile(db, '');
process.env.DATABASE_URL = `file:${db}`;
process.env.JWT_SECRET = 'clave-exclusiva-pruebas-locales-no-produccion';
process.env.NODE_ENV = 'test';
execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--schema', 'prisma/schema.prisma'], { cwd: resolve('.'), env: process.env, stdio: 'pipe' });
const { default: prisma } = await import('../../src/lib/prisma.js');
const { default: app } = await import('../../src/app.js');
const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}/api/v1`;
let delivered;
const mail = http.createServer(async (req,res) => { let text=''; for await (const chunk of req) text+=chunk; delivered=JSON.parse(text); res.end('ok'); });
mail.listen(0, '127.0.0.1'); await new Promise(resolve => mail.once('listening',resolve));
process.env.RESET_DELIVERY_URL = `http://127.0.0.1:${mail.address().port}`;
process.env.RESET_DELIVERY_SECRET = 'solo-pruebas';
const password = 'Contrasena-prueba-2026';
const users = {}; const tokens = {};
for (const code of ['GE','DIRPROY','DIRADMIN','AUD','EMP']) {
 const role=await prisma.rol.create({data:{codigo:code,nombre:code,permisos:ROLE_PERMISSIONS[code]}});
 users[code]=await prisma.usuario.create({data:{correo:`${code.toLowerCase()}@example.test`,hashContrasena:await bcrypt.hash(password,4),rolId:role.id}});
}
async function request(path, method='GET', token, body) {
 const response=await fetch(base+path,{method,headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(body?{'Content-Type':'application/json'}:{})},body:body && method !== 'GET'?JSON.stringify(body):undefined});
 return {status:response.status,data:await response.json()};
}
for (const code of Object.keys(users)) { const r=await request('/auth/login','POST',null,{correo:users[code].correo,contrasena:password}); assert.equal(r.status,200);tokens[code]=r.data.token; }
const project = { nombre:'Obra de prueba sin municipio en el nombre', municipio:'Santa Eulalia', agenciaFinanciadora:'Prueba', fechaInicioPlanificada:'2026-10-03',presupuestoMunicipal:100, presupuestoCooperacion:200 };
let id;

test('Rutas reales con base migrada y aislada', async t => {
 t.after(async()=>{ await prisma.$disconnect(); await Promise.all([new Promise(resolve=>server.close(resolve)),new Promise(resolve=>mail.close(resolve))]); await rm(dir,{recursive:true,force:true}); });
 await t.test('token fijo y token de recuperación no sirven como sesión',async()=>{
  assert.equal((await request('/proyectos','GET','demo-token-mfn')).status,401);
  const reset=jwt.sign({sub:users.GE.id,type:'password_reset'},process.env.JWT_SECRET,{expiresIn:'15m'});
  assert.equal((await request('/proyectos','GET',reset)).status,401);
 });
 await t.test('empleado no consulta ni modifica módulos restringidos',async()=>{
  for (const [path,method] of [['/proyectos','GET'],['/estadisticas/censos','POST'],['/transparencia','POST'],['/transparencia/1/visibilidad','PUT'],['/gobernanza/acuerdos/1','PUT'],['/inteligencia/sello-forense','POST']]) assert.equal((await request(path,method,tokens.EMP,{})).status,403,path);
 });
 await t.test('proyecto conserva municipio y rechaza montos o porcentajes inválidos',async()=>{
  const result=await request('/proyectos','POST',tokens.DIRPROY,project);assert.equal(result.status,201);id=result.data.id;
  assert.equal((await request(`/proyectos/${id}`,'GET',tokens.DIRPROY)).data.municipio,'Santa Eulalia');
  assert.equal((await request(`/proyectos/${id}`,'PUT',tokens.DIRPROY,{porcentajeAvanceFisico:101})).status,400);
 });
 await t.test('catálogo activo excluye municipios históricos y no prioriza datos ausentes',async()=>{
  assert.equal((await request('/proyectos','POST',tokens.GE,{...project,municipio:'Santa Cruz Barillas'})).status,400);
  assert.equal((await request('/estadisticas/censos','POST',tokens.GE,{municipio:'San Mateo Ixtatán',comunidad:'Prueba'})).status,400);
  const result=await request('/inteligencia/dictamen','GET',tokens.GE);assert.equal(result.status,200);
  assert.deepEqual(result.data.ranking.map(x=>x.municipio).sort(),['San Pedro Soloma','Santa Eulalia','San Rafael la Independencia'].sort());
  assert.equal(result.data.municipioRecomendado,null);
  for(const row of result.data.ranking)assert.equal(row.puntajeIPIM,null);
 });
 await t.test('permisos revocados se aplican a una sesión ya iniciada',async()=>{
  await prisma.rol.update({where:{codigo:'DIRPROY'},data:{permisos:ROLE_PERMISSIONS.EMP}});
  assert.equal((await request('/proyectos','GET',tokens.DIRPROY)).status,403);
  await prisma.rol.update({where:{codigo:'DIRPROY'},data:{permisos:ROLE_PERMISSIONS.DIRPROY}});
 });
 await t.test('evidencia conserva archivo, huella y coordenadas cero',async()=>{
  const archivoBase64='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
  const r=await request(`/proyectos/${id}/evidencias`,'POST',tokens.DIRPROY,{archivoBase64,tipoMime:'image/png',latitud:0,longitud:0});assert.equal(r.status,201);assert.equal(r.data.latitud,0);assert.match(r.data.sha256,/^[a-f0-9]{64}$/);
  const stored=await prisma.evidenciaProyecto.findUnique({where:{id:r.data.id}});assert.equal(stored.contenido,archivoBase64);
  assert.equal((await request(`/proyectos/${id}/evidencias`,'POST',tokens.DIRPROY,{archivoBase64:'AAAA',tipoMime:'image/png'})).status,400);
 });
 await t.test('consulta de integridad no escribe; auditoría distingue cambios autorizados',async()=>{
  const before=await prisma.puntoControlIntegridad.count();await request('/inteligencia/sello-forense?sellar=true','GET',tokens.GE);assert.equal(await prisma.puntoControlIntegridad.count(),before);
  assert.equal((await request('/inteligencia/sello-forense','POST',tokens.AUD)).status,200);
  await request(`/proyectos/${id}`,'PUT',tokens.DIRPROY,{presupuestoMunicipal:150});
  const verified=await request('/inteligencia/sello-forense','GET',tokens.AUD);assert.equal(verified.data.estadoIntegridad,'CAMBIOS CON TRAZABILIDAD VERIFICADA');assert.deepEqual(verified.data.discrepancias,[]);
 });
 await t.test('alteraciones no auditadas no se ocultan con un login ni pueden sellarse',async()=>{
  await prisma.proyecto.update({where:{id},data:{agenciaFinanciadora:'Alteración directa'}});
  await request('/auth/login','POST',null,{correo:users.GE.correo,contrasena:password});
  const r=await request('/inteligencia/sello-forense','GET',tokens.AUD);assert.ok(r.data.discrepancias.includes(`proyecto:${id}`));
  assert.equal((await request('/inteligencia/sello-forense','POST',tokens.GE)).status,409);
  await prisma.proyecto.update({where:{id},data:{agenciaFinanciadora:project.agenciaFinanciadora}});
 });
 await t.test('fallo de auditoría revierte la escritura de negocio',async()=>{
  await prisma.$executeRawUnsafe(`CREATE TRIGGER reject_audit BEFORE INSERT ON BitacoraAuditoria WHEN NEW.accion = 'create' BEGIN SELECT RAISE(ABORT, 'prueba de rollback'); END`);
  const before=await prisma.proyecto.count();const r=await request('/proyectos','POST',tokens.GE,project);assert.equal(r.status,500);assert.equal(await prisma.proyecto.count(),before);
  await prisma.$executeRawUnsafe('DROP TRIGGER reject_audit');
 });
 await t.test('expediente público no expone datos personales ni códigos secuenciales',async()=>{
  const r=await request('/transparencia/solicitudes','POST',null,{nombre:'Persona Prueba',correo:'privado@example.test',telefono:'123',descripcion:'Detalle privado'});assert.equal(r.status,201);assert.match(r.data.expediente,/^UIP-[a-f0-9]{48}$/);
  const lookup=await request(`/transparencia/solicitudes/${r.data.expediente}`);assert.equal(lookup.status,200);for(const key of ['solicitante','correo','telefono','descripcion']) assert.equal(lookup.data[key],undefined);
  assert.equal((await request('/transparencia/solicitudes/EXP-UIP-2024-0001')).status,404);
 });
 await t.test('recuperación entrega por canal privado, consume una vez y revoca sesiones',async()=>{
  const existing=await request('/auth/recuperar','POST',null,{correo:users.GE.correo});const missing=await request('/auth/recuperar','POST',null,{correo:'no-existe@example.test'});assert.deepEqual(existing.data,missing.data);assert.equal(existing.data.tokenRecuperacion,undefined);assert.equal(delivered.correo,users.GE.correo);
  const body={token:delivered.token,nuevaContrasena:'Nueva-clave-segura-2026'};
  assert.equal((await request('/auth/restablecer','POST',null,body)).status,200);
  assert.equal((await request('/auth/restablecer','POST',null,body)).status,401);
  assert.equal((await request('/proyectos','GET',tokens.GE)).status,401);
  assert.equal((await request('/auth/login','POST',null,{correo:users.GE.correo,contrasena:body.nuevaContrasena})).status,200);
 });
});
