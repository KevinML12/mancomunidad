import { MUNICIPIOS_MFN } from '../lib/municipios.js';
import { Router } from 'express';
import crypto from 'crypto';
import { verifyIntegrity } from '../lib/integrity.js';
import prisma from '../lib/prisma.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requirePermission('inteligencia'));



/**
 * GET /api/v1/inteligencia/dictamen
 * Motor de Priorización Geoespacial Multicriterio (IPIM)
 * Algoritmo científico de distribución equitativa de fondos para la Mancomunidad.
 */
router.get('/dictamen', async (req, res, next) => {
  try {
    const [censos, transacciones, proyectos, tareas] = await Promise.all([
      prisma.censoComunitarioASH.findMany(),
      prisma.transaccionFinanciera.findMany(),
      prisma.proyecto.findMany(),
      prisma.tareaARC.findMany()
    ]);

    const analisisPorMunicipio = MUNICIPIOS_MFN.map(muni => {
      // 1. Datos de Agua y Saneamiento (50% ponderación)
      const censosMuni = censos.filter(c => c.municipio === muni);
      const vivTotales = censosMuni.reduce((acc, c) => acc + c.viviendasTotales, 0);
      const vivAgua = censosMuni.reduce((acc, c) => acc + c.viviendasConAgua, 0);
      const vivSan = censosMuni.reduce((acc, c) => acc + c.viviendasConSaneamiento, 0);
      const sinCloro = censosMuni.filter(c => c.ppmCloroResidual < 0.5 || c.ppmCloroResidual > 1.5).length;

      const cobAgua = vivTotales > 0 ? (vivAgua / vivTotales) * 100 : null;
      const defAgua = 100 - cobAgua;
      const cobSan = vivTotales > 0 ? (vivSan / vivTotales) * 100 : null;
      const defSan = 100 - cobSan;
      const pctCloroRiesgo = censosMuni.length > 0 ? (sinCloro / censosMuni.length) * 100 : 50;

      // 2. Solvencia Financiera de Cuotas (25% ponderación)
      const cuotas = transacciones.filter(t => t.municipio && (t.municipio.includes(muni) || muni.includes(t.municipio)) && t.categoria === 'Cuota Ordinaria');
      const aportado = cuotas.reduce((acc, c) => acc + c.monto, 0);
      // Meta anual estimada: Q 180,000 (12 meses x Q 15,000)
      const porcentajeSolvencia = Math.min(100, (aportado / 180000) * 100);
      const factorCompromisoFiscal = 100 - porcentajeSolvencia;

      // 3. Saturación de Inversión y Hallazgos (25% ponderación)
      const proysMuni = proyectos.filter(p => 
        p.municipio === muni
      );
      const montoInvertido = proysMuni.reduce((acc, p) => acc + p.presupuestoMunicipal + p.presupuestoCooperacion, 0);
      const factorDesatencionObras = proysMuni.length === 0 ? 100 : proysMuni.length === 1 ? 50 : 20;


      // Cálculo del Índice IPIM (0 a 100 pts)
      const puntajeHídrico = (defAgua * 0.45) + (defSan * 0.35) + (pctCloroRiesgo * 0.20);
      const puntajeFinal = vivTotales === 0 ? null : Number(((puntajeHídrico * 0.50) + (factorDesatencionObras * 0.30) + (factorCompromisoFiscal * 0.20)).toFixed(1));

      let nivelPrioridad = vivTotales === 0 ? 'Sin datos suficientes' : 'Moderada';
      let recomendacionAccion = vivTotales === 0 ? 'Recopilar y validar los indicadores antes de priorizar inversiones' : 'Mantenimiento preventivo y monitoreo OMAS';
      if (puntajeFinal >= 70) {
        nivelPrioridad = 'Crítica';
        recomendacionAccion = 'Adjudicación urgente de fondos de cooperación internacional (USAID/BID)';
      } else if (puntajeFinal >= 50) {
        nivelPrioridad = 'Alta';
        recomendacionAccion = 'Formulación prioritaria de perfil técnico de alcantarillado o agua potable';
      }

      return {
        municipio: muni,
        puntajeIPIM: puntajeFinal,
        nivelPrioridad,
        recomendacionAccion,
        indicadores: {
          deficitAgua: vivTotales > 0 ? Number(defAgua.toFixed(1)) : null,
          deficitSaneamiento: vivTotales > 0 ? Number(defSan.toFixed(1)) : null,
          viviendasAuditadas: vivTotales,
          obrasActivas: proysMuni.length,
          montoInvertido,
          solvenciaCuotas: Number(porcentajeSolvencia.toFixed(1))
        }
      };
    });

    // Ordenar de mayor a menor prioridad
    analisisPorMunicipio.sort((a, b) => (b.puntajeIPIM ?? -1) - (a.puntajeIPIM ?? -1));

    // Dictamen oficial
    const municipioPrioritario = analisisPorMunicipio.find(m => m.puntajeIPIM !== null);
    const hashDictamen = crypto.createHash('sha256')
      .update(JSON.stringify(analisisPorMunicipio) + new Date().toISOString().split('T')[0])
      .digest('hex');

    res.json({
      titulo: 'Dictamen Algorítmico de Priorización de Inversión Intermunicipal (IPIM)',
      marcoLegal: 'Código Municipal Decreto 12-2002 & Estatutos Mancomunidad Frontera del Norte',
      fechaEmision: new Date().toISOString(),
      municipioRecomendado: municipioPrioritario?.municipio ?? null,
      dictamenEjecutivo: municipioPrioritario ? `Orientación preliminar: revisar ${municipioPrioritario.municipio} (${municipioPrioritario.puntajeIPIM} puntos). Los pesos requieren validación institucional; no constituye una decisión de financiamiento.` : 'No existen datos suficientes para recomendar un municipio.',
      selloCriptografico: hashDictamen,
      ranking: analisisPorMunicipio
    });
  } catch (err) {
    next(err);
  }
});


async function procesarSello(req, res, next) {
  try {
    const result = await prisma.$transaction(async tx => {
      const verified = await verifyIntegrity(tx);
      if (req.method === 'POST') {
        if (verified.discrepancias.length) return { conflict: true, verified };
        const lastAudit = await tx.bitacoraAuditoria.findFirst({ orderBy: { id: 'desc' } });
        const checkpoint = await tx.puntoControlIntegridad.create({ data: { rootHash: verified.rootHash, snapshot: verified.snapshot, auditoriaId: lastAudit?.id ?? 0, usuarioId: req.user.sub } });
        return { verified, checkpoint };
      }
      return { verified };
    }, { isolationLevel: 'Serializable' });
    if (result.conflict) return res.status(409).json({ error: 'No se puede sellar: existen discrepancias pendientes de revisión', discrepancias: result.verified.discrepancias });
    const { verified } = result;
    const checkpoint = result.checkpoint ?? verified.checkpoint;
    const aliases = { proyecto: 'proyectos', tareaARC: 'planARC', transaccionFinanciera: 'finanzasCGC', actaAsamblea: 'gobernanzaActas', convenioInstitucional: 'convenios', censoComunitarioASH: 'estadisticasASH', publicacionTransparencia: 'transparencia', evidenciaProyecto: 'evidencias', acuerdoGobernanza: 'acuerdos' };
    res.json({
      certificado: 'Control interno de integridad de MFN Digital',
      organismoAuditor: 'Verificación interna; no es una certificación de la CGC',
      estadoIntegridad: result.checkpoint ? 'PUNTO DE CONTROL REGISTRADO' : verified.estadoIntegridad,
      timestampCertificacion: new Date().toISOString(),
      merkleRootSha256: verified.rootHash,
      discrepancias: verified.discrepancias,
      puntoControlActual: checkpoint ? { id: checkpoint.id, hashSha256: checkpoint.rootHash, fecha: checkpoint.fecha } : null,
      bloquesAuditados: Object.fromEntries(Object.entries(verified.bloques).map(([name, block]) => [aliases[name], block])),
      totalRegistrosCertificados: Object.keys(verified.snapshot).length,
      totalCheckpointsHistoricos: await prisma.puntoControlIntegridad.count(),
      veredictoAuditoria: verified.discrepancias.length ? 'Hay diferencias no explicadas por las escrituras auditadas.' : 'Se compara el estado completo de los registros con un punto de control y eventos antes/después. La protección depende del acceso a la base de datos.',
      motor: 'Huella SHA-256 de registros ordenados y auditoría transaccional'
    });
  } catch (err) { next(err); }
}
router.get('/sello-forense', procesarSello);
router.post('/sello-forense', requirePermission('inteligencia', 'aprobar'), procesarSello);
export default router;
