import { useState, useMemo } from 'react';
import { usePuestos } from '../lib/api';
import PageHeader from '../components/layout/PageHeader';
import Input from '../components/ui/Input';
import { Icon } from '../components/ui/Glass';
import { RevealList, RevealItem } from '../components/ui/Reveal';

const CATEGORIAS_INFO = [
  { cat: 'A', nombre: 'Directivos', color: 'bg-celeste/15 text-celeste-hov border-celeste/30', desc: 'Dirección, Gerencia y Auditoría' },
  { cat: 'B', nombre: 'Profesionales', color: 'bg-emerald/15 text-emerald border-emerald/30', desc: 'Asesoría y Especialistas' },
  { cat: 'C', nombre: 'Técnicos', color: 'bg-amber/15 text-amber border-amber/30', desc: 'Supervisores y Coordinadores' },
  { cat: 'D', nombre: 'Operativos', color: 'bg-bg/10 text-bg/70 border-bg/20', desc: 'Auxiliares y Servicios' },
];

export default function EstructuraOrganizacional() {
  const { data: puestos, isLoading } = usePuestos();
  const [busqueda, setBusqueda] = useState('');
  const [filtroCat, setFiltroCat] = useState('Todas');

  const puestosFiltrados = useMemo(() => {
    if (!puestos) return [];
    return puestos.filter((p) => {
      const matchBusqueda =
        !busqueda ||
        p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.unidad?.nombre?.toLowerCase().includes(busqueda.toLowerCase());

      if (!matchBusqueda) return false;
      if (filtroCat === 'Todas') return true;
      return p.categoria === filtroCat;
    });
  }, [puestos, busqueda, filtroCat]);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Estructura Organizacional y Manual de Puestos"
        subtitle="Catálogo oficial de puestos de la Mancomunidad Frontera del Norte (Art. 42 RIT) clasificados por categorías A, B, C y D."
      />

      {/* Tarjetas informativas de categorías */}
      <RevealList className="grid grid-cols-2 sm:grid-cols-4 gap-3.5" stagger={0.05}>
        {CATEGORIAS_INFO.map((c) => {
          const count = (puestos || []).filter((p) => p.categoria === c.cat).length;
          return (
            <RevealItem key={c.cat}>
              <div
                onClick={() => setFiltroCat(filtroCat === c.cat ? 'Todas' : c.cat)}
                className={`glass-light rounded-card p-4 cursor-pointer transition-all ${
                  filtroCat === c.cat ? 'ring-2 ring-celeste shadow-card' : 'hover:border-bg/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-lg text-11 font-black border ${c.color}`}>
                    Cat. {c.cat}
                  </span>
                  <span className="text-12 font-bold text-bg/40">{count} puestos</span>
                </div>
                <h4 className="text-14 font-extrabold text-bg mt-2">{c.nombre}</h4>
                <p className="text-11 text-bg/50 mt-0.5">{c.desc}</p>
              </div>
            </RevealItem>
          );
        })}
      </RevealList>

      {/* Barra de herramientas */}
      <div className="glass-light rounded-card p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Buscar por puesto o unidad..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 w-full sm:w-auto">
          {['Todas', 'A', 'B', 'C', 'D'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFiltroCat(cat)}
              className={`px-3 py-1.5 rounded-xl text-12 font-bold transition-all ${
                filtroCat === cat
                  ? 'bg-bg text-white shadow-sm'
                  : 'bg-bg/5 text-bg/60 hover:bg-bg/10 hover:text-bg'
              }`}
            >
              {cat === 'Todas' ? 'Todos los Puestos' : `Categoría ${cat}`}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <div className="text-14 text-bg/40 text-center py-8">Cargando estructura...</div>}

      {/* Tabla enriquecida */}
      {!isLoading && (
        <div className="glass-light rounded-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-14">
              <thead>
                <tr className="border-b border-bg/10 text-left text-11 font-extrabold uppercase tracking-widest text-bg/40 bg-bg/[0.02]">
                  <th className="px-5 py-3.5">Puesto Oficial</th>
                  <th className="px-5 py-3.5">Unidad Organizacional</th>
                  <th className="px-5 py-3.5">Categoría</th>
                  <th className="px-5 py-3.5">Forma de Pago</th>
                  <th className="px-5 py-3.5 text-right">Colaboradores</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bg/5">
                {puestosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-14 text-bg/40">
                      No se encontraron puestos con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  puestosFiltrados.map((p) => {
                    const catInfo = CATEGORIAS_INFO.find((c) => c.cat === p.categoria) || CATEGORIAS_INFO[3];
                    return (
                      <tr key={p.id} className="hover:bg-bg/3 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-bg">{p.nombre}</td>
                        <td className="px-5 py-3.5 text-13 text-bg/60">{p.unidad?.nombre || 'Dirección General'}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-11 font-black border ${catInfo.color}`}>
                            {p.categoria} · {catInfo.nombre}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-13 text-bg/60">{p.formaPago}</td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg/5 font-mono text-12 font-bold text-bg/70">
                            <Icon name="groups" className="w-3.5 h-3.5 text-celeste" />
                            {p._count?.colaboradores ?? 0}
                          </span>
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
    </div>
  );
}
