import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useFaltas, useCrearFalta, useColaboradores } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import Input, { Select, Textarea } from '../components/ui/Input';
import { Icon } from '../components/ui/Glass';
import { RevealList, RevealItem } from '../components/ui/Reveal';

const SANCION_STYLES = {
  Verbal: 'bg-amber/15 text-amber border-amber/30',
  Escrita: 'bg-orange-500/15 text-orange-600 border-orange-500/30',
  Suspension: 'bg-rose/15 text-rose border-rose/30',
};

export default function Disciplina() {
  const { puedeEditar } = useAuth();
  const { data: faltas, isLoading } = useFaltas();
  const { data: colaboradores } = useColaboradores();
  const crear = useCrearFalta();

  const [showNew, setShowNew] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('Todas');
  const [form, setForm] = useState({ colaboradorId: '', tipo: 'Leve', descripcion: '' });

  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await crear.mutateAsync(form);
      toast.success(`Falta registrada — Sanción asignada: ${res.data.sancion?.tipo || 'Verbal'}`);
      setShowNew(false);
      setForm({ colaboradorId: '', tipo: 'Leve', descripcion: '' });
    } catch {
      toast.error('No se pudo registrar la falta');
    }
  };

  const faltasFiltradas = useMemo(() => {
    if (!faltas) return [];
    return faltas.filter((f) => {
      const matchBusqueda =
        !busqueda ||
        f.colaborador?.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        f.descripcion?.toLowerCase().includes(busqueda.toLowerCase()) ||
        f.sancion?.tipo?.toLowerCase().includes(busqueda.toLowerCase());

      if (!matchBusqueda) return false;
      if (filtroTipo === 'Todas') return true;
      return f.tipo === filtroTipo;
    });
  }, [faltas, busqueda, filtroTipo]);

  const stats = useMemo(() => {
    if (!faltas) return { total: 0, verbales: 0, escritas: 0, suspensiones: 0 };
    return {
      total: faltas.length,
      verbales: faltas.filter((f) => f.sancion?.tipo === 'Verbal').length,
      escritas: faltas.filter((f) => f.sancion?.tipo === 'Escrita').length,
      suspensiones: faltas.filter((f) => f.sancion?.tipo === 'Suspension').length,
    };
  }, [faltas]);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Régimen Disciplinario y Sanciones"
        subtitle="Escala progresiva de faltas (Art. 50 RIT): 2ª falta verbal mensual → amonestación escrita; 2ª escrita → suspensión con derecho de audiencia."
        action={
          puedeEditar('disciplina') && (
            <Button variant="filled" onClick={() => setShowNew(true)}>
              <Icon name="add" className="w-4 h-4" /> Registrar Falta
            </Button>
          )
        }
      />

      {/* Tarjetas KPI */}
      <RevealList className="grid grid-cols-2 sm:grid-cols-4 gap-3.5" stagger={0.05}>
        <RevealItem>
          <div className="glass-light rounded-card p-4">
            <span className="text-11 font-extrabold uppercase tracking-wider text-bg/40">Total Faltas</span>
            <p className="text-24 font-black text-bg mt-1">{stats.total}</p>
          </div>
        </RevealItem>
        <RevealItem>
          <div className="glass-light rounded-card p-4">
            <span className="text-11 font-extrabold uppercase tracking-wider text-amber">Amonestaciones Verbales</span>
            <p className="text-24 font-black text-amber mt-1">{stats.verbales}</p>
          </div>
        </RevealItem>
        <RevealItem>
          <div className="glass-light rounded-card p-4">
            <span className="text-11 font-extrabold uppercase tracking-wider text-orange-600">Amonestaciones Escritas</span>
            <p className="text-24 font-black text-orange-600 mt-1">{stats.escritas}</p>
          </div>
        </RevealItem>
        <RevealItem>
          <div className="glass-light rounded-card p-4">
            <span className="text-11 font-extrabold uppercase tracking-wider text-rose">Suspensiones</span>
            <p className="text-24 font-black text-rose mt-1">{stats.suspensiones}</p>
          </div>
        </RevealItem>
      </RevealList>

      {/* Formulario nuevo */}
      {showNew && puedeEditar('disciplina') && (
        <form onSubmit={submit} className="glass-light rounded-card p-6 space-y-4 animate-rise">
          <h2 className="text-16 font-extrabold text-bg">Registrar Incidencia Disciplinaria</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Select
              label="Colaborador"
              value={form.colaboradorId}
              onChange={(e) => setForm({ ...form, colaboradorId: e.target.value })}
              options={(colaboradores || []).map((c) => ({ value: c.id, label: `${c.nombre} (${c.puesto?.nombre || 'MFN'})` }))}
              required
            />
            <Select
              label="Tipo de Falta"
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              options={[
                { value: 'Leve', label: 'Falta Leve (Retardos, descuidos menores)' },
                { value: 'Grave', label: 'Falta Grave (Insubordinación, faltas al código de ética)' },
              ]}
            />
          </div>
          <Textarea
            label="Descripción circunstanciada de los hechos"
            placeholder="Detalle fecha, hora y descripción de lo sucedido..."
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            required
          />
          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="filled" disabled={crear.isPending}>
              {crear.isPending ? 'Guardando…' : 'Registrar y Aplicar Sanción'}
            </Button>
            <Button type="button" variant="text" onClick={() => setShowNew(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {/* Barra de herramientas */}
      <div className="glass-light rounded-card p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Buscar por colaborador, sanción..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 w-full sm:w-auto">
          {['Todas', 'Leve', 'Grave'].map((tipo) => (
            <button
              key={tipo}
              onClick={() => setFiltroTipo(tipo)}
              className={`px-3 py-1.5 rounded-xl text-12 font-bold transition-all ${
                filtroTipo === tipo
                  ? 'bg-bg text-white shadow-sm'
                  : 'bg-bg/5 text-bg/60 hover:bg-bg/10 hover:text-bg'
              }`}
            >
              {tipo === 'Todas' ? 'Todas las Faltas' : `Faltas ${tipo}s`}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <div className="text-14 text-bg/40 text-center py-8">Cargando incidencias...</div>}

      {/* Tabla */}
      {!isLoading && (
        <div className="glass-light rounded-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-14">
              <thead>
                <tr className="border-b border-bg/10 text-left text-11 font-extrabold uppercase tracking-widest text-bg/40 bg-bg/[0.02]">
                  <th className="px-5 py-3.5">Colaborador</th>
                  <th className="px-5 py-3.5">Tipo de Falta</th>
                  <th className="px-5 py-3.5">Descripción</th>
                  <th className="px-5 py-3.5">Fecha</th>
                  <th className="px-5 py-3.5 text-right">Sanción Aplicada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bg/5">
                {faltasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-14 text-bg/40">
                      No se encontraron registros de faltas disciplinarias.
                    </td>
                  </tr>
                ) : (
                  faltasFiltradas.map((f) => (
                    <tr key={f.id} className="hover:bg-bg/3 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-bg">{f.colaborador?.nombre}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-md text-11 font-bold ${
                            f.tipo === 'Grave' ? 'bg-rose/10 text-rose' : 'bg-amber/10 text-amber'
                          }`}
                        >
                          {f.tipo}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-13 text-bg/70 max-w-sm">{f.descripcion}</td>
                      <td className="px-5 py-3.5 text-13 text-bg/55">{new Date(f.fecha).toLocaleDateString('es-GT')}</td>
                      <td className="px-5 py-3.5 text-right">
                        {f.sancion ? (
                          <span className={`inline-flex px-2.5 py-1 rounded-lg text-12 font-bold border ${SANCION_STYLES[f.sancion.tipo] || 'bg-bg/5'}`}>
                            {f.sancion.tipo === 'Suspension' ? 'Suspensión Laboral' : `Amonestación ${f.sancion.tipo}`}
                          </span>
                        ) : (
                          <span className="text-12 text-bg/30">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
