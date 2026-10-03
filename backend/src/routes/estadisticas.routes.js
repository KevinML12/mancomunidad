import { MUNICIPIOS_MFN } from '../lib/municipios.js';
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requirePermission('estadisticas'));

// GET /api/v1/estadisticas/censos - Listado de censos comunitarios
router.get('/censos', async (req, res, next) => {
  try {
    const { municipio, search } = req.query;
    const where = {};
    if (municipio) where.municipio = municipio;
    if (search) {
      where.OR = [
        { comunidad: { contains: search } },
        { codigo: { contains: search } },
        { tecnicoResponsable: { contains: search } }
      ];
    }

    const censos = await prisma.censoComunitarioASH.findMany({
      where,
      orderBy: { fechaLevantamiento: 'desc' }
    });

    res.json(censos);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/estadisticas/consolidado - Motor estadístico de cobertura y déficit regional (RF16)
router.get('/consolidado', async (req, res, next) => {
  try {
    const censos = await prisma.censoComunitarioASH.findMany({ where: { municipio: { in: MUNICIPIOS_MFN } } });

    let totalViviendas = 0;
    let conAgua = 0;
    let conSaneamiento = 0;
    let sistemasClorados = 0;
    let conCalidadAceptable = 0; // Cloro residual entre 0.5 y 1.5 ppm

    const porMunicipio = {};

    censos.forEach(c => {
      totalViviendas += c.viviendasTotales;
      conAgua += c.viviendasConAgua;
      conSaneamiento += c.viviendasConSaneamiento;
      if (c.sistemaCloracion) sistemasClorados++;
      if (c.ppmCloroResidual >= 0.5 && c.ppmCloroResidual <= 1.5) conCalidadAceptable++;

      if (!porMunicipio[c.municipio]) {
        porMunicipio[c.municipio] = {
          viviendas: 0,
          conAgua: 0,
          conSaneamiento: 0,
          censos: 0
        };
      }
      porMunicipio[c.municipio].viviendas += c.viviendasTotales;
      porMunicipio[c.municipio].conAgua += c.viviendasConAgua;
      porMunicipio[c.municipio].conSaneamiento += c.viviendasConSaneamiento;
      porMunicipio[c.municipio].censos++;
    });

    const porcentajeAgua = totalViviendas > 0 ? Number(((conAgua / totalViviendas) * 100).toFixed(1)) : 0;
    const porcentajeSaneamiento = totalViviendas > 0 ? Number(((conSaneamiento / totalViviendas) * 100).toFixed(1)) : 0;
    const deficitAgua = 100 - porcentajeAgua;
    const deficitSaneamiento = 100 - porcentajeSaneamiento;

    res.json({
      totalViviendas,
      conAgua,
      conSaneamiento,
      sistemasClorados,
      totalComunidadesCensadas: censos.length,
      coberturaAguaPorcentaje: porcentajeAgua,
      coberturaSaneamientoPorcentaje: porcentajeSaneamiento,
      deficitAguaPorcentaje: Number(deficitAgua.toFixed(1)),
      deficitSaneamientoPorcentaje: Number(deficitSaneamiento.toFixed(1)),
      porMunicipio
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/estadisticas/censos - Registrar levantamiento de campo
router.post('/censos', requirePermission('estadisticas', 'editar'), async (req, res, next) => {
  try {
    const {
      municipio,
      comunidad,
      viviendasTotales,
      viviendasConAgua,
      sistemaCloracion,
      ppmCloroResidual,
      viviendasConSaneamiento,
      tecnicoResponsable
    } = req.body;

    if (!MUNICIPIOS_MFN.includes(municipio)) return res.status(400).json({ error: 'Seleccione un municipio activo' });
    const count = await prisma.censoComunitarioASH.count();
    const cleanMun = municipio.toUpperCase().slice(0, 3);
    const codigo = `ASH-2024-${cleanMun}-${(count + 1).toString().padStart(3, '0')}`;

    const censo = await prisma.censoComunitarioASH.create({
      data: {
        codigo,
        municipio,
        comunidad,
        viviendasTotales: Number(viviendasTotales),
        viviendasConAgua: Number(viviendasConAgua),
        sistemaCloracion: Boolean(sistemaCloracion),
        ppmCloroResidual: Number(ppmCloroResidual) || 0,
        viviendasConSaneamiento: Number(viviendasConSaneamiento),
        tecnicoResponsable: tecnicoResponsable || 'Técnico OMAS'
      }
    });

    res.status(201).json(censo);
  } catch (err) {
    next(err);
  }
});

export default router;
