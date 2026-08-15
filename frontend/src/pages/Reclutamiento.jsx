import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  useConvocatorias,
  useCrearConvocatoria,
  useActualizarEstadoConvocatoria,
  useCrearCandidato,
  useActualizarCandidato,
  usePuestos,
} from '../lib/api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import Input, { Select } from '../components/ui/Input';
import { Icon } from '../components/ui/Glass';
import { RevealList, RevealItem } from '../components/ui/Reveal';

// Modal para registrar o editar candidato con ponderación
function ModalCandidato({ convocatoria, candidato, onClose }) {
  const crear = useCrearCandidato();
  const actualizar = useActualizarCandidato();
  const [nombre, setNombre] = useState(candidato?.nombre || '');
  const [expedienteCompleto, setExpedienteCompleto] = useState(candidato?.expedienteCompleto ?? true);
  const [competencias, setCompetencias] = useState(candidato?.puntajeCompetencias ?? 80);
  const [experiencia, setExperiencia] = useState(candidato?.puntajeExperiencia ?? 85);
  const [entrevista, setEntrevista] = useState(candidato?.puntajeEntrevista ?? 75);
  const [referencias, setReferencias] = useState(candidato?.puntajeReferencias ?? 90);

  const puntajeTotal = useMemo(() => {
    const c = Number(competencias) || 0;
    const e = Number(experiencia) || 0;
    const ent = Number(entrevista) || 0;
    const r = Number(referencias) || 0;
    return Number((c * 0.6 + e * 0.15 + ent * 0.15 + r * 0.1).toFixed(2));
  }, [competencias, experiencia, entrevista, referencias]);

  const submit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    try {
      if (candidato) {
        await actualizar.mutateAsync({
          convocatoriaId: convocatoria.id,
          candidatoId: candidato.id,
          nombre,
          expedienteCompleto,
          puntajeCompetencias: Number(competencias),
          puntajeExperiencia: Number(experiencia),
          puntajeEntrevista: Number(entrevista),
          puntajeReferencias: Number(referencias),
        });
        toast.success('Puntuaciones de candidato actualizadas');
      } else {
        await crear.mutateAsync({
          convocatoriaId: convocatoria.id,
          nombre,
          expedienteCompleto,
          puntajeCompetencias: Number(competencias),
          puntajeExperiencia: Number(experiencia),
          puntajeEntrevista: Number(entrevista),
          puntajeReferencias: Number(referencias),
        });
        toast.success('Candidato registrado en la convocatoria');
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo guardar el candidato');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/40 backdrop-blur-sm animate-fade-in">
      <div className="glass-light rounded-[28px] max-w-lg w-full shadow-card-lg overflow-hidden animate-rise">
        <div className="p-6 pb-4 border-b border-bg/10 flex items-center justify-between">
          <div>
            <h2 className="text-18 font-black text-bg">
              {candidato ? 'Editar Evaluación de Candidato' : 'Registrar y Evaluar Candidato'}
            </h2>
            <p className="text-13 text-bg/50">Puesto: {convocatoria.puesto?.nombre}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-bg/40 hover:text-bg hover:bg-bg/5 transition-colors">
            <Icon name="close" className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <Input
            label="Nombre completo del candidato"
            placeholder="Ej. Lic. Carlos Morales"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />

          <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-bg/[0.02] border border-bg/10 cursor-pointer">
            <input
              type="checkbox"
              checked={expedienteCompleto}
              onChange={(e) => setExpedienteCompleto(e.target.checked)}
              className="w-4 h-4 rounded text-celeste focus:ring-celeste"
            />
            <div>
              <span className="text-13 font-bold text-bg block">Expediente completo verificado</span>
              <span className="text-11 text-bg/40">DPI, RTU, títulos, antecedentes penales y policíacos</span>
            </div>
          </label>

          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-12 font-extrabold uppercase tracking-wider text-bg/40">
                Matriz de Ponderación Oficial (Manual Cap. III)
              </span>
              <span className="text-13 font-black text-celeste-hov">Puntaje Total: {puntajeTotal} / 100</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-bg/[0.02] border border-bg/5">
                <label className="text-11 font-bold text-bg/70 block mb-1">Competencias (60%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={competencias}
                  onChange={(e) => setCompetencias(e.target.value)}
                  className="w-full bg-white/70 border border-bg/10 rounded-lg px-2.5 py-1.5 text-14 font-bold text-bg"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-bg/[0.02] border border-bg/5">
                <label className="text-11 font-bold text-bg/70 block mb-1">Experiencia (15%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={experiencia}
                  onChange={(e) => setExperiencia(e.target.value)}
                  className="w-full bg-white/70 border border-bg/10 rounded-lg px-2.5 py-1.5 text-14 font-bold text-bg"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-bg/[0.02] border border-bg/5">
                <label className="text-11 font-bold text-bg/70 block mb-1">Entrevistas (15%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={entrevista}
                  onChange={(e) => setEntrevista(e.target.value)}
                  className="w-full bg-white/70 border border-bg/10 rounded-lg px-2.5 py-1.5 text-14 font-bold text-bg"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-bg/[0.02] border border-bg/5">
                <label className="text-11 font-bold text-bg/70 block mb-1">Referencias (10%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={referencias}
                  onChange={(e) => setReferencias(e.target.value)}
                  className="w-full bg-white/70 border border-bg/10 rounded-lg px-2.5 py-1.5 text-14 font-bold text-bg"
                  required
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-bg/10 flex justify-end gap-2">
            <Button type="button" variant="text" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="filled" disabled={crear.isPending || actualizar.isPending}>
              {crear.isPending || actualizar.isPending ? 'Guardando…' : 'Guardar Evaluación'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal de la Matriz de Candidatos por Convocatoria
function ModalMatrizCandidatos({ convocatoria, onClose, puedeEditar }) {
  const [candidatoModal, setCandidatoModal] = useState(null);
  const candidatos = useMemo(() => {
    const list = [...(convocatoria?.candidatos || [])];
    return list.sort((a, b) => (b.puntajeTotal || 0) - (a.puntajeTotal || 0));
  }, [convocatoria]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/40 backdrop-blur-sm animate-fade-in">
      <div className="glass-light rounded-[28px] max-w-4xl w-full max-h-[90vh] flex flex-col shadow-card-lg overflow-hidden animate-rise">
        {/* Cabecera */}
        <div className="p-6 pb-4 border-b border-bg/10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-md text-11 font-extrabold ${convocatoria.estado === 'Abierta' ? 'bg-emerald/15 text-emerald' : 'bg-bg/10 text-bg/60'}`}>
                {convocatoria.estado}
              </span>
              <span className="text-12 text-bg/40 font-mono">Tipo: {convocatoria.tipo}</span>
            </div>
            <h2 className="text-20 font-black text-bg mt-1">{convocatoria.puesto?.nombre}</h2>
            <p className="text-13 text-bg/60">
              Matriz oficial de evaluación y orden de mérito · Cierra {new Date(convocatoria.fechaCierre).toLocaleDateString('es-GT', { dateStyle: 'long' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {puedeEditar && (
              <Button variant="filled" size="sm" onClick={() => setCandidatoModal({ isNew: true })}>
                <Icon name="add" className="w-4 h-4" /> Agregar Candidato
              </Button>
            )}
            <button onClick={onClose} className="p-2 rounded-xl text-bg/40 hover:text-bg hover:bg-bg/5 transition-colors">
              <Icon name="close" className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Requisitos de la plaza */}
        {convocatoria.requisitos && (
          <div className="px-6 py-3 bg-celeste/5 border-b border-bg/5 text-12 text-celeste-hov">
            <strong>Requisitos del Puesto:</strong> {convocatoria.requisitos}
          </div>
        )}

        {/* Tabla de la Matriz */}
        <div className="p-6 overflow-y-auto flex-1">
          {candidatos.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="person_search" className="w-10 h-10 text-bg/20 mx-auto mb-2" />
              <p className="text-14 font-semibold text-bg/50">No hay candidatos registrados en esta convocatoria.</p>
              {puedeEditar && (
                <div className="mt-3">
                  <Button variant="outline" size="sm" onClick={() => setCandidatoModal({ isNew: true })}>
                    Registrar Primer Candidato
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-14">
                <thead>
                  <tr className="border-b border-bg/10 text-left text-11 font-extrabold uppercase tracking-widest text-bg/40">
                    <th className="px-3 py-3">Lugar</th>
                    <th className="px-3 py-3">Candidato</th>
                    <th className="px-3 py-3 text-center">Expediente</th>
                    <th className="px-3 py-3 text-center">Competencias (60%)</th>
                    <th className="px-3 py-3 text-center">Experiencia (15%)</th>
                    <th className="px-3 py-3 text-center">Entrevistas (15%)</th>
                    <th className="px-3 py-3 text-center">Referencias (10%)</th>
                    <th className="px-3 py-3 text-right">Puntaje Total</th>
                    {puedeEditar && <th className="px-3 py-3 text-right">Acción</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-bg/5">
                  {candidatos.map((c, index) => {
                    const isTop = index === 0 && (c.puntajeTotal || 0) > 0;
                    return (
                      <tr key={c.id} className={`hover:bg-bg/3 transition-colors ${isTop ? 'bg-celeste/[0.04]' : ''}`}>
                        <td className="px-3 py-3.5">
                          {isTop ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-11 font-black bg-celeste/15 text-celeste-hov border border-celeste/30">
                              ★ 1° Lugar
                            </span>
                          ) : (
                            <span className="font-mono text-12 text-bg/40 font-bold ml-2">{index + 1}°</span>
                          )}
                        </td>
                        <td className="px-3 py-3.5">
                          <span className="font-bold text-bg block">{c.nombre}</span>
                        </td>
                        <td className="px-3 py-3.5 text-center">
                          {c.expedienteCompleto ? (
                            <span className="inline-block px-2 py-0.5 rounded-md text-11 font-bold bg-emerald/10 text-emerald">
                              Completo
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-md text-11 font-bold bg-amber/10 text-amber">
                              Incompleto
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3.5 text-center font-mono text-13 text-bg/70">{c.puntajeCompetencias ?? 0} pts</td>
                        <td className="px-3 py-3.5 text-center font-mono text-13 text-bg/70">{c.puntajeExperiencia ?? 0} pts</td>
                        <td className="px-3 py-3.5 text-center font-mono text-13 text-bg/70">{c.puntajeEntrevista ?? 0} pts</td>
                        <td className="px-3 py-3.5 text-center font-mono text-13 text-bg/70">{c.puntajeReferencias ?? 0} pts</td>
                        <td className="px-3 py-3.5 text-right">
                          <span className={`text-15 font-black ${isTop ? 'text-celeste-hov' : 'text-bg'}`}>
                            {c.puntajeTotal ? c.puntajeTotal.toFixed(2) : '0.00'}
                          </span>
                        </td>
                        {puedeEditar && (
                          <td className="px-3 py-3.5 text-right">
                            <button
                              onClick={() => setCandidatoModal(c)}
                              className="text-12 font-bold text-celeste hover:text-celeste-hov underline"
                            >
                              Calificar
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pie */}
        <div className="p-4 border-t border-bg/10 flex justify-between items-center bg-paper/50">
          <span className="text-12 text-bg/40">
            Total postulantes: <strong className="text-bg">{candidatos.length}</strong>
          </span>
          <Button variant="filled" size="sm" onClick={onClose}>
            Cerrar Matriz
          </Button>
        </div>
      </div>

      {candidatoModal && (
        <ModalCandidato
          convocatoria={convocatoria}
          candidato={candidatoModal.isNew ? null : candidatoModal}
          onClose={() => setCandidatoModal(null)}
        />
      )}
    </div>
  );
}

export default function Reclutamiento() {
  const { puedeEditar } = useAuth();
  const { data: convocatorias, isLoading } = useConvocatorias();
  const { data: puestos } = usePuestos();
  const crear = useCrearConvocatoria();
  const actualizarEstado = useActualizarEstadoConvocatoria();

  const [showNew, setShowNew] = useState(false);
  const [matrizModal, setMatrizModal] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todas');
  const [form, setForm] = useState({ puestoId: '', tipo: 'Externa', fechaCierre: '', requisitos: '' });

  const submit = async (e) => {
    e.preventDefault();
    try {
      await crear.mutateAsync(form);
      toast.success('Convocatoria publicada');
      setShowNew(false);
      setForm({ puestoId: '', tipo: 'Externa', fechaCierre: '', requisitos: '' });
    } catch {
      toast.error('No se pudo crear la convocatoria');
    }
  };

  const toggleEstado = async (c, e) => {
    e.stopPropagation();
    const nuevoEstado = c.estado === 'Abierta' ? 'Cerrada' : 'Abierta';
    try {
      await actualizarEstado.mutateAsync({ id: c.id, estado: nuevoEstado });
      toast.success(`Convocatoria ${nuevoEstado.toLowerCase()}`);
    } catch {
      toast.error('No se pudo cambiar el estado');
    }
  };

  // Filtrado reactivo
  const convocatoriasFiltradas = useMemo(() => {
    if (!convocatorias) return [];
    return convocatorias.filter((c) => {
      const matchBusqueda =
        !busqueda ||
        c.puesto?.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.tipo?.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.requisitos?.toLowerCase().includes(busqueda.toLowerCase());

      if (!matchBusqueda) return false;
      if (filtroEstado === 'Todas') return true;
      return c.estado === filtroEstado;
    });
  }, [convocatorias, busqueda, filtroEstado]);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Reclutamiento y Selección de Personal"
        subtitle="Convocatorias con plazo mínimo de 8 días hábiles y matriz ponderada (Competencias 60%, Experiencia 15%, Entrevistas 15%, Referencias 10%)."
        action={
          puedeEditar('reclutamiento') && (
            <Button variant="filled" onClick={() => setShowNew(true)}>
              <Icon name="add" className="w-4 h-4" /> Nueva Convocatoria
            </Button>
          )
        }
      />

      {/* Barra de herramientas */}
      <div className="glass-light rounded-card p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Buscar por puesto, requisitos..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 w-full sm:w-auto">
          {['Todas', 'Abierta', 'Cerrada'].map((f) => (
            <button
              key={f}
              onClick={() => setFiltroEstado(f)}
              className={`px-3 py-1.5 rounded-xl text-12 font-bold transition-all ${
                filtroEstado === f
                  ? 'bg-bg text-white shadow-sm'
                  : 'bg-bg/5 text-bg/60 hover:bg-bg/10 hover:text-bg'
              }`}
            >
              {f === 'Todas' ? 'Todas las Convocatorias' : f + 's'}
            </button>
          ))}
        </div>
      </div>

      {/* Formulario para nueva convocatoria */}
      {showNew && puedeEditar('reclutamiento') && (
        <form onSubmit={submit} className="glass-light rounded-card p-6 space-y-4 animate-rise">
          <h2 className="text-16 font-extrabold text-bg">Publicar Nueva Convocatoria</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Select
              label="Puesto a concursar"
              value={form.puestoId}
              onChange={(e) => setForm({ ...form, puestoId: e.target.value })}
              options={(puestos || []).map((p) => ({ value: p.id, label: `${p.nombre} (Cat. ${p.categoria})` }))}
              required
            />
            <Select
              label="Tipo de Convocatoria"
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              options={[
                { value: 'Interna', label: 'Interna (Personal actual MFN)' },
                { value: 'Externa', label: 'Externa (Pública general)' },
                { value: 'Mixta', label: 'Mixta (Simultánea)' },
              ]}
            />
            <Input
              label="Fecha de cierre (mínimo 8 días)"
              type="date"
              value={form.fechaCierre}
              onChange={(e) => setForm({ ...form, fechaCierre: e.target.value })}
              required
            />
            <Input
              label="Requisitos y perfil (opcional)"
              placeholder="Ej. Título universitario, 2 años experiencia en sector público"
              value={form.requisitos}
              onChange={(e) => setForm({ ...form, requisitos: e.target.value })}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="filled" disabled={crear.isPending}>
              {crear.isPending ? 'Publicando…' : 'Publicar Convocatoria'}
            </Button>
            <Button type="button" variant="text" onClick={() => setShowNew(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {isLoading && <div className="text-14 text-bg/40 text-center py-8">Cargando convocatorias...</div>}

      {/* Grid de Convocatorias */}
      {!isLoading && (
        <div className="grid md:grid-cols-2 gap-4">
          {convocatoriasFiltradas.length === 0 ? (
            <div className="md:col-span-2 glass-light rounded-card p-12 text-center text-14 text-bg/40">
              No hay convocatorias registradas con este filtro.
            </div>
          ) : (
            convocatoriasFiltradas.map((c) => {
              const candidatos = c.candidatos || [];
              const completos = candidatos.filter((x) => x.expedienteCompleto).length;
              const diasRestantes = Math.ceil((new Date(c.fechaCierre) - new Date()) / (1000 * 60 * 60 * 24));
              const topCandidato = [...candidatos].sort((a, b) => (b.puntajeTotal || 0) - (a.puntajeTotal || 0))[0];

              return (
                <div
                  key={c.id}
                  className="glass-light rounded-card p-5 hover:shadow-card transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <span className="px-2 py-0.5 rounded text-10 font-bold bg-bg/5 text-bg/50 uppercase tracking-wide mr-2">
                          {c.tipo}
                        </span>
                        <h3 className="text-16 font-extrabold text-bg inline">{c.puesto?.nombre}</h3>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-lg text-11 font-bold shrink-0 ${
                          c.estado === 'Abierta' ? 'bg-emerald/12 text-emerald' : 'bg-bg/8 text-bg/50'
                        }`}
                      >
                        {c.estado}
                      </span>
                    </div>

                    <p className="text-12 text-bg/50 mb-3">
                      Cierre: {new Date(c.fechaCierre).toLocaleDateString('es-GT')}
                      {c.estado === 'Abierta' && diasRestantes >= 0 && (
                        <span className="text-celeste-hov font-semibold ml-1.5">
                          ({diasRestantes === 0 ? 'Cierra hoy' : `${diasRestantes} días restantes`})
                        </span>
                      )}
                    </p>

                    {c.requisitos && (
                      <p className="text-12 text-bg/70 bg-bg/[0.02] p-2.5 rounded-xl border border-bg/5 mb-4 line-clamp-2">
                        {c.requisitos}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-13 text-bg/60 p-3 rounded-xl bg-bg/[0.02] border border-bg/5 mb-4">
                      <div className="flex items-center gap-1.5">
                        <Icon name="groups" className="w-4 h-4 text-celeste" />
                        <span><strong>{candidatos.length}</strong> candidatos</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-12">
                        <Icon name="check_circle" className="w-4 h-4 text-emerald" />
                        <span>{completos} exp. completos</span>
                      </div>
                    </div>

                    {topCandidato && topCandidato.puntajeTotal > 0 && (
                      <div className="p-2.5 rounded-xl bg-celeste/8 border border-celeste/15 mb-4 flex items-center justify-between text-12">
                        <span className="text-celeste-hov font-bold">1° Lugar: {topCandidato.nombre}</span>
                        <span className="font-mono font-black text-celeste">{topCandidato.puntajeTotal.toFixed(2)} pts</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-bg/5">
                    <Button variant="outline" size="sm" onClick={() => setMatrizModal(c)}>
                      <Icon name="table_chart" className="w-4 h-4" /> Matriz de Candidatos
                    </Button>
                    {puedeEditar('reclutamiento') && (
                      <button
                        onClick={(e) => toggleEstado(c, e)}
                        className="text-12 font-bold text-bg/40 hover:text-bg transition-colors"
                      >
                        {c.estado === 'Abierta' ? 'Cerrar' : 'Reabrir'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal de Matriz */}
      {matrizModal && (
        <ModalMatrizCandidatos
          convocatoria={matrizModal}
          onClose={() => setMatrizModal(null)}
          puedeEditar={puedeEditar('reclutamiento')}
        />
      )}
    </div>
  );
}
