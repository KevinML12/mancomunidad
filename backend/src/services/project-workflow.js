import { base } from '../lib/prisma.js';
import { recordHash } from '../lib/integrity.js';
import { ValidationError } from './errors.js';
import { text, numeric, choice } from './validation.js';

export class ConflictError extends Error {}
export async function atomic(work) {
  for (let attempt = 0; ; attempt++) {
    try { return await base.$transaction(work, { isolationLevel: 'Serializable' }); }
    catch (error) { if (attempt < 4 && ['P2034','P2002'].includes(error.code)) continue; throw error; }
  }
}
export async function writeAudited(tx, model, operation, args, userId) {
  const before = operation === 'create' ? null : await tx[model].findUnique({ where: args.where });
  const row = await tx[model][operation](args);
  await tx.bitacoraAuditoria.create({ data: { usuarioId: userId, accion: operation, entidad: model, entidadId: row.id, antesHash: before ? recordHash(model, before) : null, despuesHash: recordHash(model, row) } });
  return row;
}
export async function createMilestones(projectId, userId, body) {
  if (!Array.isArray(body.hitos) || !body.hitos.length || body.hitos.length > 30) throw new ValidationError('Defina entre 1 y 30 hitos');
  const hitos = body.hitos.map(h => ({ nombre: text(h.nombre,'Nombre del hito'), criterio: text(h.criterio,'Criterio de aceptación',{max:2000}), peso: Math.round(numeric(h.peso,'Peso del hito',{min:0.01,max:100,money:true}) * 100) }));
  if (hitos.reduce((sum,h) => sum+h.peso,0) !== 10000) throw new ValidationError('Los pesos deben sumar exactamente 100%');
  return atomic(async tx => {
    const project = await tx.proyecto.findUniqueOrThrow({where:{id:projectId}});
    if (project.avancePorHitos) throw new ConflictError('El plan ya está definido. No puede reemplazarse desde este flujo');
    for (const hito of hitos) await writeAudited(tx,'hitoProyecto','create',{data:{...hito,proyectoId:projectId}},userId);
    return writeAudited(tx,'proyecto','update',{where:{id:projectId},data:{avancePorHitos:true,porcentajeAvanceFisico:0}},userId);
  });
}
export async function reviewEvidence(projectId, evidenceId, userId, body) {
  const estadoRevision = choice(body.estado,['Aprobada','Rechazada'],'Decisión');
  const motivoRevision = text(body.motivo,'Motivo de la revisión',{max:2000});
  const revisionVersion = numeric(body.version,'Versión',{integer:true});
  return atomic(async tx => {
    const evidence = await tx.evidenciaProyecto.findUniqueOrThrow({where:{id:evidenceId}});
    if (evidence.proyectoId !== projectId) throw new ValidationError('La evidencia no pertenece al proyecto');
    if (evidence.revisionVersion !== revisionVersion) throw new ConflictError('Otra persona revisó esta evidencia. Actualice el expediente');
    if (estadoRevision === 'Aprobada' && !evidence.contenido) throw new ValidationError('Un enlace histórico no permite aprobar un archivo conservado');
    const row = await writeAudited(tx,'evidenciaProyecto','update',{where:{id:evidenceId},data:{estadoRevision,motivoRevision,revisadoPorId:userId,revisadoEn:new Date(),revisionVersion:{increment:1}}},userId);
    await writeAudited(tx,'revisionEvidencia','create',{data:{evidenciaId:evidenceId,estado:estadoRevision,motivo:motivoRevision,usuarioId:userId,version:revisionVersion+1}},userId);
    const project = await tx.proyecto.findUniqueOrThrow({where:{id:projectId}});
    if (project.avancePorHitos) {
      const hitos = await tx.hitoProyecto.findMany({where:{proyectoId:projectId},include:{evidencias:{where:{estadoRevision:'Aprobada'},select:{id:true}}}});
      const progress = hitos.reduce((sum,h) => sum+(h.evidencias.length ? h.peso : 0),0)/100;
      await writeAudited(tx,'proyecto','update',{where:{id:projectId},data:{porcentajeAvanceFisico:progress}},userId);
    }
    return row;
  });
}
