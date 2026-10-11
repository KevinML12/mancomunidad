import prisma from '../lib/prisma.js';
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
  const { tipo, cuentaBancaria, categoria, municipio, monto, comprobanteTipo, comprobanteNumero, urlComprobante, descripcion, fecha } = body;
  if (categoria === 'Caja Chica' && !urlComprobante) throw new ValidationError('La administración de Caja Chica exige obligatoriamente adjuntar fotografía de la factura');
  if (!monto || Number(monto) <= 0) throw new ValidationError('El monto debe ser mayor a cero');

  const count = await prisma.transaccionFinanciera.count();
  const prefijo = tipo === 'Ingreso' ? 'ING' : 'EGR';
  const codigo = `FIN-2024-${prefijo}${(count + 1).toString().padStart(4, '0')}`;
  return prisma.transaccionFinanciera.create({
    data: {
      codigo, tipo, cuentaBancaria: cuentaBancaria || 'Fondos Públicos', categoria,
      municipio: municipio || 'Regional', monto: Number(monto), comprobanteTipo,
      comprobanteNumero, urlComprobante, descripcion,
      fecha: fecha ? new Date(fecha) : new Date(),
    },
  });
}
