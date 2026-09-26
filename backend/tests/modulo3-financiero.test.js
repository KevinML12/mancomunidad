import test from 'node:test';
import assert from 'node:assert/strict';

// Business logic and helpers for Módulo 3: Control Financiero y Rendición de Cuentas
export const CUENTAS_BANCARIAS = ['Fondos Públicos', 'Cooperación Internacional'];
export const COMPROBANTES_VALIDOS = ['Recibo CGC 63-A2', 'Factura SAT FEL', 'Recibo SAT'];
export const CUOTA_MENSUAL_ORDINARIA = 15000; // Q15,000 por municipio

export function formatearCodigoFinanciero(anio, tipo, correlativo) {
  const prefijo = tipo === 'Ingreso' ? 'ING' : 'EGR';
  return `FIN-${anio}-${prefijo}${correlativo.toString().padStart(4, '0')}`;
}

export function validarCuentaBancaria(cuenta) {
  return CUENTAS_BANCARIAS.includes(cuenta);
}

export function validarTipoComprobante(tipo) {
  return COMPROBANTES_VALIDOS.includes(tipo);
}

export function validarGastoCajaChica(monto, urlFactura) {
  if (monto <= 0) throw new Error('El monto debe ser positivo');
  if (monto > 5000) throw new Error('El gasto individual de Caja Chica no puede exceder el límite reglamentario de Q5,000');
  if (!urlFactura || typeof urlFactura !== 'string' || urlFactura.trim() === '') {
    throw new Error('RF11: Es obligatorio adjuntar la fotografía o PDF de la factura legal para compras de Caja Chica');
  }
  return true;
}

export function calcularSolvenciaMunicipio(cuotasPagadas, mesesExigibles = 12) {
  const montoEsperado = mesesExigibles * CUOTA_MENSUAL_ORDINARIA;
  const saldoPendiente = montoEsperado - cuotasPagadas;
  const solvente = saldoPendiente <= 0;
  return {
    montoEsperado,
    cuotasPagadas,
    saldoPendiente: Math.max(0, saldoPendiente),
    solvente
  };
}

export function consolidarBalancesBancarios(transacciones) {
  const cuentas = {
    'Fondos Públicos': { ingresos: 0, egresos: 0, saldo: 0 },
    'Cooperación Internacional': { ingresos: 0, egresos: 0, saldo: 0 }
  };

  for (const t of transacciones) {
    if (!cuentas[t.cuentaBancaria]) continue;
    if (t.tipo === 'Ingreso') {
      cuentas[t.cuentaBancaria].ingresos += t.monto;
    } else if (t.tipo === 'Egreso') {
      cuentas[t.cuentaBancaria].egresos += t.monto;
    }
  }

  cuentas['Fondos Públicos'].saldo = cuentas['Fondos Públicos'].ingresos - cuentas['Fondos Públicos'].egresos;
  cuentas['Cooperación Internacional'].saldo = cuentas['Cooperación Internacional'].ingresos - cuentas['Cooperación Internacional'].egresos;

  const totalIngresos = cuentas['Fondos Públicos'].ingresos + cuentas['Cooperación Internacional'].ingresos;
  const totalEgresos = cuentas['Fondos Públicos'].egresos + cuentas['Cooperación Internacional'].egresos;
  const liquidezTotal = cuentas['Fondos Públicos'].saldo + cuentas['Cooperación Internacional'].saldo;

  return {
    cuentas,
    totalIngresos,
    totalEgresos,
    liquidezTotal
  };
}

export function filtrarTransacciones(transacciones, { municipio, cuenta, tipo } = {}) {
  return transacciones.filter(t => {
    if (municipio && t.municipio !== municipio) return false;
    if (cuenta && t.cuentaBancaria !== cuenta) return false;
    if (tipo && t.tipo !== tipo) return false;
    return true;
  });
}

// ==========================================
// 15 PRUEBAS UNITARIAS - MÓDULO 3
// ==========================================

test('1. Formato institucional de código de transacción (FIN-YYYY-ING/EGRXXXX)', () => {
  assert.equal(formatearCodigoFinanciero(2024, 'Ingreso', 4), 'FIN-2024-ING0004');
  assert.equal(formatearCodigoFinanciero(2024, 'Egreso', 18), 'FIN-2024-EGR0018');
});

test('2. Separación bancaria estricta de cuentas (Fondos Públicos vs Cooperación Internacional)', () => {
  assert.equal(validarCuentaBancaria('Fondos Públicos'), true);
  assert.equal(validarCuentaBancaria('Cooperación Internacional'), true);
  assert.equal(validarCuentaBancaria('Cuenta Personal'), false);
});

test('3. Validación de comprobantes legales oficiales autorizados por Contraloría y SAT', () => {
  assert.equal(validarTipoComprobante('Recibo CGC 63-A2'), true);
  assert.equal(validarTipoComprobante('Factura SAT FEL'), true);
  assert.equal(validarTipoComprobante('Recibo SAT'), true);
  assert.equal(validarTipoComprobante('Vale Informal en Papel'), false);
});

test('4. RF11: Obligatoriedad de adjuntar evidencia fotográfica en egresos de Caja Chica', () => {
  assert.equal(validarGastoCajaChica(450, 'https://storage.mfn.gob.gt/facturas/fac-991.pdf'), true);
});

test('5. RF11: Rechazo de egreso de Caja Chica si no se adjunta fotografía de la factura', () => {
  assert.throws(() => {
    validarGastoCajaChica(300, '');
  }, /RF11: Es obligatorio adjuntar/);
});

test('6. Límite máximo de compra individual en Caja Chica (techo de Q5,000)', () => {
  assert.throws(() => {
    validarGastoCajaChica(5200, 'https://evidencia.jpg');
  }, /no puede exceder el límite reglamentario/);
});

test('7. Cálculo de solvencia municipal para cuotas ordinarias anuales (Q15,000/mes)', () => {
  const solvencia = calcularSolvenciaMunicipio(180000, 12);
  assert.equal(solvencia.solvente, true);
  assert.equal(solvencia.saldoPendiente, 0);
});

test('8. Detección de morosidad y saldo pendiente en cuotas municipales', () => {
  const solvencia = calcularSolvenciaMunicipio(120000, 12);
  assert.equal(solvencia.solvente, false);
  assert.equal(solvencia.saldoPendiente, 60000);
});

test('9. Consolidación de ingresos en cuenta de Fondos Públicos', () => {
  const txs = [
    { cuentaBancaria: 'Fondos Públicos', tipo: 'Ingreso', monto: 30000 },
    { cuentaBancaria: 'Fondos Públicos', tipo: 'Ingreso', monto: 15000 }
  ];
  const balance = consolidarBalancesBancarios(txs);
  assert.equal(balance.cuentas['Fondos Públicos'].ingresos, 45000);
});

test('10. Consolidación de egresos operativos en cuenta de Fondos Públicos', () => {
  const txs = [
    { cuentaBancaria: 'Fondos Públicos', tipo: 'Egreso', monto: 8500 },
    { cuentaBancaria: 'Fondos Públicos', tipo: 'Egreso', monto: 1500 }
  ];
  const balance = consolidarBalancesBancarios(txs);
  assert.equal(balance.cuentas['Fondos Públicos'].egresos, 10000);
});

test('11. Cálculo de saldo neto disponible en Fondos Públicos', () => {
  const txs = [
    { cuentaBancaria: 'Fondos Públicos', tipo: 'Ingreso', monto: 100000 },
    { cuentaBancaria: 'Fondos Públicos', tipo: 'Egreso', monto: 40000 }
  ];
  const balance = consolidarBalancesBancarios(txs);
  assert.equal(balance.cuentas['Fondos Públicos'].saldo, 60000);
});

test('12. Independencia total de saldo en cuenta de Cooperación Internacional', () => {
  const txs = [
    { cuentaBancaria: 'Fondos Públicos', tipo: 'Ingreso', monto: 50000 },
    { cuentaBancaria: 'Cooperación Internacional', tipo: 'Ingreso', monto: 250000 },
    { cuentaBancaria: 'Cooperación Internacional', tipo: 'Egreso', monto: 75000 }
  ];
  const balance = consolidarBalancesBancarios(txs);
  assert.equal(balance.cuentas['Cooperación Internacional'].saldo, 175000);
  assert.equal(balance.cuentas['Fondos Públicos'].saldo, 50000);
});

test('13. Cálculo de liquidez institucional consolidada en el sistema', () => {
  const txs = [
    { cuentaBancaria: 'Fondos Públicos', tipo: 'Ingreso', monto: 100000 },
    { cuentaBancaria: 'Fondos Públicos', tipo: 'Egreso', monto: 20000 },
    { cuentaBancaria: 'Cooperación Internacional', tipo: 'Ingreso', monto: 500000 },
    { cuentaBancaria: 'Cooperación Internacional', tipo: 'Egreso', monto: 100000 }
  ];
  const balance = consolidarBalancesBancarios(txs);
  assert.equal(balance.liquidezTotal, 480000);
});

test('14. Filtrado de movimientos financieros por municipio aportante', () => {
  const txs = [
    { codigo: 'FIN-1', municipio: 'Santa Eulalia', monto: 15000 },
    { codigo: 'FIN-2', municipio: 'San Pedro Soloma', monto: 15000 }
  ];
  const filtradas = filtrarTransacciones(txs, { municipio: 'Santa Eulalia' });
  assert.equal(filtradas.length, 1);
  assert.equal(filtradas[0].codigo, 'FIN-1');
});

test('15. Filtrado de transacciones por cuenta bancaria asignada', () => {
  const txs = [
    { codigo: 'FIN-1', cuentaBancaria: 'Fondos Públicos' },
    { codigo: 'FIN-2', cuentaBancaria: 'Cooperación Internacional' }
  ];
  const filtradas = filtrarTransacciones(txs, { cuenta: 'Cooperación Internacional' });
  assert.equal(filtradas.length, 1);
  assert.equal(filtradas[0].codigo, 'FIN-2');
});
