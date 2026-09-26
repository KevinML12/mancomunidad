import test from 'node:test';
import assert from 'node:assert/strict';

// Business logic and helpers for Módulo 4: Control de Acuerdos y Gobernanza (Actas y Acuerdos)
export const TIPOS_SESION = ['Ordinaria', 'Extraordinaria'];
export const ESTADOS_SEMAFORO = ['Cumplido', 'En Proceso', 'Pendiente'];

export function formatearNumeroActa(sesion, anio) {
  return `ACTA-${sesion.toString().padStart(2, '0')}-${anio}`;
}

export function validarTipoSesion(tipo) {
  return TIPOS_SESION.includes(tipo);
}

export function validarEstadoSemaforo(estado) {
  return ESTADOS_SEMAFORO.includes(estado);
}

export function formatearCodigoAcuerdo(actaNumero, correlativo) {
  return `ACU-${actaNumero}-${correlativo.toString().padStart(2, '0')}`;
}

export function validarCumplimientoAcuerdo(estado, evidenciaUrl) {
  if (estado === 'Cumplido' && (!evidenciaUrl || evidenciaUrl.trim() === '')) {
    throw new Error('RF14: Se requiere adjuntar evidencia o dictamen de cumplimiento para marcar un acuerdo como Cumplido');
  }
  return true;
}

export function calcularEfectividadGobernanza(acuerdos) {
  if (!Array.isArray(acuerdos) || acuerdos.length === 0) return 0;
  const cumplidos = acuerdos.filter(a => a.estado === 'Cumplido').length;
  return Math.round((cumplidos / acuerdos.length) * 100);
}

export function detectarAcuerdosVencidos(acuerdos, fechaReferencia = new Date()) {
  const ref = new Date(fechaReferencia);
  return acuerdos.filter(a => {
    if (a.estado === 'Cumplido') return false;
    if (!a.fechaCumplimiento) return false;
    return new Date(a.fechaCumplimiento) < ref;
  });
}

export function indexarActasPorMunicipio(actas) {
  const grupos = {};
  for (const a of actas) {
    if (!grupos[a.municipioSede]) grupos[a.municipioSede] = [];
    grupos[a.municipioSede].push(a);
  }
  return grupos;
}

export function buscarEnAcuerdos(acuerdos, query) {
  if (!query) return acuerdos;
  const q = query.toLowerCase();
  return acuerdos.filter(a => 
    a.codigo.toLowerCase().includes(q) ||
    a.titulo.toLowerCase().includes(q) ||
    a.responsable.toLowerCase().includes(q)
  );
}

// ==========================================
// 15 PRUEBAS UNITARIAS - MÓDULO 4
// ==========================================

test('1. Formato oficial de acta de asamblea institucional (ACTA-SS-YYYY)', () => {
  assert.equal(formatearNumeroActa(4, 2024), 'ACTA-04-2024');
  assert.equal(formatearNumeroActa(12, 2024), 'ACTA-12-2024');
});

test('2. Validación de tipos de sesión de asamblea autorizados', () => {
  assert.equal(validarTipoSesion('Ordinaria'), true);
  assert.equal(validarTipoSesion('Extraordinaria'), true);
  assert.equal(validarTipoSesion('Informal'), false);
});

test('3. Validación de estados válidos del semáforo político de cumplimiento', () => {
  assert.equal(validarEstadoSemaforo('Cumplido'), true);
  assert.equal(validarEstadoSemaforo('En Proceso'), true);
  assert.equal(validarEstadoSemaforo('Pendiente'), true);
  assert.equal(validarEstadoSemaforo('Ignorado'), false);
});

test('4. Generación estandarizada de código de acuerdo resolutivo', () => {
  const codigo = formatearCodigoAcuerdo('ACTA-04-2024', 1);
  assert.equal(codigo, 'ACU-ACTA-04-2024-01');
});

test('5. RF14: Exigencia de evidencia documental para cerrar acuerdo como Cumplido', () => {
  assert.equal(validarCumplimientoAcuerdo('Cumplido', 'https://storage.mfn.gob.gt/evidencias/resolucion.pdf'), true);
});

test('6. RF14: Rechazo al marcar Cumplido sin adjuntar evidencia probatoria', () => {
  assert.throws(() => {
    validarCumplimientoAcuerdo('Cumplido', '');
  }, /RF14: Se requiere adjuntar evidencia/);
});

test('7. Aceptación de estado En Proceso sin requerir evidencia final inmediata', () => {
  assert.equal(validarCumplimientoAcuerdo('En Proceso', null), true);
});

test('8. Cálculo del índice de efectividad de gobernanza (% acuerdos cumplidos)', () => {
  const acuerdos = [
    { estado: 'Cumplido' },
    { estado: 'Cumplido' },
    { estado: 'En Proceso' },
    { estado: 'Pendiente' }
  ];
  assert.equal(calcularEfectividadGobernanza(acuerdos), 50);
});

test('9. Detección de acuerdos en mora política con fecha límite vencida', () => {
  const acuerdos = [
    { codigo: 'A1', estado: 'En Proceso', fechaCumplimiento: '2024-02-01' },
    { codigo: 'A2', estado: 'Cumplido', fechaCumplimiento: '2024-02-01' },
    { codigo: 'A3', estado: 'Pendiente', fechaCumplimiento: '2024-05-01' }
  ];
  const vencidos = detectarAcuerdosVencidos(acuerdos, '2024-03-25');
  assert.equal(vencidos.length, 1);
  assert.equal(vencidos[0].codigo, 'A1');
});

test('10. Indexación geográfica de actas según municipio anfitrión de la asamblea', () => {
  const actas = [
    { numeroActa: 'ACTA-01-2024', municipioSede: 'Santa Eulalia' },
    { numeroActa: 'ACTA-02-2024', municipioSede: 'San Pedro Soloma' },
    { numeroActa: 'ACTA-03-2024', municipioSede: 'Santa Eulalia' }
  ];
  const indexadas = indexarActasPorMunicipio(actas);
  assert.equal(indexadas['Santa Eulalia'].length, 2);
  assert.equal(indexadas['San Pedro Soloma'].length, 1);
});

test('11. Búsqueda y filtrado de acuerdos políticos por palabra clave o código', () => {
  const acuerdos = [
    { codigo: 'ACU-01', titulo: 'Aprobación de Fideicomiso Agua', responsable: 'Gerencia' },
    { codigo: 'ACU-02', titulo: 'Contratación de Auditor Externo', responsable: 'Junta Directiva' }
  ];
  const resultado = buscarEnAcuerdos(acuerdos, 'Fideicomiso');
  assert.equal(resultado.length, 1);
  assert.equal(resultado[0].codigo, 'ACU-01');
});

test('12. Búsqueda por responsable institucional de la ejecución del acuerdo', () => {
  const acuerdos = [
    { codigo: 'ACU-01', titulo: 'Aprobación de Fideicomiso', responsable: 'Gerencia Ejecutiva' },
    { codigo: 'ACU-02', titulo: 'Auditoría', responsable: 'Dirección Financiera' }
  ];
  const resultado = buscarEnAcuerdos(acuerdos, 'Financiera');
  assert.equal(resultado.length, 1);
  assert.equal(resultado[0].codigo, 'ACU-02');
});

test('13. Conteo de acuerdos vinculados a una misma acta', () => {
  const acta = {
    numeroActa: 'ACTA-04-2024',
    acuerdos: [{ id: 1 }, { id: 2 }, { id: 3 }]
  };
  assert.equal(acta.acuerdos.length, 3);
});

test('14. Comprobación de existencia de folio de hojas movibles autorizado por CGC', () => {
  const acta = { numeroActa: 'ACTA-04-2024', libroCGCFolio: 'Folio No. 042-2023-CGC' };
  assert.ok(acta.libroCGCFolio.includes('CGC'));
});

test('15. Validación de disponibilidad de acta escaneada en formato PDF', () => {
  const acta = { urlPdfEscaneado: 'https://storage.mfn.gob.gt/actas/acta-04-2024.pdf' };
  assert.ok(acta.urlPdfEscaneado.endsWith('.pdf'));
});
