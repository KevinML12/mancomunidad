<script>
  import { onMount } from 'svelte';
  import apiClient from '$lib/apiClient';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { toast } from 'svelte-sonner';
  import { fade, fly } from 'svelte/transition';

  let censos = $state([]);
  let loading = $state(true);
  let searchQuery = $state('');
  let filtroMunicipio = $state('todos');

  // Modal
  let showModal = $state(false);
  let formLoading = $state(false);
  let nuevoCenso = $state({
    municipio: 'Santa Eulalia',
    comunidad: '',
    viviendasTotales: 100,
    viviendasConAgua: 80,
    sistemaCloracion: true,
    ppmCloroResidual: 0.8,
    viviendasConSaneamiento: 60,
    tecnicoResponsable: 'Técnico OMAS'
  });

  async function fetchCensos() {
    loading = true;
    try {
      const { data } = await apiClient.get('/estadisticas/censos');
      if (Array.isArray(data)) {
        censos = data;
      }
    } catch (err) {
      console.error('Error al cargar censos ASH de la BD:', err);
      toast.error('No se pudo cargar la base de censos de la base de datos');
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    fetchCensos();
  });

  // Métricas agregadas
  let totalViviendas = $derived(censos.reduce((a, c) => a + c.viviendasTotales, 0));
  let totalAgua = $derived(censos.reduce((a, c) => a + c.viviendasConAgua, 0));
  let totalSaneamiento = $derived(censos.reduce((a, c) => a + c.viviendasConSaneamiento, 0));
  let totalClorados = $derived(censos.filter(c => c.sistemaCloracion).length);

  let coberturaAguaPct = $derived(totalViviendas > 0 ? Number(((totalAgua / totalViviendas) * 100).toFixed(1)) : 0);
  let coberturaSaneamientoPct = $derived(totalViviendas > 0 ? Number(((totalSaneamiento / totalViviendas) * 100).toFixed(1)) : 0);
  let deficitAguaPct = $derived(Number((100 - coberturaAguaPct).toFixed(1)));
  let deficitSaneamientoPct = $derived(Number((100 - coberturaSaneamientoPct).toFixed(1)));

  // Filtrado de tabla
  let censosFiltrados = $derived(
    censos.filter(c => {
      if (filtroMunicipio !== 'todos' && c.municipio !== filtroMunicipio) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = c.comunidad.toLowerCase().includes(q) ||
                      c.codigo.toLowerCase().includes(q) ||
                      c.municipio.toLowerCase().includes(q) ||
                      c.tecnicoResponsable.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    })
  );

  // Análisis por municipio
  let estadisticasMunicipios = $derived.by(() => {
    const map = {};
    censos.forEach(c => {
      if (!map[c.municipio]) {
        map[c.municipio] = { viv: 0, agua: 0, san: 0, clorados: 0, totalCensos: 0 };
      }
      map[c.municipio].viv += c.viviendasTotales;
      map[c.municipio].agua += c.viviendasConAgua;
      map[c.municipio].san += c.viviendasConSaneamiento;
      if (c.sistemaCloracion) map[c.municipio].clorados++;
      map[c.municipio].totalCensos++;
    });

    return Object.entries(map).map(([nombre, d]) => {
      const cobAgua = d.viv > 0 ? Math.round((d.agua / d.viv) * 100) : 0;
      const cobSan = d.viv > 0 ? Math.round((d.san / d.viv) * 100) : 0;
      return {
        nombre,
        ...d,
        coberturaAgua: cobAgua,
        deficitAgua: 100 - cobAgua,
        coberturaSaneamiento: cobSan
      };
    });
  });

  async function guardarCenso(e) {
    e.preventDefault();
    if (nuevoCenso.viviendasConAgua > nuevoCenso.viviendasTotales) {
      toast.error('Viviendas con agua no pueden superar el total');
      return;
    }
    if (nuevoCenso.viviendasConSaneamiento > nuevoCenso.viviendasTotales) {
      toast.error('Viviendas con saneamiento no pueden superar el total');
      return;
    }

    formLoading = true;
    try {
      await apiClient.post('/estadisticas/censos', {
        ...nuevoCenso,
        viviendasTotales: Number(nuevoCenso.viviendasTotales),
        viviendasConAgua: Number(nuevoCenso.viviendasConAgua),
        viviendasConSaneamiento: Number(nuevoCenso.viviendasConSaneamiento),
        ppmCloroResidual: Number(nuevoCenso.ppmCloroResidual)
      });
      await fetchCensos();
      toast.success('Censo territorial guardado exitosamente en base de datos');
      showModal = false;
      nuevoCenso = {
        municipio: 'Santa Eulalia',
        comunidad: '',
        viviendasTotales: 100,
        viviendasConAgua: 80,
        sistemaCloracion: true,
        ppmCloroResidual: 0.8,
        viviendasConSaneamiento: 60,
        tecnicoResponsable: 'Técnico OMAS'
      };
    } catch (err) {
      toast.error('Error al guardar censo en base de datos: ' + (err.message || 'Error'));
    } finally {
      formLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Estadísticas Territoriales ASH | MFN Digital</title>
</svelte:head>

<!-- HEADER PRINCIPAL -->
<header class="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-8 mt-2 animate-fade-in">
  <div>
    <div class="flex items-center gap-2 mb-2">
      <span class="text-[9px] font-bold uppercase tracking-[0.15em] text-[#3B82F6]">Módulo 06</span>
      <span class="text-[9px] text-[#0A1526]/30">•</span>
      <span class="text-[9px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40">Agua, Saneamiento e Higiene (ASH)</span>
    </div>
    <h2 class="text-[40px] font-black tracking-[-0.04em] leading-none text-[#0A1526] mb-3">Estadísticas Territoriales</h2>
    <p class="text-[13px] text-[#0A1526]/50 leading-relaxed max-w-2xl">
      Consolidación regional de censos OMAS, medición de cloro residual según COGUANOR y priorización de brechas para proyectos.
    </p>
  </div>

  <div class="flex items-center gap-3 shrink-0 flex-wrap">
    <!-- Buscador -->
    <div class="relative">
      <input 
        type="text" 
        bind:value={searchQuery}
        placeholder="Buscar comunidad o municipio..." 
        class="w-[280px] pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-full text-[13px] text-[#0A1526] placeholder-[#0A1526]/30 shadow-sm focus:outline-none focus:border-[#3B82F6] transition-all" 
      />
      <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#0A1526]/30" />
    </div>

    <!-- Filtro Municipio -->
    <select 
      bind:value={filtroMunicipio} 
      class="px-4 py-3 bg-white border border-gray-100 rounded-full shadow-sm text-[12px] font-bold text-[#0A1526] focus:outline-none transition-colors"
    >
      <option value="todos">Todos los Municipios</option>
      <option value="Santa Eulalia">Santa Eulalia</option>
      <option value="San Pedro Soloma">San Pedro Soloma</option>
      <option value="San Rafael la Independencia">San Rafael la Independencia</option>
    </select>

    <!-- Botón Nuevo Censo -->
    <button 
      onclick={() => showModal = true}
      class="px-6 py-3 bg-[#0A1526] hover:bg-black text-white rounded-full text-[13px] font-bold shadow-md transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer"
    >
      <Icon name="add" className="w-[18px] h-[18px] text-[#3B82F6]" stroke={2.5} />
      <span>+ Levantar Censo de Campo</span>
    </button>
  </div>
</header>

<!-- BARRA DE INDICADORES ASH CONSOLIDADOS -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
  <!-- Cobertura Agua -->
  <div class="bg-white border border-gray-100 rounded-[24px] p-6 shadow-[0_20px_60px_-15px_rgba(10,21,38,0.04)] card-lift">
    <div class="flex items-center justify-between mb-3">
      <span class="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#0A1526]/40">Cobertura de Agua Potable</span>
      <span class="w-8 h-8 rounded-full bg-[#EBF3FF] flex items-center justify-center text-[#3B82F6]">
        <Icon name="water_drop" className="w-4 h-4" />
      </span>
    </div>
    <p class="text-[28px] font-black tracking-[-0.04em] text-[#0A1526]">{coberturaAguaPct}%</p>
    <div class="mt-3">
      <div class="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div class="bg-[#3B82F6] h-1.5 rounded-full transition-all duration-700 ease-out" style="width: {coberturaAguaPct}%"></div>
      </div>
      <p class="text-[10px] text-[#0A1526]/40 font-medium mt-1.5">{totalAgua.toLocaleString('es-GT')} de {totalViviendas.toLocaleString('es-GT')} hogares conectados</p>
    </div>
  </div>

  <!-- Déficit de Agua -->
  <div class="bg-white border border-gray-100 rounded-[24px] p-6 shadow-[0_20px_60px_-15px_rgba(10,21,38,0.04)] card-lift">
    <div class="flex items-center justify-between mb-3">
      <span class="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#0A1526]/40">Brecha / Déficit de Agua</span>
      <span class="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
        <Icon name="trending_down" className="w-4 h-4" />
      </span>
    </div>
    <p class="text-[28px] font-black tracking-[-0.04em] text-rose-600">{deficitAguaPct}%</p>
    <p class="text-[11px] text-rose-800 font-bold mt-2">Hogares sin acceso a red formal</p>
  </div>

  <!-- Saneamiento Básico -->
  <div class="bg-white border border-gray-100 rounded-[24px] p-6 shadow-[0_20px_60px_-15px_rgba(10,21,38,0.04)] card-lift">
    <div class="flex items-center justify-between mb-3">
      <span class="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#0A1526]/40">Saneamiento y Letrinas</span>
      <span class="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
        <Icon name="sanitizer" className="w-4 h-4" />
      </span>
    </div>
    <p class="text-[28px] font-black tracking-[-0.04em] text-[#0A1526]">{coberturaSaneamientoPct}%</p>
    <div class="mt-3">
      <div class="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div class="bg-emerald-500 h-1.5 rounded-full transition-all duration-700 ease-out" style="width: {coberturaSaneamientoPct}%"></div>
      </div>
      <p class="text-[10px] text-[#0A1526]/40 font-medium mt-1.5">Déficit de saneamiento: {deficitSaneamientoPct}%</p>
    </div>
  </div>

  <!-- Cloración Conforme COGUANOR -->
  <div class="bg-white border border-gray-100 rounded-[24px] p-6 shadow-[0_20px_60px_-15px_rgba(10,21,38,0.04)] card-lift">
    <div class="flex items-center justify-between mb-3">
      <span class="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#0A1526]/40">Sistemas con Cloración</span>
      <span class="w-8 h-8 rounded-full bg-cyan-50 flex items-center justify-center text-cyan-600">
        <Icon name="science" className="w-4 h-4" />
      </span>
    </div>
    <p class="text-[28px] font-black tracking-[-0.04em] text-[#0A1526]">{totalClorados} / {censos.length}</p>
    <p class="text-[11px] font-bold text-cyan-800 mt-2">Norma 0.5 - 1.5 ppm residual</p>
  </div>
</div>

<!-- DÉFICIT TERRITORIAL COMPARATIVO POR MUNICIPIO (RF16) -->
<section class="bg-white border border-gray-100/60 rounded-[32px] p-8 mb-8 shadow-[0_20px_60px_-15px_rgba(10,21,38,0.05)]">
  <div class="flex items-center justify-between pb-6 mb-4 border-b border-gray-50">
    <div>
      <h3 class="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1">Déficit Comparativo por Municipio</h3>
      <p class="text-[12px] font-medium text-[#0A1526]/50">Evidencia territorial para fundamentación técnica de perfiles de inversión Módulo 01</p>
    </div>
    <span class="text-[10px] font-mono text-[#0A1526]/40 uppercase tracking-wider">Censo OMAS 2024</span>
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
    {#each estadisticasMunicipios as mun}
      <div class="bg-[#F8FAFC] border border-gray-100 rounded-[22px] p-5 card-lift">
        <h4 class="text-[13px] font-black text-[#0A1526] tracking-tight leading-tight mb-3">{mun.nombre}</h4>
        
        <div class="space-y-3">
          <div>
            <div class="flex justify-between text-[10px] font-bold text-[#0A1526]/50 mb-1">
              <span>Agua: {mun.coberturaAgua}%</span>
              <span class="text-rose-600">Déf: {mun.deficitAgua}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div class="bg-[#3B82F6] h-1.5 rounded-full" style="width: {mun.coberturaAgua}%"></div>
            </div>
          </div>

          <div>
            <div class="flex justify-between text-[10px] font-bold text-[#0A1526]/50 mb-1">
              <span>Saneamiento:</span>
              <span class="text-emerald-700">{mun.coberturaSaneamiento}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div class="bg-emerald-500 h-1.5 rounded-full" style="width: {mun.coberturaSaneamiento}%"></div>
            </div>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-gray-200/60 flex items-center justify-between text-[10px]">
          <span class="text-[#0A1526]/40">{mun.viv} viviendas</span>
          <span class="font-bold text-[#3B82F6]">{mun.clorados} con Cloro</span>
        </div>
      </div>
    {/each}
  </div>
</section>

<!-- TABLA DE COMUNIDADES CENSADAS -->
<section class="bg-white border border-gray-100/60 rounded-[32px] p-8 shadow-[0_20px_60px_-15px_rgba(10,21,38,0.05)]">
  <div class="pb-6 mb-2 border-b border-gray-50 flex items-center justify-between">
    <div>
      <h3 class="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1">Levantamientos de Campo Registrados</h3>
      <p class="text-[12px] font-medium text-[#0A1526]/50">Padrón de comunidades georreferenciadas y monitoreo físico-químico</p>
    </div>
    <span class="px-3 py-1 rounded-full bg-blue-50 text-[#3B82F6] text-[10px] font-bold">
      {censosFiltrados.length} Comunidades
    </span>
  </div>

  <div class="overflow-x-auto">
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b border-gray-50">
          <th class="py-4 px-4 text-[9px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40">Código / Fecha</th>
          <th class="py-4 px-4 text-[9px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40">Comunidad & Municipio</th>
          <th class="py-4 px-4 text-[9px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40">Hogares con Agua</th>
          <th class="py-4 px-4 text-[9px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40">Saneamiento Básico</th>
          <th class="py-4 px-4 text-[9px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40">Calidad Cloro (COGUANOR)</th>
          <th class="py-4 px-4 text-[9px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40">Técnico OMAS</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-50/60">
        {#each censosFiltrados as c}
          {@const cobAgua = Math.round((c.viviendasConAgua / c.viviendasTotales) * 100)}
          {@const cobSan = Math.round((c.viviendasConSaneamiento / c.viviendasTotales) * 100)}
          {@const cloroOptimo = c.ppmCloroResidual >= 0.5 && c.ppmCloroResidual <= 1.5}
          <tr class="transition-colors hover:bg-gray-50/50 group">
            <td class="py-4 px-4">
              <span class="text-[9px] font-mono font-bold text-[#3B82F6] block">{c.codigo}</span>
              <span class="text-[11px] text-[#0A1526]/50">{c.fechaLevantamiento}</span>
            </td>
            <td class="py-4 px-4">
              <h4 class="text-[13px] font-black text-[#0A1526] leading-snug">{c.comunidad}</h4>
              <span class="text-[10px] text-[#0A1526]/40">{c.municipio}</span>
            </td>
            <td class="py-4 px-4">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="text-[13px] font-black text-[#0A1526]">{cobAgua}%</span>
                  <span class="text-[10px] text-[#0A1526]/40">({c.viviendasConAgua}/{c.viviendasTotales})</span>
                </div>
                <div class="w-24 bg-gray-200 rounded-full h-1 overflow-hidden">
                  <div class="bg-[#3B82F6] h-1 rounded-full" style="width: {cobAgua}%"></div>
                </div>
              </div>
            </td>
            <td class="py-4 px-4">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="text-[13px] font-black text-[#0A1526]">{cobSan}%</span>
                  <span class="text-[10px] text-[#0A1526]/40">({c.viviendasConSaneamiento}/{c.viviendasTotales})</span>
                </div>
                <div class="w-24 bg-gray-200 rounded-full h-1 overflow-hidden">
                  <div class="bg-emerald-500 h-1 rounded-full" style="width: {cobSan}%"></div>
                </div>
              </div>
            </td>
            <td class="py-4 px-4">
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border {cloroOptimo ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}">
                <span class="w-1.5 h-1.5 rounded-full {cloroOptimo ? 'bg-emerald-500' : 'bg-rose-500'}"></span>
                <span>{c.ppmCloroResidual} ppm {cloroOptimo ? '(Conforme)' : '(Riesgo)'}</span>
              </span>
            </td>
            <td class="py-4 px-4">
              <span class="text-[12px] font-bold text-[#0A1526] block">{c.tecnicoResponsable}</span>
              <span class="text-[10px] text-[#0A1526]/40">Encuesta Validada</span>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>

<!-- MODAL LEVANTAMIENTO DE CENSO (RF16) -->
{#if showModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div transition:fade={{ duration: 180 }} class="fixed inset-0 bg-[#0A1526]/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick={() => showModal = false}>
    <div transition:fly={{ y: 20, duration: 250 }} class="bg-white rounded-[32px] w-full max-w-xl shadow-[0_24px_60px_-20px_rgba(10,21,38,0.12)] p-8 border border-gray-100" onclick={e => e.stopPropagation()}>
      <div class="flex justify-between items-center mb-6 border-b border-gray-50 pb-4">
        <div>
          <span class="text-[9px] font-bold uppercase tracking-[0.15em] text-[#3B82F6]">Monitoreo OMAS</span>
          <h2 class="text-xl font-black text-[#0A1526] tracking-tight">Levantamiento de Censo ASH</h2>
        </div>
        <button onclick={() => showModal = false} class="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
          <Icon name="close" className="w-5 h-5 text-[#0A1526]/50" stroke={2} />
        </button>
      </div>

      <form onsubmit={guardarCenso} class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="field-1" class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1.5">Municipio</label>
            <select id="field-1" bind:value={nuevoCenso.municipio} class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[12px] text-[#0A1526]">
              <option value="Santa Eulalia">Santa Eulalia</option>
              <option value="San Pedro Soloma">San Pedro Soloma</option>
              <option value="San Rafael la Independencia">San Rafael la Independencia</option>
            </select>
          </div>

          <div>
            <label for="field-2" class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1.5">Nombre Comunidad / Aldea</label>
            <input id="field-2" required type="text" bind:value={nuevoCenso.comunidad} placeholder="Ej: Aldea Ixcanac" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-[#0A1526]" />
          </div>
        </div>

        <div class="grid grid-cols-3 gap-3">
          <div>
            <label for="field-3" class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1.5">Total Hogares</label>
            <input id="field-3" required type="number" min="1" bind:value={nuevoCenso.viviendasTotales} class="w-full bg-white border border-gray-200 rounded-xl px-3 py-3 text-[13px] font-bold text-[#0A1526]" />
          </div>

          <div>
            <label for="field-4" class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1.5">Con Agua de Red</label>
            <input id="field-4" required type="number" min="0" bind:value={nuevoCenso.viviendasConAgua} class="w-full bg-white border border-gray-200 rounded-xl px-3 py-3 text-[13px] font-bold text-[#0A1526]" />
          </div>

          <div>
            <label for="field-5" class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1.5">Con Saneamiento</label>
            <input id="field-5" required type="number" min="0" bind:value={nuevoCenso.viviendasConSaneamiento} class="w-full bg-white border border-gray-200 rounded-xl px-3 py-3 text-[13px] font-bold text-[#0A1526]" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="field-6" class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1.5">¿Sistema con Clorador?</label>
            <select id="field-6" bind:value={nuevoCenso.sistemaCloracion} class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[12px] text-[#0A1526]">
              <option value={true}>Sí, dosificador instalado</option>
              <option value={false}>No, agua cruda sin tratar</option>
            </select>
          </div>

          <div>
            <label for="field-7" class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1.5">Cloro Residual (ppm)</label>
            <input id="field-7" required type="number" step="0.1" min="0" bind:value={nuevoCenso.ppmCloroResidual} class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-[#0A1526]" />
          </div>
        </div>

        <div>
          <label for="field-8" class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1.5">Técnico OMAS Responsable</label>
          <input id="field-8" required type="text" bind:value={nuevoCenso.tecnicoResponsable} placeholder="Nombre del inspector de campo" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-[#0A1526]" />
        </div>

        <div class="pt-4 flex justify-end gap-3 mt-6 border-t border-gray-50 pt-5">
          <button type="button" onclick={() => showModal = false} class="px-6 py-3 rounded-full font-bold text-[#0A1526]/60 hover:bg-gray-50 transition-colors text-[13px]">Cancelar</button>
          <button type="submit" disabled={formLoading} class="px-8 py-3 bg-[#0A1526] text-white rounded-full font-bold hover:bg-black shadow-md transition-all text-[13px] disabled:opacity-50">
            {formLoading ? 'Registrando...' : 'Guardar Censo OMAS'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
