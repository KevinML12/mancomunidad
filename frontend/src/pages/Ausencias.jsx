import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useAusencias, useCrearAusencia, useResolverAusencia, useSaldoVacaciones, useColaboradores } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import Input, { Select } from '../components/ui/Input';
import { Icon } from '../components/ui/Glass';
import { RevealList, RevealItem } from '../components/ui/Reveal';

const ESTADO_STYLES = {
  Pendiente: 'bg-amber/15 text-amber border-amber/30',
  Aprobado: 'bg-emerald/15 text-emerald border-emerald/30',
  Rechazado: 'bg-rose/15 text-rose border-rose/30',
};

const TIPO_STYLES = {
  Vacaciones: { badge: 'bg-celeste/10 text-celeste-hov', icon: 'beach_access' },
  Permiso: { badge: 'bg-purple-500/10 text-purple-600', icon: 'schedule' },
  'Licencia (IGSS)': { badge: 'bg-emerald/10 text-emerald', icon: 'local_hospital' },
};

function calcularDias(desde, hasta) {
  if (!desde || !hasta) return 0;
  const d1 = new Date(desde);
  const d2 = new Date(hasta);
  if (isNaN(d1) || isNaN(d2) || d2 < d1) return 0;
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
}

// Modal de detalle de solicitud
function ModalSolicitudDetalle({ solicitud, onClose, onResolver, puedeAprobar }) {
  if (!solicitud) return null;
  const dias = calcularDias(solicitud.desde, solicitud.hasta);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/40 backdrop-blur-sm animate-fade-in">
      <div className="glass-light rounded-[28px] max-w-lg w-full shadow-card-lg overflow-hidden animate-rise">
        <div className="p-6 pb-4 border-b border-bg/10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-11 font-extrabold bg-bg/8 text-bg/60 uppercase tracking-wide">
                Solicitud #{solicitud.id}
              </span>
              <span className={`px-2 py-0.5 rounded-md text-11 font-bold border ${ESTADO_STYLES[solicitud.estado]}`}>
                {solicitud.estado}
              </span>
            </div>
            <h2 className="text-20 font-black text-bg mt-1.5">{solicitud.colaborador?.nombre}</h2>
            <p className="text-13 text-bg/60">{solicitud.colaborador?.puesto?.nombre || 'Colaborador MFN'}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-bg/40 hover:text-bg hover:bg-bg/5 transition-colors">
            <Icon name="close" className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-bg/[0.02] border border-bg/5">
            <div>
              <span className="text-11 font-extrabold uppercase tracking-wider text-bg/40 block">Tipo de Solicitud</span>
              <span className="text-14 font-bold text-bg">{solicitud.tipo}</span>
            </div>
            <div>
              <span className="text-11 font-extrabold uppercase tracking-wider text-bg/40 block">Duración</span>
              <span className="text-14 font-bold text-celeste-hov">{dias} {dias === 1 ? 'día' : 'días'}</span>
            </div>
            <div>
              <span className="text-11 font-extrabold uppercase tracking-wider text-bg/40 block">Fecha Inicial</span>
              <span className="text-13 font-semibold text-bg/80">
                {new Date(solicitud.desde).toLocaleDateString('es-GT', { dateStyle: 'long' })}
              </span>
            </div>
            <div>
              <span className="text-11 font-extrabold uppercase tracking-wider text-bg/40 block">Fecha Final</span>
              <span className="text-13 font-semibold text-bg/80">
                {new Date(solicitud.hasta).toLocaleDateString('es-GT', { dateStyle: 'long' })}
              </span>
            </div>
          </div>

          <div>
            <span className="text-11 font-extrabold uppercase tracking-wider text-bg/40 block mb-1">Motivo / Justificación</span>
            <p className="text-13 text-bg/75 p-3 rounded-xl bg-bg/[0.02] border border-bg/5 leading-relaxed">
              {solicitud.motivo || 'Sin observaciones adicionales registradas.'}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-celeste/5 border border-celeste/15 text-12 text-celeste-hov flex items-start gap-2">
            <Icon name="info" className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Conforme al Art. 38 del RIT de la Mancomunidad, las vacaciones corresponden a 20 días hábiles para menos de 5 años de servicio y 25 días para más de 5 años.
            </span>
          </div>
        </div>

        <div className="p-4 border-t border-bg/10 flex justify-end gap-2 bg-paper/50">
          {puedeAprobar && solicitud.estado === 'Pendiente' && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="text-rose border-rose/30 hover:bg-rose/10"
                onClick={() => {
                  onResolver(solicitud.id, 'Rechazado');
                  onClose();
                }}
              >
                Rechazar
              </Button>
              <Button
                variant="filled"
                size="sm"
                onClick={() => {
                  onResolver(solicitud.id, 'Aprobado');
                  onClose();
                }}
              >
                Aprobar Solicitud
              </Button>
            </>
          )}
          <Button variant="text" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}

// Modal para nueva solicitud
function NuevaSolicitudModal({ onClose, user, saldo, disponibles }) {
  const { data: colaboradores } = useColaboradores();
  const crear = useCrearAusencia();
  const [form, setForm] = useState({
    colaboradorId: user?.colaboradorId || '',
    tipo: 'Vacaciones',
    desde: '',
    hasta: '',
    motivo: '',
  });

  const diasSolicitados = useMemo(() => calcularDias(form.desde, form.hasta), [form.desde, form.hasta]);
  const excedeSaldo = form.tipo === 'Vacaciones' && disponibles !== null && diasSolicitados > disponibles;

  const submit = async (e) => {
    e.preventDefault();
    if (excedeSaldo) {
      toast.error(`No tienes suficiente saldo (${disponibles} días disponibles vs ${diasSolicitados} solicitados)`);
      return;
    }
    try {
      await crear.mutateAsync(form);
      toast.success('Solicitud de ausencia registrada correctamente');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo crear la solicitud');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/40 backdrop-blur-sm animate-fade-in">
      <div className="glass-light rounded-[28px] max-w-lg w-full shadow-card-lg overflow-hidden animate-rise">
        <div className="p-6 pb-4 border-b border-bg/10 flex items-center justify-between">
          <div>
            <h2 className="text-18 font-black text-bg">Nueva Solicitud de Ausencia</h2>
            <p className="text-13 text-bg/50">Vacaciones, permisos oficiales y licencias médicas</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-bg/40 hover:text-bg hover:bg-bg/5 transition-colors">
            <Icon name="close" className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {form.tipo === 'Vacaciones' && saldo && (
            <div className="p-3.5 rounded-2xl bg-celeste/10 border border-celeste/20 flex items-center justify-between">
              <div>
                <span className="text-11 font-extrabold uppercase tracking-wider text-bg/40 block">Saldo de Vacaciones</span>
                <span className="text-13 font-bold text-celeste-hov">{disponibles} días disponibles ({saldo.diasUsados} usados de {saldo.diasDisponibles})</span>
              </div>
              <Icon name="beach_access" className="w-5 h-5 text-celeste" />
            </div>
          )}

          {!user?.colaboradorId && (
            <Select
              label="Colaborador"
              value={form.colaboradorId}
              onChange={(e) => setForm({ ...form, colaboradorId: e.target.value })}
              options={(colaboradores || []).map((c) => ({
                value: c.id,
                label: `${c.nombre} — ${c.puesto?.nombre || 'Puesto'}`,
              }))}
              required
            />
          )}

          <Select
            label="Tipo de ausencia"
            value={form.tipo}
            onChange={(e) => setForm({ ...form, tipo: e.target.value })}
            options={[
              { value: 'Vacaciones', label: 'Vacaciones ordinarias (Art. 38)' },
              { value: 'Permiso', label: 'Permiso con/sin goce de sueldo (Art. 35)' },
              { value: 'Licencia (IGSS)', label: 'Licencia médica / IGSS (Art. 39)' },
            ]}
          />

          <div className="grid sm:grid-cols-2 gap-3">
            <Input
              label="Fecha inicial (Desde)"
              type="date"
              value={form.desde}
              onChange={(e) => setForm({ ...form, desde: e.target.value })}
              required
            />
            <Input
              label="Fecha final (Hasta)"
              type="date"
              value={form.hasta}
              onChange={(e) => setForm({ ...form, hasta: e.target.value })}
              required
            />
          </div>

          {diasSolicitados > 0 && (
            <div className={`p-3 rounded-xl border text-13 font-bold flex items-center justify-between ${
              excedeSaldo ? 'bg-rose/10 border-rose/20 text-rose' : 'bg-bg/[0.03] border-bg/10 text-bg'
            }`}>
              <span>Total días solicitados:</span>
              <span>{diasSolicitados} {diasSolicitados === 1 ? 'día' : 'días'}</span>
            </div>
          )}

          <Input
            label="Motivo o Justificación"
            placeholder="Ej. Vacaciones programadas según rol anual"
            value={form.motivo}
            onChange={(e) => setForm({ ...form, motivo: e.target.value })}
          />

          <div className="pt-2 flex justify-end gap-3">
            <Button type="button" variant="text" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="filled" disabled={crear.isPending || excedeSaldo}>
              {crear.isPending ? 'Enviando…' : 'Enviar Solicitud'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Ausencias() {
  const { user, puedeAprobar } = useAuth();
  const { data: ausencias, isLoading } = useAusencias();
  const { data: saldo } = useSaldoVacaciones(user?.colaboradorId);
  const resolver = useResolverAusencia();

  const [showNew, setShowNew] = useState(false);
  const [detalleModal, setDetalleModal] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [tabEstado, setTabEstado] = useState('Todas');

  const disponibles = saldo ? saldo.diasDisponibles - saldo.diasUsados : null;

  const resolverSolicitud = async (id, estado) => {
    try {
      await resolver.mutateAsync({ id, estado });
      toast.success(`Solicitud ${estado.toLowerCase()} con éxito`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo actualizar la solicitud');
    }
  };

  // Filtrado reactivo
  const ausenciasFiltradas = useMemo(() => {
    if (!ausencias) return [];
    return ausencias.filter((a) => {
      const matchBusqueda =
        !busqueda ||
        a.colaborador?.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        a.colaborador?.puesto?.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        a.tipo?.toLowerCase().includes(busqueda.toLowerCase()) ||
        a.motivo?.toLowerCase().includes(busqueda.toLowerCase());

      if (!matchBusqueda) return false;
      if (tabEstado === 'Todas') return true;
      return a.estado === tabEstado;
    });
  }, [ausencias, busqueda, tabEstado]);

  // Contadores para badges de tabs
  const counts = useMemo(() => {
    if (!ausencias) return { Todas: 0, Pendiente: 0, Aprobado: 0, Rechazado: 0 };
    return {
      Todas: ausencias.length,
      Pendiente: ausencias.filter((a) => a.estado === 'Pendiente').length,
      Aprobado: ausencias.filter((a) => a.estado === 'Aprobado').length,
      Rechazado: ausencias.filter((a) => a.estado === 'Rechazado').length,
    };
  }, [ausencias]);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Vacaciones, Permisos y Licencias"
        subtitle="Control de saldos de vacaciones por colaborador (Art. 38 RIT) y flujo de aprobación por jefatura inmediata."
        action={
          <Button variant="filled" onClick={() => setShowNew(true)}>
            <Icon name="add" className="w-4 h-4" /> Nueva Solicitud
          </Button>
        }
      />

      {/* Tarjetas KPI de Resumen */}
      <RevealList className="grid grid-cols-2 sm:grid-cols-4 gap-3.5" stagger={0.05}>
        <RevealItem>
          <div className="glass-light rounded-card p-4">
            <span className="text-11 font-extrabold uppercase tracking-wider text-celeste-hov">Días Disponibles</span>
            <p className="text-24 font-black text-celeste mt-1">
              {disponibles !== null ? `${disponibles} días` : '—'}
            </p>
          </div>
        </RevealItem>
        <RevealItem>
          <div className="glass-light rounded-card p-4">
            <span className="text-11 font-extrabold uppercase tracking-wider text-bg/40">Días Usados ({saldo?.anio || new Date().getFullYear()})</span>
            <p className="text-24 font-black text-bg mt-1">
              {saldo ? `${saldo.diasUsados} / ${saldo.diasDisponibles}` : '—'}
            </p>
          </div>
        </RevealItem>
        <RevealItem>
          <div className="glass-light rounded-card p-4">
            <span className="text-11 font-extrabold uppercase tracking-wider text-amber">Por Aprobar</span>
            <p className="text-24 font-black text-amber mt-1">{counts.Pendiente}</p>
          </div>
        </RevealItem>
        <RevealItem>
          <div className="glass-light rounded-card p-4">
            <span className="text-11 font-extrabold uppercase tracking-wider text-emerald">Aprobadas</span>
            <p className="text-24 font-black text-emerald mt-1">{counts.Aprobado}</p>
          </div>
        </RevealItem>
      </RevealList>

      {/* Barra de herramientas: Búsqueda y Pestañas de Estado */}
      <div className="glass-light rounded-card p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Buscar colaborador, motivo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {[
            { id: 'Todas', label: 'Todas', count: counts.Todas },
            { id: 'Pendiente', label: 'Pendientes', count: counts.Pendiente, color: 'text-amber' },
            { id: 'Aprobado', label: 'Aprobadas', count: counts.Aprobado, color: 'text-emerald' },
            { id: 'Rechazado', label: 'Rechazadas', count: counts.Rechazado, color: 'text-rose' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTabEstado(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-12 font-bold transition-all flex items-center gap-1.5 ${
                tabEstado === tab.id
                  ? 'bg-bg text-white shadow-sm'
                  : 'bg-bg/5 text-bg/60 hover:bg-bg/10 hover:text-bg'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-md text-10 font-black ${tabEstado === tab.id ? 'bg-white/20 text-white' : 'bg-bg/10 text-bg/50'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {isLoading && <div className="text-14 text-bg/40 text-center py-8">Cargando solicitudes...</div>}

      {/* Tabla enriquecida */}
      {!isLoading && (
        <div className="glass-light rounded-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-14">
              <thead>
                <tr className="border-b border-bg/10 text-left text-11 font-extrabold uppercase tracking-widest text-bg/40 bg-bg/[0.02]">
                  <th className="px-5 py-3.5">Colaborador</th>
                  <th className="px-5 py-3.5">Tipo</th>
                  <th className="px-5 py-3.5">Período</th>
                  <th className="px-5 py-3.5">Días</th>
                  <th className="px-5 py-3.5">Motivo</th>
                  <th className="px-5 py-3.5">Estado</th>
                  <th className="px-5 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bg/5">
                {ausenciasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-14 text-bg/40">
                      No hay solicitudes registradas con este filtro.
                    </td>
                  </tr>
                ) : (
                  ausenciasFiltradas.map((a) => {
                    const dias = calcularDias(a.desde, a.hasta);
                    const tipoStyle = TIPO_STYLES[a.tipo] || TIPO_STYLES.Vacaciones;
                    return (
                      <tr key={a.id} className="hover:bg-bg/3 transition-colors">
                        <td className="px-5 py-3.5">
                          <span className="font-bold text-bg block">{a.colaborador?.nombre}</span>
                          <span className="text-11 text-bg/40">{a.colaborador?.puesto?.nombre || 'MFN'}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-12 font-bold ${tipoStyle.badge}`}>
                            <Icon name={tipoStyle.icon} className="w-3.5 h-3.5" />
                            {a.tipo}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-13 text-bg/70">
                          <div>{new Date(a.desde).toLocaleDateString('es-GT')}</div>
                          <div className="text-11 text-bg/40">al {new Date(a.hasta).toLocaleDateString('es-GT')}</div>
                        </td>
                        <td className="px-5 py-3.5 text-13 font-black text-bg">
                          {dias} {dias === 1 ? 'día' : 'días'}
                        </td>
                        <td className="px-5 py-3.5 text-13 text-bg/60 max-w-xs truncate">
                          {a.motivo || '—'}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex px-2.5 py-1 rounded-lg text-12 font-bold border ${ESTADO_STYLES[a.estado]}`}>
                            {a.estado}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {puedeAprobar('ausencias') && a.estado === 'Pendiente' && (
                              <>
                                <button
                                  onClick={() => resolverSolicitud(a.id, 'Aprobado')}
                                  className="px-2 py-1 rounded-lg bg-emerald/10 text-emerald hover:bg-emerald/20 text-12 font-bold transition-colors"
                                  title="Aprobar Solicitud"
                                >
                                  Aprobar
                                </button>
                                <button
                                  onClick={() => resolverSolicitud(a.id, 'Rechazado')}
                                  className="px-2 py-1 rounded-lg bg-rose/10 text-rose hover:bg-rose/20 text-12 font-bold transition-colors"
                                  title="Rechazar Solicitud"
                                >
                                  Rechazar
                                </button>
                              </>
                            )}
                            <Button variant="outline" size="sm" onClick={() => setDetalleModal(a)}>
                              Detalle
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modales */}
      {showNew && (
        <NuevaSolicitudModal
          onClose={() => setShowNew(false)}
          user={user}
          saldo={saldo}
          disponibles={disponibles}
        />
      )}
      {detalleModal && (
        <ModalSolicitudDetalle
          solicitud={detalleModal}
          onClose={() => setDetalleModal(null)}
          onResolver={resolverSolicitud}
          puedeAprobar={puedeAprobar('ausencias')}
        />
      )}
    </div>
  );
}
