export const AREAS = [
  { key:'proyectos', path:'/proyectos', title:'Proyectos', description:'Expedientes, presupuestos y evidencias de campo.' },
  { key:'arc', path:'/arc', title:'Plan de mejoras ARC', description:'Compromisos, responsables y vencimientos.' },
  { key:'financiero', path:'/financiero', title:'Finanzas y cuotas', description:'Movimientos, fondos y aportes municipales.' },
  { key:'gobernanza', path:'/gobernanza', title:'Gobernanza y actas', description:'Actas, acuerdos y referencias documentales.' },
  { key:'convenios', path:'/convenios', title:'Convenios', description:'Alianzas, vigencias y prórrogas registradas.' },
  { key:'estadisticas', path:'/estadisticas', title:'Indicadores ASH', description:'Censos de viviendas, agua y saneamiento.' },
  { key:'inteligencia', path:'/inteligencia', title:'Control de integridad', description:'Verificación interna de registros y puntos de control.' },
  { key:'estructura', path:'/personal', title:'Talento humano', description:'Gestión del personal institucional.' },
  { key:'transparencia', path:'/transparencia', title:'Transparencia', description:'Consulta ciudadana de información publicada.' }
];
const PRIORITIES = {
  GE:['proyectos','arc','financiero','gobernanza'],
  JD:['gobernanza','financiero','proyectos'],
  DIRADMIN:['financiero','convenios','gobernanza'],
  DIRPROY:['proyectos','arc','estadisticas'],
  AUD:['inteligencia','financiero','gobernanza','proyectos'],
  RRHH:['estructura'], JI:['estructura'], EMP:['estructura']
};
export function navigationFor(role, permissions) {
  const allowed = AREAS.filter(area => permissions?.modulos?.includes(area.key));
  const priorities = PRIORITIES[role] || allowed.slice(0,4).map(area => area.key);
  const primary = priorities.map(key => allowed.find(area => area.key === key)).filter(Boolean);
  return { primary, secondary:allowed.filter(area => !primary.some(item => item.key === area.key)) };
}
