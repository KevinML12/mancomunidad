import { MUNICIPIOS_MFN } from '../../lib/municipios.js';
import crypto from 'node:crypto';
import { auditContext } from '../../lib/integrity.js';
import { Router } from 'express';
import prisma from '../../lib/prisma.js';
import { requireAuth, requireAppAdmin } from '../../middleware/auth.js';
import { mediaUrl } from '../../services/media.js';
import { pageWindow } from '../../lib/pagination.js';

const router = Router();

router.get('/publicaciones/:id/media', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(404).json({ error: 'Archivo no encontrado' });
    const row = await prisma.publicacionTransparencia.findFirst({
      where: { id, visibilidad: true, tipo: { not: 'SolicitudUIP' } }, select: { mediaRef: true },
    });
    if (!row?.mediaRef) return res.status(404).json({ error: 'Archivo no encontrado' });
    res.set('Cache-Control', 'no-store').redirect(302, await mediaUrl(row.mediaRef));
  } catch (error) { next(error); }
});

// GET /api/v1/transparencia/publico - Acceso público ciudadano libre (RF5, sin autenticación)
router.get('/publico', async (req, res, next) => {
  try {
    const page = pageWindow(req.query);
    const publicaciones = await prisma.publicacionTransparencia.findMany({
      where: { visibilidad: true, tipo: { not: 'SolicitudUIP' } },
      orderBy: [{ fechaPublicacion: 'desc' }, { id: 'desc' }], skip: page.skip, take: page.take,
    });
    const currentPublications = publicaciones.slice(0, page.limit);

    const proyectosPublicos = await prisma.proyecto.findMany({
      where: { estado: { not: 'Cancelado' }, id: { in: currentPublications.filter(p => p.tipo === 'Proyecto' && p.referenciaId !== null).map(p => p.referenciaId) } },
      select: {
        id: true,
        nombre: true,
        municipio: true,
        agenciaFinanciadora: true,
        presupuestoMunicipal: true,
        presupuestoCooperacion: true,
        fechaInicioPlanificada: true,
        fechaFinPlanificada: true,
        estado: true,
        porcentajeAvanceFisico: true,
        createdAt: true
      }
    });

    const censusWhere = { municipio: { in: MUNICIPIOS_MFN } };
    const [totals, clorados] = await Promise.all([
      prisma.censoComunitarioASH.aggregate({ where: censusWhere,
        _sum: { viviendasTotales: true, viviendasConAgua: true, viviendasConSaneamiento: true }, _count: { _all: true } }),
      prisma.censoComunitarioASH.count({ where: { ...censusWhere, ppmCloroResidual: { gte: 0.5, lte: 1.5 } } }),
    ]);
    const totalViviendas = totals._sum.viviendasTotales || 0;
    const conAgua = totals._sum.viviendasConAgua || 0;
    const conSaneamiento = totals._sum.viviendasConSaneamiento || 0;
    const totalCensos = totals._count._all;

    const estadisticas = {
      coberturaAgua: totalViviendas > 0 ? Number(((conAgua / totalViviendas) * 100).toFixed(1)) : 0,
      coberturaSaneamiento: totalViviendas > 0 ? Number(((conSaneamiento / totalViviendas) * 100).toFixed(1)) : 0,
      cloroConforme: totalCensos > 0 ? Number(((clorados / totalCensos) * 100).toFixed(1)) : 0,
      totalViviendas,
      totalCensos
    };

    res.json({
      portal: 'Portal de Transparencia y Datos Abiertos · Mancomunidad Frontera del Norte',
      marcoLegal: 'Ley de Acceso a la Información Pública (Decreto 57-2008)',
      publicaciones: currentPublications,
      nextPage: publicaciones.length > page.limit ? page.page + 1 : null,
      proyectosPublicos,
      estadisticas
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/transparencia/gestion - Control interno para rol de Gerente (RF5)
router.get('/gestion', requireAuth, requireAppAdmin, async (req, res, next) => {
  try {
    const publicaciones = await prisma.publicacionTransparencia.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const proyectosPublicos = await prisma.proyecto.findMany({
      where: { estado: { not: 'Cancelado' } },
      select: {
        id: true,
        nombre: true,
        municipio: true,
        agenciaFinanciadora: true,
        presupuestoMunicipal: true,
        presupuestoCooperacion: true,
        estado: true,
        porcentajeAvanceFisico: true,
        createdAt: true
      }
    });

    const censos = await prisma.censoComunitarioASH.findMany({ where: { municipio: { in: MUNICIPIOS_MFN } } });
    let totalViviendas = 0;
    let conAgua = 0;
    let conSaneamiento = 0;
    let clorados = 0;
    censos.forEach(c => {
      totalViviendas += c.viviendasTotales;
      conAgua += c.viviendasConAgua;
      conSaneamiento += c.viviendasConSaneamiento;
      if (c.ppmCloroResidual >= 0.5 && c.ppmCloroResidual <= 1.5) clorados++;
    });

    const estadisticas = {
      coberturaAgua: totalViviendas > 0 ? Number(((conAgua / totalViviendas) * 100).toFixed(1)) : 0,
      coberturaSaneamiento: totalViviendas > 0 ? Number(((conSaneamiento / totalViviendas) * 100).toFixed(1)) : 0,
      cloroConforme: censos.length > 0 ? Number(((clorados / censos.length) * 100).toFixed(1)) : 0,
      totalViviendas,
      totalCensos: censos.length
    };

    res.json({
      publicaciones,
      proyectosPublicos,
      estadisticas
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/transparencia/:id/visibilidad - Habilitar o dar de baja publicación (RF5)
router.put('/:id/visibilidad', requireAuth, requireAppAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { visibilidad } = req.body;
    if (!Number.isSafeInteger(id) || id < 1 || typeof visibilidad !== 'boolean') return res.status(400).json({ error: 'Visibilidad inválida' });
    const publication = await prisma.publicacionTransparencia.findUnique({ where: { id } });
    if (publication?.tipo === 'SolicitudUIP') return res.status(400).json({ error: 'Los expedientes de solicitudes son privados' });

    const updated = await prisma.publicacionTransparencia.update({
      where: { id },
      data: { visibilidad }
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/transparencia - Publicar nuevo contenido al portal ciudadano
router.post('/', requireAuth, requireAppAdmin, async (req, res, next) => {
  try {
    const { tipo, titulo, resumen, referenciaId } = req.body;
    if (!['Aviso', 'Proyecto', 'Acta', 'Estadística', 'Finanzas', 'Convocatoria', 'Documento'].includes(tipo) ||
        typeof titulo !== 'string' || !titulo.trim() || titulo.length > 160 ||
        typeof resumen !== 'string' || !resumen.trim() || resumen.length > 3000 ||
        (referenciaId != null && (!Number.isSafeInteger(Number(referenciaId)) || Number(referenciaId) < 1))) {
      return res.status(400).json({ error: 'Publicación inválida' });
    }
    const codigo = `PUB-${new Date().getUTCFullYear()}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;

    const nueva = await prisma.publicacionTransparencia.create({
      data: {
        codigo,
        tipo,
        titulo: titulo.trim(),
        resumen: resumen.trim(),
        referenciaId: referenciaId ? Number(referenciaId) : null,
        visibilidad: true,
        autorizadoPor: req.user?.nombre || req.user.correo
      }
    });

    res.status(201).json(nueva);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/transparencia/solicitudes - Solicitud de Información Pública Digital (Decreto 57-2008)
router.post('/solicitudes', (req, res, next) => auditContext.run({ usuarioId: null }, next), async (req, res, next) => {
  try {
    const { nombre, correo, telefono, municipio, descripcion } = req.body;
    if (!nombre || !descripcion) {
      return res.status(400).json({ error: 'Nombre del solicitante y descripción son obligatorios según Art. 38' });
    }

    const codigo = `UIP-${crypto.randomBytes(24).toString('hex')}`;
    
    // Plazo legal de 10 días hábiles (~14 días calendario)
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + 14);

    const nueva = await prisma.publicacionTransparencia.create({
      data: {
        codigo,
        tipo: 'SolicitudUIP',
        titulo: `Solicitud de Información: ${nombre} (${municipio || 'Regional'})`,
        resumen: JSON.stringify({
          solicitante: nombre,
          correo: correo || 'No provisto',
          telefono: telefono || 'No provisto',
          municipio: municipio || 'Regional',
          descripcion,
          fechaLimite: fechaLimite.toISOString().split('T')[0],
          estado: 'Admitida para Trámite (Plazo de Ley 10 Días)'
        }),
        visibilidad: false,
        autorizadoPor: 'Unidad de Información Pública (UIP-MFN)'
      }
    });

    res.status(201).json({
      mensaje: 'Solicitud de Información Pública registrada exitosamente',
      expediente: codigo,
      solicitante: nombre,
      fechaRecepcion: nueva.fechaPublicacion,
      fechaLimiteLegal: fechaLimite.toISOString().split('T')[0],
      marcoLegal: 'Ley de Acceso a la Información Pública (Decreto 57-2008)',
      estado: 'Admitida para Trámite (Plazo de Ley 10 Días)'
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/transparencia/solicitudes/:codigo - Consulta de expediente ciudadano
router.get('/solicitudes/:codigo', async (req, res, next) => {
  try {
    const { codigo } = req.params;
    const sol = await prisma.publicacionTransparencia.findFirst({
      where: { codigo, tipo: 'SolicitudUIP' }
    });
    if (!sol) {
      return res.status(404).json({ error: 'Expediente no encontrado en el registro oficial de la UIP' });
    }
    let datos = {};
    try { datos = JSON.parse(sol.resumen || '{}'); } catch {}
    if (!/^UIP-[a-f0-9]{48}$/.test(codigo)) return res.status(404).json({ error: 'Código de consulta no disponible' });
    res.json({ expediente: sol.codigo, fechaRecepcion: sol.fechaPublicacion, estado: datos.estado, fechaLimite: datos.fechaLimite });
  } catch (err) {
    next(err);
  }
});

export default router;
