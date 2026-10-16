import { Router } from 'express';
import prisma from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { ValidationError } from '../../services/errors.js';
import { DOCUMENT_TYPES, MAX_DOCUMENT_BYTES, storageConfigured, documentScope, prepareDocument, finishDocument, openDocument, DocumentServiceError } from '../../services/documents.js';
import jwt from 'jsonwebtoken';
import { canAccessMunicipio } from '../../lib/municipality-scope.js';
const router=Router();router.use(requireAuth);
const allowed=(req,tipo,edit=false)=>{const scope=documentScope(tipo);return req.user.permisos?.modulos?.includes(scope.module) && (!edit || req.user.permisos?.editar?.includes(scope.module));};
function failure(error,res,next) {
  if (error instanceof DocumentServiceError) return res.status(error.status).json({error:error.message});
  if (error instanceof ValidationError || /^P[0-9]{4}$/.test(error?.code || '')) return next(error);
  console.error('Fallo de almacenamiento privado:',error.name);
  return res.status(503).json({error:'No se pudo completar la operación con el archivo. Consérvelo y reintente'});
}
router.get('/estado',(_req,res)=>res.json({disponible:storageConfigured(),limiteBytes:MAX_DOCUMENT_BYTES}));
router.post('/preparar',rateLimit(20),async(req,res,next)=>{
  try {
    if (!allowed(req,req.body.tipo,true)) return res.status(403).json({error:'Su rol no puede adjuntar documentos en esta área'});
    res.json(await prepareDocument(req.user.sub,req.body));
  }catch(error){failure(error,res,next);}
});
router.post('/confirmar',rateLimit(40),async(req,res,next)=>{
  try {
    let claim;
    try {claim=jwt.verify(req.body.ticket,process.env.JWT_SECRET,{algorithms:['HS256']});} catch {throw new ValidationError('La autorización de carga venció o es inválida');}
    if (claim.type!=='document_upload' || !DOCUMENT_TYPES[claim.tipo]) throw new ValidationError('Autorización inválida');
    if (!allowed(req,claim.tipo,true)) return res.status(403).json({error:'Su rol ya no puede adjuntar documentos en esta área'});
    res.json(await finishDocument(req.user.sub,req.body.ticket));
  }catch(error){failure(error,res,next);}
});
router.post('/abrir',async(req,res,next)=>{
  try {
    const scope=documentScope(req.body.tipo);
    if (!allowed(req,req.body.tipo)) return res.status(403).json({error:'No tiene acceso a este documento'});
    const id=Number(req.body.id);
    if (!Number.isSafeInteger(id) || id<1) throw new ValidationError('Registro inválido');
    const row=await prisma[scope.model].findUnique({where:{id},select:{[scope.field]:true,...(req.body.tipo==='factura'?{municipio:true}:{})}});
    if (!row || !row[scope.field]) return res.status(404).json({error:'Este registro no tiene documento adjunto'});
    if (req.body.tipo==='factura' && row.municipio!=='Regional' && !canAccessMunicipio(req.user,row.municipio)) return res.status(404).json({error:'Registro no encontrado'});
    res.set('Cache-Control','no-store').json(await openDocument(row[scope.field],req.body.tipo));
  }catch(error){failure(error,res,next);}
});
export default router;
