import prisma from '../lib/prisma.js';
import { MUNICIPIOS_MFN } from '../lib/municipios.js';
import { choice, numeric, text, date, url } from './validation.js';
import { ValidationError } from './errors.js';
import { canAccessMunicipio, municipalityWhere } from '../lib/municipality-scope.js';
import crypto from 'node:crypto';
import { documentReference } from './documents.js';

export function listTransactions({ tipo, cuentaBancaria, categoria, municipio }, user, page) {
  const where = municipalityWhere(user, { includeRegional: true });
  if (tipo) where.tipo = tipo;
  if (cuentaBancaria) where.cuentaBancaria = cuentaBancaria;
  if (categoria) where.categoria = categoria;
  if (municipio) {
    if (municipio !== 'Regional' && !canAccessMunicipio(user, municipio)) return Promise.resolve([]);
    where.municipio = municipio;
  }
  return prisma.transaccionFinanciera.findMany({ where, orderBy: [{ fecha: 'desc' }, { id: 'desc' }], ...(page ? { skip: page.skip, take: page.take } : {}) });
}

export async function getBalance(user) {
  const totals = await prisma.transaccionFinanciera.groupBy({ by: ['cuentaBancaria', 'tipo'],
    where: municipalityWhere(user, { includeRegional: true }), _sum: { monto: true } });
  const cuentas = {
    fondosPublicos: { ingresos: 0, egresos: 0, saldo: 0 },
    cooperacion: { ingresos: 0, egresos: 0, saldo: 0 },
  };
  totals.forEach(t => {
    const target = t.cuentaBancaria === 'Fondos Públicos' ? cuentas.fondosPublicos : cuentas.cooperacion;
    if (t.tipo === 'Ingreso') target.ingresos += t._sum.monto || 0;
    else target.egresos += t._sum.monto || 0;
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

export async function createTransaction(body, user) {
  const tipo = choice(body.tipo, ['Ingreso', 'Egreso'], 'Tipo de movimiento');
  const cuentaBancaria = choice(body.cuentaBancaria ?? 'Fondos Públicos', ['Fondos Públicos', 'Cooperación Internacional'], 'Cuenta');
  const categoria = text(body.categoria, 'Categoría');
  const municipio = choice(body.municipio ?? 'Regional', [...MUNICIPIOS_MFN, 'Regional'], 'Municipio');
  if (municipio !== 'Regional' && !canAccessMunicipio(user, municipio)) throw new ValidationError('Municipio fuera de su ámbito autorizado');
  if (municipio === 'Regional' && !user.permisos?.alcance?.regionalFinanzas) throw new ValidationError('El registro regional requiere una cuenta autorizada');
  if (categoria.startsWith('Cuota') && !MUNICIPIOS_MFN.includes(municipio)) throw new ValidationError('Seleccione el municipio activo que realiza el aporte');
  const monto = numeric(body.monto, 'Monto', { min: 0.01, money: true });
  const comprobanteTipo = text(body.comprobanteTipo, 'Tipo de comprobante');
  const comprobanteNumero = text(body.comprobanteNumero, 'Número de comprobante');
  const descripcion = text(body.descripcion, 'Descripción', { max: 4000 });
  let urlComprobante;
  if (categoria === 'Caja Chica') {
    if (typeof body.urlComprobante !== 'string' || !body.urlComprobante.startsWith('r2://')) throw new ValidationError('Adjunte una fotografía de la factura desde este formulario');
    urlComprobante = await documentReference(body.urlComprobante, 'factura', user.sub);
  } else {
    urlComprobante = url(body.urlComprobante, 'Comprobante');
  }
  const fecha = body.fecha === undefined ? new Date() : date(body.fecha, 'Fecha del movimiento');

  const prefijo = tipo === 'Ingreso' ? 'ING' : 'EGR';
  const codigo = `FIN-${new Date().getUTCFullYear()}-${prefijo}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  return prisma.transaccionFinanciera.create({
    data: {
      codigo, tipo, cuentaBancaria: cuentaBancaria || 'Fondos Públicos', categoria,
      municipio: municipio || 'Regional', monto: Number(monto), comprobanteTipo,
      comprobanteNumero, urlComprobante, descripcion,
      fecha,
    },
  });
}
