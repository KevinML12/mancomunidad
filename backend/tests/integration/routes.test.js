import test from 'node:test';
import crypto from 'node:crypto';
import { startR2Mock, pdfFixture } from '../helpers/r2-mock.js';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import http from 'node:http';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ROLE_PERMISSIONS } from '../../src/lib/roles.js';
import express from 'express';

const dir = await mkdtemp(join(tmpdir(), 'mfn-routes-'));
const db = join(dir, 'test.db'); await writeFile(db, '');
process.env.DATABASE_URL = `file:${db}`;
process.env.JWT_SECRET = 'clave-exclusiva-pruebas-locales-no-produccion';
process.env.NODE_ENV = 'test';
process.env.APP_ADMIN_EMAILS = 'ge@example.test';
execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--schema', 'prisma/schema.prisma'], { cwd: resolve('.'), env: process.env, stdio: 'pipe' });
const { default: prisma } = await import('../../src/lib/prisma.js');
const { default: app } = await import('../../src/app.js');
const { rateLimit } = await import('../../src/middleware/rate-limit.js');
const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}/api/v1`;
let delivered;
const mail = http.createServer(async (req,res) => { let text=''; for await (const chunk of req) text+=chunk; delivered=JSON.parse(text); res.end('ok'); });
mail.listen(0, '127.0.0.1'); await new Promise(resolve => mail.once('listening',resolve));
process.env.RESET_DELIVERY_URL = `http://127.0.0.1:${mail.address().port}`;
process.env.RESET_DELIVERY_SECRET = 'solo-pruebas';
const password = 'Contrasena-prueba-2026';
const users = {}; const tokens = {};
for (const code of ['GE','JD','DIRPROY','DIRADMIN','AUD','EMP']) {
 const role=await prisma.rol.create({data:{codigo:code,nombre:code,permisos:ROLE_PERMISSIONS[code]}});
 users[code]=await prisma.usuario.create({data:{correo:`${code.toLowerCase()}@example.test`,hashContrasena:await bcrypt.hash(password,4),rolId:role.id}});
}
async function request(path, method='GET', token, body) {
 const response=await fetch(base+path,{method,headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(body?{'Content-Type':'application/json'}:{})},body:body && method !== 'GET'?JSON.stringify(body):undefined});
 return {status:response.status,data:await response.json(),headers:response.headers};
}
for (const code of Object.keys(users)) {
 const r=await request('/auth/login','POST',null,{correo:users[code].correo,contrasena:password});
 assert.equal(r.status,200);
 assert.equal(r.data.token,undefined);
 assert.match(r.headers.get('set-cookie')||'',/mfn_session=.*HttpOnly.*SameSite=Lax/i);
 tokens[code]=jwt.sign({type:'session',version:users[code].sessionVersion,sub:users[code].id},process.env.JWT_SECRET,{expiresIn:'12h'});
}
const project = { nombre:'Obra de prueba sin municipio en el nombre', municipio:'Santa Eulalia', agenciaFinanciadora:'Prueba', fechaInicioPlanificada:'2026-10-03',presupuestoMunicipal:100, presupuestoCooperacion:200 };
let id;

test('Rutas reales con base migrada y aislada', async t => {
 t.after(async()=>{ await prisma.$disconnect(); await Promise.all([new Promise(resolve=>server.close(resolve)),new Promise(resolve=>mail.close(resolve))]); await rm(dir,{recursive:true,force:true}); });
 await t.test('la migración administrativa no se expone por HTTP',async()=>{
  assert.equal((await request('/sistema/migrar','POST',null,{})).status,404);
 });
 await t.test('CORS solo permite el origen configurado y la API privada no se almacena en caché',async()=>{
  const allowed=await fetch(base+'/auth/me',{method:'OPTIONS',headers:{Origin:'http://127.0.0.1:3000','Access-Control-Request-Method':'GET'}});
  assert.equal(allowed.headers.get('access-control-allow-origin'),'http://127.0.0.1:3000');
  const denied=await fetch(base+'/auth/me',{method:'OPTIONS',headers:{Origin:'https://evil.example','Access-Control-Request-Method':'GET'}});
  assert.equal(denied.headers.get('access-control-allow-origin'),null);
  const privateResponse=await fetch(base+'/auth/me');
  assert.equal(privateResponse.headers.get('cache-control'),'no-store');
  assert.equal(privateResponse.headers.get('x-content-type-options'),'nosniff');
 });
 await t.test('sesión por cookie permite lectura, exige origen permitido en escritura y se cierra',async()=>{
  const login=await request('/auth/login','POST',null,{correo:users.GE.correo,contrasena:password});
  const cookie=login.headers.get('set-cookie').split(';')[0];
  const me=await fetch(base+'/auth/me',{headers:{Cookie:cookie}});
  assert.equal(me.status,200);
  const blocked=await fetch(base+'/proyectos',{method:'POST',headers:{Cookie:cookie,Origin:'https://evil.example','Content-Type':'application/json'},body:JSON.stringify(project)});
  assert.equal(blocked.status,403);
  const logout=await fetch(base+'/auth/logout',{method:'POST',headers:{Cookie:cookie,Origin:'http://127.0.0.1:3000'}});
  assert.equal(logout.status,200);
  assert.match(logout.headers.get('set-cookie')||'',/mfn_session=/);
 });
 await t.test('límite compartido conserva el cupo con peticiones concurrentes en dos instancias',async()=>{
  const scope=`test-${Date.now()}`;
  const servers=[0,1].map(()=>{
   const limited=express();
   limited.get('/limited',rateLimit(3,60_000,{scope}),(_req,res)=>res.json({ok:true}));
   return limited.listen(0,'127.0.0.1');
  });
  try {
   await Promise.all(servers.map(server=>new Promise(resolve=>server.once('listening',resolve))));
   const statuses=await Promise.all(Array.from({length:8},(_,i)=>fetch(`http://127.0.0.1:${servers[i%2].address().port}/limited`).then(response=>response.status)));
   assert.equal(statuses.filter(status=>status===200).length,3);
   assert.equal(statuses.filter(status=>status===429).length,5);
  } finally {
   await Promise.all(servers.map(server=>new Promise(resolve=>server.close(resolve))));
  }
 });
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
 await t.test('finanzas separa cuentas y exige comprobante para caja chica',async()=>{
  const body={tipo:'Ingreso',cuentaBancaria:'Fondos Públicos',categoria:'Cuota Ordinaria',municipio:'Santa Eulalia',monto:100,comprobanteTipo:'Recibo CGC 63-A2',comprobanteNumero:'PRUEBA-1',descripcion:'Movimiento de prueba'};
  assert.equal((await request('/financiero/transacciones','POST',tokens.GE,body)).status,201);
  assert.equal((await request('/financiero/transacciones','POST',tokens.GE,{...body,tipo:'Egreso',categoria:'Caja Chica'})).status,400);
  const balance=await request('/financiero/balance','GET',tokens.GE);
  assert.equal(balance.status,200);
  assert.equal(balance.data.cuentas.fondosPublicos.saldo,100);
  assert.equal(balance.data.cuentas.cooperacion.saldo,0);
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
  const keys=['R2_ENDPOINT','R2_BUCKET','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY'];
  const saved=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
  const mock=await startR2Mock();
  Object.assign(process.env,{R2_ENDPOINT:mock.endpoint,R2_BUCKET:'test-bucket',R2_ACCESS_KEY_ID:'test-key',R2_SECRET_ACCESS_KEY:'test-secret'});
  try {
  const archivoBase64='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
  const r=await request(`/proyectos/${id}/evidencias`,'POST',tokens.DIRPROY,{archivoBase64,tipoMime:'image/png',latitud:0,longitud:0});assert.equal(r.status,201);assert.equal(r.data.latitud,0);assert.match(r.data.sha256,/^[a-f0-9]{64}$/);
  const stored=await prisma.evidenciaProyecto.findUnique({where:{id:r.data.id}});assert.equal(stored.contenido,null);assert.match(stored.urlArchivo,/^r2media:\/\/evidencias\//);
  assert.match(r.data.urlArchivo,/^http:\/\/127\.0\.0\.1:/);
  assert.equal((await request(`/proyectos/${id}/evidencias`,'POST',tokens.DIRPROY,{archivoBase64:'AAAA',tipoMime:'image/png'})).status,400);
  } finally {
   for(const [key,value] of Object.entries(saved)) if(value===undefined) delete process.env[key]; else process.env[key]=value;
   await new Promise(resolve=>mock.server.close(resolve));
  }
 });
 await t.test('administración separada publica contenido con archivo R2 y bloquea otros roles',async()=>{
  assert.equal((await request('/admin/overview','GET',tokens.EMP)).status,403);
  assert.equal((await request('/admin/overview','GET',tokens.GE)).status,200);
  const keys=['R2_ENDPOINT','R2_BUCKET','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY'];
  const saved=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
  const mock=await startR2Mock();
  Object.assign(process.env,{R2_ENDPOINT:mock.endpoint,R2_BUCKET:'test-bucket',R2_ACCESS_KEY_ID:'test-key',R2_SECRET_ACCESS_KEY:'test-secret'});
  try {
   const archivoBase64='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
   assert.equal((await request('/admin/media','POST',tokens.EMP,{archivoBase64,tipoMime:'image/png'})).status,403);
   const media=await request('/admin/media','POST',tokens.GE,{archivoBase64,tipoMime:'image/png'});
   assert.equal(media.status,201);assert.match(media.data.reference,/^r2media:\/\/publicaciones\//);
   const created=await request('/admin/publicaciones','POST',tokens.GE,{tipo:'Aviso',titulo:'Aviso de prueba',resumen:'Contenido comprobado en la prueba',mediaRef:media.data.reference,visibilidad:true});
   assert.equal(created.status,201);assert.equal(created.data.visibilidad,false);
   assert.equal((await request('/transparencia/publico')).data.publicaciones.some(row=>row.id===created.data.id),false);
   assert.equal((await request(`/admin/publicaciones/${created.data.id}`,'PATCH',tokens.GE,{visibilidad:true})).status,200);
   assert.equal((await request('/transparencia/publico')).data.publicaciones.some(row=>row.id===created.data.id),true);
   const image=await fetch(base+`/transparencia/publicaciones/${created.data.id}/media`,{redirect:'manual'});
   assert.equal(image.status,302);assert.match(image.headers.get('location'),/^http:\/\/127\.0\.0\.1:/);
   const stored=await prisma.publicacionTransparencia.findUnique({where:{id:created.data.id}});
   assert.equal(stored.mediaRef,media.data.reference);
   assert.ok(mock.objects.size>0);
  } finally {
   for(const [key,value] of Object.entries(saved)) if(value===undefined) delete process.env[key]; else process.env[key]=value;
   await new Promise(resolve=>mock.server.close(resolve));
  }
 });
 await t.test('RF7-RF9 ARC asigna, filtra, detecta vencimiento y deja de alertar al finalizar',async()=>{
  const due=new Date(Date.now()-2*86400000).toISOString();
  const created=await request('/arc','POST',tokens.GE,{titulo:'Evidencia de aceptación ARC',descripcion:'Acción sintética de prueba',municipio:'Santa Eulalia',responsable:'Responsable de prueba',prioridad:'Alta',fechaLimite:due});
  assert.equal(created.status,201);
  assert.equal(created.data.estado,'Pendiente');
  const filtered=await request('/arc?municipio=Santa%20Eulalia&prioridad=Alta&search=Responsable','GET',tokens.GE);
  assert.equal(filtered.status,200);assert.equal(filtered.data.length,1);assert.equal(filtered.data[0].estaVencida,true);
  assert.equal((await request(`/arc/${created.data.id}`,'PUT',tokens.AUD,{estado:'Finalizado'})).status,403);
  for(const estado of ['En Proceso','En Revisión','Finalizado'])assert.equal((await request(`/arc/${created.data.id}`,'PUT',tokens.GE,{estado})).status,200);
  const final=(await request('/arc','GET',tokens.GE)).data.find(x=>x.id===created.data.id);
  assert.equal(final.estaVencida,false);assert.ok(final.fechaFinalizada);
  const metrics=await request('/arc/metricas','GET',tokens.GE);assert.equal(metrics.data.porcentajeCumplimiento,100);assert.equal(metrics.data.vencidas,0);
 });
 await t.test('RF13-RF14 acta se indexa y acuerdo conserva vínculo y estado',async()=>{
  const act=await request('/gobernanza/actas','POST',tokens.GE,{numeroActa:'ACTA-PRUEBA-2026-001',numeroSesion:1,fecha:'2026-10-12',municipioSede:'Santa Eulalia',libroCGCFolio:'FOLIO-DE-PRUEBA',urlPdfEscaneado:'https://example.test/acta.pdf'});
  assert.equal(act.status,201);
  const list=await request('/gobernanza/actas?municipioSede=Santa%20Eulalia&search=FOLIO-DE-PRUEBA','GET',tokens.GE);assert.equal(list.data.length,1);assert.equal(list.data[0].urlPdfEscaneado,'https://example.test/acta.pdf');
  const agreement=await request(`/gobernanza/actas/${act.data.id}/acuerdos`,'POST',tokens.GE,{titulo:'Acuerdo de prueba',descripcion:'Acuerdo sintético para prueba técnica',responsable:'Responsable de prueba'});
  assert.equal(agreement.status,201);assert.equal(agreement.data.actaId,act.data.id);
  assert.equal((await request(`/gobernanza/acuerdos/${agreement.data.id}`,'PUT',tokens.AUD,{estado:'Cumplido'})).status,403);
  const changed=await request(`/gobernanza/acuerdos/${agreement.data.id}`,'PUT',tokens.GE,{estado:'Cumplido',evidenciaUrl:'https://example.test/informe.pdf'});assert.equal(changed.status,200);
  const lookup=await request('/gobernanza/acuerdos?estado=Cumplido','GET',tokens.GE);assert.equal(lookup.data[0].acta.numeroActa,'ACTA-PRUEBA-2026-001');
 });
 await t.test('RF15 convenios distingue vencido, frontera de 90 días y renovación',async()=>{
  const now=Date.now();const created=[];
  for(const days of [-3,90,91]){
   const r=await request('/convenios','POST',tokens.GE,{nombre:`Convenio prueba ${days}`,entidadCooperante:'Entidad de prueba',coordinadorMFN:'Coordinador de prueba',fechaSuscripcion:new Date(now-10*86400000).toISOString(),fechaVencimiento:new Date(now+days*86400000).toISOString()});assert.equal(r.status,201);created.push(r.data.id);
  }
  const result=await request('/convenios','GET',tokens.GE);assert.equal(result.status,200);
  for(const [i,alert] of ['vencido','proximo','normal'].entries())assert.equal(result.data.find(x=>x.id===created[i]).alerta,alert);
  assert.equal((await request(`/convenios/${created[1]}`,'PUT',tokens.GE,{estado:'En Renovación'})).status,200);
  assert.equal((await request('/convenios','GET',tokens.GE)).data.find(x=>x.id===created[1]).estado,'En Renovación');
 });
 await t.test('convenios acepta centavos, valida fechas y restringe edición de consulta',async()=>{
  const body={nombre:'Convenio e2e 1330',tipoOrganizacion:'Sector Público',entidadCooperante:'Entidad de prueba',coordinadorMFN:'Persona de prueba',montoCooperacion:1330.25,contrapartidaMFN:123.45,fechaSuscripcion:'2026-10-13',fechaVencimiento:'2027-05-14'};
  const before=await prisma.convenioInstitucional.count();
  for(const invalid of [{montoCooperacion:-1},{contrapartidaMFN:1.234},{fechaVencimiento:'2026-01-01'},{urlDocumento:'javascript:alert(1)'}]) assert.equal((await request('/convenios','POST',tokens.GE,{...body,...invalid})).status,400);
  assert.equal(await prisma.convenioInstitucional.count(),before);
  const r=await request('/convenios','POST',tokens.GE,body);assert.equal(r.status,201);assert.equal(r.data.montoCooperacion,1330.25);assert.match(r.data.codigo,/^CONV-2026-/);
  assert.equal((await request('/convenios','POST',tokens.JD,body)).status,403);
  assert.equal((await request(`/convenios/${r.data.id}`,'PUT',tokens.JD,{fechaVencimiento:'2028-05-14'})).status,403);
  assert.equal((await request(`/convenios/${r.data.id}`,'PUT',tokens.GE,{fechaVencimiento:'2027-04-14'})).status,400);
  assert.equal((await request(`/convenios/${r.data.id}`,'PUT',tokens.GE,{fechaVencimiento:'2028-05-14',estado:'Vigente'})).status,200);
 });
 await t.test('gobernanza exige referencia HTTP para cumplimiento y restringe roles de consulta',async()=>{
  const body={numeroActa:'ACTA-VALIDACION-2026',numeroSesion:2,fecha:'2026-10-13',municipioSede:'San Pedro Soloma',libroCGCFolio:'Folio sintético'};
  assert.equal((await request('/gobernanza/actas','POST',tokens.GE,{...body,urlPdfEscaneado:'javascript:alert(1)'})).status,400);
  const act=await request('/gobernanza/actas','POST',tokens.GE,body);assert.equal(act.status,201);
  const a=await request(`/gobernanza/actas/${act.data.id}/acuerdos`,'POST',tokens.GE,{titulo:'Acuerdo validado',descripcion:'Prueba',responsable:'Persona de prueba'});assert.equal(a.status,201);
  const path=`/gobernanza/acuerdos/${a.data.id}`;
  assert.equal((await request(path,'PUT',tokens.GE,{estado:'Cumplido'})).status,400);
  assert.equal((await request(path,'PUT',tokens.GE,{estado:'Cumplido',evidenciaUrl:'javascript:alert(1)'})).status,400);
  for(const role of ['JD','AUD']) {assert.equal((await request('/gobernanza/actas','GET',tokens[role])).status,200);assert.equal((await request(path,'PUT',tokens[role],{estado:'Pendiente'})).status,403);}
  assert.equal((await request(path,'PUT',tokens.GE,{estado:'Cumplido',evidenciaUrl:'https://example.test/prueba.pdf'})).status,200);
 });
 await t.test('RF16 ASH consolida viviendas y coberturas de municipios activos',async()=>{
  for(const [municipio,total,water,sanitation] of [['Santa Eulalia',100,80,60],['San Pedro Soloma',50,20,15]]){
   const r=await request('/estadisticas/censos','POST',tokens.GE,{municipio,comunidad:'Comunidad de prueba',viviendasTotales:total,viviendasConAgua:water,viviendasConSaneamiento:sanitation,sistemaCloracion:true,ppmCloroResidual:0.7});assert.equal(r.status,201);
  }
  await prisma.censoComunitarioASH.create({data:{codigo:'ASH-HISTORICO-PRUEBA',municipio:'San Juan Ixcoy',comunidad:'Registro histórico de prueba',viviendasTotales:1000,viviendasConAgua:900,viviendasConSaneamiento:800,sistemaCloracion:true,ppmCloroResidual:0.9,tecnicoResponsable:'Persona de prueba'}});
  const current=await request('/estadisticas/censos','GET',tokens.GE);assert.equal(current.status,200);assert.equal(current.data.length,2);assert.ok(current.data.every(x=>x.municipio!=='San Juan Ixcoy'));
  const history=await request('/estadisticas/censos?municipio=San%20Juan%20Ixcoy','GET',tokens.GE);assert.equal(history.data.length,1);assert.equal(await prisma.censoComunitarioASH.count(),3);
  const r=await request('/estadisticas/consolidado','GET',tokens.GE);assert.equal(r.status,200);assert.equal(r.data.totalViviendas,150);assert.equal(r.data.coberturaAguaPorcentaje,66.7);assert.equal(r.data.coberturaSaneamientoPorcentaje,50);assert.equal(r.data.porMunicipio['Santa Eulalia'].viviendas,100);
 });
 await t.test('RF5 publicación visible controla proyecto público sin fotos ni GPS',async()=>{
  assert.equal((await request('/transparencia/publico')).data.proyectosPublicos.length,0);
  const pub=await request('/transparencia','POST',tokens.GE,{tipo:'Proyecto',titulo:'Proyecto de prueba público',resumen:'Publicación sintética para prueba técnica',referenciaId:id});assert.equal(pub.status,201);
  const visible=await request('/transparencia/publico');assert.equal(visible.status,200);assert.equal(visible.data.proyectosPublicos.length,1);
  for(const key of ['evidencias','latitud','longitud'])assert.equal(visible.data.proyectosPublicos[0][key],undefined);
  assert.equal((await request(`/transparencia/${pub.data.id}/visibilidad`,'PUT',tokens.GE,{visibilidad:false})).status,200);
  assert.equal((await request('/transparencia/publico')).data.proyectosPublicos.length,0);
 });
 await t.test('captura financiera rechaza montos y cuentas incoherentes sin escribir',async()=>{
  const base={tipo:'Ingreso',cuentaBancaria:'Fondos Públicos',categoria:'Cuota Ordinaria',municipio:'Santa Eulalia',monto:100,comprobanteTipo:'Recibo',comprobanteNumero:'VALIDACION',descripcion:'Prueba de validación'};
  const before=await prisma.transaccionFinanciera.count();
  for(const patch of [{monto:-1},{monto:'Infinity'},{monto:'0x10'},{monto:null},{monto:true},{monto:''},{monto:1.001},{tipo:'Transferencia'},{cuentaBancaria:'Cuenta inexistente'},{municipio:'Regional'},{comprobanteNumero:'  '},{fecha:'2026-02-30'},{urlComprobante:'javascript:alert(1)'}]){
   const r=await request('/financiero/transacciones','POST',tokens.GE,{...base,...patch});assert.equal(r.status,400,JSON.stringify(patch));assert.ok(r.data.error);
  }
  assert.equal(await prisma.transaccionFinanciera.count(),before);
  const result=await request('/financiero/transacciones','POST',tokens.GE,{...base,monto:'0.29',comprobanteNumero:' CENTAVOS '});assert.equal(result.status,201);assert.equal(result.data.monto,0.29);assert.equal(result.data.comprobanteNumero,'CENTAVOS');
 });
 await t.test('censos rechaza valores inventados por conversión o servicios superiores al total',async()=>{
  const base={municipio:'Santa Eulalia',comunidad:'Comunidad validación',viviendasTotales:10,viviendasConAgua:5,viviendasConSaneamiento:3,sistemaCloracion:false,ppmCloroResidual:0,tecnicoResponsable:'Persona de prueba'};
  const before=await prisma.censoComunitarioASH.count();
  for(const patch of [{viviendasTotales:0},{viviendasConAgua:11},{viviendasConSaneamiento:11},{viviendasConAgua:1.5},{viviendasConAgua:-1},{viviendasTotales:2147483648},{viviendasTotales:''},{viviendasConAgua:null},{ppmCloroResidual:-0.1},{sistemaCloracion:'false'},{sistemaCloracion:null},{comunidad:'  '}]){
   assert.equal((await request('/estadisticas/censos','POST',tokens.GE,{...base,...patch})).status,400,JSON.stringify(patch));
  }
  assert.equal(await prisma.censoComunitarioASH.count(),before);
  assert.equal((await request('/estadisticas/censos','POST',tokens.GE,{...base,viviendasConAgua:0,viviendasConSaneamiento:0})).status,201);
 });
 await t.test('ARC valida datos obligatorios, fechas y estados sin dejar escrituras inválidas',async()=>{
  const base={titulo:'Tarea validación',descripcion:'Descripción',responsable:'Responsable de prueba',municipio:'Santa Eulalia',prioridad:'Media',fechaLimite:'2026-10-30'};
  const before=await prisma.tareaARC.count();
  for(const patch of [{titulo:''},{responsable:' '},{descripcion:null},{fechaLimite:'2026-02-30'},{municipio:'Municipio inexistente'},{prioridad:'Inventada'}])assert.equal((await request('/arc','POST',tokens.GE,{...base,...patch})).status,400,JSON.stringify(patch));
  assert.equal(await prisma.tareaARC.count(),before);
  const created=await request('/arc','POST',tokens.GE,base);assert.equal(created.status,201);
  assert.equal((await request(`/arc/${created.data.id}`,'PUT',tokens.GE,{estado:'Estado inventado'})).status,400);
  assert.equal((await request(`/arc/${created.data.id}`,'PUT',tokens.GE,{fechaLimite:'2026-02-30'})).status,400);
  assert.equal((await prisma.tareaARC.findUnique({where:{id:created.data.id}})).estado,'Pendiente');
 });
 await t.test('proyectos conserva cronología en creación y edición parcial',async()=>{
  const before=await prisma.proyecto.count();
  assert.equal((await request('/proyectos','POST',tokens.GE,{...project,fechaFinPlanificada:'2026-10-02'})).status,400);
  assert.equal((await request('/proyectos','POST',tokens.GE,{...project,fechaInicioPlanificada:'2026-02-30'})).status,400);
  assert.equal((await request('/proyectos','POST',tokens.GE,{...project,presupuestoMunicipal:true})).status,400);
  assert.equal(await prisma.proyecto.count(),before);
  assert.equal((await request(`/proyectos/${id}`,'PUT',tokens.GE,{fechaFinPlanificada:'2026-10-02'})).status,400);
  assert.equal((await request(`/proyectos/${id}`,'PUT',tokens.GE,{fechaFinPlanificada:'2026-11-01'})).status,200);
  assert.equal((await request(`/proyectos/${id}`,'PUT',tokens.GE,{fechaInicioPlanificada:'2026-12-01'})).status,400);
  assert.equal((await request(`/proyectos/${id}`,'PUT',tokens.GE,{fechaFinPlanificada:''})).status,200);
  assert.equal((await prisma.proyecto.findUnique({where:{id}})).fechaFinPlanificada,null);
 });
 await t.test('R2 privado: carga directa, archivo verificado, referencia y descarga con permisos',async r2=>{
  const saved=Object.fromEntries(['R2_ENDPOINT','R2_BUCKET','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY'].map(k=>[k,process.env[k]]));
  const restore=()=>{for(const [key,value] of Object.entries(saved))if(value===undefined)delete process.env[key];else process.env[key]=value;};
  for(const key of Object.keys(saved))delete process.env[key];
  const pdf=pdfFixture();const sha256=crypto.createHash('sha256').update(pdf).digest('hex');
  const body={tipo:'acta',nombre:'acta-prueba.pdf',tipoMime:'application/pdf',bytes:pdf.length,sha256};
  assert.equal((await request('/documentos/preparar','POST',null,body)).status,401);
  assert.equal((await request('/documentos/preparar','POST',tokens.JD,body)).status,403);
  assert.equal((await request('/documentos/preparar','POST',tokens.GE,body)).status,503);
  const mock=await startR2Mock();
  try {
   Object.assign(process.env,{R2_ENDPOINT:mock.endpoint,R2_BUCKET:'mfn-test-private',R2_ACCESS_KEY_ID:'test-only-key',R2_SECRET_ACCESS_KEY:'test-only-secret'});
   assert.equal((await request('/documentos/preparar','POST',tokens.GE,{...body,bytes:11*1024*1024})).status,400);
   assert.equal((await request('/documentos/preparar','POST',tokens.GE,{...body,tipoMime:'text/plain'})).status,400);
   await r2.test('archivo renombrado PDF se rechaza aunque su huella coincida',async()=>{
    const fake=Buffer.alloc(100,65);const sha=crypto.createHash('sha256').update(fake).digest('hex');
    const prep=await request('/documentos/preparar','POST',tokens.GE,{...body,bytes:fake.length,sha256:sha});assert.equal(prep.status,200);
    await fetch(prep.data.uploadUrl,{method:'PUT',headers:{'Content-Type':'application/pdf'},body:fake});
    assert.equal((await request('/documentos/confirmar','POST',tokens.GE,{ticket:prep.data.ticket})).status,400);
   });
   const prepared=await request('/documentos/preparar','POST',tokens.GE,body);assert.equal(prepared.status,200);
   assert.equal((await request('/proyectos','GET',prepared.data.ticket)).status,401);
   assert.equal((await request('/documentos/confirmar','POST',tokens.GE,{ticket:prepared.data.ticket})).status,400);
   const altered=Buffer.from(pdf);altered[15]^=1;
   await fetch(prepared.data.uploadUrl,{method:'PUT',headers:{'Content-Type':'application/pdf'},body:altered});
   assert.equal((await request('/documentos/confirmar','POST',tokens.GE,{ticket:prepared.data.ticket})).status,400);
   await fetch(prepared.data.uploadUrl,{method:'PUT',headers:{'Content-Type':'application/pdf'},body:pdf});
   await r2.test('dos confirmaciones simultáneas mantienen la misma referencia y bytes',async()=>{
    const concurrent=await Promise.all([request('/documentos/confirmar','POST',tokens.GE,{ticket:prepared.data.ticket}),request('/documentos/confirmar','POST',tokens.GE,{ticket:prepared.data.ticket})]);
    assert.ok(concurrent.every(x=>x.status===200));assert.equal(concurrent[0].data.reference,concurrent[1].data.reference);
   });
   const finished=await request('/documentos/confirmar','POST',tokens.GE,{ticket:prepared.data.ticket});assert.equal(finished.status,200);assert.equal(finished.data.sha256,sha256);assert.ok(finished.data.reference.startsWith('r2://'));
   assert.equal((await request('/documentos/confirmar','POST',tokens.GE,{ticket:prepared.data.ticket})).data.reference,finished.data.reference);
   await r2.test('otra cuenta editora no confirma un envío ajeno',async()=>{
    const other=await prisma.usuario.create({data:{correo:'otro-editor@example.test',hashContrasena:users.GE.hashContrasena,rolId:users.GE.rolId}});
    const token=jwt.sign({type:'session',sub:other.id,version:other.sessionVersion},process.env.JWT_SECRET);
    assert.equal((await request('/documentos/confirmar','POST',token,{ticket:prepared.data.ticket})).status,403);
   });
   await r2.test('ticket vencido y ámbito heredado se rechazan',async()=>{
    const claim=jwt.decode(prepared.data.ticket);delete claim.exp;
    const expired=jwt.sign(claim,process.env.JWT_SECRET,{expiresIn:-1});
    assert.equal((await request('/documentos/confirmar','POST',tokens.GE,{ticket:expired})).status,400);
    assert.equal((await request('/documentos/preparar','POST',tokens.GE,{...body,tipo:'constructor'})).status,400);
   });
   await r2.test('retirar edición impide confirmar un ticket anterior',async()=>{
    const rol=await prisma.rol.findUnique({where:{id:users.GE.rolId}});
    try{await prisma.rol.update({where:{id:rol.id},data:{permisos:{...rol.permisos,editar:[]}}});
     assert.equal((await request('/documentos/confirmar','POST',tokens.GE,{ticket:prepared.data.ticket})).status,403);
    }finally{await prisma.rol.update({where:{id:rol.id},data:{permisos:rol.permisos}});}
   });
   const actaBody={numeroActa:'ACTA-R2-PRUEBA',numeroSesion:1,fecha:'2026-10-13',municipioSede:'Santa Eulalia',libroCGCFolio:'Folio de prueba R2',urlPdfEscaneado:finished.data.reference};
   assert.equal((await request('/gobernanza/actas','POST',tokens.GE,{...actaBody,urlPdfEscaneado:'r2://invalido'})).status,400);
   const acta=await request('/gobernanza/actas','POST',tokens.GE,actaBody);assert.equal(acta.status,201);
   const lookup={tipo:'acta',id:acta.data.id};
   assert.equal((await request('/documentos/abrir','POST',null,lookup)).status,401);
   assert.equal((await request('/documentos/abrir','POST',tokens.EMP,lookup)).status,403);
   const opened=await request('/documentos/abrir','POST',tokens.JD,lookup);assert.equal(opened.status,200);assert.equal(opened.data.expiresIn,120);
   assert.deepEqual(Buffer.from(await (await fetch(opened.data.url)).arrayBuffer()),pdf);
   // Replaying the temporary upload cannot change the linked final object.
   await fetch(prepared.data.uploadUrl,{method:'PUT',headers:{'Content-Type':'application/pdf'},body:altered});
   assert.deepEqual(Buffer.from(await (await fetch(opened.data.url)).arrayBuffer()),pdf);
   const finishedAgain=await request('/documentos/confirmar','POST',tokens.GE,{ticket:prepared.data.ticket});assert.equal(finishedAgain.data.reference,finished.data.reference);
   assert.equal((await request('/documentos/abrir','POST',tokens.JD,{tipo:'acta',id:999999})).status,404);
   // Browser-sized payload exceeds Vercel's body limit, but only metadata reaches Express.
   const largePdf=Buffer.concat([pdf.subarray(0,pdf.lastIndexOf('%%EOF')),Buffer.from('%'),Buffer.alloc(5*1024*1024,32),Buffer.from('\n%%EOF\n')]);
   const largeHash=crypto.createHash('sha256').update(largePdf).digest('hex');
   for(const tipo of ['convenio','acuerdo']) {
    const prep=await request('/documentos/preparar','POST',tokens.GE,{...body,tipo,bytes:largePdf.length,sha256:largeHash});assert.equal(prep.status,200);
    assert.equal((await fetch(prep.data.uploadUrl,{method:'PUT',headers:{'Content-Type':'application/pdf'},body:largePdf})).status,200);
    const confirmed=await request('/documentos/confirmar','POST',tokens.GE,{ticket:prep.data.ticket});assert.equal(confirmed.status,200);assert.equal(confirmed.data.sha256,largeHash);
    if(tipo==='convenio') {
     const saved=await request('/convenios','POST',tokens.GE,{nombre:'Convenio PDF privado',entidadCooperante:'Prueba',coordinadorMFN:'Persona prueba',fechaSuscripcion:'2026-10-13',fechaVencimiento:'2027-10-13',urlDocumento:confirmed.data.reference});assert.equal(saved.status,201);
     assert.equal((await request('/documentos/abrir','POST',tokens.JD,{tipo,id:saved.data.id})).status,200);
    } else {
     const saved=await request(`/gobernanza/actas/${acta.data.id}/acuerdos`,'POST',tokens.GE,{titulo:'Acuerdo con PDF',descripcion:'Respaldo sintético de prueba',responsable:'Prueba',estado:'Cumplido',evidenciaUrl:confirmed.data.reference});assert.equal(saved.status,201);
     assert.equal((await request('/documentos/abrir','POST',tokens.JD,{tipo,id:saved.data.id})).status,200);
    }
   }
   const wrongScope=await request('/convenios','POST',tokens.GE,{nombre:'Convenio',entidadCooperante:'Prueba',coordinadorMFN:'Persona prueba',fechaSuscripcion:'2026-10-13',fechaVencimiento:'2027-10-13',urlDocumento:finished.data.reference});assert.equal(wrongScope.status,400);
  }finally{restore();await new Promise(resolve=>mock.server.close(resolve));}
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
 await t.test('dos aprobaciones simultáneas descuentan vacaciones una sola vez',async()=>{
  const puesto=await prisma.puesto.create({data:{nombre:'Puesto concurrente',categoria:'A'}});
  const colaborador=await prisma.colaborador.create({data:{nombre:'Colaborador concurrente',puestoId:puesto.id,fechaIngreso:new Date('2024-01-01')}});
  const anio=new Date().getFullYear();
  await prisma.saldoVacaciones.create({data:{colaboradorId:colaborador.id,anio,diasDisponibles:10,diasUsados:0}});
  const solicitud=await prisma.solicitudAusencia.create({data:{colaboradorId:colaborador.id,tipo:'Vacaciones',desde:new Date('2026-11-02'),hasta:new Date('2026-11-03')}});
  const results=await Promise.all([request(`/ausencias/${solicitud.id}`,'PUT',tokens.JD,{estado:'Aprobado'}),request(`/ausencias/${solicitud.id}`,'PUT',tokens.JD,{estado:'Aprobado'})]);
  assert.deepEqual(results.map(result=>result.status).sort(),[200,409]);
  const saldo=await prisma.saldoVacaciones.findUnique({where:{colaboradorId_anio:{colaboradorId:colaborador.id,anio}}});
  assert.equal(saldo.diasUsados,2);
  assert.equal((await prisma.solicitudAusencia.findUnique({where:{id:solicitud.id}})).estado,'Aprobado');
 });
});
