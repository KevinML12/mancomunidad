const core = ['proyectos', 'arc', 'financiero', 'gobernanza', 'convenios', 'estadisticas', 'inteligencia', 'transparencia'];
const hr = ['estructura', 'reclutamiento', 'evaluaciones', 'ausencias', 'disciplina', 'capacitacion'];
const permisos = (modulos, editar = [], aprobar = []) => ({ modulos: ['dashboard', ...modulos], editar, aprobar });
export const ROLE_PERMISSIONS = {
 GE: permisos([...core, ...hr], [...core, ...hr], [...core, ...hr]),
 JD: permisos([...core, ...hr], ['estructura', 'evaluaciones'], ['disciplina', 'ausencias']),
 DIRADMIN: permisos(['financiero', 'gobernanza', 'convenios', 'arc', ...hr], ['financiero', 'evaluaciones'], ['ausencias']),
 DIRPROY: permisos(['proyectos', 'arc', 'estadisticas', 'convenios', 'evaluaciones', 'ausencias', 'disciplina', 'capacitacion'], ['proyectos', 'arc', 'estadisticas', 'disciplina', 'evaluaciones'], ['ausencias']),
 RRHH: permisos(hr, ['estructura', 'reclutamiento', 'capacitacion', 'evaluaciones'], ['ausencias']),
 AUD: permisos([...core, ...hr], [], ['inteligencia']),
 JI: permisos(['evaluaciones', 'ausencias', 'disciplina', 'capacitacion'], ['disciplina', 'evaluaciones'], ['ausencias']),
 EMP: permisos(['evaluaciones', 'ausencias', 'capacitacion']),
};
