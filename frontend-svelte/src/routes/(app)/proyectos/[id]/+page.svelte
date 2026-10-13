<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import apiClient from '$lib/apiClient';
  import ProjectMilestones from '$lib/components/ui/ProjectMilestones.svelte';
  import EvidenceReview from '$lib/components/ui/EvidenceReview.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { toast } from 'svelte-sonner';
  import { auth } from '$lib/stores/auth.svelte.js';
  import { getSnapshot, saveSnapshot, queueEvidence, getEvidenceDrafts, removeEvidenceDraft, updateEvidenceDraft, sha256Base64 } from '$lib/offline-field.js';
  import { fade, fly } from 'svelte/transition';

  let projectId = $derived($page.params.id);
  let proyecto = $state(null);
  let loading = $state(true);
  let offlineSnapshot = $state(null);
  let drafts = $state([]);
  let syncing = $state(false);

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
  // Evidencia Form State
  let showModal = $state(false);
  let formLoading = $state(false);
  let formData = $state({
    hitoId: '',
    urlArchivo: '',
    latitud: '',
    longitud: '',
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
      let received = 0;
      for (const draft of pending) {
        try {
          const payload = { ...draft.payload, claveEnvio: draft.payload.claveEnvio || draft.key.split(':').at(-1) };
          await updateEvidenceDraft(draft,{status:'Enviando',lastError:''});
          const { data } = await apiClient.post(`/proyectos/${projectId}/evidencias`, payload);
          if (!data.id || data.sha256 !== draft.sha256) throw new Error('No se recibió confirmación del archivo');
          await removeEvidenceDraft(draft.key);
          received++;
        } catch (error) {
          await updateEvidenceDraft(draft,{status:'Pendiente',lastError:error.response?.data?.error || 'Sin confirmación del servidor. Reintente con conexión.'});
          if (!error.response || [401,403].includes(error.response.status)) break;
        }
      }
      if (pending.length) {
        if (received) toast.success(`${received} evidencia(s) recibida(s) por el servidor`);
        if (received < pending.length) toast.error('Quedan borradores pendientes. Revise el motivo antes de reintentar');
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
    fetchProyecto().then(syncDrafts);
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
      archivoBase64, tipoMime, claveEnvio: crypto.randomUUID(), fechaCaptura: new Date().toISOString(),
      hitoId: formData.hitoId || null,
      latitud: formData.latitud === '' ? null : Number(formData.latitud),
      longitud: formData.longitud === '' ? null : Number(formData.longitud),
      descripcion: formData.descripcion
    };
    try {
      await queueEvidence(auth.user?.id, projectId, payload, await sha256Base64(archivoBase64));
      showModal = false; archivoBase64 = ''; tipoMime = '';
      formData = { hitoId: '', urlArchivo: '', latitud: '', longitud: '', descripcion: '' };
      await refreshDrafts();
      toast.info('Guardada en este dispositivo; pendiente de confirmación del servidor');
      if (navigator.onLine) await syncDrafts();
    } catch (err) {
      toast.error('No se pudo conservar el borrador local. Mantenga esta pantalla abierta y conserve la fotografía original.');

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
    <div role="status" class="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      Expediente guardado en este dispositivo el {new Date(offlineSnapshot).toLocaleString('es-GT')}. Puede estar desactualizado.
      <button onclick={fetchProyecto} class="ml-2 underline font-semibold">Reintentar conexión</button>
    </div>
  {/if}
  {#if drafts.length > 0}
    <div role="status" class="rounded-2xl border border-blue-300 bg-blue-50 p-4 text-sm text-blue-950">
      {drafts.length} evidencia(s) guardada(s) solo en este dispositivo. No forman parte del expediente del servidor todavía.
      <button onclick={syncDrafts} disabled={syncing} class="ml-2 underline font-semibold disabled:opacity-50">{syncing ? 'Sincronizando...' : 'Sincronizar ahora'}</button>
      {#each drafts as draft}
        <a class="block mt-2 underline" download={`MFN-borrador-${draft.key.split(':').at(-1)}.${draft.payload.tipoMime === 'image/png' ? 'png' : 'jpg'}`} href={`data:${draft.payload.tipoMime};base64,${draft.payload.archivoBase64}`}>Descargar fotografía original del borrador</a>
        <p class="mt-2">{draft.payload.descripcion || 'Fotografía de campo'} · {draft.status || 'Pendiente de envío'}{draft.lastError ? `: ${draft.lastError}` : ''}</p>
      {/each}
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
          <span class="text-[12px] font-semibold uppercase tracking-normal text-[#1248AA]">Expediente Fiduciario</span>
          <span class="text-[12px] text-[#071D49]/30">•</span>
          <span class="text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40">{proyecto?.municipio || 'Jurisdicción MFN'}</span>
        </div>
        <h1 class="text-[28px] font-semibold tracking-tight text-[#071D49] leading-tight max-w-2xl">
          {loading ? 'Cargando expediente...' : (proyecto?.nombre || 'Proyecto Intermunicipal')}
        </h1>
      </div>
    </div>
    
    {#if auth.puedeEditar('proyectos')}
    <div class="flex items-center gap-3 shrink-0">
      <button 
        onclick={() => showModal = true}
        class="px-6 py-3 bg-[#071D49] hover:bg-black text-white rounded-full text-[13px] font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer pill-interactive"
      >
        <Icon name="add_a_photo" className="w-4 h-4 text-[#1248AA]" stroke={2} />
        Registrar Evidencia de Campo
      </button>
    </div>
    {/if}
  </div>

  {#if !loading && proyecto}
    <!-- TARJETAS DE INDICADORES FINANCIEROS Y DE AVANCE -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Card 1: Estado Actual -->
      <div class="glass-light   rounded-[24px] p-6  card-lift">
        <div class="flex items-center justify-between mb-3">
          <span class="text-[12px] font-semibold uppercase tracking-normal text-[#071D49]/40">Estado de Obra</span>
          <span class="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Icon name="engineering" className="w-4 h-4" />
          </span>
        </div>
        <p class="text-[24px] font-semibold tracking-[-0.03em] text-[#071D49]">{proyecto.estado || 'Sin estado registrado'}</p>
        <p class="text-[11px] text-emerald-600 font-bold mt-2 flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
          Estado registrado en el expediente
        </p>
      </div>

      <!-- Card 2: Avance Físico -->
      <div class="glass-light   rounded-[24px] p-6  card-lift">
        <div class="flex items-center justify-between mb-3">
          <span class="text-[12px] font-semibold uppercase tracking-normal text-[#071D49]/40">Avance Físico</span>
          <span class="w-8 h-8 rounded-full bg-[#EDF4FF] flex items-center justify-center text-[#1248AA]">
            <Icon name="trending_up" className="w-4 h-4" />
          </span>
        </div>
        <p class="text-[24px] font-semibold tracking-[-0.03em] text-[#071D49]">{proyecto.porcentajeAvanceFisico ?? 0}%</p>
        <div class="mt-2.5">
          <div class="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div class="bg-[#1248AA] h-1.5 rounded-full transition-all duration-700 ease-out" style="width: {proyecto.porcentajeAvanceFisico ?? 0}%"></div>
          </div>
        </div>
      </div>

      <!-- Card 3: Aporte Municipal -->
      <div class="glass-light   rounded-[24px] p-6  card-lift">
        <div class="flex items-center justify-between mb-3">
          <span class="text-[12px] font-semibold uppercase tracking-normal text-[#071D49]/40">Aporte Municipal</span>
          <span class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <Icon name="account_balance" className="w-4 h-4" />
          </span>
        </div>
        <p class="text-[22px] font-semibold tracking-[-0.03em] text-[#071D49]">Q {(proyecto.presupuestoMunicipal || 0).toLocaleString('es-GT')}</p>
        <p class="text-[11px] text-[#071D49]/50 font-medium mt-2">Presupuesto municipal registrado</p>
      </div>

      <!-- Card 4: Cooperación Externa -->
      <div class="glass-light   rounded-[24px] p-6  card-lift">
        <div class="flex items-center justify-between mb-3">
          <span class="text-[12px] font-semibold uppercase tracking-normal text-[#071D49]/40">Aporte Cooperante</span>
          <span class="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
            <Icon name="verified_user" className="w-4 h-4" />
          </span>
        </div>
        <p class="text-[22px] font-semibold tracking-[-0.03em] text-[#071D49]">Q {(proyecto.presupuestoCooperacion || 0).toLocaleString('es-GT')}</p>
        <p class="text-[11px] text-[#071D49]/50 font-medium mt-2">{proyecto.agenciaFinanciadora || 'Sin agencia registrada'}</p>
      </div>
    </div>

    <ProjectMilestones {proyecto} refresh={fetchProyecto} offline={!!offlineSnapshot} />
    <!-- SECCIÓN DE EVIDENCIAS FOTOGRÁFICAS -->
    <section class="glass-light  rounded-[32px] p-8  ">
      <div class="flex items-center justify-between pb-6 mb-6 border-b border-gray-50">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="text-[12px] font-semibold uppercase tracking-normal text-[#071D49]/40">Galería de Fiscalización</span>
          </div>
          <h2 class="text-xl font-semibold text-[#071D49] tracking-tight">Evidencias Fotográficas de Campo</h2>
        </div>
        <span class="text-[11px] font-bold text-[#071D49]/50">
          {(proyecto.evidencias || []).length} registros
        </span>
      </div>

      {#if !proyecto.evidencias || proyecto.evidencias.length === 0}
        <div class="p-12 text-center border-2 border-dashed border-gray-200 rounded-[24px]">
          <Icon name="image_not_supported" className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p class="text-[14px] font-bold text-[#071D49]">No hay evidencias fotográficas registradas</p>
          <p class="text-[12px] text-[#071D49]/40 mt-1 max-w-sm mx-auto">
            Utiliza el botón superior para subir fotos tomadas en el sitio de la obra y, si corresponde, registrar sus coordenadas.
          </p>
        </div>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {#each proyecto.evidencias as evidencia}
            <div class="glass-light   rounded-[24px] overflow-hidden card-lift group">
              <div class="h-48 bg-gray-900 relative overflow-hidden">
                {#if evidencia.urlArchivo}
                  <img src={evidencia.urlArchivo} alt="Fotografía registrada del proyecto" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" />
                {:else}
                  <div class="w-full h-full flex items-center justify-center text-white/70 text-sm">Sin fotografía disponible</div>
                {/if}
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div class="absolute top-3 left-3 bg-[#071D49]/80 backdrop-blur-md rounded-lg px-2.5 py-1 text-white text-[12px] font-bold flex items-center gap-1.5">
                  <Icon name="calendar_today" className="w-3 h-3 text-[#1248AA]" />
                  {evidencia.fechaCaptura ? new Date(evidencia.fechaCaptura).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' }) : (evidencia.createdAt ? new Date(evidencia.createdAt).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Reciente')}
                </div>
                {#if evidencia.latitud != null && evidencia.longitud != null}
                  <div class="absolute top-3 right-3 bg-emerald-500 rounded-lg px-2 py-1 text-white text-[12px] font-semibold flex items-center gap-1">
                    <Icon name="satellite_alt" className="w-3 h-3" />
                    Coordenadas registradas
                  </div>
                {/if}
              </div>

              <div class="p-5 space-y-3">
                <p class="text-sm font-semibold">{proyecto.hitos?.find(h => h.id === evidencia.hitoId)?.nombre || 'Documentación general; no suma avance'}</p>
                <EvidenceReview {evidencia} {projectId} refresh={fetchProyecto} offline={!!offlineSnapshot} />
                <p class="text-[12px] font-medium text-[#071D49]/80 leading-relaxed line-clamp-2">
                  {evidencia.descripcion || 'Sin descripción registrada.'}
                </p>
                <div class="pt-3 border-t border-gray-50 flex items-center justify-between text-[11px]">
                  <span class="text-[12px] font-mono font-bold text-[#071D49]/50">
                    {evidencia.latitud != null && evidencia.longitud != null ? `${evidencia.latitud}°, ${evidencia.longitud}°` : 'Sin coordenadas'}
                  </span>
                  {#if evidencia.latitud != null && evidencia.longitud != null}
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${evidencia.latitud},${evidencia.longitud}`} 
                      target="_blank" 
                      rel="noreferrer"
                      class="text-[11px] font-semibold text-[#1248AA] hover:underline flex items-center gap-1"
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
      class="glass-light mfn-form-dialog rounded-[32px] w-full max-w-lg p-8"
      onclick={e => e.stopPropagation()}
    >
      <div class="flex justify-between items-center mb-6 pb-4 border-b border-gray-50">
        <div>
          <span class="text-[12px] font-bold uppercase tracking-normal text-[#1248AA]">Fiscalización de Obra</span>
          <h2 class="text-xl font-semibold text-[#071D49] tracking-tight">Registrar Evidencia de Campo</h2>
        </div>
        <button 
          onclick={() => showModal = false} 
          class="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-[#071D49]/40 hover:text-[#071D49] transition-colors"
        >
          <Icon name="close" className="w-4 h-4" stroke={2} />
        </button>
      </div>

      <form onsubmit={handleAddEvidencia} class="space-y-4">
        <p class="text-sm">El archivo original se conserva. La fecha y ubicación declaradas no acreditan por sí solas dónde o cuándo se tomó la fotografía.</p>
        {#if proyecto?.avancePorHitos}
          <label class="block">Hito al que corresponde<select bind:value={formData.hitoId} class="block w-full bg-white border rounded-xl p-3"><option value="">Documentación general (no suma avance)</option>{#each proyecto.hitos || [] as hito}<option value={hito.id}>{hito.nombre}</option>{/each}</select></label>
        {/if}
        <div>
          <label for="field-1" class="block text-[12px] font-bold uppercase tracking-normal text-[#071D49]/50 mb-1.5">Fotografía PNG o JPEG (hasta 5 MB)</label>
          <input id="field-1" type="file" accept="image/png,image/jpeg" onchange={seleccionarArchivo} required class="w-full p-3 border rounded-xl" />
        </div>
        
        <div>
          <div class="flex justify-between items-center mb-1.5">
            <span class="block text-[12px] font-bold uppercase tracking-normal text-[#071D49]/50">Geolocalización GPS</span>
            <button 
              type="button" 
              onclick={handleGeoCapture} 
              class="text-[12px] font-semibold text-[#1248AA] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Icon name="my_location" className="w-3 h-3" />
              Obtener GPS actual
            </button>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <input 
              bind:value={formData.latitud} 
              type="text" 
              placeholder="Latitud (ej: 15.7314)" 
              class="w-full bg-white border border-gray-200 focus:border-[#1248AA] rounded-xl px-4 py-2.5 text-[12px] font-mono text-[#071D49]" 
            />
            <input 
              bind:value={formData.longitud} 
              type="text" 
              placeholder="Longitud (ej: -91.4821)" 
              class="w-full bg-white border border-gray-200 focus:border-[#1248AA] rounded-xl px-4 py-2.5 text-[12px] font-mono text-[#071D49]" 
            />
          </div>
        </div>

        <div>
          <label for="field-2" class="block text-[12px] font-bold uppercase tracking-normal text-[#071D49]/50 mb-1.5">Descripción de Avance de Obra</label>
          <textarea id="field-2"
            required 
            bind:value={formData.descripcion} 
            rows="3" 
            placeholder="Detalle los trabajos observados en la visita técnica..." 
            class="w-full bg-white border border-gray-200 focus:border-[#1248AA] focus:ring-1 focus:ring-[#1248AA] rounded-xl px-4 py-3 text-[13px] text-[#071D49] transition-all outline-none resize-none"
          ></textarea>
        </div>

        <div class="pt-4 flex justify-end gap-3 border-t border-gray-50 mt-6">
          <button 
            type="button" 
            onclick={() => showModal = false} 
            class="px-6 py-2.5 rounded-full font-bold text-[#071D49]/60 hover:bg-gray-50 transition-colors text-[13px]"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            disabled={formLoading} 
            class="px-7 py-2.5 bg-[#071D49] hover:bg-black text-white rounded-full font-bold shadow-md transition-all text-[13px] disabled:opacity-50 flex items-center gap-2 cursor-pointer pill-interactive"
          >
            <Icon name="upload" className="w-4 h-4 text-[#1248AA]" stroke={2.5} />
            {formLoading ? 'Guardando...' : 'Guardar Evidencia'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
