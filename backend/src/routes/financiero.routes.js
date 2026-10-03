import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requirePermission('financiero'));

// GET /api/v1/financiero/transacciones - Listar movimientos
router.get('/transacciones', async (req, res, next) => {
  try {
    const { tipo, cuentaBancaria, categoria, municipio } = req.query;
    const where = {};
    if (tipo) where.tipo = tipo;
    if (cuentaBancaria) where.cuentaBancaria = cuentaBancaria;
    if (categoria) where.categoria = categoria;
    if (municipio) where.municipio = municipio;

    const transacciones = await prisma.transaccionFinanciera.findMany({
      where,
      orderBy: { fecha: 'desc' }
    });
    res.json(transacciones);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/financiero/balance - Balance con separación bancaria (RF12)
router.get('/balance', async (req, res, next) => {
  try {
    const transacciones = await prisma.transaccionFinanciera.findMany();

    const cuentas = {
      fondosPublicos: { ingresos: 0, egresos: 0, saldo: 0 },
      cooperacion: { ingresos: 0, egresos: 0, saldo: 0 }
    };

    transacciones.forEach(t => {
      const isPublic = t.cuentaBancaria === 'Fondos Públicos';
      const target = isPublic ? cuentas.fondosPublicos : cuentas.cooperacion;
      if (t.tipo === 'Ingreso') {
        target.ingresos += t.monto;
      } else {
        target.egresos += t.monto;
      }
    });

    cuentas.fondosPublicos.saldo = cuentas.fondosPublicos.ingresos - cuentas.fondosPublicos.egresos;
    cuentas.cooperacion.saldo = cuentas.cooperacion.ingresos - cuentas.cooperacion.egresos;

    const consolidado = {
      ingresosTotales: cuentas.fondosPublicos.ingresos + cuentas.cooperacion.ingresos,
      egresosTotales: cuentas.fondosPublicos.egresos + cuentas.cooperacion.egresos,
      saldoDisponibleTotal: cuentas.fondosPublicos.saldo + cuentas.cooperacion.saldo,
      cuentas
    };

    res.json(consolidado);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/financiero/transacciones - Registrar movimiento (RF10/11 - RBAC)
router.post('/transacciones', requirePermission('financiero', 'editar'), async (req, res, next) => {
  try {
    const { 
      tipo, 
      cuentaBancaria, 
      categoria, 
      municipio, 
      monto, 
      comprobanteTipo, 
      comprobanteNumero, 
      urlComprobante, 
      descripcion,
      fecha
    } = req.body;

    // Validación RF11: Caja Chica exige comprobante obligatorio
    if (categoria === 'Caja Chica' && !urlComprobante) {
      return res.status(400).json({ error: 'La administración de Caja Chica exige obligatoriamente adjuntar fotografía de la factura' });
    }

    if (!monto || Number(monto) <= 0) {
      return res.status(400).json({ error: 'El monto debe ser mayor a cero' });
    }

    const count = await prisma.transaccionFinanciera.count();
    const prefijo = tipo === 'Ingreso' ? 'ING' : 'EGR';
    const codigo = `FIN-2024-${prefijo}${(count + 1).toString().padStart(4, '0')}`;

    const nueva = await prisma.transaccionFinanciera.create({
      data: {
        codigo,
        tipo,
        cuentaBancaria: cuentaBancaria || 'Fondos Públicos',
        categoria,
        municipio: municipio || 'Regional',
        monto: Number(monto),
        comprobanteTipo,
        comprobanteNumero,
        urlComprobante,
        descripcion,
        fecha: fecha ? new Date(fecha) : new Date()
      }
    });

    res.status(201).json(nueva);
  } catch (err) {
    next(err);
  }
});


export default router;
