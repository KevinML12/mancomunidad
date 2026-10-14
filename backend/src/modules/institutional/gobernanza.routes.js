import { documentReference } from '../../services/documents.js';
import { text, choice, numeric, date } from '../../services/validation.js';
import { MUNICIPIOS_MFN } from '../../lib/municipios.js';
import { ValidationError } from '../../services/errors.js';
import { Router } from 'express';
import prisma from '../../lib/prisma.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';

const router = Router();
router.use(requireAuth, requirePermission('gobernanza'));

// GET /api/v1/gobernanza/actas - Listar actas oficiales e indexadas
router.get('/actas', async (req, res, next) => {
  try {
    const { tipoSesion, municipioSede, search } = req.query;
    const where = {};
    if (tipoSesion) where.tipoSesion = tipoSesion;
    if (municipioSede) where.municipioSede = municipioSede;
    if (search) {
      where.OR = [
        { numeroActa: { contains: search } },
        { municipioSede: { contains: search } },
        { libroCGCFolio: { contains: search } }
      ];
    }

    const actas = await prisma.actaAsamblea.findMany({
      where,
      orderBy: { fecha: 'desc' },
      include: {
        acuerdos: true
      }
    });

    res.json(actas);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/gobernanza/acuerdos - Semáforo de acuerdos políticos
router.get('/acuerdos', async (req, res, next) => {
  try {
    const { estado } = req.query;
    const where = {};
    if (estado) where.estado = estado;

    const acuerdos = await prisma.acuerdoGobernanza.findMany({
      where,
      include: {
        acta: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(acuerdos);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/gobernanza/actas - Registrar y digitalizar acta oficial (RF13 - RBAC)
router.post('/actas', requirePermission('gobernanza', 'editar'), async (req, res, next) => {
  try {
    const { 
      numeroActa, 
      numeroSesion, 
      tipoSesion, 
      fecha, 
      municipioSede, 
      lugarReunion, 
      libroCGCFolio, 
      urlPdfEscaneado 
    } = req.body;

    const acta = await prisma.actaAsamblea.create({
      data: {
        numeroActa:text(numeroActa,'Número de acta'),
        numeroSesion:numeric(numeroSesion,'Número de sesión',{min:1,integer:true}),
        tipoSesion:choice(tipoSesion === undefined ? 'Ordinaria' : tipoSesion,['Ordinaria','Extraordinaria'],'Tipo de sesión'),
        fecha:date(fecha,'Fecha de sesión'),
        municipioSede:choice(municipioSede,MUNICIPIOS_MFN,'Municipio sede'),
        lugarReunion:text(lugarReunion,'Lugar de reunión',{optional:true}),
        libroCGCFolio:text(libroCGCFolio,'Folio consignado'),
        urlPdfEscaneado:await documentReference(urlPdfEscaneado,'acta',req.user.sub)
      }
    });

    res.status(201).json(acta);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/gobernanza/actas/:id/acuerdos - Vincular acuerdo resolutivo a acta (RF14 - RBAC)
router.post('/actas/:id/acuerdos', requirePermission('gobernanza', 'editar'), async (req, res, next) => {

  try {
    const actaId = Number(req.params.id);
    const { titulo, descripcion, responsable, fechaCumplimiento, estado, evidenciaUrl } = req.body;

    const count = await prisma.acuerdoGobernanza.count({ where: { actaId } });
    const acta = await prisma.actaAsamblea.findUnique({ where: { id: actaId } });
    if (!acta) return res.status(404).json({error:'Acta no encontrada'});
    const validatedState = choice(estado === undefined ? 'En Proceso' : estado,['Pendiente','En Proceso','Cumplido'],'Estado');
    const reference = await documentReference(evidenciaUrl,'acuerdo',req.user.sub);
    if (validatedState === 'Cumplido' && !reference) throw new ValidationError('Adjunte una referencia documental para registrar cumplimiento');
    const codigo = `ACU-${acta.numeroActa}-${(count + 1).toString().padStart(2, '0')}`;

    const acuerdo = await prisma.acuerdoGobernanza.create({
      data: {
        codigo,
        actaId,
        titulo:text(titulo,'Título'),
        descripcion:text(descripcion,'Descripción',{max:4000}),
        responsable:text(responsable,'Responsable'),
        fechaCumplimiento:fechaCumplimiento ? date(fechaCumplimiento,'Fecha de cumplimiento') : null,
        estado:validatedState,
        evidenciaUrl:reference
      }
    });

    res.status(201).json(acuerdo);
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/gobernanza/acuerdos/:id - Actualizar estado en semáforo de cumplimiento
router.put('/acuerdos/:id', requirePermission('gobernanza', 'editar'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { estado, evidenciaUrl } = req.body;

    const current = await prisma.acuerdoGobernanza.findUnique({where:{id}});
    if (!current) return res.status(404).json({error:'Acuerdo no encontrado'});
    const nextState = choice(estado,['Pendiente','En Proceso','Cumplido'],'Estado');
    const reference = await documentReference(evidenciaUrl === undefined ? current.evidenciaUrl : evidenciaUrl,'acuerdo',req.user.sub,{existing:current.evidenciaUrl});
    if (nextState === 'Cumplido' && !reference) throw new ValidationError('Adjunte una referencia documental para registrar cumplimiento');
    const updated = await prisma.acuerdoGobernanza.update({
      where: { id },
      data: {
        estado:nextState,
        evidenciaUrl:reference ?? null
      }
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
