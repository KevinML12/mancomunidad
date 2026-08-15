import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { colaboradoresVisiblesPara } from '../lib/scope.js';

const router = Router();

// Cap. V 5.4: cada rol accede a un tablero adaptado — Junta Directiva/
// Gerencia/Dirección Admin/Auditoría ven cumplimiento institucional, RRHH
// ve pendientes operativos, un jefe de equipo ve las solicitudes de su
// equipo, y un Empleado ve su propio saldo e historial.
const TIER_POR_ROL = {
  JD: 'institucional', GE: 'institucional', DIRADMIN: 'institucional', AUD: 'institucional',
  RRHH: 'operativo',
  JI: 'equipo', DIRPROY: 'equipo',
  EMP: 'personal',
};

router.get('/', requireAuth, async (req, res) => {
  const tier = TIER_POR_ROL[req.user.rol] || 'institucional';
  if (tier === 'personal') return res.json(await tableroPersonal(req.user));
  if (tier === 'equipo') return res.json(await tableroEquipo(req.user));
  if (tier === 'operativo') return res.json(await tableroOperativo());
  return res.json(await tableroInstitucional());
});

async function tableroInstitucional() {
  const [totalColaboradores, evaluacionesPendientes, contratosSinRegistrar, capacitaciones, ausenciasPendientes, faltasSinSancion] =
    await Promise.all([
      prisma.colaborador.count({ where: { estado: 'Activo' } }),
      prisma.evaluacionDesempeno.count({ where: { OR: [{ resultado: null }, { resultado: 'Pendiente' }] } }),
      prisma.contrato.count({ where: { fechaRegistroContraloria: null } }),
      prisma.capacitacion.findMany({ include: { certificaciones: true } }),
      prisma.solicitudAusencia.count({ where: { estado: 'Pendiente' } }),
      prisma.faltaDisciplinaria.findMany({ where: { sancion: null }, include: { colaborador: true } }),
    ]);

  const herramientasAlDia = capacitaciones.filter(
    (c) => c.certificaciones.length > 0 && c.certificaciones.every((cert) => cert.firmado),
  ).length;

  const alertas = [];
  if (contratosSinRegistrar > 0) {
    alertas.push({ tipo: 'urgente', texto: `${contratosSinRegistrar} contrato(s) sin registrar ante la Contraloría (plazo legal: 15 días)` });
  }
  if (evaluacionesPendientes > 0) {
    alertas.push({ tipo: 'atencion', texto: `${evaluacionesPendientes} evaluación(es) de desempeño pendiente(s)` });
  }
  if (ausenciasPendientes > 0) {
    alertas.push({ tipo: 'atencion', texto: `${ausenciasPendientes} solicitud(es) de ausencia esperando aprobación` });
  }
  for (const f of faltasSinSancion) {
    alertas.push({
      tipo: 'urgente',
      texto: `Falta sin resolver de ${f.colaborador.nombre} — definir audiencia (plazo: 3 días hábiles)`,
    });
  }
  const capacitacionesPendientes = capacitaciones.filter((c) => c.certificaciones.length === 0);
  for (const c of capacitacionesPendientes) {
    alertas.push({ tipo: 'atencion', texto: `Capacitación "${c.nombreHerramienta}" sin programar` });
  }

  return {
    vista: 'institucional',
    kpis: { herramientasAlDia, totalHerramientas: capacitaciones.length, evaluacionesPendientes, contratosSinRegistrar, totalColaboradores },
    alertas: alertas.slice(0, 8),
  };
}

async function tableroOperativo() {
  const [evaluacionesPendientes, contratosSinRegistrar, capacitaciones, totalColaboradores] = await Promise.all([
    prisma.evaluacionDesempeno.count({ where: { OR: [{ resultado: null }, { resultado: 'Pendiente' }] } }),
    prisma.contrato.count({ where: { fechaRegistroContraloria: null } }),
    prisma.capacitacion.findMany({ include: { certificaciones: true } }),
    prisma.colaborador.count({ where: { estado: 'Activo' } }),
  ]);
  const capacitacionesSinProgramar = capacitaciones.filter((c) => !c.fecha).length;

  const alertas = [];
  if (contratosSinRegistrar > 0) alertas.push({ tipo: 'urgente', texto: `${contratosSinRegistrar} contrato(s) por registrar ante la Contraloría` });
  if (evaluacionesPendientes > 0) alertas.push({ tipo: 'atencion', texto: `${evaluacionesPendientes} evaluación(es) por vencer o sin resultado` });
  if (capacitacionesSinProgramar > 0) alertas.push({ tipo: 'atencion', texto: `${capacitacionesSinProgramar} capacitación(es) sin fecha programada` });

  return {
    vista: 'operativo',
    kpis: { evaluacionesPendientes, contratosSinRegistrar, capacitacionesSinProgramar, totalColaboradores },
    alertas,
  };
}

async function tableroEquipo(user) {
  const scope = (await colaboradoresVisiblesPara(user)) || [];
  const subordinadosIds = scope.filter((id) => id !== user.colaboradorId);

  const [ausenciasPendientes, evaluacionesPendientes, faltasSinSancion, tamanoEquipo] = await Promise.all([
    prisma.solicitudAusencia.findMany({
      where: { colaboradorId: { in: scope }, estado: 'Pendiente' },
      include: { colaborador: true },
    }),
    prisma.evaluacionDesempeno.count({
      where: { colaboradorId: { in: subordinadosIds }, OR: [{ resultado: null }, { resultado: 'Pendiente' }] },
    }),
    prisma.faltaDisciplinaria.findMany({ where: { colaboradorId: { in: scope }, sancion: null }, include: { colaborador: true } }),
    prisma.colaborador.count({ where: { id: { in: subordinadosIds } } }),
  ]);

  const alertas = ausenciasPendientes.map((a) => ({
    tipo: 'atencion',
    texto: `${a.colaborador.nombre} solicitó ${a.tipo.toLowerCase()} — pendiente de tu aprobación`,
  }));
  for (const f of faltasSinSancion) {
    alertas.push({ tipo: 'urgente', texto: `Falta sin resolver de ${f.colaborador.nombre} — definir audiencia` });
  }

  return {
    vista: 'equipo',
    kpis: { tamanoEquipo, ausenciasPendientes: ausenciasPendientes.length, evaluacionesPendientes },
    alertas: alertas.slice(0, 8),
  };
}

async function tableroPersonal(user) {
  if (!user.colaboradorId) {
    return { vista: 'personal', kpis: { diasDisponibles: 0, diasUsados: 0, ultimoResultado: null, ultimoPeriodo: null }, alertas: [] };
  }
  const anio = new Date().getFullYear();
  const [saldo, ultimaEvaluacion, solicitudesPendientes] = await Promise.all([
    prisma.saldoVacaciones.findUnique({ where: { colaboradorId_anio: { colaboradorId: user.colaboradorId, anio } } }),
    prisma.evaluacionDesempeno.findFirst({ where: { colaboradorId: user.colaboradorId }, orderBy: { createdAt: 'desc' } }),
    prisma.solicitudAusencia.count({ where: { colaboradorId: user.colaboradorId, estado: 'Pendiente' } }),
  ]);

  const alertas = [];
  if (solicitudesPendientes > 0) {
    alertas.push({ tipo: 'atencion', texto: `Tenés ${solicitudesPendientes} solicitud(es) de ausencia esperando respuesta` });
  }
  if (ultimaEvaluacion?.resultado === 'Deficiente') {
    alertas.push({ tipo: 'urgente', texto: 'Tu última evaluación activó un plan de mejora — revisá tu expediente' });
  }

  return {
    vista: 'personal',
    kpis: {
      diasDisponibles: (saldo?.diasDisponibles || 0) - (saldo?.diasUsados || 0),
      diasUsados: saldo?.diasUsados || 0,
      ultimoResultado: ultimaEvaluacion?.resultado || null,
      ultimoPeriodo: ultimaEvaluacion?.periodo || null,
    },
    alertas,
  };
}

export default router;
