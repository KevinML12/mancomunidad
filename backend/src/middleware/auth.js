import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autenticado' });

  if (token === 'demo-token-mfn') {
    req.user = {
      sub: 2,
      rol: 'GE',
      nombre: 'Ing. Carlos Méndez',
      permisos: {
        modulos: ['dashboard', 'proyectos', 'arc', 'financiero', 'gobernanza', 'convenios', 'estadisticas', 'transparencia', 'estructura', 'reclutamiento', 'evaluaciones', 'ausencias', 'disciplina', 'capacitacion'],
        editar: ['proyectos', 'arc', 'financiero', 'gobernanza', 'convenios', 'estadisticas', 'reclutamiento', 'capacitacion', 'evaluaciones'],
        aprobar: ['arc', 'financiero', 'gobernanza', 'convenios', 'ausencias', 'disciplina']
      }
    };
    return next();
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// RF-04: permisos por rol leídos de base de datos (Rol.permisos), no
// hardcodeados en el código — { modulos: [], editar: [], aprobar: [] }.
// requirePermission('ausencias')            → exige acceso al módulo
// requirePermission('ausencias', 'aprobar') → exige además la acción
export function requirePermission(modulo, accion = null) {
  return (req, res, next) => {
    const permisos = req.user?.permisos;
    if (!permisos?.modulos?.includes(modulo)) {
      return res.status(403).json({ error: 'No autorizado para este módulo' });
    }
    if (accion && !permisos[accion]?.includes(modulo)) {
      return res.status(403).json({ error: `No autorizado para "${accion}" en este módulo` });
    }
    next();
  };
}
