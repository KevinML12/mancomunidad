import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { FACTORES_EVALUACION, HERRAMIENTAS_ADMINISTRATIVAS } from '../src/lib/constants.js';

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'mfn2026';

// Catálogo de roles — evolución del enum fijo de 5 roles de la propuesta
// original (Cap. I 1.9 Variables) hacia un modelo de permisos granular,
// más fiel a la jerarquía real de la MFN (Reglamento Interno + manuales).
// modulos = pestañas visibles; editar = puede crear/registrar; aprobar = puede resolver/autorizar.
const ROLES_DATA = [
  {
    codigo: 'JD',
    nombre: 'Junta Directiva',
    descripcion: 'Máxima autoridad de la Mancomunidad — aprueba la creación de puestos y resuelve sanciones graves.',
    permisos: {
      modulos: ['dashboard', 'estructura', 'reclutamiento', 'evaluaciones', 'ausencias', 'disciplina', 'capacitacion'],
      editar: ['estructura', 'evaluaciones'],
      aprobar: ['disciplina', 'ausencias'],
    },
  },
  {
    codigo: 'GE',
    nombre: 'Gerencia Ejecutiva',
    descripcion: 'Representante legal y autoridad administrativa máxima — aprueba contrataciones, ausencias y sanciones.',
    permisos: {
      modulos: ['dashboard', 'estructura', 'reclutamiento', 'evaluaciones', 'ausencias', 'disciplina', 'capacitacion'],
      editar: ['reclutamiento', 'capacitacion', 'evaluaciones'],
      aprobar: ['ausencias', 'disciplina'],
    },
  },
  {
    codigo: 'DIRADMIN',
    nombre: 'Dirección Administrativa y Financiera',
    descripcion: 'Supervisa Recursos Humanos, Compras y Contabilidad; aprueba ausencias de su equipo.',
    permisos: {
      modulos: ['dashboard', 'estructura', 'reclutamiento', 'evaluaciones', 'ausencias', 'disciplina', 'capacitacion'],
      editar: ['evaluaciones'],
      aprobar: ['ausencias'],
    },
  },
  {
    codigo: 'RRHH',
    nombre: 'Recursos Humanos',
    descripcion: 'Ejecuta reclutamiento, contratación, capacitación y expedientes; custodia la estructura de puestos.',
    permisos: {
      modulos: ['dashboard', 'estructura', 'reclutamiento', 'evaluaciones', 'ausencias', 'disciplina', 'capacitacion'],
      editar: ['estructura', 'reclutamiento', 'capacitacion', 'evaluaciones'],
      aprobar: ['ausencias'],
    },
  },
  {
    codigo: 'AUD',
    nombre: 'Auditoría Interna',
    descripcion: 'Control interno y fiscalización — acceso de solo lectura a los procesos auditables.',
    permisos: {
      modulos: ['dashboard', 'estructura', 'evaluaciones', 'disciplina', 'capacitacion'],
      editar: [],
      aprobar: [],
    },
  },
  {
    codigo: 'DIRPROY',
    nombre: 'Dirección de Proyectos',
    descripcion: 'Supervisa las coordinaciones técnicas — jefe inmediato de su equipo de proyectos.',
    permisos: {
      modulos: ['dashboard', 'evaluaciones', 'ausencias', 'disciplina', 'capacitacion'],
      editar: ['disciplina', 'evaluaciones'],
      aprobar: ['ausencias'],
    },
  },
  {
    codigo: 'JI',
    nombre: 'Jefe Inmediato',
    descripcion: 'Jefatura de unidad o coordinación — evalúa, aprueba ausencias y amonesta a su equipo directo.',
    permisos: {
      modulos: ['dashboard', 'evaluaciones', 'ausencias', 'disciplina', 'capacitacion'],
      editar: ['disciplina', 'evaluaciones'],
      aprobar: ['ausencias'],
    },
  },
  {
    codigo: 'EMP',
    nombre: 'Empleado',
    descripcion: 'Consulta su propio expediente, solicita ausencias y revisa su capacitación.',
    permisos: {
      modulos: ['dashboard', 'evaluaciones', 'ausencias', 'capacitacion'],
      editar: [],
      aprobar: [],
    },
  },
];

async function main() {
  console.log('Limpiando datos previos...');
  await prisma.bitacoraAuditoria.deleteMany();
  await prisma.certificacionCapacitacion.deleteMany();
  await prisma.capacitacion.deleteMany();
  await prisma.sancion.deleteMany();
  await prisma.faltaDisciplinaria.deleteMany();
  await prisma.solicitudAusencia.deleteMany();
  await prisma.saldoVacaciones.deleteMany();
  await prisma.planMejora.deleteMany();
  await prisma.evaluacionFactor.deleteMany();
  await prisma.evaluacionDesempeno.deleteMany();
  await prisma.candidato.deleteMany();
  await prisma.convocatoria.deleteMany();
  await prisma.contrato.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.colaborador.deleteMany();
  await prisma.puesto.deleteMany();
  await prisma.unidadOrganizacional.deleteMany();
  await prisma.rol.deleteMany();

  console.log('Creando catálogo de 8 roles con permisos...');
  const roles = {};
  for (const r of ROLES_DATA) {
    roles[r.codigo] = await prisma.rol.create({ data: r });
  }

  console.log('Creando unidades organizacionales...');
  const gerencia = await prisma.unidadOrganizacional.create({ data: { nombre: 'Gerencia Ejecutiva' } });
  const dirAdmin = await prisma.unidadOrganizacional.create({ data: { nombre: 'Dirección Administrativa y Financiera' } });
  const dirProy = await prisma.unidadOrganizacional.create({ data: { nombre: 'Dirección de Proyectos' } });

  console.log('Creando catálogo de 28 puestos...');
  // 4ta columna = puesto del jefe inmediato (nombre, resuelto a id en la 2da
  // pasada de abajo) — el Reglamento Interno (art. 6) define 3 niveles
  // jerárquicos. Cada técnico reporta a la coordinación con la que coincide
  // temáticamente (ej. Técnico DET → Coordinador Desarrollo Económico
  // Territorial), no directo a la Dirección de Proyectos — el Manual de
  // Procedimientos no lo detalla puesto por puesto, así que esta asignación
  // es una inferencia razonable a partir del nombre de cada técnico.
  const PUESTOS_DATA = [
    ['Gerente Ejecutivo', 'A', gerencia.id, null],
    ['Asistente / Secretaría', 'C', gerencia.id, 'Gerente Ejecutivo'],
    ['Auditoría Interna', 'A', gerencia.id, 'Gerente Ejecutivo'],
    ['Monitoreo y Evaluación', 'B', gerencia.id, 'Gerente Ejecutivo'],
    ['Dirección de Proyectos', 'A', dirProy.id, 'Gerente Ejecutivo'],
    ['Coordinador Desarrollo Económico Territorial', 'A', dirProy.id, 'Dirección de Proyectos'],
    ['Coordinador Gestión Ambiental y Cambio Climático', 'A', dirProy.id, 'Dirección de Proyectos'],
    ['Coordinador Fortalecimiento Político/Institucional', 'A', dirProy.id, 'Dirección de Proyectos'],
    ['Coordinador Participación Ciudadana, Equidad e Inclusión', 'A', dirProy.id, 'Dirección de Proyectos'],
    ['Coordinador Desarrollo Social Integral', 'A', dirProy.id, 'Dirección de Proyectos'],
    ['Coordinador Gestión, Planificación y Ejecución de Proyectos', 'A', dirProy.id, 'Dirección de Proyectos'],
    ['Dirección Administrativa y Financiera', 'A', dirAdmin.id, 'Gerente Ejecutivo'],
    ['Asistente Administrativa / Recursos Humanos', 'C', dirAdmin.id, 'Dirección Administrativa y Financiera'],
    ['Técnico DET', 'B', dirProy.id, 'Coordinador Desarrollo Económico Territorial'],
    ['Técnico GIRH', 'B', dirProy.id, 'Coordinador Gestión Ambiental y Cambio Climático'],
    ['Técnico Fortalecimiento Gobernanza', 'B', dirProy.id, 'Coordinador Fortalecimiento Político/Institucional'],
    ['Técnico Social y de Comportamiento', 'B', dirProy.id, 'Coordinador Participación Ciudadana, Equidad e Inclusión'],
    ['Técnico WASH', 'B', dirProy.id, 'Coordinador Gestión Ambiental y Cambio Climático'],
    ['Técnico Gestión de Proyecto', 'B', dirProy.id, 'Coordinador Gestión, Planificación y Ejecución de Proyectos'],
    ['Técnico Comunicador Social', 'B', dirAdmin.id, 'Dirección Administrativa y Financiera'],
    ['Técnico SAN', 'B', dirProy.id, 'Coordinador Desarrollo Social Integral'],
    ['Técnico Educación Ambiental', 'B', dirProy.id, 'Coordinador Gestión Ambiental y Cambio Climático'],
    ['Técnico Fortalecimiento Institucional', 'B', dirProy.id, 'Coordinador Fortalecimiento Político/Institucional'],
    ['Técnico Género y Equidad', 'B', dirProy.id, 'Coordinador Participación Ciudadana, Equidad e Inclusión'],
    ['Técnico Desarrollo Social', 'B', dirProy.id, 'Coordinador Desarrollo Social Integral'],
    ['Asistente Financiero', 'C', dirAdmin.id, 'Dirección Administrativa y Financiera'],
    ['Contador', 'C', dirAdmin.id, 'Dirección Administrativa y Financiera'],
    ['Compras y Contrataciones', 'C', dirAdmin.id, 'Dirección Administrativa y Financiera'],
  ];
  const puestos = {};
  for (const [nombre, categoria, unidadId] of PUESTOS_DATA) {
    puestos[nombre] = await prisma.puesto.create({ data: { nombre, categoria, unidadId } });
  }
  for (const [nombre, , , jefeNombre] of PUESTOS_DATA) {
    if (!jefeNombre) continue;
    await prisma.puesto.update({
      where: { id: puestos[nombre].id },
      data: { jefeInmediatoId: puestos[jefeNombre].id },
    });
  }

  console.log('Creando colaboradores...');
  const COLABS_DATA = [
    ['Marvin Josué Ramírez', 'Gerente Ejecutivo', '2021-03-01'],
    ['Ana Lucía Pérez', 'Asistente Administrativa / Recursos Humanos', '2022-01-10'],
    ['Carlos Enrique Domingo', 'Contador', '2021-06-15'],
    ['Elvira Sofía Pablo', 'Coordinador Desarrollo Económico Territorial', '2023-02-01'],
    ['José Miguel Francisco', 'Técnico Comunicador Social', '2023-04-18'],
    ['Brenda Lisbeth Mendoza', 'Monitoreo y Evaluación', '2023-05-02'],
    ['Diego Alonso Velásquez', 'Compras y Contrataciones', '2023-07-20'],
    ['Rosa Idalia Gómez', 'Asistente Financiero', '2023-08-11'],
    ['Julio César Matías', 'Auditoría Interna', '2022-05-16'],
    ['Silvia Patricia Ramos', 'Dirección de Proyectos', '2021-09-01'],
    ['Óscar Fernando Ixcoy', 'Dirección Administrativa y Financiera', '2021-11-03'],
    ['Marta Elena Solís', 'Técnico DET', '2023-09-04'],
  ];
  const colaboradores = {};
  const anio = new Date().getFullYear();
  for (const [nombre, puestoNombre, fechaIngreso] of COLABS_DATA) {
    const c = await prisma.colaborador.create({
      data: { nombre, puestoId: puestos[puestoNombre].id, fechaIngreso: new Date(fechaIngreso) },
    });
    colaboradores[nombre] = c;
    await prisma.saldoVacaciones.create({
      data: { colaboradorId: c.id, anio, diasDisponibles: 20, diasUsados: Math.floor(Math.random() * 10) },
    });
    await prisma.contrato.create({
      data: {
        colaboradorId: c.id,
        tipo: '1 año',
        fechaInicio: new Date(fechaIngreso),
        fechaRegistroContraloria: Math.random() > 0.3 ? new Date(fechaIngreso) : null,
      },
    });
  }

  console.log('Creando usuarios (login demo — contraseña para todos: "mfn2026")...');
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const usuarios = [
    { correo: 'juntadirectiva@mfn.gob.gt', rol: 'JD', colaboradorId: null },
    { correo: 'gerencia@mfn.gob.gt', rol: 'GE', colaboradorId: colaboradores['Marvin Josué Ramírez'].id },
    { correo: 'diradmin@mfn.gob.gt', rol: 'DIRADMIN', colaboradorId: colaboradores['Óscar Fernando Ixcoy'].id },
    { correo: 'rrhh@mfn.gob.gt', rol: 'RRHH', colaboradorId: colaboradores['Ana Lucía Pérez'].id },
    { correo: 'auditoria@mfn.gob.gt', rol: 'AUD', colaboradorId: colaboradores['Julio César Matías'].id },
    { correo: 'dirproyectos@mfn.gob.gt', rol: 'DIRPROY', colaboradorId: colaboradores['Silvia Patricia Ramos'].id },
    { correo: 'jefatura@mfn.gob.gt', rol: 'JI', colaboradorId: colaboradores['Elvira Sofía Pablo'].id },
    { correo: 'empleado@mfn.gob.gt', rol: 'EMP', colaboradorId: colaboradores['José Miguel Francisco'].id },
  ];
  for (const u of usuarios) {
    await prisma.usuario.create({ data: { correo: u.correo, hashContrasena: hash, rolId: roles[u.rol].id, colaboradorId: u.colaboradorId } });
  }

  console.log('Creando convocatorias y candidatos...');
  const conv1 = await prisma.convocatoria.create({
    data: { puestoId: puestos['Técnico Educación Ambiental'].id, tipo: 'Externa', fechaCierre: new Date('2026-08-15'), estado: 'Abierta' },
  });
  await prisma.candidato.createMany({
    data: [
      { convocatoriaId: conv1.id, nombre: 'Luis Fernando Ortiz', puntajeCompetencias: 85, puntajeExperiencia: 70, puntajeEntrevista: 90, puntajeReferencias: 80, puntajeTotal: 82.5, expedienteCompleto: true },
      { convocatoriaId: conv1.id, nombre: 'María José Herrera', puntajeCompetencias: 92, puntajeExperiencia: 60, puntajeEntrevista: 88, puntajeReferencias: 75, puntajeTotal: 83.7, expedienteCompleto: true },
      { convocatoriaId: conv1.id, nombre: 'Pedro Antonio Mateo', puntajeCompetencias: 70, puntajeExperiencia: 50, puntajeEntrevista: 60, puntajeReferencias: 65, puntajeTotal: 63.5, expedienteCompleto: false },
    ],
  });
  await prisma.convocatoria.create({
    data: { puestoId: puestos['Asistente Financiero'].id, tipo: 'Interna', fechaCierre: new Date('2026-08-12'), estado: 'Abierta' },
  });

  console.log('Creando evaluaciones de desempeño...');
  const nivelesDemo = {
    'José Miguel Francisco': 'Bueno',
    'Brenda Lisbeth Mendoza': 'Sobresaliente',
    'Diego Alonso Velásquez': 'Regular',
    'Elvira Sofía Pablo': 'Deficiente',
  };
  for (const [nombre, resultado] of Object.entries(nivelesDemo)) {
    const puntoBase = { Sobresaliente: 4, Bueno: 3, Regular: 2, Deficiente: 1 }[resultado];
    const evaluacion = await prisma.evaluacionDesempeno.create({
      data: {
        colaboradorId: colaboradores[nombre].id,
        evaluadorId: colaboradores['Marvin Josué Ramírez'].id,
        periodo: `${anio} - Anual`,
        resultado,
        fecha: new Date(),
        factores: {
          create: FACTORES_EVALUACION.map((nombreFactor, i) => ({
            factor: i + 1,
            nombreFactor,
            calificacion: ['Sobresaliente', 'Bueno', 'Regular', 'Deficiente'][Math.max(0, Math.min(3, puntoBase - 1 + (i % 2 === 0 ? 0 : -1)))],
          })),
        },
      },
    });
    if (resultado === 'Deficiente') {
      const fechaLimite = new Date();
      fechaLimite.setMonth(fechaLimite.getMonth() + 2);
      await prisma.planMejora.create({ data: { evaluacionId: evaluacion.id, fechaLimite } });
    }
  }
  // Una evaluación pendiente (sin factores todavía) para mostrar en el tablero.
  await prisma.evaluacionDesempeno.create({
    data: { colaboradorId: colaboradores['Rosa Idalia Gómez'].id, evaluadorId: colaboradores['Marvin Josué Ramírez'].id, periodo: `${anio} - Anual`, resultado: 'Pendiente' },
  });

  console.log('Creando solicitudes de ausencia...');
  await prisma.solicitudAusencia.createMany({
    data: [
      { colaboradorId: colaboradores['Elvira Sofía Pablo'].id, tipo: 'Vacaciones', desde: new Date('2026-08-17'), hasta: new Date('2026-08-21'), estado: 'Pendiente' },
      { colaboradorId: colaboradores['José Miguel Francisco'].id, tipo: 'Permiso', desde: new Date('2026-08-10'), hasta: new Date('2026-08-10'), estado: 'Aprobado' },
      { colaboradorId: colaboradores['Rosa Idalia Gómez'].id, tipo: 'Vacaciones', desde: new Date('2026-09-01'), hasta: new Date('2026-09-05'), estado: 'Pendiente' },
      { colaboradorId: colaboradores['Ana Lucía Pérez'].id, tipo: 'Licencia (IGSS)', desde: new Date('2026-07-28'), hasta: new Date('2026-07-29'), estado: 'Aprobado' },
      { colaboradorId: colaboradores['Marta Elena Solís'].id, tipo: 'Permiso', desde: new Date('2026-08-11'), hasta: new Date('2026-08-11'), estado: 'Pendiente' },
    ],
  });

  console.log('Creando faltas disciplinarias...');
  const falta1 = await prisma.faltaDisciplinaria.create({
    data: { colaboradorId: colaboradores['Diego Alonso Velásquez'].id, tipo: 'Leve', descripcion: 'Retraso reiterado sin autorización', fecha: new Date('2026-07-18') },
  });
  await prisma.sancion.create({ data: { faltaId: falta1.id, tipo: 'Verbal', resultado: 'Notificada' } });

  const falta2 = await prisma.faltaDisciplinaria.create({
    data: { colaboradorId: colaboradores['Carlos Enrique Domingo'].id, tipo: 'Grave', descripcion: 'Uso indebido de equipo institucional para fines personales', fecha: new Date('2026-08-05') },
  });
  const fechaAudiencia = new Date();
  fechaAudiencia.setDate(fechaAudiencia.getDate() + 3);
  await prisma.sancion.create({ data: { faltaId: falta2.id, tipo: 'Suspension', fechaAudiencia, resultado: 'Pendiente de audiencia' } });

  console.log('Creando capacitaciones y certificaciones (8 herramientas)...');
  const todosColabs = Object.values(colaboradores);
  for (const [i, nombreHerramienta] of HERRAMIENTAS_ADMINISTRATIVAS.entries()) {
    const capacitacion = await prisma.capacitacion.create({
      data: { nombreHerramienta, fecha: i < 6 ? new Date('2026-06-12') : null },
    });
    if (i < 6) {
      // Certificación firmada por la mayoría del personal (matching el 12/14 real del taller).
      const firmantes = todosColabs.slice(0, i === 3 ? 6 : 8);
      for (const c of firmantes) {
        await prisma.certificacionCapacitacion.create({
          data: { capacitacionId: capacitacion.id, colaboradorId: c.id, firmado: true, fecha: new Date('2026-06-12') },
        });
      }
    }
  }

  console.log('\n✅ Seed completo.\n');
  console.log('── Usuarios de prueba (contraseña: mfn2026) ──');
  for (const u of usuarios) console.log(`  ${u.rol.padEnd(5)} ${u.correo}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
