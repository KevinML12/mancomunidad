import prisma from '../lib/prisma.js';
import { MUNICIPIOS_MFN } from '../lib/municipios.js';
import { choice, numeric, text, date, url } from './validation.js';
import { ValidationError } from './errors.js';

export function listTransactions({ tipo, cuentaBancaria, categoria, municipio }) {
  const where = {};
  if (tipo) where.tipo = tipo;
  if (cuentaBancaria) where.cuentaBancaria = cuentaBancaria;
  if (categoria) where.categoria = categoria;
  if (municipio) where.municipio = municipio;
  return prisma.transaccionFinanciera.findMany({ where, orderBy: { fecha: 'desc' } });
}

export async function getBalance() {
  const transacciones = await prisma.transaccionFinanciera.findMany();
  const cuentas = {
    fondosPublicos: { ingresos: 0, egresos: 0, saldo: 0 },
    cooperacion: { ingresos: 0, egresos: 0, saldo: 0 },
  };
  transacciones.forEach(t => {
    const target = t.cuentaBancaria === 'Fondos Públicos' ? cuentas.fondosPublicos : cuentas.cooperacion;
    if (t.tipo === 'Ingreso') target.ingresos += t.monto;
    else target.egresos += t.monto;
  });
  cuentas.fondosPublicos.saldo = cuentas.fondosPublicos.ingresos - cuentas.fondosPublicos.egresos;
  cuentas.cooperacion.saldo = cuentas.cooperacion.ingresos - cuentas.cooperacion.egresos;
  return {
    ingresosTotales: cuentas.fondosPublicos.ingresos + cuentas.cooperacion.ingresos,
    egresosTotales: cuentas.fondosPublicos.egresos + cuentas.cooperacion.egresos,
    saldoDisponibleTotal: cuentas.fondosPublicos.saldo + cuentas.cooperacion.saldo,
    cuentas,
  };
}

export async function createTransaction(body) {
  const tipo = choice(body.tipo, ['Ingreso', 'Egreso'], 'Tipo de movimiento');
  const cuentaBancaria = choice(body.cuentaBancaria ?? 'Fondos Públicos', ['Fondos Públicos', 'Cooperación Internacional'], 'Cuenta');
  const categoria = text(body.categoria, 'Categoría');
  const municipio = choice(body.municipio ?? 'Regional', [...MUNICIPIOS_MFN, 'Regional'], 'Municipio');
  if (categoria.startsWith('Cuota') && !MUNICIPIOS_MFN.includes(municipio)) throw new ValidationError('Seleccione el municipio activo que realiza el aporte');
  const monto = numeric(body.monto, 'Monto', { min: 0.01, money: true });
  const comprobanteTipo = text(body.comprobanteTipo, 'Tipo de comprobante');
  const comprobanteNumero = text(body.comprobanteNumero, 'Número de comprobante');
  const descripcion = text(body.descripcion, 'Descripción', { max: 4000 });
  const urlComprobante = url(body.urlComprobante, 'Comprobante');
  const fecha = body.fecha === undefined ? new Date() : date(body.fecha, 'Fecha del movimiento');
  if (categoria === 'Caja Chica' && !urlComprobante) throw new ValidationError('Adjunte el enlace al comprobante de caja chica');

  const count = await prisma.transaccionFinanciera.count();
  const prefijo = tipo === 'Ingreso' ? 'ING' : 'EGR';
  const codigo = `FIN-2024-${prefijo}${(count + 1).toString().padStart(4, '0')}`;
  return prisma.transaccionFinanciera.create({
    data: {
      codigo, tipo, cuentaBancaria: cuentaBancaria || 'Fondos Públicos', categoria,
      municipio: municipio || 'Regional', monto: Number(monto), comprobanteTipo,
      comprobanteNumero, urlComprobante, descripcion,
      fecha,
    },
  });
}
