import { MUNICIPIOS_MFN } from '../../lib/municipios.js';
import { Router } from 'express';
import { choice, numeric, text } from '../../services/validation.js';
import { ValidationError } from '../../services/errors.js';
import prisma from '../../lib/prisma.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';

const router = Router();
router.use(requireAuth, requirePermission('estadisticas'));

// GET /api/v1/estadisticas/censos - Listado de censos comunitarios
router.get('/censos', async (req, res, next) => {
  try {
    const { municipio, search } = req.query;
    // Operational view follows the active territory; an explicit municipality query preserves historical access.
    const where = { municipio: { in: MUNICIPIOS_MFN } };
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
    const municipio = choice(req.body.municipio, MUNICIPIOS_MFN, 'Municipio');
    const comunidad = text(req.body.comunidad, 'Comunidad');
    const options = { integer: true, max: 2147483647 };
    const viviendasTotales = numeric(req.body.viviendasTotales, 'Total de viviendas', { ...options, min: 1 });
    const viviendasConAgua = numeric(req.body.viviendasConAgua, 'Viviendas con agua', options);
    const viviendasConSaneamiento = numeric(req.body.viviendasConSaneamiento, 'Viviendas con saneamiento', options);
    if (viviendasConAgua > viviendasTotales || viviendasConSaneamiento > viviendasTotales) throw new ValidationError('Las viviendas con servicio no pueden superar el total');
    const sistemaCloracion = req.body.sistemaCloracion;
    if (typeof sistemaCloracion !== 'boolean') throw new ValidationError('Indique si existe sistema de cloración');
    const ppmCloroResidual = numeric(req.body.ppmCloroResidual, 'Cloro residual');
    const tecnicoResponsable = text(req.body.tecnicoResponsable ?? 'Técnico OMAS', 'Técnico responsable');

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
