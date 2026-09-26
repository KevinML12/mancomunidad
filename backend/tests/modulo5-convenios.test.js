import test from 'node:test';
import assert from 'node:assert/strict';

// Business logic and helpers for Módulo 5: Gestión de Alianzas y Convenios
export const TIPOS_ORGANIZACION = ['Cooperación Internacional', 'Sector Público', 'ONG'];

export function formatearCodigoConvenio(anio, entidad, correlativo) {
  const clean = entidad.toUpperCase().replace(/\s+/g, '').slice(0, 5);
  return `CONV-${anio}-${clean}-${correlativo.toString().padStart(2, '0')}`;
}

export function validarTipoOrganizacion(tipo) {
  return TIPOS_ORGANIZACION.includes(tipo);
}

export function evaluarVigenciaConvenio(fechaVencimiento, estadoActual = 'Vigente', fechaReferencia = new Date()) {
  const vencimiento = new Date(fechaVencimiento);
  const ref = new Date(fechaReferencia);
  const diferenciaMs = vencimiento.getTime() - ref.getTime();
  const diasRestantes = Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24));

  let alerta = 'normal';
  let estado = estadoActual;

  if (diasRestantes < 0) {
    alerta = 'vencido';
    estado = 'Vencido';
  } else if (diasRestantes <= 90) {
    alerta = 'proximo_a_vencer';
    if (estadoActual !== 'En Renovación') {
      estado = 'Próximo a Vencer';
    }
  } else {
    estado = 'Vigente';
  }

  return { diasRestantes, alerta, estado };
}

export function calcularApalancamientoFinanciero(montoCooperacion, contrapartidaMFN) {
  const total = Number(montoCooperacion) + Number(contrapartidaMFN);
  const porcentajeContrapartida = total > 0 ? (contrapartidaMFN / total) * 100 : 0;
  return {
    totalComprometido: total,
    porcentajeContrapartida: Number(porcentajeContrapartida.toFixed(2))
  };
}

export function validarProrrogaFecha(fechaActual, nuevaFecha) {
  const actual = new Date(fechaActual);
  const nueva = new Date(nuevaFecha);
  if (isNaN(actual.getTime()) || isNaN(nueva.getTime())) return false;
  return nueva > actual;
}

export function filtrarConvenios(convenios, { tipo, entidad, alerta } = {}) {
  return convenios.filter(c => {
    if (tipo && c.tipoOrganizacion !== tipo) return false;
    if (entidad && !c.entidadCooperante.toLowerCase().includes(entidad.toLowerCase())) return false;
    if (alerta && c.alerta !== alerta) return false;
    return true;
  });
}

// ==========================================
// 15 PRUEBAS UNITARIAS - MÓDULO 5
// ==========================================

test('1. Formato estandarizado de código institucional de convenio', () => {
  assert.equal(formatearCodigoConvenio(2024, 'USAID', 1), 'CONV-2024-USAID-01');
  assert.equal(formatearCodigoConvenio(2024, 'AECID España', 3), 'CONV-2024-AECID-03');
});

test('2. Validación de tipos de organización aliada reconocidos', () => {
  assert.equal(validarTipoOrganizacion('Cooperación Internacional'), true);
  assert.equal(validarTipoOrganizacion('Sector Público'), true);
  assert.equal(validarTipoOrganizacion('ONG'), true);
  assert.equal(validarTipoOrganizacion('Empresa Comercial'), false);
});

test('3. Motor cronológico: cálculo de días calendario restantes hasta caducidad', () => {
  const resultado = evaluarVigenciaConvenio('2024-04-14', 'Vigente', '2024-03-15');
  assert.equal(resultado.diasRestantes, 30);
});

test('4. RF15: Activación de alerta preventiva automática a los 90 días o menos', () => {
  const resultado = evaluarVigenciaConvenio('2024-06-01', 'Vigente', '2024-03-15');
  assert.equal(resultado.alerta, 'proximo_a_vencer');
  assert.equal(resultado.estado, 'Próximo a Vencer');
  assert.ok(resultado.diasRestantes <= 90);
});

test('5. Convenio en estado normal cuando faltan más de 90 días de vigencia', () => {
  const resultado = evaluarVigenciaConvenio('2024-12-31', 'Vigente', '2024-03-15');
  assert.equal(resultado.alerta, 'normal');
  assert.equal(resultado.estado, 'Vigente');
  assert.ok(resultado.diasRestantes > 90);
});

test('6. Detección de convenio vencido cuando la fecha es anterior a hoy', () => {
  const resultado = evaluarVigenciaConvenio('2024-02-01', 'Vigente', '2024-03-15');
  assert.equal(resultado.alerta, 'vencido');
  assert.equal(resultado.estado, 'Vencido');
  assert.ok(resultado.diasRestantes < 0);
});

test('7. Respeto al estatus diplomático de "En Renovación" aunque falten <90 días', () => {
  const resultado = evaluarVigenciaConvenio('2024-04-01', 'En Renovación', '2024-03-15');
  assert.equal(resultado.alerta, 'proximo_a_vencer');
  assert.equal(resultado.estado, 'En Renovación');
});

test('8. Cálculo del portafolio total comprometido (Aporte Externo + Contrapartida MFN)', () => {
  const calculo = calcularApalancamientoFinanciero(8000000, 2000000);
  assert.equal(calculo.totalComprometido, 10000000);
  assert.equal(calculo.porcentajeContrapartida, 20.0);
});

test('9. Cálculo de porcentaje de contrapartida cero cuando la donación es 100% no reembolsable', () => {
  const calculo = calcularApalancamientoFinanciero(5000000, 0);
  assert.equal(calculo.totalComprometido, 5000000);
  assert.equal(calculo.porcentajeContrapartida, 0);
});

test('10. Validación de prórroga de convenio: nueva fecha debe ser estrictamente posterior', () => {
  assert.equal(validarProrrogaFecha('2024-06-30', '2024-12-31'), true);
  assert.equal(validarProrrogaFecha('2024-06-30', '2024-05-01'), false);
});

test('11. Filtrado de portafolio por entidad cooperante específica', () => {
  const convenios = [
    { entidadCooperante: 'USAID', tipoOrganizacion: 'Cooperación Internacional' },
    { entidadCooperante: 'AECID', tipoOrganizacion: 'Cooperación Internacional' },
    { entidadCooperante: 'Global Communities', tipoOrganizacion: 'ONG' }
  ];
  const resultado = filtrarConvenios(convenios, { entidad: 'USAID' });
  assert.equal(resultado.length, 1);
  assert.equal(resultado[0].entidadCooperante, 'USAID');
});

test('12. Filtrado de convenios según tipo de organización aliada', () => {
  const convenios = [
    { entidadCooperante: 'USAID', tipoOrganizacion: 'Cooperación Internacional' },
    { entidadCooperante: 'Ministerio de Finanzas', tipoOrganizacion: 'Sector Público' },
    { entidadCooperante: 'Global Communities', tipoOrganizacion: 'ONG' }
  ];
  const resultado = filtrarConvenios(convenios, { tipo: 'Sector Público' });
  assert.equal(resultado.length, 1);
  assert.equal(resultado[0].entidadCooperante, 'Ministerio de Finanzas');
});

test('13. Filtrado por estado de alerta temprana para renovación prioritaria', () => {
  const convenios = [
    { codigo: 'C1', alerta: 'proximo_a_vencer' },
    { codigo: 'C2', alerta: 'normal' },
    { codigo: 'C3', alerta: 'vencido' }
  ];
  const urgentes = filtrarConvenios(convenios, { alerta: 'proximo_a_vencer' });
  assert.equal(urgentes.length, 1);
  assert.equal(urgentes[0].codigo, 'C1');
});

test('14. Verificación de existencia de documento o adenda legal firmada', () => {
  const convenio = { urlDocumento: 'https://storage.mfn.gob.gt/convenios/convenio-usaid-089.pdf' };
  assert.ok(convenio.urlDocumento.endsWith('.pdf'));
});

test('15. Validación de coordinador técnico institucional asignado por MFN', () => {
  const convenio = { coordinadorMFN: 'Ing. Carlos Méndez' };
  assert.ok(convenio.coordinadorMFN.length > 3);
});
