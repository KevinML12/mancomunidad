<script>
  import PdfUpload from '$lib/components/ui/PdfUpload.svelte';
  import DocumentLink from '$lib/components/ui/DocumentLink.svelte';
  let documentBusy = $state(false);
  import { onMount } from 'svelte';
  import apiClient from '$lib/apiClient';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { toast } from 'svelte-sonner';
  import { auth } from '$lib/stores/auth.svelte.js';
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

  let acuerdoPendiente = $state(null);
  let enlaceCumplimiento = $state('');
  let showAcuerdo = $state(false);
  let acuerdoLoading = $state(false);
  let nuevoAcuerdo = $state({titulo:'',descripcion:'',responsable:'',fechaCumplimiento:'',evidenciaUrl:''});
  async function guardarAcuerdo(event) {
    event.preventDefault(); acuerdoLoading = true;
    try {
      await apiClient.post(`/gobernanza/actas/${selectedActa.id}/acuerdos`,{...nuevoAcuerdo,estado:'En Proceso'});
      showAcuerdo=false; nuevoAcuerdo={titulo:'',descripcion:'',responsable:'',fechaCumplimiento:'',evidenciaUrl:''};
      toast.success('Acuerdo vinculado al acta'); await fetchActas();
    } catch (err) { toast.error(err.response?.data?.error || 'No se pudo registrar el acuerdo'); }
    finally { acuerdoLoading=false; }
  }
  async function guardarCumplimiento(event) {
    event.preventDefault(); if (!enlaceCumplimiento) {toast.error('Adjunte el PDF de respaldo antes de guardar');return;} acuerdoLoading=true;
    try {
      await apiClient.put(`/gobernanza/acuerdos/${acuerdoPendiente.id}`,{estado:'Cumplido',evidenciaUrl:enlaceCumplimiento});
      acuerdoPendiente=null; toast.success('Cumplimiento registrado con referencia documental'); await fetchActas();
    } catch (err) { toast.error(err.response?.data?.error || 'No se pudo guardar el cumplimiento'); }
    finally { acuerdoLoading=false; }
  }
  async function actualizarEstadoAcuerdo(acuerdo, nuevoEstado) {
    let evidencia = acuerdo.evidenciaUrl;
    if (nuevoEstado === 'Cumplido' && !evidencia) {
      acuerdoPendiente = acuerdo; enlaceCumplimiento = ''; return;
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
      toast.error(err.response?.data?.error || 'No se pudo actualizar el acuerdo');
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
      toast.success('Acta registrada en la base de datos');
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
      toast.error(err.response?.data?.error || 'No se pudo registrar el acta');
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
      <span class="text-[12px] font-bold uppercase tracking-normal text-[#1248AA]">Módulo 04</span>
      <span class="text-[12px] text-[#071D49]/30">•</span>
      <span class="text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40">Órganos de Dirección y Asamblea General</span>
    </div>
    <h2 class="text-[40px] font-semibold tracking-[-0.04em] leading-none text-[#071D49] mb-3">Gobernanza y Actas</h2>
    <p class="text-[13px] text-[#071D49]/50 leading-relaxed max-w-2xl">
      Registro de actas, folios consignados y seguimiento de acuerdos. La autorización de folios debe comprobarse con la documentación original.
    </p>
  </div>

  <div class="flex items-center gap-3 shrink-0 flex-wrap">
    <!-- Buscador -->
    <div class="relative">
      <input 
        type="text" 
        bind:value={searchQuery}
        placeholder="Buscar acta, acuerdo o folio CGC..." 
        class="w-[280px] pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-full text-[13px] text-[#071D49] placeholder-[#071D49]/30 shadow-sm focus:outline-none focus:border-[#1248AA] transition-all" 
      />
      <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#071D49]/30" />
    </div>

    <!-- Filtro Municipio Sede -->
    <select 
      bind:value={filtroMunicipio} 
      class="px-4 py-3 bg-white border border-gray-100 rounded-full shadow-sm text-[12px] font-bold text-[#071D49] focus:outline-none transition-colors"
    >
      <option value="todos">Todos los Municipios Sede</option>
      <option value="Santa Eulalia">Santa Eulalia</option>
      <option value="San Pedro Soloma">San Pedro Soloma</option>
      <option value="San Rafael la Independencia">San Rafael la Independencia</option>
    </select>

    <!-- Botón Nueva Acta -->
    {#if auth.puedeEditar('gobernanza')}
    <button 
      onclick={() => showModal = true}
      class="px-6 py-3 bg-[#071D49] hover:bg-black text-white rounded-full text-[13px] font-bold shadow-md transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer"
    >
      <Icon name="add" className="w-[18px] h-[18px] text-[#1248AA]" stroke={2.5} />
      <span>+ Registrar acta</span>
    </button>
    {/if}
  </div>
</header>

<!-- BARRA DE EFECTIVIDAD Y SEMÁFORO POLÍTICO -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
  <!-- Efectividad Global -->
  <div class="glass-light   rounded-[24px] p-6  transition-all duration-300 hover:-translate-y-0.5">
    <div class="flex items-center justify-between mb-3">
      <span class="text-[12px] font-semibold uppercase tracking-normal text-[#071D49]/40">Efectividad Resolutiva</span>
      <span class="w-8 h-8 rounded-full bg-[#EDF4FF] flex items-center justify-center text-[#1248AA]">
        <Icon name="gavel" className="w-4 h-4" />
      </span>
    </div>
    <p class="text-[28px] font-semibold tracking-[-0.04em] text-[#071D49]">{efectividadPct}%</p>
    <div class="mt-3">
      <div class="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div class="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" style="width: {efectividadPct}%"></div>
      </div>
      <p class="text-[12px] text-[#071D49]/40 font-medium mt-1.5">{cumplidosCount} de {totalAcuerdos} acuerdos acatados</p>
    </div>
  </div>

  <!-- Cumplidos -->
  <div class="glass-light   rounded-[24px] p-6  card-lift">
    <div class="flex items-center justify-between mb-3">
      <span class="text-[12px] font-semibold uppercase tracking-normal text-[#071D49]/40">Acuerdos Cumplidos</span>
      <span class="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
        <Icon name="check_circle" className="w-4 h-4" />
      </span>
    </div>
    <p class="text-[28px] font-semibold tracking-[-0.04em] text-[#071D49]">{cumplidosCount}</p>
    <p class="text-[11px] text-emerald-700 font-bold mt-2">Estado consignado en el expediente</p>
  </div>

  <!-- En Proceso -->
  <div class="glass-light   rounded-[24px] p-6  card-lift">
    <div class="flex items-center justify-between mb-3">
      <span class="text-[12px] font-semibold uppercase tracking-normal text-[#071D49]/40">En Ejecución Política</span>
      <span class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
        <Icon name="hourglass_top" className="w-4 h-4" />
      </span>
    </div>
    <p class="text-[28px] font-semibold tracking-[-0.04em] text-[#071D49]">{enProcesoCount}</p>
    <p class="text-[11px] text-[#071D49]/50 font-medium mt-2">Bajo responsabilidad de comisiones</p>
  </div>

  <!-- Pendientes / Alertas -->
  <div class="glass-light   rounded-[24px] p-6  card-lift">
    <div class="flex items-center justify-between mb-3">
      <span class="text-[12px] font-semibold uppercase tracking-normal text-[#071D49]/40">Pendientes / Alertas</span>
      <span class="w-8 h-8 rounded-full {pendientesCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'} flex items-center justify-center">
        <Icon name="warning" className="w-4 h-4" />
      </span>
    </div>
    <p class="text-[28px] font-semibold tracking-[-0.04em] {pendientesCount > 0 ? 'text-amber-600' : 'text-[#071D49]'}">{pendientesCount}</p>
    <p class="text-[11px] font-bold mt-2 {pendientesCount > 0 ? 'text-amber-700' : 'text-[#071D49]/40'}">
      {pendientesCount > 0 ? 'Acuerdos en estado Pendiente' : 'Sin acuerdos en estado Pendiente'}
    </p>
  </div>
</div>

<!-- CUERPO DE DOS COLUMNAS: ACTAS OFICIALES & SEMÁFORO DE ACUERDOS -->
<div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
  <!-- Columna Izquierda: Repositorio de Actas Indexadas (5 Cols) -->
  <div class="lg:col-span-5 space-y-4">
    <div class="flex items-center justify-between px-2">
      <span class="text-[12px] font-semibold uppercase tracking-normal text-[#071D49]/40">Actas Indexadas ({actasFiltradas.length})</span>
      <span class="text-[12px] font-mono text-[#071D49]/40">Folio consignado</span>
    </div>

    <div class="space-y-3">
      {#each actasFiltradas as a}
        {@const isSelected = selectedActa?.id === a.id}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div 
          onclick={() => selectedActa = a}
          class="bg-white border rounded-[24px] p-5 cursor-pointer card-lift {isSelected ? 'border-[#1248AA] shadow-md ring-2 ring-[#1248AA]/10' : 'border-gray-100 shadow-xs hover:shadow-sm'}"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="text-[11px] font-mono font-bold {isSelected ? 'text-[#1248AA]' : 'text-[#071D49]'}">
              {a.numeroActa}
            </span>
            <span class="text-[12px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full {a.tipoSesion === 'Ordinaria' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}">
              {a.tipoSesion}
            </span>
          </div>

          <h4 class="text-[14px] font-semibold text-[#071D49] tracking-tight leading-snug mb-1">
            Sesión No. {a.numeroSesion} · {a.municipioSede}
          </h4>
          <p class="text-[11px] text-[#071D49]/50 line-clamp-1 mb-3">
            {a.lugarReunion}
          </p>

          <div class="pt-3 border-t border-gray-50 flex items-center justify-between text-[11px]">
            <span class="text-[12px] font-mono text-[#071D49]/40">{a.libroCGCFolio}</span>
            <DocumentLink reference={a.urlPdfEscaneado} tipo="acta" id={a.id} label="Abrir PDF del acta" />
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Columna Derecha: Acuerdos Resolutivos y Semáforo (7 Cols) -->
  <div class="lg:col-span-7 glass-light   rounded-[32px] p-8 ">
    {#if selectedActa}
      {#key selectedActa.id}
      <div class="animate-scale-up space-y-6">
      <div class="pb-6 border-b border-gray-50 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-2">
            <span class="text-[12px] font-semibold uppercase tracking-normal px-2.5 py-1 rounded-md bg-[#EDF4FF] text-[#1D4ED8]">
              {selectedActa.numeroActa}
            </span>
            <span class="text-[11px] font-medium text-[#071D49]/40">{new Date(selectedActa.fecha).toLocaleDateString('es-GT',{timeZone:'UTC'})}</span>
          </div>
          <h3 class="text-2xl font-semibold text-[#071D49] tracking-tight">
            Acuerdos Resolutivos de la Sesión
          </h3>
          <p class="text-[12px] text-[#071D49]/50 mt-1">
            Sede: <strong class="text-[#071D49]">{selectedActa.municipioSede}</strong> · {selectedActa.libroCGCFolio}
          </p>
        </div>

        <DocumentLink reference={selectedActa.urlPdfEscaneado} tipo="acta" id={selectedActa.id} label="Abrir PDF del acta" />
      </div>

      {#if auth.puedeEditar('gobernanza')}<button class="rounded-full px-5 py-2 bg-[#071D49] text-white" disabled={documentBusy} onclick={() => showAcuerdo=!showAcuerdo}>Registrar acuerdo de esta acta</button>{/if}
      <p class="text-sm text-[#071D49]">Los PDF privados se abren con autorización y acceso temporal en otra pestaña. Los enlaces anteriores siguen siendo externos. El archivo no acredita por sí solo firmas ni autorización CGC.</p>
      <!-- Listado de Acuerdos -->
      <div class="space-y-4">
        {#if !selectedActa.acuerdos || selectedActa.acuerdos.length === 0}
          <div class="py-12 text-center text-xs text-[#071D49]/40">
            No hay acuerdos políticos registrados para esta acta.
          </div>
        {:else}
          {#each selectedActa.acuerdos as acuerdo}
            {@const esCumplido = acuerdo.estado === 'Cumplido'}
            {@const esProceso = acuerdo.estado === 'En Proceso'}
            <div class="bg-[#FFFFFF] border border-gray-100 rounded-[20px] p-5 transition-all duration-300 hover:shadow-sm">
              <div class="flex items-start justify-between gap-3 mb-2">
                <span class="text-[12px] font-mono font-bold text-[#1248AA] bg-blue-50 px-2 py-0.5 rounded-md">
                  {acuerdo.codigo}
                </span>

                <!-- Semáforo selector -->
                {#if auth.puedeEditar('gobernanza')}
                <div class="flex items-center gap-1 bg-white border border-gray-200 rounded-full p-1 shadow-xs">
                  <button 
                    onclick={() => actualizarEstadoAcuerdo(acuerdo, 'Pendiente')}
                    class="px-2 py-0.5 rounded-full text-[12px] font-bold transition-all {!esCumplido && !esProceso ? 'bg-amber-500 text-white' : 'text-gray-400 hover:text-gray-700'}"
                  >
                    Pendiente
                  </button>
                  <button 
                    onclick={() => actualizarEstadoAcuerdo(acuerdo, 'En Proceso')}
                    class="px-2 py-0.5 rounded-full text-[12px] font-bold transition-all {esProceso ? 'bg-[#1248AA] text-white' : 'text-gray-400 hover:text-gray-700'}"
                  >
                    En Proceso
                  </button>
                  <button 
                    onclick={() => actualizarEstadoAcuerdo(acuerdo, 'Cumplido')}
                    class="px-2 py-0.5 rounded-full text-[12px] font-bold transition-all {esCumplido ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-gray-700'}"
                  >
                    Cumplido
                  </button>
                </div>
                {:else}
                  <span class="text-[12px] font-semibold text-[#071D49]/60">{acuerdo.estado}</span>
                {/if}
              </div>

              <h4 class="text-[14px] font-semibold text-[#071D49] leading-snug tracking-tight mb-1.5">
                {acuerdo.titulo}
              </h4>
              <p class="text-[12px] text-[#071D49]/60 leading-relaxed mb-3">
                {acuerdo.descripcion}
              </p>

              <div class="pt-3 border-t border-gray-200/60 flex items-center justify-between text-[11px]">
                <span class="text-[12px] text-[#071D49]/50">
                  Responsable: <strong class="text-[#071D49]">{acuerdo.responsable}</strong>
                </span>

                <DocumentLink reference={acuerdo.evidenciaUrl} tipo="acuerdo" id={acuerdo.id} label="Ver evidencia" />
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
{#if showModal && auth.puedeEditar('gobernanza')}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div transition:fade={{ duration: 180 }} class="fixed inset-0 bg-[#071D49]/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick={() => {if (!documentBusy && !formLoading) showModal = false;}}>
    <div transition:fly={{ y: 20, duration: 250 }} class="glass-light mfn-form-dialog rounded-[32px] w-full max-w-xl  p-8  " onclick={e => e.stopPropagation()}>
      <div class="flex justify-between items-center mb-6 border-b border-gray-50 pb-4">
        <div>
          <span class="text-[12px] font-bold uppercase tracking-normal text-[#1248AA]">Asamblea General MFN</span>
          <h2 class="text-xl font-semibold text-[#071D49] tracking-tight">Registro de acta</h2>
        </div>
        <button onclick={() => {if (!documentBusy && !formLoading) showModal = false;}} class="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
          <Icon name="close" className="w-5 h-5 text-[#071D49]/50" stroke={2} />
        </button>
      </div>

      <form onsubmit={registrarActa} class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="field-1" class="block text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40 mb-1.5">Número de Acta</label>
            <input id="field-1" required type="text" bind:value={nuevaActa.numeroActa} placeholder="Ej: ACTA-04-2024" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-[#071D49]" />
          </div>

          <div>
            <label for="field-2" class="block text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40 mb-1.5">Número de Sesión</label>
            <input id="field-2" required type="number" min="1" bind:value={nuevaActa.numeroSesion} class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-[#071D49]" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="field-3" class="block text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40 mb-1.5">Tipo de Sesión</label>
            <select id="field-3" bind:value={nuevaActa.tipoSesion} class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[12px] text-[#071D49]">
              <option value="Ordinaria">Ordinaria</option>
              <option value="Extraordinaria">Extraordinaria</option>
            </select>
          </div>

          <div>
            <label for="field-4" class="block text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40 mb-1.5">Fecha de Sesión</label>
            <input id="field-4" required type="date" bind:value={nuevaActa.fecha} class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-[#071D49]" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="field-5" class="block text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40 mb-1.5">Municipio Sede</label>
            <select id="field-5" bind:value={nuevaActa.municipioSede} class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[12px] text-[#071D49]">
              <option value="Santa Eulalia">Santa Eulalia</option>
              <option value="San Pedro Soloma">San Pedro Soloma</option>
              <option value="San Rafael la Independencia">San Rafael la Independencia</option>
            </select>
          </div>

          <div>
            <label for="field-6" class="block text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40 mb-1.5">Folio Libro Hojas Movibles CGC</label>
            <input id="field-6" required type="text" bind:value={nuevaActa.libroCGCFolio} placeholder="Ej: Libro No. 04 · Folio 132" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-[#071D49]" />
          </div>
        </div>

        <div>
          <label for="field-7" class="block text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40 mb-1.5">Lugar Específico de Reunión</label>
          <input id="field-7" required type="text" bind:value={nuevaActa.lugarReunion} placeholder="Ej: Salón de Honor Municipal" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-[#071D49]" />
        </div>

        <PdfUpload tipo="acta" bind:value={nuevaActa.urlPdfEscaneado} onbusy={busy=>documentBusy=busy} />

        <div class="pt-4 flex justify-end gap-3 mt-6 border-t border-gray-50 pt-5">
          <button type="button" onclick={() => {if (!documentBusy && !formLoading) showModal = false;}} class="px-6 py-3 rounded-full font-bold text-[#071D49]/60 hover:bg-gray-50 transition-colors text-[13px]">Cancelar</button>
          <button type="submit" disabled={formLoading || documentBusy} class="px-8 py-3 bg-[#071D49] text-white rounded-full font-bold hover:bg-black shadow-md transition-all text-[13px] disabled:opacity-50">
            {formLoading ? 'Indexando...' : 'Registrar acta'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

{#if showAcuerdo && selectedActa && auth.puedeEditar('gobernanza')}
<div class="fixed inset-0 z-50 flex items-center justify-center bg-[#071D49]/30 backdrop-blur-sm p-4">
<dialog open aria-modal="true" aria-labelledby="titulo-acuerdo" class="relative m-0 glass-light mfn-form-dialog max-w-xl w-full rounded-[24px] p-6">
<h2 id="titulo-acuerdo" class="text-xl font-semibold mb-4">Registrar acuerdo · {selectedActa.numeroActa}</h2>
<form onsubmit={guardarAcuerdo} class="space-y-3">
<label class="block">Título<input required bind:value={nuevoAcuerdo.titulo} maxlength="200" class="block w-full bg-white border rounded-xl p-3" /></label>
<label class="block">Descripción<textarea required bind:value={nuevoAcuerdo.descripcion} maxlength="4000" class="block w-full bg-white border rounded-xl p-3"></textarea></label>
<label class="block">Responsable<input required bind:value={nuevoAcuerdo.responsable} maxlength="200" class="block w-full bg-white border rounded-xl p-3" /></label>
<label class="block">Fecha de cumplimiento prevista (opcional)<input type="date" bind:value={nuevoAcuerdo.fechaCumplimiento} class="block w-full bg-white border rounded-xl p-3" /></label>
<PdfUpload tipo="acuerdo" bind:value={nuevoAcuerdo.evidenciaUrl} onbusy={busy=>documentBusy=busy} />
<p class="text-sm">Se registra En Proceso. El responsable es texto consignado; todavía no asigna una cuenta de usuario.</p>
<div class="flex justify-end gap-3"><button type="button" disabled={acuerdoLoading || documentBusy} onclick={()=>showAcuerdo=false}>Cancelar</button><button disabled={acuerdoLoading || documentBusy} class="bg-[#071D49] text-white rounded-full px-5 py-3">Guardar acuerdo</button></div>
</form></dialog></div>
{/if}
{#if acuerdoPendiente && auth.puedeEditar('gobernanza')}
<div class="fixed inset-0 z-50 flex items-center justify-center bg-[#071D49]/30 backdrop-blur-sm p-4">
<dialog open aria-modal="true" aria-labelledby="titulo-cumplimiento" class="relative m-0 glass-light mfn-form-dialog max-w-lg w-full rounded-[24px] p-6 space-y-4">
<h2 id="titulo-cumplimiento" class="text-xl font-semibold">Registrar cumplimiento</h2><p>{acuerdoPendiente.titulo}</p>
<form onsubmit={guardarCumplimiento} class="space-y-4">
<PdfUpload tipo="acuerdo" required bind:value={enlaceCumplimiento} onbusy={busy=>documentBusy=busy} />
<p class="text-sm">Adjunte el PDF de respaldo para registrar cumplimiento. La carga no verifica firmas ni validez legal.</p>
<div class="flex justify-end gap-3"><button type="button" disabled={acuerdoLoading || documentBusy} onclick={()=>acuerdoPendiente=null}>Cancelar</button><button disabled={acuerdoLoading || documentBusy} class="bg-[#071D49] text-white rounded-full px-5 py-3">Guardar cumplimiento</button></div>
</form></dialog></div>
{/if}
