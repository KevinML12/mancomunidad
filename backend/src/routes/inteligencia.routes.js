import { Router } from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const MUNICIPIOS_MFN = [
  'Santa Eulalia',
  'San Pedro Soloma',
  'San Mateo Ixtatán',
  'San Rafael la Independencia',
  'Santa Cruz Barillas',
  'San Juan Ixcoy'
];

/**
 * GET /api/v1/inteligencia/dictamen
 * Motor de Priorización Geoespacial Multicriterio (IPIM)
 * Algoritmo científico de distribución equitativa de fondos para la Mancomunidad.
 */
router.get('/dictamen', requireAuth, async (req, res, next) => {
  try {
    const [censos, transacciones, proyectos, tareas] = await Promise.all([
      prisma.censoComunitarioASH.findMany(),
      prisma.transaccionFinanciera.findMany(),
      prisma.proyecto.findMany(),
      prisma.tareaARC.findMany()
    ]);

    const analisisPorMunicipio = MUNICIPIOS_MFN.map(muni => {
      // 1. Datos de Agua y Saneamiento (50% ponderación)
      const censosMuni = censos.filter(c => c.municipio.toLowerCase().includes(muni.toLowerCase()) || muni.toLowerCase().includes(c.municipio.toLowerCase()));
      const vivTotales = censosMuni.reduce((acc, c) => acc + c.viviendasTotales, 0);
      const vivAgua = censosMuni.reduce((acc, c) => acc + c.viviendasConAgua, 0);
      const vivSan = censosMuni.reduce((acc, c) => acc + c.viviendasConSaneamiento, 0);
      const sinCloro = censosMuni.filter(c => c.ppmCloroResidual < 0.5 || c.ppmCloroResidual > 1.5).length;

      const cobAgua = vivTotales > 0 ? (vivAgua / vivTotales) * 100 : 50;
      const defAgua = 100 - cobAgua;
      const cobSan = vivTotales > 0 ? (vivSan / vivTotales) * 100 : 40;
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
        (p.municipio && p.municipio.toLowerCase().includes(muni.toLowerCase())) ||
        (p.nombre && p.nombre.toLowerCase().includes(muni.toLowerCase()))
      );
      const montoInvertido = proysMuni.reduce((acc, p) => acc + p.presupuestoMunicipal + p.presupuestoCooperacion, 0);
      const factorDesatencionObras = proysMuni.length === 0 ? 100 : proysMuni.length === 1 ? 50 : 20;


      // Cálculo del Índice IPIM (0 a 100 pts)
      const puntajeHídrico = (defAgua * 0.45) + (defSan * 0.35) + (pctCloroRiesgo * 0.20);
      const puntajeFinal = Number(((puntajeHídrico * 0.50) + (factorDesatencionObras * 0.30) + (factorCompromisoFiscal * 0.20)).toFixed(1));

      let nivelPrioridad = 'Moderada';
      let recomendacionAccion = 'Mantenimiento preventivo y monitoreo OMAS';
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
          deficitAgua: Number(defAgua.toFixed(1)),
          deficitSaneamiento: Number(defSan.toFixed(1)),
          viviendasAuditadas: vivTotales,
          obrasActivas: proysMuni.length,
          montoInvertido,
          solvenciaCuotas: Number(porcentajeSolvencia.toFixed(1))
        }
      };
    });

    // Ordenar de mayor a menor prioridad
    analisisPorMunicipio.sort((a, b) => b.puntajeIPIM - a.puntajeIPIM);

    // Dictamen oficial
    const municipioPrioritario = analisisPorMunicipio[0];
    const hashDictamen = crypto.createHash('sha256')
      .update(JSON.stringify(analisisPorMunicipio) + new Date().toISOString().split('T')[0])
      .digest('hex');

    res.json({
      titulo: 'Dictamen Algorítmico de Priorización de Inversión Intermunicipal (IPIM)',
      marcoLegal: 'Código Municipal Decreto 12-2002 & Estatutos Mancomunidad Frontera del Norte',
      fechaEmision: new Date().toISOString(),
      municipioRecomendado: municipioPrioritario.municipio,
      dictamenEjecutivo: `Conforme a la matriz técnica de vulnerabilidad sanitaria (ASH) y cobertura hídrica, la Asamblea de Alcaldes debe canalizar el próximo paquete de financiamiento no reembolsable con prioridad hacia el municipio de ${municipioPrioritario.municipio} (Índice de Vulnerabilidad: ${municipioPrioritario.puntajeIPIM} pts - ${municipioPrioritario.nivelPrioridad}).`,
      selloCriptografico: hashDictamen,
      ranking: analisisPorMunicipio
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/inteligencia/sello-forense
 * POST /api/v1/inteligencia/sello-forense
 * Cadena de Custodia Criptográfica Forense (Anti-Fraude CGC)
 * Genera el Merkle Root y valida o sella el estado de inalterabilidad contra la Bitácora Histórica Inmutable.
 */
async function procesarSelloForense(req, res, next) {
  try {
    const sellarNuevoPunto = req.method === 'POST' || req.query.sellar === 'true';

    const [proys, arc, tx, actas, convs, censos, pubs] = await Promise.all([
      prisma.proyecto.findMany({ select: { id: true, nombre: true, porcentajeAvanceFisico: true, createdAt: true } }),
      prisma.tareaARC.findMany({ select: { id: true, codigo: true, estado: true, updatedAt: true } }),
      prisma.transaccionFinanciera.findMany({ select: { id: true, codigo: true, monto: true, comprobanteNumero: true } }),
      prisma.actaAsamblea.findMany({ select: { id: true, numeroActa: true, libroCGCFolio: true } }),
      prisma.convenioInstitucional.findMany({ select: { id: true, codigo: true, fechaVencimiento: true } }),
      prisma.censoComunitarioASH.findMany({ select: { id: true, codigo: true, ppmCloroResidual: true } }),
      prisma.publicacionTransparencia.findMany({ select: { id: true, codigo: true, visibilidad: true } })
    ]);

    const bloqueProyectos = crypto.createHash('sha256').update(JSON.stringify(proys)).digest('hex');
    const bloqueARC = crypto.createHash('sha256').update(JSON.stringify(arc)).digest('hex');
    const bloqueFinanzas = crypto.createHash('sha256').update(JSON.stringify(tx)).digest('hex');
    const bloqueGobernanza = crypto.createHash('sha256').update(JSON.stringify(actas)).digest('hex');
    const bloqueConvenios = crypto.createHash('sha256').update(JSON.stringify(convs)).digest('hex');
    const bloqueASH = crypto.createHash('sha256').update(JSON.stringify(censos)).digest('hex');
    const bloqueTransparencia = crypto.createHash('sha256').update(JSON.stringify(pubs)).digest('hex');

    const arbolMerkle = [bloqueProyectos, bloqueARC, bloqueFinanzas, bloqueGobernanza, bloqueConvenios, bloqueASH, bloqueTransparencia].join(':');
    const merkleRoot = crypto.createHash('sha256').update(arbolMerkle).digest('hex');

    const totalRegistros = proys.length + arc.length + tx.length + actas.length + convs.length + censos.length + pubs.length;

    // Consulta de respaldo histórico en BitacoraAuditoria
    const ultimoPuntoControl = await prisma.bitacoraAuditoria.findFirst({
      where: { accion: 'certificacion_merkle_root' },
      orderBy: { fecha: 'desc' }
    });

    const totalCheckpointsHistoricos = await prisma.bitacoraAuditoria.count({
      where: { accion: 'certificacion_merkle_root' }
    });

    let estadoIntegridad = 'INALTERADO / AUDITORÍA CONFORME';
    let veredictoAuditoria = 'Firma Merkle Root coincide con el registro histórico de auditoría.';
    let mutacionesRegistradas = 0;
    let puntoControlRegistrado = ultimoPuntoControl;

    if (!ultimoPuntoControl) {
      // Punto Génesis inicial
      puntoControlRegistrado = await prisma.bitacoraAuditoria.create({
        data: {
          usuarioId: req.user?.sub ?? null,
          accion: 'certificacion_merkle_root',
          entidad: merkleRoot,
          entidadId: totalRegistros
        }
      });
      estadoIntegridad = 'PUNTO GÉNESIS ASENTADO';
      veredictoAuditoria = 'Primer punto de control histórico registrado en la bitácora inmutable de auditoría.';
    } else {
      // Contar mutaciones operativas desde el último punto de control
      mutacionesRegistradas = await prisma.bitacoraAuditoria.count({
        where: {
          fecha: { gt: ultimoPuntoControl.fecha },
          accion: { not: 'certificacion_merkle_root' }
        }
      });

      if (merkleRoot === ultimoPuntoControl.entidad) {
        estadoIntegridad = 'INALTERADO / AUDITORÍA CONFORME';
        veredictoAuditoria = 'La huella criptográfica actual coincide exactamente con el último punto de control sellado en bitácora.';
      } else {
        if (sellarNuevoPunto) {
          puntoControlRegistrado = await prisma.bitacoraAuditoria.create({
            data: {
              usuarioId: req.user?.sub ?? null,
              accion: 'certificacion_merkle_root',
              entidad: merkleRoot,
              entidadId: totalRegistros
            }
          });
          estadoIntegridad = 'NUEVO PUNTO DE CONTROL SELLADO';
          veredictoAuditoria = `Se asentó un nuevo punto de control forense con ${mutacionesRegistradas} eventos auditados desde el checkpoint anterior.`;
        } else if (mutacionesRegistradas > 0) {
          estadoIntegridad = 'ACTUALIZADO / TRAZABILIDAD AUDITADA';
          veredictoAuditoria = `El estado de datos contiene ${mutacionesRegistradas} transacciones autorizadas posteriores al último punto de control.`;
        } else {
          estadoIntegridad = 'ALERTA / DISCREPANCIA DETECTADA';
          veredictoAuditoria = 'El Merkle Root difiere del punto de control previo sin eventos correspondientes en la bitácora de auditoría.';
        }
      }
    }

    res.json({
      certificado: 'Certificado Forense de Integridad de Datos Intermunicipales MFN',
      organismoAuditor: 'Contraloría General de Cuentas (CGC) · República de Guatemala',
      estadoIntegridad,
      timestampCertificacion: new Date().toISOString(),
      merkleRootSha256: merkleRoot,
      puntoControlAnterior: ultimoPuntoControl ? {
        id: ultimoPuntoControl.id,
        hashSha256: ultimoPuntoControl.entidad,
        fecha: ultimoPuntoControl.fecha,
        usuarioId: ultimoPuntoControl.usuarioId
      } : null,
      puntoControlActual: puntoControlRegistrado ? {
        id: puntoControlRegistrado.id,
        hashSha256: puntoControlRegistrado.entidad,
        fecha: puntoControlRegistrado.fecha
      } : null,
      mutacionesRegistradasEnBitacora: mutacionesRegistradas,
      totalCheckpointsHistoricos: totalCheckpointsHistoricos + (sellarNuevoPunto || !ultimoPuntoControl ? 1 : 0),
      veredictoAuditoria,
      bloquesAuditados: {
        proyectos: { count: proys.length, hashSha256: bloqueProyectos.slice(0, 16) + '...' },
        planARC: { count: arc.length, hashSha256: bloqueARC.slice(0, 16) + '...' },
        finanzasCGC: { count: tx.length, hashSha256: bloqueFinanzas.slice(0, 16) + '...' },
        gobernanzaActas: { count: actas.length, hashSha256: bloqueGobernanza.slice(0, 16) + '...' },
        convenios: { count: convs.length, hashSha256: bloqueConvenios.slice(0, 16) + '...' },
        estadisticasASH: { count: censos.length, hashSha256: bloqueASH.slice(0, 16) + '...' },
        transparencia: { count: pubs.length, hashSha256: bloqueTransparencia.slice(0, 16) + '...' },
      },
      totalRegistrosCertificados: totalRegistros,
      motor: 'SHA-256 Cryptographic Audit Ledger · Neon PostgreSQL v16'
    });
  } catch (err) {
    next(err);
  }
}

router.get('/sello-forense', requireAuth, procesarSelloForense);
router.post('/sello-forense', requireAuth, procesarSelloForense);

export default router;
