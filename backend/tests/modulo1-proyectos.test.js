import test from 'node:test';
import assert from 'node:assert/strict';

// Helper functions and business logic for Módulo 1 (Proyectos Intermunicipales)
export function calcularPresupuestoTotal(municipal, cooperacion) {
  if (municipal < 0 || cooperacion < 0) throw new Error('Los presupuestos no pueden ser negativos');
  return Number(municipal) + Number(cooperacion);
}

export function convertirUsdAGtq(usd, tipoCambio = 7.8) {
  if (usd < 0) throw new Error('El monto en USD no puede ser negativo');
  return Math.round(usd * tipoCambio);
}

export function calcularEtapa(avance) {
  if (avance < 0 || avance > 100) throw new Error('El avance debe estar entre 0 y 100');
  if (avance === 0) return 'Etapa 1/5';
  const etapa = Math.ceil(avance / 20);
  return `Etapa ${etapa}/5`;
}

export function calcularMontoDevengado(total, avance) {
  if (avance < 0 || avance > 100) throw new Error('El avance debe estar entre 0 y 100');
  return Math.round(total * (avance / 100));
}

export function calcularSaldoPorLiquidar(total, devengado) {
  return total - devengado;
}

export function calcularRetencionGarantia(saldo, porcentaje = 0.05) {
  return Math.round(saldo * porcentaje);
}

export function validarCoordenadasGps(latitud, longitud) {
  const latValida = typeof latitud === 'number' && latitud >= -90 && latitud <= 90;
  const lonValida = typeof longitud === 'number' && longitud >= -180 && longitud <= 180;
  return latValida && lonValida;
}

export function validarToleranciaGps(distanciaMetros, limite = 1.8) {
  return Math.abs(distanciaMetros) <= limite;
}

export function validarFechasProyecto(fechaInicio, fechaFin) {
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) return false;
  return fin >= inicio;
}

export function validarTransicionEstado(estadoActual, nuevoEstado) {
  const flujo = {
    'Planificación': ['En Ejecución', 'Cancelado'],
    'En Ejecución': ['Cimentación', 'Terracería', 'Recepción Previa', 'Suspendido'],
    'Cimentación': ['En Ejecución', 'Recepción Previa'],
    'Terracería': ['En Ejecución', 'Recepción Previa'],
    'Recepción Previa': ['Finalizado', 'En Ejecución'],
    'Finalizado': []
  };
  return flujo[estadoActual]?.includes(nuevoEstado) || false;
}

export function formatearCodigoProyecto(anio, correlativo, prefijo = 'AG') {
  return `MFN-${anio}-${prefijo}${correlativo.toString().padStart(2, '0')}`;
}

export function filtrarProyectos(proyectos, query) {
  if (!query) return proyectos;
  const q = query.toLowerCase();
  return proyectos.filter(p => 
    p.nombre.toLowerCase().includes(q) ||
    p.codigo.toLowerCase().includes(q) ||
    p.municipio.toLowerCase().includes(q)
  );
}

// ==========================================
// 15 PRUEBAS UNITARIAS - MÓDULO 1
// ==========================================

test('1. Validación de cálculo de presupuesto total (Municipal + Cooperación)', () => {
  const total = calcularPresupuestoTotal(500000, 2500000);
  assert.equal(total, 3000000);
});

test('2. Error cuando el presupuesto municipal o cooperación es negativo', () => {
  assert.throws(() => calcularPresupuestoTotal(-100, 500), /no pueden ser negativos/);
});

test('3. Conversión correcta de divisa de USD a Quetzales (Tipo de cambio 7.8)', () => {
  const gtq = convertirUsdAGtq(1240000, 7.8);
  assert.equal(gtq, 9672000);
});

test('4. Cálculo automático de Etapa 1 a 5 según porcentaje de avance físico', () => {
  assert.equal(calcularEtapa(15), 'Etapa 1/5');
  assert.equal(calcularEtapa(42), 'Etapa 3/5');
  assert.equal(calcularEtapa(78.5), 'Etapa 4/5');
  assert.equal(calcularEtapa(100), 'Etapa 5/5');
});

test('5. Error si el porcentaje de avance físico está fuera de rango (0 a 100)', () => {
  assert.throws(() => calcularEtapa(105), /entre 0 y 100/);
  assert.throws(() => calcularEtapa(-5), /entre 0 y 100/);
});

test('6. Cálculo de Monto Devengado financiero basado en avance físico', () => {
  const devengado = calcularMontoDevengado(1240000, 78.5);
  assert.equal(devengado, 973400);
});

test('7. Cálculo de Saldo por Liquidar en cuenta de fideicomiso', () => {
  const saldo = calcularSaldoPorLiquidar(1240000, 973400);
  assert.equal(saldo, 266600);
});

test('8. Cálculo de retención de garantía del 5% requerida por Contraloría (CGC)', () => {
  const retencion = calcularRetencionGarantia(266600, 0.05);
  assert.equal(retencion, 13330);
});

test('9. Validación de coordenadas geográficas EXIF inmutables para fotografías de campo', () => {
  const coordenadasValidas = validarCoordenadasGps(15.7314, -91.4821);
  const coordenadasInvalidas = validarCoordenadasGps(95.0, -195.0);
  assert.equal(coordenadasValidas, true);
  assert.equal(coordenadasInvalidas, false);
});

test('10. Validación de tolerancia satelital GPS dentro del límite estricto de ±1.8 metros', () => {
  assert.equal(validarToleranciaGps(1.2, 1.8), true);
  assert.equal(validarToleranciaGps(2.5, 1.8), false);
});

test('11. Validación de coherencia cronológica de fechas de ejecución', () => {
  assert.equal(validarFechasProyecto('2024-01-15', '2024-12-31'), true);
  assert.equal(validarFechasProyecto('2024-12-31', '2024-01-15'), false);
});

test('12. Validación de transición de estados de obra según flujo técnico', () => {
  assert.equal(validarTransicionEstado('Planificación', 'En Ejecución'), true);
  assert.equal(validarTransicionEstado('En Ejecución', 'Recepción Previa'), true);
  assert.equal(validarTransicionEstado('Finalizado', 'En Ejecución'), false);
});

test('13. Formateo estandarizado de código institucional de expediente (MFN-YYYY-PRXX)', () => {
  const codigo = formatearCodigoProyecto(2024, 1, 'AG');
  assert.equal(codigo, 'MFN-2024-AG01');
});

test('14. Búsqueda y filtrado de proyectos por código de obra', () => {
  const lista = [
    { codigo: 'MFN-2024-AG01', nombre: 'Agua Potable', municipio: 'Santa Eulalia' },
    { codigo: 'MFN-2024-VI04', nombre: 'Puente Biregional', municipio: 'San Mateo Ixtatán' }
  ];
  const resultado = filtrarProyectos(lista, 'AG01');
  assert.equal(resultado.length, 1);
  assert.equal(resultado[0].municipio, 'Santa Eulalia');
});

test('15. Filtrado por municipio miembro de la Mancomunidad Frontera del Norte', () => {
  const lista = [
    { codigo: 'MFN-2024-AG01', nombre: 'Agua Potable', municipio: 'Santa Eulalia' },
    { codigo: 'MFN-2024-PT02', nombre: 'Planta Tratamiento', municipio: 'San Pedro Soloma' }
  ];
  const resultado = filtrarProyectos(lista, 'Soloma');
  assert.equal(resultado.length, 1);
  assert.equal(resultado[0].codigo, 'MFN-2023-PT02' in lista[1] ? 'MFN-2023-PT02' : 'MFN-2024-PT02');
});
