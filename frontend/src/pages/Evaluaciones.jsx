import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useEvaluaciones, useFactoresEvaluacion, useCrearEvaluacion, useColaboradores } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import Input, { Select } from '../components/ui/Input';
import { Icon } from '../components/ui/Glass';
import { RevealList, RevealItem } from '../components/ui/Reveal';

const NIVELES = [
  { label: 'Sobresaliente', puntos: 4, short: 'Sobr', color: 'bg-celeste/15 text-celeste-hov border-celeste/30' },
  { label: 'Bueno', puntos: 3, short: 'Bueno', color: 'bg-emerald/15 text-emerald border-emerald/30' },
  { label: 'Regular', puntos: 2, short: 'Reg', color: 'bg-amber/15 text-amber border-amber/30' },
  { label: 'Deficiente', puntos: 1, short: 'Def', color: 'bg-rose/15 text-rose border-rose/30' },
];

const RESULTADO_STYLES = {
  Sobresaliente: { badge: 'bg-celeste/15 text-celeste-hov border-celeste/30', bar: 'bg-celeste' },
  Bueno: { badge: 'bg-emerald/15 text-emerald border-emerald/30', bar: 'bg-emerald' },
  Regular: { badge: 'bg-amber/15 text-amber border-amber/30', bar: 'bg-amber' },
  Deficiente: { badge: 'bg-rose/15 text-rose border-rose/30', bar: 'bg-rose' },
  Pendiente: { badge: 'bg-bg/8 text-bg/50 border-bg/15', bar: 'bg-bg/20' },
};

const CAT_COLORS = {
  A: 'bg-celeste/12 text-celeste-hov',
  B: 'bg-emerald/12 text-emerald',
  C: 'bg-amber/15 text-amber',
  D: 'bg-bg/8 text-bg/60',
};

// Modal de detalle de la boleta de evaluación con los 15 factores
function ModalBoletaDetalle({ evaluacion, onClose }) {
  if (!evaluacion) return null;

  const factores = evaluacion.factores || [];
  const totalFactores = factores.length || 15;
  const puntosMap = { Sobresaliente: 4, Bueno: 3, Regular: 2, Deficiente: 1 };
  const sumaPuntos = factores.reduce((acc, f) => acc + (puntosMap[f.calificacion] || 0), 0);
  const promedio = totalFactores > 0 ? (sumaPuntos / totalFactores).toFixed(2) : '0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/40 backdrop-blur-sm animate-fade-in">
      <div className="glass-light rounded-[28px] max-w-2xl w-full max-h-[90vh] flex flex-col shadow-card-lg overflow-hidden animate-rise">
        {/* Cabecera del modal */}
        <div className="p-6 pb-4 border-b border-bg/10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-11 font-extrabold bg-bg/8 text-bg/60 uppercase tracking-wide">
                Boleta oficial · Cap. IV
              </span>
              <span className="text-12 text-bg/40 font-mono">ID #{evaluacion.id}</span>
            </div>
            <h2 className="text-20 font-black text-bg mt-1">{evaluacion.colaborador?.nombre}</h2>
            <p className="text-13 text-bg/60">
              {evaluacion.colaborador?.puesto?.nombre || 'Colaborador'} · Período: {evaluacion.periodo}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-bg/40 hover:text-bg hover:bg-bg/5 transition-colors"
          >
            <Icon name="close" className="w-5 h-5" />
          </button>
        </div>

        {/* Resumen del resultado */}
        <div className="px-6 py-4 bg-bg/[0.02] border-b border-bg/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 rounded-xl text-13 font-black border ${RESULTADO_STYLES[evaluacion.resultado || 'Pendiente']?.badge}`}>
              {evaluacion.resultado}
            </span>
            <div className="text-12 text-bg/60">
              Promedio ponderado: <strong className="text-bg">{promedio} / 4.00</strong>
            </div>
          </div>
          <div className="text-12 text-bg/50">
            Evaluador: <span className="font-semibold text-bg/80">{evaluacion.evaluador?.nombre || 'Jefatura'}</span>
          </div>
        </div>

        {/* Alerta si tiene plan de mejora */}
        {evaluacion.planMejora && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-rose/10 border border-rose/20 flex items-start gap-3">
            <Icon name="warning" className="w-5 h-5 text-rose shrink-0 mt-0.5" />
            <div>
              <p className="text-13 font-bold text-rose">Plan de Mejora Activo (2 Meses)</p>
              <p className="text-12 text-rose/80">
                Activado automáticamente por resultado Deficiente. Vence el{' '}
                {new Date(evaluacion.planMejora.fechaLimite).toLocaleDateString('es-GT', { dateStyle: 'long' })}.
              </p>
            </div>
          </div>
        )}

        {/* Lista de los 15 factores */}
        <div className="p-6 overflow-y-auto space-y-2.5 flex-1">
          <h3 className="text-12 font-extrabold uppercase tracking-wider text-bg/40 mb-3">
            Desglose de los 15 Factores Evaluados
          </h3>
          {factores.map((f, i) => {
            const calif = f.calificacion || 'Bueno';
            const nivel = NIVELES.find((n) => n.label === calif) || NIVELES[1];
            return (
              <div
                key={f.id || i}
                className="flex items-center justify-between p-3 rounded-xl bg-bg/[0.02] border border-bg/5 hover:bg-bg/[0.04] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-bg/5 font-mono text-11 font-bold text-bg/50 flex items-center justify-center">
                    {f.factor || i + 1}
                  </span>
                  <span className="text-13 font-medium text-bg/85">{f.nombreFactor}</span>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-11 font-bold border ${nivel.color}`}>
                  {calif} ({nivel.puntos} pts)
                </span>
              </div>
            );
          })}
        </div>

        {/* Pie del modal */}
        <div className="p-4 border-t border-bg/10 flex justify-end gap-2 bg-paper/50">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Icon name="receipt_long" className="w-4 h-4" /> Imprimir Boleta
          </Button>
          <Button variant="filled" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}

// Modal para registrar una nueva boleta
function NuevaEvaluacionModal({ onClose }) {
  const { data: colaboradores } = useColaboradores();
  const { data: factores } = useFactoresEvaluacion();
  const crear = useCrearEvaluacion();
  const [colaboradorId, setColaboradorId] = useState('');
  const [calificaciones, setCalificaciones] = useState({});

  // Calcular resultado en tiempo real mientras el usuario califica
  const factoresList = factores || [];
  const currentPuntos = factoresList.map((_, i) => {
    const val = calificaciones[i] || 'Bueno';
    return val === 'Sobresaliente' ? 4 : val === 'Bueno' ? 3 : val === 'Regular' ? 2 : 1;
  });
  const promedioActual = currentPuntos.length > 0 ? currentPuntos.reduce((a, b) => a + b, 0) / currentPuntos.length : 3;
  const resultadoProyectado =
    promedioActual >= 3.5 ? 'Sobresaliente' : promedioActual >= 2.5 ? 'Bueno' : promedioActual >= 1.5 ? 'Regular' : 'Deficiente';

  const submit = async (e) => {
    e.preventDefault();
    if (!colaboradorId || !factores) return;
    const califs = factores.map((_, i) => calificaciones[i] || 'Bueno');
    try {
      const res = await crear.mutateAsync({
        colaboradorId,
        periodo: `${new Date().getFullYear()} - Evaluación Anual`,
        calificaciones: califs,
      });
      toast.success(`Evaluación guardada — Resultado: ${res.data.resultado}`);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo registrar la evaluación');
    }
  };

  const setAll = (nivel) => {
    const next = {};
    factoresList.forEach((_, i) => {
      next[i] = nivel;
    });
    setCalificaciones(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/40 backdrop-blur-sm animate-fade-in">
      <div className="glass-light rounded-[28px] max-w-3xl w-full max-h-[92vh] flex flex-col shadow-card-lg overflow-hidden animate-rise">
        <div className="p-6 pb-4 border-b border-bg/10 flex items-center justify-between">
          <div>
            <h2 className="text-18 font-black text-bg">Nueva Boleta de Evaluación de Desempeño</h2>
            <p className="text-13 text-bg/50">15 factores ponderados con cálculo automático de resultado</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-bg/40 hover:text-bg hover:bg-bg/5 transition-colors">
            <Icon name="close" className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-5">
            <div className="grid sm:grid-cols-2 gap-4 items-end">
              <Select
                label="Colaborador a evaluar"
                value={colaboradorId}
                onChange={(e) => setColaboradorId(e.target.value)}
                options={(colaboradores || []).map((c) => ({
                  value: c.id,
                  label: `${c.nombre} (${c.puesto?.nombre || 'Puesto'} - Cat. ${c.puesto?.categoria || 'B'})`,
                }))}
                required
              />
              <div className="p-3.5 rounded-2xl bg-bg/[0.03] border border-bg/10 flex items-center justify-between">
                <div>
                  <span className="text-11 font-extrabold uppercase tracking-wider text-bg/40 block">Resultado actual</span>
                  <span className={`text-13 font-black ${resultadoProyectado === 'Deficiente' ? 'text-rose' : 'text-celeste-hov'}`}>
                    {resultadoProyectado} ({promedioActual.toFixed(2)} pts)
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setAll('Bueno')}
                    className="text-11 font-bold text-bg/50 hover:text-bg px-2 py-1 rounded bg-bg/5"
                  >
                    Todo Bueno
                  </button>
                  <button
                    type="button"
                    onClick={() => setAll('Sobresaliente')}
                    className="text-11 font-bold text-celeste hover:text-celeste-hov px-2 py-1 rounded bg-celeste/10"
                  >
                    Todo Sobr.
                  </button>
                </div>
              </div>
            </div>

            {resultadoProyectado === 'Deficiente' && (
              <div className="p-3.5 rounded-2xl bg-rose/10 border border-rose/20 text-12 text-rose font-medium flex items-center gap-2">
                <Icon name="warning" className="w-4 h-4 shrink-0" />
                Un resultado &quot;Deficiente&quot; activará automáticamente un Plan de Mejora obligatorio de 2 meses.
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-12 font-extrabold uppercase tracking-wider text-bg/40 mb-2">
                Calificación de los 15 Factores Institucionales
              </h3>
              {factoresList.map((f, i) => {
                const currentNivel = calificaciones[i] || 'Bueno';
                return (
                  <div
                    key={i}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-bg/[0.02] border border-bg/5 hover:bg-bg/[0.04] transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-md bg-bg/5 font-mono text-11 font-bold text-bg/40 flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <p className="text-13 font-medium text-bg/80">{f}</p>
                    </div>
                    <div className="flex gap-1 shrink-0 self-end sm:self-auto">
                      {NIVELES.map((n) => {
                        const isSelected = currentNivel === n.label;
                        return (
                          <button
                            type="button"
                            key={n.label}
                            onClick={() => setCalificaciones((c) => ({ ...c, [i]: n.label }))}
                            className={`px-2.5 py-1 rounded-lg text-11 font-bold transition-all ${
                              isSelected ? n.color + ' shadow-sm' : 'bg-bg/5 text-bg/40 hover:bg-bg/10 hover:text-bg'
                            }`}
                          >
                            {n.short}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-4 border-t border-bg/10 flex justify-end gap-3 bg-paper/50">
            <Button type="button" variant="text" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="filled" disabled={crear.isPending}>
              {crear.isPending ? 'Guardando…' : 'Guardar Evaluación'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Evaluaciones() {
  const { puedeEditar } = useAuth();
  const { data: evaluaciones, isLoading } = useEvaluaciones();
  const [showNew, setShowNew] = useState(false);
  const [detalleModal, setDetalleModal] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroResultado, setFiltroResultado] = useState('Todos');

  // Filtrado reactivo
  const evaluacionesFiltradas = useMemo(() => {
    if (!evaluaciones) return [];
    return evaluaciones.filter((ev) => {
      const matchBusqueda =
        !busqueda ||
        ev.colaborador?.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        ev.colaborador?.puesto?.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        ev.periodo?.toLowerCase().includes(busqueda.toLowerCase());

      if (!matchBusqueda) return false;
      if (filtroResultado === 'Todos') return true;
      if (filtroResultado === 'PlanMejora') return !!ev.planMejora;
      return ev.resultado === filtroResultado;
    });
  }, [evaluaciones, busqueda, filtroResultado]);

  // KPIs de resumen
  const stats = useMemo(() => {
    if (!evaluaciones || evaluaciones.length === 0) return { total: 0, sobresalientes: 0, deficientes: 0, planes: 0 };
    const total = evaluaciones.length;
    const sobresalientes = evaluaciones.filter((e) => e.resultado === 'Sobresaliente').length;
    const deficientes = evaluaciones.filter((e) => e.resultado === 'Deficiente').length;
    const planes = evaluaciones.filter((e) => !!e.planMejora).length;
    return { total, sobresalientes, deficientes, planes };
  }, [evaluaciones]);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Evaluación del Desempeño Laboral"
        subtitle="Módulo oficial SIRH-MFN (Capítulo IV). Evaluación ponderada de 15 factores y activación de Planes de Mejora continua."
        action={
          puedeEditar('evaluaciones') && (
            <Button variant="filled" onClick={() => setShowNew(true)}>
              <Icon name="add" className="w-4 h-4" /> Nueva Boleta
            </Button>
          )
        }
      />

      {/* Tarjetas KPI de resumen */}
      <RevealList className="grid grid-cols-2 sm:grid-cols-4 gap-3.5" stagger={0.05}>
        <RevealItem>
          <div className="glass-light rounded-card p-4">
            <span className="text-11 font-extrabold uppercase tracking-wider text-bg/40">Total Evaluaciones</span>
            <p className="text-24 font-black text-bg mt-1">{stats.total}</p>
          </div>
        </RevealItem>
        <RevealItem>
          <div className="glass-light rounded-card p-4">
            <span className="text-11 font-extrabold uppercase tracking-wider text-celeste-hov">Sobresalientes</span>
            <p className="text-24 font-black text-celeste mt-1">{stats.sobresalientes}</p>
          </div>
        </RevealItem>
        <RevealItem>
          <div className="glass-light rounded-card p-4">
            <span className="text-11 font-extrabold uppercase tracking-wider text-rose">Deficientes</span>
            <p className="text-24 font-black text-rose mt-1">{stats.deficientes}</p>
          </div>
        </RevealItem>
        <RevealItem>
          <div className="glass-light rounded-card p-4">
            <span className="text-11 font-extrabold uppercase tracking-wider text-amber">Planes de Mejora</span>
            <p className="text-24 font-black text-amber mt-1">{stats.planes}</p>
          </div>
        </RevealItem>
      </RevealList>

      {/* Barra de herramientas: Búsqueda y Filtros */}
      <div className="glass-light rounded-card p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Buscar por colaborador, puesto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {['Todos', 'Sobresaliente', 'Bueno', 'Regular', 'Deficiente', 'PlanMejora'].map((f) => (
            <button
              key={f}
              onClick={() => setFiltroResultado(f)}
              className={`px-3 py-1.5 rounded-xl text-12 font-bold transition-all ${
                filtroResultado === f
                  ? 'bg-bg text-white shadow-sm'
                  : 'bg-bg/5 text-bg/60 hover:bg-bg/10 hover:text-bg'
              }`}
            >
              {f === 'PlanMejora' ? 'Planes de Mejora' : f}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <div className="text-14 text-bg/40 text-center py-8">Cargando evaluaciones...</div>}

      {/* Tabla enriquecida */}
      {!isLoading && (
        <div className="glass-light rounded-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-14">
              <thead>
                <tr className="border-b border-bg/10 text-left text-11 font-extrabold uppercase tracking-widest text-bg/40 bg-bg/[0.02]">
                  <th className="px-5 py-3.5">Colaborador</th>
                  <th className="px-5 py-3.5">Puesto / Categoría</th>
                  <th className="px-5 py-3.5">Período</th>
                  <th className="px-5 py-3.5">Evaluador</th>
                  <th className="px-5 py-3.5">Resultado</th>
                  <th className="px-5 py-3.5">Plan de Mejora</th>
                  <th className="px-5 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bg/5">
                {evaluacionesFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-14 text-bg/40">
                      No se encontraron evaluaciones con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  evaluacionesFiltradas.map((ev) => (
                    <tr key={ev.id} className="hover:bg-bg/3 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-bg block">{ev.colaborador?.nombre}</span>
                        <span className="text-11 text-bg/40 font-mono">DPI: {ev.colaborador?.dpi || 'N/A'}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-13 text-bg/75 block">{ev.colaborador?.puesto?.nombre || '—'}</span>
                        {ev.colaborador?.puesto?.categoria && (
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-10 font-black mt-0.5 ${
                              CAT_COLORS[ev.colaborador.puesto.categoria]
                            }`}
                          >
                            Cat. {ev.colaborador.puesto.categoria}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-13 text-bg/60">{ev.periodo}</td>
                      <td className="px-5 py-3.5 text-13 text-bg/60">{ev.evaluador?.nombre || 'Jefatura'}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-lg text-12 font-bold border ${
                            RESULTADO_STYLES[ev.resultado || 'Pendiente']?.badge
                          }`}
                        >
                          {ev.resultado || 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {ev.planMejora ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-11 font-bold bg-rose/10 text-rose border border-rose/20">
                            <Icon name="warning" className="w-3.5 h-3.5" />
                            Vence {new Date(ev.planMejora.fechaLimite).toLocaleDateString('es-GT')}
                          </span>
                        ) : (
                          <span className="text-13 text-bg/30">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button variant="outline" size="sm" onClick={() => setDetalleModal(ev)}>
                          <Icon name="visibility" className="w-3.5 h-3.5" /> Ver Boleta
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modales */}
      {showNew && <NuevaEvaluacionModal onClose={() => setShowNew(false)} />}
      {detalleModal && <ModalBoletaDetalle evaluacion={detalleModal} onClose={() => setDetalleModal(null)} />}
    </div>
  );
}
