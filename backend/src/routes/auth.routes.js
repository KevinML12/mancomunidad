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

// RF1: Solicitud de Recuperación de Credenciales Institucionales
router.post('/recuperar', async (req, res) => {
  const { correo } = req.body;
  if (!correo) return res.status(400).json({ error: 'El correo electrónico es requerido' });

  const usuario = await prisma.usuario.findUnique({
    where: { correo: correo.trim().toLowerCase() }
  });

  if (!usuario) {
    // Respuesta ambigua por seguridad contra enumeración de cuentas
    return res.json({
      mensaje: 'Si el correo institucional existe en el registro, se ha generado la instrucción de recuperación.',
      enviado: true
    });
  }

  // Token firmado válido por 15 minutos
  const tokenRecuperacion = jwt.sign(
    { sub: usuario.id, type: 'password_reset' },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  await logAction(usuario.id, 'solicitud_recuperar_clave', 'usuario', usuario.id);

  res.json({
    mensaje: 'Instrucción de recuperación generada exitosamente. Válido por 15 minutos.',
    enviado: true,
    correo: usuario.correo,
    tokenRecuperacion
  });
});

// RF1: Restablecimiento Seguro de Contraseña
router.post('/restablecer', async (req, res) => {
  const { token, nuevaContrasena } = req.body;
  if (!token || !nuevaContrasena) {
    return res.status(400).json({ error: 'Token y nueva contraseña son requeridos' });
  }

  if (nuevaContrasena.length < 6) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener un mínimo de 6 caracteres' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.type !== 'password_reset') {
      return res.status(400).json({ error: 'Token inválido para esta operación' });
    }

    const hash = await bcrypt.hash(nuevaContrasena, 10);
    await prisma.usuario.update({
      where: { id: payload.sub },
      data: { hashContrasena: hash }
    });

    await logAction(payload.sub, 'restablecer_clave_exito', 'usuario', payload.sub);

    res.json({
      ok: true,
      mensaje: 'Contraseña actualizada exitosamente. Ahora puede iniciar sesión con sus nuevas credenciales.'
    });
  } catch (err) {
    res.status(401).json({ error: 'El enlace o token de recuperación es inválido o ha expirado (15 min)' });
  }
});

export default router;
