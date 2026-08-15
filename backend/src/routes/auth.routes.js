import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { logAction } from '../lib/audit.js';

const router = Router();

const displayName = (usuario) => usuario.colaborador?.nombre || usuario.rol.nombre;

function serialize(usuario) {
  return {
    id: usuario.id,
    correo: usuario.correo,
    rol: usuario.rol.codigo,
    rolNombre: usuario.rol.nombre,
    permisos: usuario.rol.permisos,
    nombre: displayName(usuario),
    puesto: usuario.colaborador?.puesto?.nombre || null,
    colaboradorId: usuario.colaboradorId,
  };
}

router.post('/login', async (req, res) => {
  const { correo, contrasena } = req.body;
  if (!correo || !contrasena) return res.status(400).json({ error: 'Correo y contraseña son requeridos' });

  const usuario = await prisma.usuario.findUnique({
    where: { correo },
    include: { colaborador: { include: { puesto: true } }, rol: true },
  });
  if (!usuario) return res.status(401).json({ error: 'Credenciales inválidas' });

  const ok = await bcrypt.compare(contrasena, usuario.hashContrasena);
  if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

  const token = jwt.sign(
    { sub: usuario.id, rol: usuario.rol.codigo, permisos: usuario.rol.permisos, nombre: displayName(usuario), colaboradorId: usuario.colaboradorId },
    process.env.JWT_SECRET,
    { expiresIn: '12h' },
  );

  await logAction(usuario.id, 'login', 'usuario', usuario.id);

  res.json({ token, user: serialize(usuario) });
});

router.get('/me', requireAuth, async (req, res) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.user.sub },
    include: { colaborador: { include: { puesto: true } }, rol: true },
  });
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(serialize(usuario));
});

router.get('/roles', requireAuth, async (req, res) => {
  const roles = await prisma.rol.findMany({ select: { id: true, codigo: true, nombre: true, descripcion: true } });
  res.json(roles);
});

export default router;
