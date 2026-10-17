const core = ['proyectos', 'arc', 'financiero', 'gobernanza', 'convenios', 'estadisticas', 'inteligencia', 'transparencia'];
const coreEditable = core.filter(key => key !== 'transparencia');
const hr = ['estructura', 'reclutamiento', 'evaluaciones', 'ausencias', 'disciplina', 'capacitacion'];
export const MODULE_KEYS = Object.freeze(['dashboard', ...core, ...hr]);
export const MODULE_LABELS = Object.freeze({
 dashboard: 'Inicio', proyectos: 'Proyectos', arc: 'Plan ARC', financiero: 'Finanzas',
 gobernanza: 'Gobernanza', convenios: 'Convenios', estadisticas: 'Indicadores ASH',
 inteligencia: 'Control de integridad', transparencia: 'Transparencia',
 estructura: 'Talento humano', reclutamiento: 'Reclutamiento',
 evaluaciones: 'Evaluaciones', ausencias: 'Ausencias', disciplina: 'Disciplina',
 capacitacion: 'Capacitación',
});
const alcance = (territorio, personal, tablero, regionalFinanzas = false, regionalARC = false) =>
 ({ territorio, personal, tablero, regionalFinanzas, regionalARC });
const permisos = (modulos, editar = [], aprobar = [], prioritarios = [], scope) => ({ modulos: ['dashboard', ...modulos], editar, aprobar, prioritarios, alcance: scope });
export const ROLE_PERMISSIONS = {
 GE: permisos([...core, ...hr], [...coreEditable, ...hr], [...coreEditable, ...hr], ['proyectos', 'arc', 'financiero', 'gobernanza'], alcance('global', 'global', 'institucional', true, true)),
 JD: permisos([...core, ...hr], ['estructura', 'evaluaciones'], ['disciplina', 'ausencias'], ['gobernanza', 'financiero', 'proyectos'], alcance('global', 'global', 'institucional', true, true)),
 DIRADMIN: permisos(['financiero', 'gobernanza', 'convenios', 'arc', ...hr], ['financiero', 'evaluaciones'], ['ausencias'], ['financiero', 'convenios', 'gobernanza'], alcance('asignado', 'equipo', 'institucional', true)),
 DIRPROY: permisos(['proyectos', 'arc', 'estadisticas', 'convenios', 'evaluaciones', 'ausencias', 'disciplina', 'capacitacion'], ['proyectos', 'arc', 'estadisticas', 'disciplina', 'evaluaciones'], ['ausencias'], ['proyectos', 'arc', 'estadisticas'], alcance('asignado', 'equipo', 'equipo')),
 RRHH: permisos(hr, ['estructura', 'reclutamiento', 'capacitacion', 'evaluaciones'], ['ausencias'], ['estructura', 'ausencias', 'evaluaciones', 'reclutamiento'], alcance('asignado', 'global', 'operativo')),
 AUD: permisos([...core, ...hr], [], ['inteligencia'], ['inteligencia', 'financiero', 'gobernanza', 'proyectos'], alcance('global', 'global', 'institucional')),
 JI: permisos(['evaluaciones', 'ausencias', 'disciplina', 'capacitacion'], ['disciplina', 'evaluaciones'], ['ausencias'], ['ausencias', 'evaluaciones', 'disciplina'], alcance('asignado', 'equipo', 'equipo')),
 EMP: permisos(['evaluaciones', 'ausencias', 'capacitacion'], [], [], ['ausencias', 'evaluaciones', 'capacitacion'], alcance('asignado', 'propio', 'personal')),
};

export function validRolePermissions(value) {
 if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
 const names = ['modulos', 'editar', 'aprobar', 'prioritarios', 'alcance'];
 if (Object.keys(value).some(name => !names.includes(name))) return false;
 const allowed = new Set(MODULE_KEYS);
 for (const name of names.filter(name => name !== 'alcance')) {
  const list = value[name];
  if (!Array.isArray(list) || list.some(item => typeof item !== 'string' || !allowed.has(item)) || new Set(list).size !== list.length) return false;
 }
 const visible = new Set(value.modulos);
 const scope = value.alcance;
 if (!scope || typeof scope !== 'object' || Array.isArray(scope) ||
     Object.keys(scope).sort().join(',') !== 'personal,regionalARC,regionalFinanzas,tablero,territorio' ||
     !['global', 'asignado'].includes(scope.territorio) ||
     !['global', 'equipo', 'propio'].includes(scope.personal) ||
     !['institucional', 'operativo', 'equipo', 'personal'].includes(scope.tablero) ||
     typeof scope.regionalFinanzas !== 'boolean' || typeof scope.regionalARC !== 'boolean') return false;
 return visible.has('dashboard') && value.prioritarios.length <= 4 &&
  value.prioritarios.every(item => item !== 'dashboard' && visible.has(item)) &&
  value.editar.every(item => item !== 'dashboard' && item !== 'transparencia' && visible.has(item)) &&
  value.aprobar.every(item => item !== 'dashboard' && item !== 'transparencia' && visible.has(item));
}
