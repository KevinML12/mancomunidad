import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../lib/api';
import StatCard from '../components/ui/StatCard';
import { Icon } from '../components/ui/Glass';
import { useAuth } from '../context/AuthContext';
import Reveal, { RevealList, RevealItem } from '../components/ui/Reveal';

function AlertRow({ tipo, texto }) {
  const isUrgente = tipo === 'urgente';
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-2xl ${isUrgente ? 'bg-rose/8 border border-rose/15' : 'bg-amber/10 border border-amber/15'}`}>
      <Icon name={isUrgente ? 'warning' : 'info'} className={`w-[18px] h-[18px] shrink-0 mt-0.5 ${isUrgente ? 'text-rose' : 'text-amber'}`} stroke={2} />
      <p className="text-14 font-medium text-bg/80 leading-snug">{texto}</p>
    </div>
  );
}

// Cap. V 5.4 — un tablero adaptado por rol
const TARJETAS_POR_VISTA = {
  institucional: (k) => [
    { icon: 'task_alt', label: 'Herramientas al día', value: `${k.herramientasAlDia} / ${k.totalHerramientas}`, tint: 'ok' },
    { icon: 'hourglass_empty', label: 'Evaluaciones pendientes', value: k.evaluacionesPendientes, tint: 'sec' },
    { icon: 'receipt_long', label: 'Contratos por registrar', value: k.contratosSinRegistrar, tint: 'err' },
    { icon: 'groups', label: 'Colaboradores activos', value: k.totalColaboradores, tint: 'pri' },
  ],
  operativo: (k) => [
    { icon: 'hourglass_empty', label: 'Evaluaciones por vencer', value: k.evaluacionesPendientes, tint: 'sec' },
    { icon: 'receipt_long', label: 'Contratos por registrar', value: k.contratosSinRegistrar, tint: 'err' },
    { icon: 'school', label: 'Capacitaciones sin programar', value: k.capacitacionesSinProgramar, tint: 'ter' },
    { icon: 'groups', label: 'Colaboradores activos', value: k.totalColaboradores, tint: 'pri' },
  ],
  equipo: (k) => [
    { icon: 'groups', label: 'Tamaño de tu equipo', value: k.tamanoEquipo, tint: 'pri' },
    { icon: 'calendar_month', label: 'Ausencias por aprobar', value: k.ausenciasPendientes, tint: 'sec' },
    { icon: 'hourglass_empty', label: 'Evaluaciones pendientes', value: k.evaluacionesPendientes, tint: 'ter' },
  ],
  personal: (k) => [
    { icon: 'calendar_month', label: 'Días vacaciones disponibles', value: k.diasDisponibles, tint: 'ok' },
    { icon: 'history', label: 'Días usados este año', value: k.diasUsados, tint: 'pri' },
    { icon: 'task_alt', label: 'Última evaluación', value: k.ultimoResultado || 'Sin evaluar', sub: k.ultimoPeriodo, tint: k.ultimoResultado === 'Deficiente' ? 'err' : 'ter' },
  ],
};

const COLS_GRID = { 3: 'md:grid-cols-3', 4: 'md:grid-cols-4' };

const MODULOS_RAPIDOS = [
  { ruta: '/evaluaciones', titulo: 'Evaluaciones', desc: '15 factores y planes de mejora', icono: 'rate_review', color: 'text-celeste-hov', bg: 'bg-celeste/10' },
  { ruta: '/ausencias', titulo: 'Solicitudes', desc: 'Vacaciones, permisos y licencias', icono: 'event_available', color: 'text-purple-600', bg: 'bg-purple-500/10' },
  { ruta: '/reclutamiento', titulo: 'Reclutamiento', desc: 'Convocatorias y matriz de mérito', icono: 'person_search', color: 'text-emerald', bg: 'bg-emerald/10' },
  { ruta: '/estructura', titulo: 'Estructura Puestos', desc: 'Catálogo institucional Cat. A-D', icono: 'account_tree', color: 'text-amber', bg: 'bg-amber/10' },
];

export default function Tablero() {
  const { user, roleLabel } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useDashboard();
  const tarjetas = data ? (TARJETAS_POR_VISTA[data.vista] || TARJETAS_POR_VISTA.institucional)(data.kpis) : [];

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <Reveal className="mb-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-11 font-extrabold text-celeste-hov bg-celeste/10 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
            {roleLabel}
          </span>
          <span className="text-12 text-bg/40 font-mono">SIRH-MFN</span>
        </div>
        <h1 className="text-28 font-black tracking-tightish text-bg">
          Hola, {user?.nombre?.split(' ')[0]}
        </h1>
        <p className="text-14 text-bg/50 mt-1">
          Sistema de Información para la Gestión de Recursos Humanos · Mancomunidad Frontera del Norte
        </p>
      </Reveal>

      {isError && (
        <div className="glass-light rounded-card p-6 text-14 text-rose font-semibold border border-rose/20">
          No se pudo conectar con el backend. Verifique que el servidor esté activo en el puerto 8080.
        </div>
      )}

      {isLoading && <div className="text-14 text-bg/40 text-center py-8">Cargando tablero de control…</div>}

      {data && (
        <>
          {/* Tarjetas KPI */}
          <RevealList className={`grid grid-cols-2 ${COLS_GRID[tarjetas.length] || 'md:grid-cols-4'} gap-4`} stagger={0.06}>
            {tarjetas.map((t) => (
              <RevealItem key={t.label}><StatCard {...t} /></RevealItem>
            ))}
          </RevealList>

          {/* Accesos rápidos a los módulos requeridos */}
          <Reveal delay={0.1}>
            <h2 className="text-14 font-extrabold uppercase tracking-wider text-bg/40 mb-3">
              Módulos del Sistema
            </h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3.5">
              {MODULOS_RAPIDOS.map((m) => (
                <div
                  key={m.ruta}
                  onClick={() => navigate(m.ruta)}
                  className="glass-light rounded-card p-4.5 cursor-pointer hover:shadow-card hover:-translate-y-0.5 transition-all group"
                >
                  <div className={`w-10 h-10 rounded-xl ${m.bg} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                    <Icon name={m.icono} className={`w-5 h-5 ${m.color}`} />
                  </div>
                  <h3 className="text-15 font-bold text-bg group-hover:text-celeste-hov transition-colors">
                    {m.titulo}
                  </h3>
                  <p className="text-12 text-bg/50 mt-0.5">{m.desc}</p>
                </div>
              ))}
            </div>
          </Reveal>

          {/* Alertas de plazos vigentes */}
          <Reveal delay={0.15} className="glass-light rounded-card p-6">
            <h2 className="text-16 font-extrabold text-bg mb-4 flex items-center gap-2">
              <Icon name="notifications_active" className="w-5 h-5 text-bg/50" />
              Alertas y Plazos Institucionales Vigentes
            </h2>
            {data.alertas.length === 0 ? (
              <p className="text-14 text-bg/40">No hay alertas pendientes en este momento.</p>
            ) : (
              <RevealList className="space-y-2.5" stagger={0.05}>
                {data.alertas.map((a, i) => <RevealItem key={i}><AlertRow {...a} /></RevealItem>)}
              </RevealList>
            )}
          </Reveal>
        </>
      )}
    </div>
  );
}
