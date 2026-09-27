import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/transparencia/publico - Acceso público ciudadano libre (RF5, sin autenticación)
router.get('/publico', async (req, res, next) => {
  try {
    const publicaciones = await prisma.publicacionTransparencia.findMany({
      where: { visibilidad: true, tipo: { not: 'SolicitudUIP' } },
      orderBy: { fechaPublicacion: 'desc' }
    });

    const proyectosPublicos = await prisma.proyecto.findMany({
      where: { estado: { not: 'Cancelado' } },
      select: {
        id: true,
        nombre: true,
        agenciaFinanciadora: true,
        presupuestoMunicipal: true,
        presupuestoCooperacion: true,
        fechaInicioPlanificada: true,
        fechaFinPlanificada: true,
        estado: true,
        porcentajeAvanceFisico: true,
        createdAt: true,
        evidencias: {
          select: {
            id: true,
            urlArchivo: true,
            latitud: true,
            longitud: true,
            descripcion: true,
            fechaCaptura: true
          },
          take: 5
        }
      }
    });

    const censos = await prisma.censoComunitarioASH.findMany();
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
      portal: 'Portal de Transparencia y Datos Abiertos · Mancomunidad Frontera del Norte',
      marcoLegal: 'Ley de Acceso a la Información Pública (Decreto 57-2008)',
      publicaciones,
      proyectosPublicos,
      estadisticas
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/transparencia/gestion - Control interno para rol de Gerente (RF5)
router.get('/gestion', requireAuth, async (req, res, next) => {
  try {
    const publicaciones = await prisma.publicacionTransparencia.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const proyectosPublicos = await prisma.proyecto.findMany({
      where: { estado: { not: 'Cancelado' } },
      select: {
        id: true,
        nombre: true,
        agenciaFinanciadora: true,
        presupuestoMunicipal: true,
        presupuestoCooperacion: true,
        estado: true,
        porcentajeAvanceFisico: true,
        createdAt: true
      }
    });

    const censos = await prisma.censoComunitarioASH.findMany();
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
router.put('/:id/visibilidad', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { visibilidad } = req.body;

    const updated = await prisma.publicacionTransparencia.update({
      where: { id },
      data: { visibilidad: Boolean(visibilidad) }
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/transparencia - Publicar nuevo contenido al portal ciudadano
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { tipo, titulo, resumen, referenciaId } = req.body;

    const count = await prisma.publicacionTransparencia.count();
    const codigo = `PUB-2024-${(count + 1).toString().padStart(3, '0')}`;

    const nueva = await prisma.publicacionTransparencia.create({
      data: {
        codigo,
        tipo,
        titulo,
        resumen,
        referenciaId: referenciaId ? Number(referenciaId) : null,
        visibilidad: true,
        autorizadoPor: req.user?.nombre || 'Gerencia Ejecutiva'
      }
    });

// POST /api/v1/transparencia/solicitudes - Solicitud de Información Pública Digital (Decreto 57-2008)
router.post('/solicitudes', async (req, res, next) => {
  try {
    const { nombre, correo, telefono, municipio, descripcion } = req.body;
    if (!nombre || !descripcion) {
      return res.status(400).json({ error: 'Nombre del solicitante y descripción son obligatorios según Art. 38' });
    }

    const count = await prisma.publicacionTransparencia.count({
      where: { tipo: 'SolicitudUIP' }
    });
    const codigo = `EXP-UIP-2024-${(count + 1).toString().padStart(4, '0')}`;
    
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
    res.json({
      expediente: sol.codigo,
      fechaRecepcion: sol.fechaPublicacion,
      ...datos
    });
  } catch (err) {
    next(err);
  }
});

export default router;
