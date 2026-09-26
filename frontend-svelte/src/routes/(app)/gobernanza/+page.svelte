<script>
  import { onMount } from 'svelte';
  import apiClient from '$lib/apiClient';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { toast } from 'svelte-sonner';
  import { fade, fly } from 'svelte/transition';

  let actas = $state([]);
  let selectedActa = $state(null);
  let loading = $state(true);
  let searchQuery = $state('');
  let filtroMunicipio = $state('todos');

  // Modal
  let showModal = $state(false);
  let formLoading = $state(false);
  let nuevaActa = $state({
    numeroActa: '',
    numeroSesion: 1,
    tipoSesion: 'Ordinaria',
    fecha: '',
    municipioSede: 'Santa Eulalia',
    lugarReunion: '',
    libroCGCFolio: '',
    urlPdfEscaneado: ''
  });

  async function fetchActas() {
    loading = true;
    try {
      const { data } = await apiClient.get('/gobernanza/actas');
      if (Array.isArray(data)) {
        actas = data;
        if (data.length > 0 && !selectedActa) {
          selectedActa = data[0];
        } else if (selectedActa) {
          selectedActa = data.find(a => a.id === selectedActa.id) || data[0] || null;
        }
      }
    } catch (err) {
      console.error('Error al cargar actas de la base de datos:', err);
      toast.error('No se pudo cargar el repositorio de actas de la BD');
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    fetchActas();
  });

  // Métricas reactivas de gobernanza
  let todosLosAcuerdos = $derived(actas.flatMap(a => a.acuerdos || []));
  let totalAcuerdos = $derived(todosLosAcuerdos.length);
  let cumplidosCount = $derived(todosLosAcuerdos.filter(a => a.estado === 'Cumplido').length);
  let enProcesoCount = $derived(todosLosAcuerdos.filter(a => a.estado === 'En Proceso').length);
  let pendientesCount = $derived(todosLosAcuerdos.filter(a => a.estado === 'Pendiente').length);
  let efectividadPct = $derived(totalAcuerdos > 0 ? Math.round((cumplidosCount / totalAcuerdos) * 100) : 0);

  // Filtrado de actas
  let actasFiltradas = $derived(
    actas.filter(a => {
      if (filtroMunicipio !== 'todos' && a.municipioSede !== filtroMunicipio) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = a.numeroActa.toLowerCase().includes(q) ||
                      a.municipioSede.toLowerCase().includes(q) ||
                      a.libroCGCFolio.toLowerCase().includes(q) ||
                      (a.acuerdos && a.acuerdos.some(ac => ac.titulo.toLowerCase().includes(q)));
        if (!match) return false;
      }
      return true;
    })
  );

  async function actualizarEstadoAcuerdo(acuerdo, nuevoEstado) {
    let evidencia = acuerdo.evidenciaUrl;
    if (nuevoEstado === 'Cumplido' && !evidencia) {
      const url = prompt('RF14: Ingrese URL de la evidencia o resolución de cumplimiento:');
      if (!url) {
        toast.error('Se requiere evidencia documental obligatoria para marcar como Cumplido');
        return;
      }
      evidencia = url;
    }

    try {
      await apiClient.put(`/gobernanza/acuerdos/${acuerdo.id}`, {
        estado: nuevoEstado,
        evidenciaUrl: evidencia
      });
      toast.success(`Acuerdo actualizado en la base de datos: ${nuevoEstado}`);
      await fetchActas();
    } catch (err) {
      console.error('Error al actualizar acuerdo en la BD:', err);
      toast.error('No se pudo actualizar el acuerdo en la base de datos');
    }
  }

  async function registrarActa(e) {
    e.preventDefault();
    formLoading = true;
    try {
      await apiClient.post('/gobernanza/actas', {
        ...nuevaActa,
        numeroSesion: Number(nuevaActa.numeroSesion),
        fecha: nuevaActa.fecha || new Date().toISOString().split('T')[0]
      });
      toast.success('Acta oficial registrada e indexada en la base de datos');
      showModal = false;
      nuevaActa = {
        numeroActa: '',
        numeroSesion: actas.length + 1,
        tipoSesion: 'Ordinaria',
        fecha: '',
        municipioSede: 'Santa Eulalia',
        lugarReunion: '',
        libroCGCFolio: '',
        urlPdfEscaneado: ''
      };
      await fetchActas();
    } catch (err) {
      console.error('Error al registrar acta en la BD:', err);
      toast.error('Error al guardar el acta en la base de datos');
    } finally {
      formLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Gobernanza y Actas | MFN Digital</title>
</svelte:head>

<!-- HEADER PRINCIPAL -->
<header class="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-8 mt-2 animate-fade-in">
  <div>
    <div class="flex items-center gap-2 mb-2">
      <span class="text-[9px] font-bold uppercase tracking-[0.15em] text-[#3B82F6]">Módulo 04</span>
      <span class="text-[9px] text-[#0A1526]/30">•</span>
      <span class="text-[9px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40">Órganos de Dirección y Asamblea General</span>
    </div>
    <h2 class="text-[40px] font-black tracking-[-0.04em] leading-none text-[#0A1526] mb-3">Gobernanza y Actas</h2>
    <p class="text-[13px] text-[#0A1526]/50 leading-relaxed max-w-2xl">
      Digitalización de actas autorizadas por Contraloría (CGC), foliado oficial y semáforo de cumplimiento de acuerdos políticos.
    </p>
  </div>

  <div class="flex items-center gap-3 shrink-0 flex-wrap">
    <!-- Buscador -->
    <div class="relative">
      <input 
        type="text" 
        bind:value={searchQuery}
        placeholder="Buscar acta, acuerdo o folio CGC..." 
        class="w-[280px] pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-full text-[13px] text-[#0A1526] placeholder-[#0A1526]/30 shadow-sm focus:outline-none focus:border-[#3B82F6] transition-all" 
      />
      <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#0A1526]/30" />
    </div>

    <!-- Filtro Municipio Sede -->
    <select 
      bind:value={filtroMunicipio} 
      class="px-4 py-3 bg-white border border-gray-100 rounded-full shadow-sm text-[12px] font-bold text-[#0A1526] focus:outline-none transition-colors"
    >
      <option value="todos">Todos los Municipios Sede</option>
      <option value="Santa Eulalia">Santa Eulalia</option>
      <option value="San Pedro Soloma">San Pedro Soloma</option>
      <option value="San Rafael la Independencia">San Rafael la Independencia</option>
      <option value="San Mateo Ixtatán">San Mateo Ixtatán</option>
    </select>

    <!-- Botón Nueva Acta -->
    <button 
      onclick={() => showModal = true}
      class="px-6 py-3 bg-[#0A1526] hover:bg-black text-white rounded-full text-[13px] font-bold shadow-md transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer"
    >
      <Icon name="add" className="w-[18px] h-[18px] text-[#3B82F6]" stroke={2.5} />
      <span>+ Digitalizar Acta Oficial</span>
    </button>
  </div>
</header>

<!-- BARRA DE EFECTIVIDAD Y SEMÁFORO POLÍTICO -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
  <!-- Efectividad Global -->
  <div class="bg-white border border-gray-100 rounded-[24px] p-6 shadow-[0_20px_60px_-15px_rgba(10,21,38,0.04)] transition-all duration-300 hover:-translate-y-0.5">
    <div class="flex items-center justify-between mb-3">
      <span class="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#0A1526]/40">Efectividad Resolutiva</span>
      <span class="w-8 h-8 rounded-full bg-[#EBF3FF] flex items-center justify-center text-[#3B82F6]">
        <Icon name="gavel" className="w-4 h-4" />
      </span>
    </div>
    <p class="text-[28px] font-black tracking-[-0.04em] text-[#0A1526]">{efectividadPct}%</p>
    <div class="mt-3">
      <div class="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div class="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" style="width: {efectividadPct}%"></div>
      </div>
      <p class="text-[10px] text-[#0A1526]/40 font-medium mt-1.5">{cumplidosCount} de {totalAcuerdos} acuerdos acatados</p>
    </div>
  </div>

  <!-- Cumplidos -->
  <div class="bg-white border border-gray-100 rounded-[24px] p-6 shadow-[0_20px_60px_-15px_rgba(10,21,38,0.04)] card-lift">
    <div class="flex items-center justify-between mb-3">
      <span class="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#0A1526]/40">Acuerdos Cumplidos</span>
      <span class="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
        <Icon name="check_circle" className="w-4 h-4" />
      </span>
    </div>
    <p class="text-[28px] font-black tracking-[-0.04em] text-[#0A1526]">{cumplidosCount}</p>
    <p class="text-[11px] text-emerald-700 font-bold mt-2">Respaldados con evidencias</p>
  </div>

  <!-- En Proceso -->
  <div class="bg-white border border-gray-100 rounded-[24px] p-6 shadow-[0_20px_60px_-15px_rgba(10,21,38,0.04)] card-lift">
    <div class="flex items-center justify-between mb-3">
      <span class="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#0A1526]/40">En Ejecución Política</span>
      <span class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
        <Icon name="hourglass_top" className="w-4 h-4" />
      </span>
    </div>
    <p class="text-[28px] font-black tracking-[-0.04em] text-[#0A1526]">{enProcesoCount}</p>
    <p class="text-[11px] text-[#0A1526]/50 font-medium mt-2">Bajo responsabilidad de comisiones</p>
  </div>

  <!-- Pendientes / Alertas -->
  <div class="bg-white border border-gray-100 rounded-[24px] p-6 shadow-[0_20px_60px_-15px_rgba(10,21,38,0.04)] card-lift">
    <div class="flex items-center justify-between mb-3">
      <span class="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#0A1526]/40">Pendientes / Alertas</span>
      <span class="w-8 h-8 rounded-full {pendientesCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'} flex items-center justify-center">
        <Icon name="warning" className="w-4 h-4" />
      </span>
    </div>
    <p class="text-[28px] font-black tracking-[-0.04em] {pendientesCount > 0 ? 'text-amber-600' : 'text-[#0A1526]'}">{pendientesCount}</p>
    <p class="text-[11px] font-bold mt-2 {pendientesCount > 0 ? 'text-amber-700' : 'text-[#0A1526]/40'}">
      {pendientesCount > 0 ? 'Plazos de directiva por vencer' : 'Sin pendientes atrasados'}
    </p>
  </div>
</div>

<!-- CUERPO DE DOS COLUMNAS: ACTAS OFICIALES & SEMÁFORO DE ACUERDOS -->
<div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
  <!-- Columna Izquierda: Repositorio de Actas Indexadas (5 Cols) -->
  <div class="lg:col-span-5 space-y-4">
    <div class="flex items-center justify-between px-2">
      <span class="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#0A1526]/40">Actas Indexadas ({actasFiltradas.length})</span>
      <span class="text-[10px] font-mono text-[#0A1526]/40">Autorizado CGC</span>
    </div>

    <div class="space-y-3">
      {#each actasFiltradas as a}
        {@const isSelected = selectedActa?.id === a.id}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div 
          onclick={() => selectedActa = a}
          class="bg-white border rounded-[24px] p-5 cursor-pointer card-lift {isSelected ? 'border-[#3B82F6] shadow-md ring-2 ring-[#3B82F6]/10' : 'border-gray-100 shadow-xs hover:shadow-sm'}"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="text-[11px] font-mono font-bold {isSelected ? 'text-[#3B82F6]' : 'text-[#0A1526]'}">
              {a.numeroActa}
            </span>
            <span class="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full {a.tipoSesion === 'Ordinaria' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}">
              {a.tipoSesion}
            </span>
          </div>

          <h4 class="text-[14px] font-black text-[#0A1526] tracking-tight leading-snug mb-1">
            Sesión No. {a.numeroSesion} · {a.municipioSede}
          </h4>
          <p class="text-[11px] text-[#0A1526]/50 line-clamp-1 mb-3">
            {a.lugarReunion}
          </p>

          <div class="pt-3 border-t border-gray-50 flex items-center justify-between text-[11px]">
            <span class="text-[10px] font-mono text-[#0A1526]/40">{a.libroCGCFolio}</span>
            <div class="flex items-center gap-1.5 text-[#3B82F6] font-bold">
              <Icon name="description" className="w-3.5 h-3.5" />
              <span>PDF</span>
            </div>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Columna Derecha: Acuerdos Resolutivos y Semáforo (7 Cols) -->
  <div class="lg:col-span-7 bg-white border border-gray-100 rounded-[32px] p-8 shadow-[0_20px_60px_-15px_rgba(10,21,38,0.05)]">
    {#if selectedActa}
      {#key selectedActa.id}
      <div class="animate-scale-up space-y-6">
      <div class="pb-6 border-b border-gray-50 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-2">
            <span class="text-[9px] font-extrabold uppercase tracking-[0.1em] px-2.5 py-1 rounded-md bg-[#EBF3FF] text-[#1D4ED8]">
              {selectedActa.numeroActa}
            </span>
            <span class="text-[11px] font-medium text-[#0A1526]/40">{selectedActa.fecha}</span>
          </div>
          <h3 class="text-2xl font-black text-[#0A1526] tracking-tight">
            Acuerdos Resolutivos de la Sesión
          </h3>
          <p class="text-[12px] text-[#0A1526]/50 mt-1">
            Sede: <strong class="text-[#0A1526]">{selectedActa.municipioSede}</strong> · {selectedActa.libroCGCFolio}
          </p>
        </div>

        {#if selectedActa.urlPdfEscaneado}
          <a 
            href={selectedActa.urlPdfEscaneado} 
            target="_blank"
            class="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-[#0A1526] rounded-full text-[11px] font-bold border border-gray-200 shadow-xs flex items-center gap-2 transition-colors shrink-0"
          >
            <Icon name="visibility" className="w-4 h-4 text-[#3B82F6]" />
            <span>Ver Acta con Firmas</span>
          </a>
        {/if}
      </div>

      <!-- Listado de Acuerdos -->
      <div class="space-y-4">
        {#if !selectedActa.acuerdos || selectedActa.acuerdos.length === 0}
          <div class="py-12 text-center text-xs text-[#0A1526]/40">
            No hay acuerdos políticos registrados para esta acta.
          </div>
        {:else}
          {#each selectedActa.acuerdos as acuerdo}
            {@const esCumplido = acuerdo.estado === 'Cumplido'}
            {@const esProceso = acuerdo.estado === 'En Proceso'}
            <div class="bg-[#F8FAFC] border border-gray-100 rounded-[20px] p-5 transition-all duration-300 hover:shadow-sm">
              <div class="flex items-start justify-between gap-3 mb-2">
                <span class="text-[9px] font-mono font-bold text-[#3B82F6] bg-blue-50 px-2 py-0.5 rounded-md">
                  {acuerdo.codigo}
                </span>

                <!-- Semáforo selector -->
                <div class="flex items-center gap-1 bg-white border border-gray-200 rounded-full p-1 shadow-xs">
                  <button 
                    onclick={() => actualizarEstadoAcuerdo(acuerdo, 'Pendiente')}
                    class="px-2 py-0.5 rounded-full text-[9px] font-bold transition-all {!esCumplido && !esProceso ? 'bg-amber-500 text-white' : 'text-gray-400 hover:text-gray-700'}"
                  >
                    Pendiente
                  </button>
                  <button 
                    onclick={() => actualizarEstadoAcuerdo(acuerdo, 'En Proceso')}
                    class="px-2 py-0.5 rounded-full text-[9px] font-bold transition-all {esProceso ? 'bg-[#3B82F6] text-white' : 'text-gray-400 hover:text-gray-700'}"
                  >
                    En Proceso
                  </button>
                  <button 
                    onclick={() => actualizarEstadoAcuerdo(acuerdo, 'Cumplido')}
                    class="px-2 py-0.5 rounded-full text-[9px] font-bold transition-all {esCumplido ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-gray-700'}"
                  >
                    Cumplido
                  </button>
                </div>
              </div>

              <h4 class="text-[14px] font-black text-[#0A1526] leading-snug tracking-tight mb-1.5">
                {acuerdo.titulo}
              </h4>
              <p class="text-[12px] text-[#0A1526]/60 leading-relaxed mb-3">
                {acuerdo.descripcion}
              </p>

              <div class="pt-3 border-t border-gray-200/60 flex items-center justify-between text-[11px]">
                <span class="text-[10px] text-[#0A1526]/50">
                  Responsable: <strong class="text-[#0A1526]">{acuerdo.responsable}</strong>
                </span>

                {#if acuerdo.evidenciaUrl}
                  <a href={acuerdo.evidenciaUrl} target="_blank" class="text-[#3B82F6] font-bold flex items-center gap-1 hover:underline">
                    <Icon name="link" className="w-3.5 h-3.5" />
                    <span>Ver Evidencia</span>
                  </a>
                {:else if esCumplido}
                  <span class="text-emerald-700 font-bold flex items-center gap-1">
                    <Icon name="verified" className="w-3.5 h-3.5" />
                    <span>Acreditado</span>
                  </span>
                {/if}
              </div>
            </div>
          {/each}
        {/if}
      </div>
      </div>
      {/key}
    {/if}
  </div>
</div>

<!-- MODAL DIGITALIZACIÓN DE ACTA (RF13) -->
{#if showModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div transition:fade={{ duration: 180 }} class="fixed inset-0 bg-[#0A1526]/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick={() => showModal = false}>
    <div transition:fly={{ y: 20, duration: 250 }} class="bg-white rounded-[32px] w-full max-w-xl shadow-[0_24px_60px_-20px_rgba(10,21,38,0.12)] p-8 border border-gray-100" onclick={e => e.stopPropagation()}>
      <div class="flex justify-between items-center mb-6 border-b border-gray-50 pb-4">
        <div>
          <span class="text-[9px] font-bold uppercase tracking-[0.15em] text-[#3B82F6]">Asamblea General MFN</span>
          <h2 class="text-xl font-black text-[#0A1526] tracking-tight">Digitalización de Acta Oficial</h2>
        </div>
        <button onclick={() => showModal = false} class="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
          <Icon name="close" className="w-5 h-5 text-[#0A1526]/50" stroke={2} />
        </button>
      </div>

      <form onsubmit={registrarActa} class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1.5">Número de Acta</label>
            <input required type="text" bind:value={nuevaActa.numeroActa} placeholder="Ej: ACTA-04-2024" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-[#0A1526]" />
          </div>

          <div>
            <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1.5">Número de Sesión</label>
            <input required type="number" min="1" bind:value={nuevaActa.numeroSesion} class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-[#0A1526]" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1.5">Tipo de Sesión</label>
            <select bind:value={nuevaActa.tipoSesion} class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[12px] text-[#0A1526]">
              <option value="Ordinaria">Ordinaria</option>
              <option value="Extraordinaria">Extraordinaria</option>
            </select>
          </div>

          <div>
            <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1.5">Fecha de Sesión</label>
            <input required type="date" bind:value={nuevaActa.fecha} class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-[#0A1526]" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1.5">Municipio Sede</label>
            <select bind:value={nuevaActa.municipioSede} class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[12px] text-[#0A1526]">
              <option value="Santa Eulalia">Santa Eulalia</option>
              <option value="San Pedro Soloma">San Pedro Soloma</option>
              <option value="San Rafael la Independencia">San Rafael la Independencia</option>
              <option value="San Mateo Ixtatán">San Mateo Ixtatán</option>
              <option value="Barillas">Santa Cruz Barillas</option>
              <option value="San Miguel Acatán">San Miguel Acatán</option>
            </select>
          </div>

          <div>
            <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1.5">Folio Libro Hojas Movibles CGC</label>
            <input required type="text" bind:value={nuevaActa.libroCGCFolio} placeholder="Ej: Libro No. 04 · Folio 132" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-[#0A1526]" />
          </div>
        </div>

        <div>
          <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1.5">Lugar Específico de Reunión</label>
          <input required type="text" bind:value={nuevaActa.lugarReunion} placeholder="Ej: Salón de Honor Municipal" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-[#0A1526]" />
        </div>

        <div>
          <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1.5">URL Archivo PDF Escaneado (Firmas Oficiales)</label>
          <input type="text" bind:value={nuevaActa.urlPdfEscaneado} placeholder="https://storage.mfn.gob.gt/actas/acta.pdf" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-[#0A1526]" />
        </div>

        <div class="pt-4 flex justify-end gap-3 mt-6 border-t border-gray-50 pt-5">
          <button type="button" onclick={() => showModal = false} class="px-6 py-3 rounded-full font-bold text-[#0A1526]/60 hover:bg-gray-50 transition-colors text-[13px]">Cancelar</button>
          <button type="submit" disabled={formLoading} class="px-8 py-3 bg-[#0A1526] text-white rounded-full font-bold hover:bg-black shadow-md transition-all text-[13px] disabled:opacity-50">
            {formLoading ? 'Indexando...' : 'Indexar Acta Oficial'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
