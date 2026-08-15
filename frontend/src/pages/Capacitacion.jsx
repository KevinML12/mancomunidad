import { useState, useMemo } from 'react';
import PageHeader from '../components/layout/PageHeader';
import Input from '../components/ui/Input';
import { useCapacitaciones } from '../lib/api';
import { Icon } from '../components/ui/Glass';
import { RevealList, RevealItem } from '../components/ui/Reveal';

export default function Capacitacion() {
  const { data: capacitaciones, isLoading } = useCapacitaciones();
  const [busqueda, setBusqueda] = useState('');

  const capacitacionesFiltradas = useMemo(() => {
    if (!capacitaciones) return [];
    return capacitaciones.filter((c) =>
      !busqueda || c.nombreHerramienta?.toLowerCase().includes(busqueda.toLowerCase())
    );
  }, [capacitaciones, busqueda]);

  const stats = useMemo(() => {
    if (!capacitaciones || capacitaciones.length === 0) return { total: 0, alDia: 0, coberturaPromedio: 0 };
    const total = capacitaciones.length;
    let totalPct = 0;
    let alDia = 0;

    capacitaciones.forEach((c) => {
      const pct = c.totalColaboradores ? (c.cobertura / c.totalColaboradores) * 100 : 0;
      totalPct += pct;
      if (pct >= 80) alDia++;
    });

    return {
      total,
      alDia,
      coberturaPromedio: Math.round(totalPct / total),
    };
  }, [capacitaciones]);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Capacitación Institucional y Certificaciones"
        subtitle="Monitoreo de inducción y capacitación en las 8 herramientas administrativas oficiales de la Mancomunidad (Mínimo 2 sesiones anuales)."
      />

      {/* Tarjetas KPI */}
      <RevealList className="grid grid-cols-1 sm:grid-cols-3 gap-3.5" stagger={0.05}>
        <RevealItem>
          <div className="glass-light rounded-card p-4">
            <span className="text-11 font-extrabold uppercase tracking-wider text-bg/40">Herramientas Normativas</span>
            <p className="text-24 font-black text-bg mt-1">{stats.total} Manuales y Códigos</p>
          </div>
        </RevealItem>
        <RevealItem>
          <div className="glass-light rounded-card p-4">
            <span className="text-11 font-extrabold uppercase tracking-wider text-emerald">Con Cobertura Óptima (≥80%)</span>
            <p className="text-24 font-black text-emerald mt-1">{stats.alDia} / {stats.total}</p>
          </div>
        </RevealItem>
        <RevealItem>
          <div className="glass-light rounded-card p-4">
            <span className="text-11 font-extrabold uppercase tracking-wider text-celeste-hov">Cobertura Global Promedio</span>
            <p className="text-24 font-black text-celeste mt-1">{stats.coberturaPromedio}%</p>
          </div>
        </RevealItem>
      </RevealList>

      {/* Buscador */}
      <div className="glass-light rounded-card p-4 flex items-center justify-between">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Buscar herramienta administrativa..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <span className="text-12 text-bg/40 font-bold hidden sm:inline">
          8 herramientas oficiales MFN
        </span>
      </div>

      {isLoading && <div className="text-14 text-bg/40 text-center py-8">Cargando capacitaciones...</div>}

      {/* Lista de Capacitaciones */}
      {!isLoading && (
        <div className="grid md:grid-cols-2 gap-4">
          {capacitacionesFiltradas.length === 0 ? (
            <div className="md:col-span-2 glass-light rounded-card p-12 text-center text-14 text-bg/40">
              No se encontraron herramientas con esa búsqueda.
            </div>
          ) : (
            capacitacionesFiltradas.map((c) => {
              const pct = c.totalColaboradores ? Math.round((c.cobertura / c.totalColaboradores) * 100) : 0;
              const isCompleted = pct >= 80;
              return (
                <div key={c.id} className="glass-light rounded-card p-5 hover:shadow-card transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="text-15 font-bold text-bg leading-snug">{c.nombreHerramienta}</h3>
                      <span className={`px-2.5 py-1 rounded-lg text-11 font-black shrink-0 ${
                        isCompleted ? 'bg-emerald/15 text-emerald' : pct > 0 ? 'bg-celeste/15 text-celeste-hov' : 'bg-amber/15 text-amber'
                      }`}>
                        {pct}% Cobertura
                      </span>
                    </div>

                    <div className="mt-3 mb-2">
                      <div className="flex justify-between text-12 text-bg/50 font-bold mb-1.5">
                        <span>Personal Certificado</span>
                        <span className="text-bg">{c.cobertura} de {c.totalColaboradores} colaboradores</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-bg/8 overflow-hidden p-0.5 border border-bg/5">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCompleted ? 'bg-emerald' : pct > 0 ? 'bg-celeste' : 'bg-transparent'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-12 text-bg/50 pt-3 mt-2 border-t border-bg/5">
                    <span className="flex items-center gap-1.5">
                      <Icon name="event" className="w-3.5 h-3.5 text-bg/40" />
                      {c.fecha ? `Última sesión: ${new Date(c.fecha).toLocaleDateString('es-GT')}` : 'Sin programar'}
                    </span>
                    <span className="text-11 font-bold font-mono text-bg/40">
                      ID #{c.id}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
