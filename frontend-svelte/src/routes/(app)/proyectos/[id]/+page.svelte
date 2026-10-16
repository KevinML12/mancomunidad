<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import apiClient from '$lib/apiClient';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { toast } from 'svelte-sonner';
  import { auth } from '$lib/stores/auth.svelte.js';
  import { getSnapshot, saveSnapshot, queueEvidence, getEvidenceDrafts, removeEvidenceDraft, sha256Base64 } from '$lib/offline-field.js';
  import { fade, fly } from 'svelte/transition';

  let projectId = $derived($page.params.id);
  let proyecto = $state(null);
  let loading = $state(true);
  let offlineSnapshot = $state(null);
  let drafts = $state([]);
  let syncing = $state(false);
  let milestoneBusy = $state(false);
  let milestoneForm = $state({ nombre: '', pesoPorcentaje: '', fechaPlanificada: '' });

  async function addMilestone(event) {
    event.preventDefault(); milestoneBusy = true;
    try {
      await apiClient.post(`/proyectos/${projectId}/hitos`, milestoneForm);
      milestoneForm = { nombre: '', pesoPorcentaje: '', fechaPlanificada: '' };
      await fetchProyecto();
      toast.success('Hito agregado');
    } catch (error) { toast.error(error.response?.data?.error || 'No se pudo guardar el hito'); }
    finally { milestoneBusy = false; }
  }

  async function setMilestoneApproval(hito, approve) {
    milestoneBusy = true;
    try {
      await apiClient.post(`/proyectos/${projectId}/hitos/${hito.id}/${approve ? 'aprobar' : 'reabrir'}`);
      await fetchProyecto();
      toast.success(approve ? 'Hito aprobado' : 'Hito reabierto');
    } catch (error) { toast.error(error.response?.data?.error || 'No se pudo actualizar el hito'); }
    finally { milestoneBusy = false; }
  }

  async function refreshDrafts() {
    drafts = await getEvidenceDrafts(auth.user?.id, projectId).catch(() => []);
  }

  let archivoBase64 = $state('');
  let tipoMime = $state('');
  async function seleccionarArchivo(event) {
    const file = event.target.files?.[0];
    archivoBase64 = ''; tipoMime = '';
    if (!file || !['image/png', 'image/jpeg'].includes(file.type) || file.size > 5 * 1024 * 1024) { toast.error('Seleccione una fotografía PNG o JPEG de hasta 5 MB'); return; }
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
    archivoBase64 = btoa(binary); tipoMime = file.type;
  }

  async function enviarEvidencia(payload) {
    const bytes = Uint8Array.from(atob(payload.archivoBase64), char => char.charCodeAt(0));
    const sha256 = await sha256Base64(payload.archivoBase64);
    const { data: upload } = await apiClient.post(`/proyectos/${projectId}/evidencias/preparar`, {
      tipoMime: payload.tipoMime, bytes: bytes.length, sha256
    });
    const url = new URL(upload.uploadUrl);
    const localR2 = ['localhost', '127.0.0.1'].includes(url.hostname) && ['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (!(url.protocol === 'https:' && url.hostname.endsWith('.r2.cloudflarestorage.com')) && !(localR2 && url.protocol === 'http:')) {
      throw new Error('La dirección de carga de la fotografía no es válida');
    }
    const response = await fetch(url.href, { method: 'PUT', credentials: 'omit', headers: { 'Content-Type': payload.tipoMime }, body: new Blob([bytes], { type: payload.tipoMime }) });
    if (!response.ok) throw new Error('R2 no completó la carga de la fotografía');
    const { data } = await apiClient.post(`/proyectos/${projectId}/evidencias/confirmar`, {
      ticket: upload.ticket, latitud: payload.latitud, longitud: payload.longitud,
      descripcion: payload.descripcion, fechaCaptura: payload.fechaCaptura, hitoId: payload.hitoId,
      fuenteCoordenadas: payload.fuenteCoordenadas, precisionDispositivoMetros: payload.precisionDispositivoMetros
    }, { timeout: 60000 });
    return data;
  }
  // Evidencia Form State
  let showModal = $state(false);
  let formLoading = $state(false);
  let formData = $state({
    urlArchivo: '',
    latitud: '',
    longitud: '',
    precisionDispositivoMetros: null,
    fuenteCoordenadas: 'declarada',
    hitoId: '',
    descripcion: ''
  });

  const fetchProyecto = async () => {
    loading = true;
    offlineSnapshot = null;
    try {
      const { data } = await apiClient.get(`/proyectos/${projectId}`);
      proyecto = data;
      await saveSnapshot(auth.user?.id, `project:${projectId}`, data).catch((error) => console.warn('No se pudo guardar la copia local del proyecto:', error));
    } catch (err) {
      console.error('Error al obtener proyecto:', err);
      if (err.response?.status === 401 || err.response?.status === 403 || err.response?.status === 404) {
        proyecto = null;
        toast.error('No se pudo autorizar o encontrar el proyecto');
      } else {
        const saved = await getSnapshot(auth.user?.id, `project:${projectId}`).catch(() => null);
        proyecto = saved?.data || null;
        offlineSnapshot = saved?.savedAt || null;
        if (!saved) toast.error('No hay copia local de este proyecto. Ábralo con conexión primero.');
      }
    } finally {
      loading = false;
    }
  };

  async function syncDrafts() {
    if (syncing || !navigator.onLine || !auth.puedeEditar('proyectos')) return;
    syncing = true;
    try {
      const pending = await getEvidenceDrafts(auth.user?.id, projectId);
      for (const draft of pending) {
        const { data } = await apiClient.get(`/proyectos/${projectId}`);
        if (!data.evidencias?.some((item) => item.sha256 === draft.sha256)) {
          await enviarEvidencia(draft.payload);
        }
        await removeEvidenceDraft(draft.key);
      }
      if (pending.length) {
        toast.success(`${pending.length} evidencia(s) sincronizada(s)`);
        await fetchProyecto();
      }
    } catch (err) {
      toast.error('No se pudo completar la sincronización. Los borradores siguen en el dispositivo.');
    } finally {
      await refreshDrafts();
      syncing = false;
    }
  }

  onMount(() => {
    fetchProyecto();
    refreshDrafts();
    window.addEventListener('online', syncDrafts);
    return () => window.removeEventListener('online', syncDrafts);
  });

  const handleGeoCapture = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalización no soportada en este dispositivo');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        formData.latitud = pos.coords.latitude.toFixed(6);
        formData.longitud = pos.coords.longitude.toFixed(6);
        formData.precisionDispositivoMetros = pos.coords.accuracy;
        formData.fuenteCoordenadas = 'dispositivo';
        toast.success('Coordenadas obtenidas del dispositivo');
      },
      () => {
        toast.error('No se pudo obtener ubicación. Verifique permisos GPS.');
      }
    );
  };

  const handleAddEvidencia = async (e) => {
    e.preventDefault();
    if (!archivoBase64) { toast.error('Adjunte la fotografía'); return; }
    formLoading = true;
    const payload = {
      archivoBase64, tipoMime,
      latitud: formData.latitud ? parseFloat(formData.latitud) : null,
      longitud: formData.longitud ? parseFloat(formData.longitud) : null,
      precisionDispositivoMetros: formData.precisionDispositivoMetros,
      fuenteCoordenadas: formData.fuenteCoordenadas,
      hitoId: formData.hitoId || null,
      descripcion: formData.descripcion
    };
    try {
      if (navigator.onLine) {
        await enviarEvidencia(payload);
        toast.success('Evidencia guardada en el servidor');
      } else {
        await queueEvidence(auth.user?.id, projectId, payload, await sha256Base64(archivoBase64));
        toast.info('Evidencia guardada solo en este dispositivo. Se enviará al recuperar conexión.');
      }
      showModal = false; archivoBase64 = ''; tipoMime = '';
      formData = { urlArchivo: '', latitud: '', longitud: '', precisionDispositivoMetros: null, fuenteCoordenadas: 'declarada', hitoId: '', descripcion: '' };
      await refreshDrafts();
      if (navigator.onLine) await fetchProyecto();
    } catch (err) {
      if (!err.response && navigator.onLine) {
        try {
          await queueEvidence(auth.user?.id, projectId, payload, await sha256Base64(archivoBase64));
          await refreshDrafts();
          showModal = false; archivoBase64 = ''; tipoMime = '';
          formData = { urlArchivo: '', latitud: '', longitud: '', precisionDispositivoMetros: null, fuenteCoordenadas: 'declarada', hitoId: '', descripcion: '' };
          toast.info('No se completó el envío. La fotografía quedó como borrador local para reintentar.');
        } catch (storageError) {
          toast.error('No se pudo guardar la evidencia en este dispositivo. Mantenga esta pantalla abierta.');
        }
      } else {
        toast.error('Error al registrar evidencia: ' + (err.response?.data?.error || err.message || 'Error'));
      }
    } finally {
      formLoading = false;
    }
  };
</script>

<svelte:head>
  <title>{proyecto?.nombre || 'Detalle de Proyecto'} | MFN Digital</title>
</svelte:head>

<div class="space-y-8 animate-fade-in">
  {#if offlineSnapshot}
    <div role="status" class="rounded-[4px] border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      Expediente guardado en este dispositivo el {new Date(offlineSnapshot).toLocaleString('es-GT')}. Puede estar desactualizado.
      <button onclick={fetchProyecto} class="ml-2 underline font-medium">Reintentar conexión</button>
    </div>
  {/if}
  {#if drafts.length > 0}
    <div role="status" class="rounded-[4px] border border-blue-300 bg-blue-50 p-4 text-sm text-blue-950">
      {drafts.length} evidencia(s) guardada(s) solo en este dispositivo. No forman parte del expediente del servidor todavía.
      <button onclick={syncDrafts} disabled={syncing} class="ml-2 underline font-medium disabled:opacity-50">{syncing ? 'Sincronizando...' : 'Sincronizar ahora'}</button>
    </div>
  {/if}
  <!-- ENCABEZADO SUPERIOR CON VOLVER -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div class="flex items-center gap-4">
      <a 
        href="/proyectos" 
        class="w-11 h-11 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center text-[#071D49]/60 hover:text-[#071D49] hover:bg-gray-50 transition-all card-lift"
        title="Regresar a Cartera de Proyectos"
      >
        <Icon name="arrow_back" className="w-5 h-5" />
      </a>
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="text-[12px] font-medium uppercase tracking-normal text-[#1248AA]">Expediente Fiduciario</span>
          <span class="text-[12px] text-[#071D49]/30">•</span>
          <span class="text-[12px] font-medium uppercase tracking-normal text-[#071D49]/40">{proyecto?.municipio || 'Jurisdicción MFN'}</span>
        </div>
        <h1 class="text-[28px] font-medium tracking-tight text-[#071D49] leading-tight max-w-2xl">
          {loading ? 'Cargando expediente...' : (proyecto?.nombre || 'Proyecto Intermunicipal')}
        </h1>
      </div>
    </div>
    
    {#if auth.puedeEditar('proyectos')}
    <div class="flex items-center gap-3 shrink-0">
      <button 
        onclick={() => showModal = true}
        class="px-6 py-3 bg-[#071D49] hover:bg-black text-white rounded-full text-[13px] font-medium shadow-md transition-all flex items-center gap-2 cursor-pointer pill-interactive"
      >
        <Icon name="add_a_photo" className="w-4 h-4 text-[#1248AA]" stroke={2} />
        Registrar Evidencia GPS
      </button>
    </div>
    {/if}
  </div>

  {#if !loading && proyecto}
    <!-- TARJETAS DE INDICADORES FINANCIEROS Y DE AVANCE -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Card 1: Estado Actual -->
      <div class="glass-light   rounded-[4px] p-6  card-lift">
        <div class="flex items-center justify-between mb-3">
          <span class="text-[12px] font-medium uppercase tracking-normal text-[#071D49]/40">Estado de Obra</span>
          <span class="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Icon name="engineering" className="w-4 h-4" />
          </span>
        </div>
        <p class="text-[24px] font-medium tracking-[-0.03em] text-[#071D49]">{proyecto.estado || 'Sin estado registrado'}</p>
        <p class="text-[11px] text-emerald-600 font-medium mt-2 flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
          Estado registrado en el expediente
        </p>
      </div>

      <!-- Card 2: Avance Físico -->
      <div class="glass-light   rounded-[4px] p-6  card-lift">
        <div class="flex items-center justify-between mb-3">
          <span class="text-[12px] font-medium uppercase tracking-normal text-[#071D49]/40">Avance Físico</span>
          <span class="w-8 h-8 rounded-full bg-[#EDF4FF] flex items-center justify-center text-[#1248AA]">
            <Icon name="trending_up" className="w-4 h-4" />
          </span>
        </div>
        <p class="text-[24px] font-medium tracking-[-0.03em] text-[#071D49]">{proyecto.avance?.aprobado ?? proyecto.porcentajeAvanceFisico ?? 0}%</p>
        <div class="mt-2.5">
          <div class="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div class="bg-[#1248AA] h-1.5 rounded-full transition-all duration-700 ease-out" style="width: {proyecto.avance?.aprobado ?? proyecto.porcentajeAvanceFisico ?? 0}%"></div>
          </div>
        </div>
        <p class="text-[11px] text-[#071D49]/55 mt-2">{proyecto.avance?.metodo || 'Sin plan de hitos'}</p>
      </div>

      <!-- Card 3: Aporte Municipal -->
      <div class="glass-light   rounded-[4px] p-6  card-lift">
        <div class="flex items-center justify-between mb-3">
          <span class="text-[12px] font-medium uppercase tracking-normal text-[#071D49]/40">Aporte Municipal</span>
          <span class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <Icon name="account_balance" className="w-4 h-4" />
          </span>
        </div>
        <p class="text-[22px] font-medium tracking-[-0.03em] text-[#071D49]">Q {(proyecto.presupuestoMunicipal || 0).toLocaleString('es-GT')}</p>
        <p class="text-[11px] text-[#071D49]/50 font-medium mt-2">Presupuesto municipal registrado</p>
      </div>

      <!-- Card 4: Cooperación Externa -->
      <div class="glass-light   rounded-[4px] p-6  card-lift">
        <div class="flex items-center justify-between mb-3">
          <span class="text-[12px] font-medium uppercase tracking-normal text-[#071D49]/40">Aporte Cooperante</span>
          <span class="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
            <Icon name="verified_user" className="w-4 h-4" />
          </span>
        </div>
        <p class="text-[22px] font-medium tracking-[-0.03em] text-[#071D49]">Q {(proyecto.presupuestoCooperacion || 0).toLocaleString('es-GT')}</p>
        <p class="text-[11px] text-[#071D49]/50 font-medium mt-2">{proyecto.agenciaFinanciadora || 'Sin agencia registrada'}</p>
      </div>
    </div>

    <section class="glass-light rounded-[4px] p-5 sm:p-8 space-y-5">
      <div>
        <h2 class="text-xl font-medium text-[#071D49]">Hitos y avance físico</h2>
        <p class="text-sm text-[#071D49]/60">El avance real suma únicamente los pesos de hitos aprobados.</p>
      </div>
      {#if proyecto.avance?.pesoConfigurado > 0}
        <div class="grid gap-4 sm:grid-cols-2">
          <div><p class="text-sm">Programado a hoy: {proyecto.avance.programado}%</p><div class="h-2 bg-gray-100"><div class="h-2 bg-[#1248AA]/45" style={`width: ${proyecto.avance.programado}%`}></div></div></div>
          <div><p class="text-sm">Aprobado: {proyecto.avance.aprobado}%</p><div class="h-2 bg-gray-100"><div class="h-2 bg-[#1248AA]" style={`width: ${proyecto.avance.aprobado}%`}></div></div></div>
        </div>
      {/if}
      <p class="text-xs text-[#071D49]/60">Peso configurado: {proyecto.avance?.pesoConfigurado ?? 0}%. Se requiere 100% para aprobar.</p>
      {#if proyecto.hitos?.length}
        <div class="divide-y divide-[#071D49]/10 border-y border-[#071D49]/10">
          {#each proyecto.hitos as hito}
            <div class="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div><p class="font-medium text-[#071D49]">{hito.nombre} · {hito.pesoPorcentaje}%</p><p class="text-xs text-[#071D49]/60">Planificado: {new Date(hito.fechaPlanificada).toLocaleDateString('es-GT')} · {hito.estado}</p></div>
              {#if auth.puedeAprobar('proyectos') && !offlineSnapshot}
                <button type="button" disabled={milestoneBusy} onclick={() => setMilestoneApproval(hito, hito.estado !== 'Aprobado')} class="px-4 py-2 border border-[#071D49]/30 rounded-[4px] text-sm text-[#071D49] disabled:opacity-50">{hito.estado === 'Aprobado' ? 'Reabrir' : 'Aprobar'}</button>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
      {#if auth.puedeEditar('proyectos') && !offlineSnapshot}
        <form onsubmit={addMilestone} class="grid gap-3 sm:grid-cols-[1fr_7rem_11rem_auto] sm:items-end">
          <label class="text-xs text-[#071D49]/70">Nombre<input required maxlength="180" bind:value={milestoneForm.nombre} class="mt-1 w-full border border-gray-300 p-2 rounded-[4px] text-sm" /></label>
          <label class="text-xs text-[#071D49]/70">Peso %<input required type="number" min="0.01" max="100" step="0.01" bind:value={milestoneForm.pesoPorcentaje} class="mt-1 w-full border border-gray-300 p-2 rounded-[4px] text-sm" /></label>
          <label class="text-xs text-[#071D49]/70">Fecha prevista<input required type="date" bind:value={milestoneForm.fechaPlanificada} class="mt-1 w-full border border-gray-300 p-2 rounded-[4px] text-sm" /></label>
          <button type="submit" disabled={milestoneBusy} class="bg-[#071D49] text-white px-4 py-2 rounded-[4px] text-sm disabled:opacity-50">Agregar hito</button>
        </form>
      {/if}
    </section>

    <!-- SECCIÓN DE EVIDENCIAS FOTOGRÁFICAS -->
    <section class="glass-light  rounded-[4px] p-8  ">
      <div class="flex items-center justify-between pb-6 mb-6 border-b border-gray-50">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="text-[12px] font-medium uppercase tracking-normal text-[#071D49]/40">Galería de Fiscalización</span>
          </div>
          <h2 class="text-xl font-medium text-[#071D49] tracking-tight">Evidencias Fotográficas de Campo</h2>
        </div>
        <span class="text-[11px] font-medium text-[#071D49]/50">
          {(proyecto.evidencias || []).length} registros
        </span>
      </div>

      {#if !proyecto.evidencias || proyecto.evidencias.length === 0}
        <div class="p-12 text-center border-2 border-dashed border-gray-200 rounded-[4px]">
          <Icon name="image_not_supported" className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p class="text-[14px] font-medium text-[#071D49]">No hay evidencias fotográficas registradas</p>
          <p class="text-[12px] text-[#071D49]/40 mt-1 max-w-sm mx-auto">
            Utiliza el botón superior para subir fotos tomadas en el sitio de la obra y, si corresponde, registrar sus coordenadas.
          </p>
        </div>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {#each proyecto.evidencias as evidencia}
            <div class="glass-light   rounded-[4px] overflow-hidden card-lift group">
              <div class="h-48 bg-gray-900 relative overflow-hidden">
                {#if evidencia.urlArchivo}
                  <img src={evidencia.urlArchivo} alt="Fotografía registrada del proyecto" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" />
                {:else}
                  <div class="w-full h-full flex items-center justify-center text-white/70 text-sm">Sin fotografía disponible</div>
                {/if}
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div class="absolute top-3 left-3 bg-[#071D49]/80 backdrop-blur-md rounded-[4px] px-2.5 py-1 text-white text-[12px] font-medium flex items-center gap-1.5">
                  <Icon name="calendar_today" className="w-3 h-3 text-[#1248AA]" />
                  {evidencia.fechaCaptura ? new Date(evidencia.fechaCaptura).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' }) : (evidencia.createdAt ? new Date(evidencia.createdAt).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Reciente')}
                </div>
                {#if evidencia.latitud && evidencia.longitud}
                  <div class="absolute top-3 right-3 bg-emerald-500 rounded-[4px] px-2 py-1 text-white text-[12px] font-medium flex items-center gap-1">
                    <Icon name="satellite_alt" className="w-3 h-3" />
                    Coordenadas registradas
                  </div>
                {/if}
              </div>

              <div class="p-5 space-y-3">
                <p class="text-[12px] font-medium text-[#071D49]/80 leading-relaxed line-clamp-2">
                  {evidencia.descripcion || 'Sin descripción registrada.'}
                </p>
                <p class="text-[11px] text-[#071D49]/60">{proyecto.hitos?.find(hito => hito.id === evidencia.hitoId)?.nombre || 'Sin hito asociado'} · {evidencia.validacionUbicacion || 'Ubicación histórica'}</p>
                {#if evidencia.municipioExif}<p class="text-[11px] text-[#071D49]/60">EXIF: {evidencia.municipioExif}</p>{/if}
                {#if evidencia.municipioDispositivo}<p class="text-[11px] text-[#071D49]/60">Dispositivo: {evidencia.municipioDispositivo}</p>{/if}
                <div class="pt-3 border-t border-gray-50 flex items-center justify-between text-[11px]">
                  <span class="text-[12px] font-mono font-medium text-[#071D49]/50">
                    {evidencia.latitud != null && evidencia.longitud != null ? `${evidencia.latitud}°, ${evidencia.longitud}°` : 'Sin coordenadas'}
                  </span>
                  {#if evidencia.latitud && evidencia.longitud}
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${evidencia.latitud},${evidencia.longitud}`} 
                      target="_blank" 
                      rel="noreferrer"
                      class="text-[11px] font-medium text-[#1248AA] hover:underline flex items-center gap-1"
                    >
                      <Icon name="location_on" className="w-3.5 h-3.5" />
                      Ver mapa
                    </a>
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  {/if}
</div>

<!-- MODAL REGISTRO DE EVIDENCIA -->
{#if showModal && auth.puedeEditar('proyectos')}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div 
    transition:fade={{ duration: 180 }} 
    class="fixed inset-0 bg-[#071D49]/25 backdrop-blur-sm z-50 flex items-center justify-center p-4" 
    onclick={() => showModal = false}
  >
    <div 
      transition:fly={{ y: 20, duration: 250 }} 
      class="glass-light rounded-[4px] w-full max-w-lg  p-8  "
      onclick={e => e.stopPropagation()}
    >
      <div class="flex justify-between items-center mb-6 pb-4 border-b border-gray-50">
        <div>
          <span class="text-[12px] font-medium uppercase tracking-normal text-[#1248AA]">Fiscalización de Obra</span>
          <h2 class="text-xl font-medium text-[#071D49] tracking-tight">Registrar Evidencia de Campo</h2>
        </div>
        <button 
          onclick={() => showModal = false} 
          class="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-[#071D49]/40 hover:text-[#071D49] transition-colors"
        >
          <Icon name="close" className="w-4 h-4" stroke={2} />
        </button>
      </div>

      <form onsubmit={handleAddEvidencia} class="space-y-4">
        {#if proyecto?.hitos?.length}
          <label class="block text-xs text-[#071D49]/70">Hito relacionado
            <select bind:value={formData.hitoId} required class="mt-1 w-full p-3 border border-gray-300 rounded-[4px] text-sm"><option value="">Seleccione un hito</option>{#each proyecto.hitos as hito}<option value={hito.id}>{hito.nombre}</option>{/each}</select>
          </label>
        {/if}
        <div>
          <label for="field-1" class="block text-[12px] font-medium uppercase tracking-normal text-[#071D49]/50 mb-1.5">Fotografía PNG o JPEG (hasta 5 MB)</label>
          <input id="field-1" type="file" accept="image/png,image/jpeg" onchange={seleccionarArchivo} required class="w-full p-3 border rounded-[4px]" />
        </div>
        
        <div>
          <div class="flex justify-between items-center mb-1.5">
            <span class="block text-[12px] font-medium uppercase tracking-normal text-[#071D49]/50">Geolocalización GPS</span>
            <button 
              type="button" 
              onclick={handleGeoCapture} 
              class="text-[12px] font-medium text-[#1248AA] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Icon name="my_location" className="w-3 h-3" />
              Obtener GPS actual
            </button>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input 
              bind:value={formData.latitud} 
              oninput={() => { formData.fuenteCoordenadas = 'declarada'; formData.precisionDispositivoMetros = null; }}
              type="text" 
              placeholder="Latitud (ej: 15.7314)" 
              class="w-full bg-white border border-gray-200 focus:border-[#1248AA] rounded-[4px] px-4 py-2.5 text-[12px] font-mono text-[#071D49]"
            />
            <input 
              bind:value={formData.longitud} 
              oninput={() => { formData.fuenteCoordenadas = 'declarada'; formData.precisionDispositivoMetros = null; }}
              type="text" 
              placeholder="Longitud (ej: -91.4821)" 
              class="w-full bg-white border border-gray-200 focus:border-[#1248AA] rounded-[4px] px-4 py-2.5 text-[12px] font-mono text-[#071D49]"
            />
          </div>
          <p class="mt-2 text-xs text-[#071D49]/55">Fuente: {formData.fuenteCoordenadas === 'dispositivo' ? `GPS del dispositivo (±${Math.round(formData.precisionDispositivoMetros ?? 0)} m)` : 'Coordenadas declaradas o sin GPS'}. El EXIF se leerá de la foto en el servidor.</p>
        </div>

        <div>
          <label for="field-2" class="block text-[12px] font-medium uppercase tracking-normal text-[#071D49]/50 mb-1.5">Descripción de Avance de Obra</label>
          <textarea id="field-2"
            required 
            bind:value={formData.descripcion} 
            rows="3" 
            placeholder="Detalle los trabajos observados en la visita técnica..." 
            class="w-full bg-white border border-gray-200 focus:border-[#1248AA] focus:ring-1 focus:ring-[#1248AA] rounded-[4px] px-4 py-3 text-[13px] text-[#071D49] transition-all outline-none resize-none"
          ></textarea>
        </div>

        <div class="pt-4 flex justify-end gap-3 border-t border-gray-50 mt-6">
          <button 
            type="button" 
            onclick={() => showModal = false} 
            class="px-6 py-2.5 rounded-full font-medium text-[#071D49]/60 hover:bg-gray-50 transition-colors text-[13px]"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            disabled={formLoading} 
            class="px-7 py-2.5 bg-[#071D49] hover:bg-black text-white rounded-full font-medium shadow-md transition-all text-[13px] disabled:opacity-50 flex items-center gap-2 cursor-pointer pill-interactive"
          >
            <Icon name="upload" className="w-4 h-4 text-[#1248AA]" stroke={2.5} />
            {formLoading ? 'Guardando...' : 'Guardar Evidencia'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
