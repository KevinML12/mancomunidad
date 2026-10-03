import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autenticado: se requiere token Bearer' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// Control de Acceso Basado en Roles (RBAC - RF2)
// Valida contra los permisos almacenados en la base de datos (Rol.permisos).
// Super Administrador (GE) posee facultad institucional delegada.
export function requirePermission(modulo, accion = null) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    // Gerencia Ejecutiva (Super Administrador) posee facultad de supervisión global
    if (req.user.rol === 'GE') return next();

    const permisos = req.user.permisos;
    if (!permisos?.modulos?.includes(modulo)) {
      return res.status(403).json({ error: `Acceso restringido: no cuenta con autorización para el módulo ${modulo}` });
    }
    if (accion && !permisos[accion]?.includes(modulo)) {
      return res.status(403).json({ error: `Acceso restringido: carece de privilegios para "${accion}" en ${modulo}` });
    }
    next();
  };
}

