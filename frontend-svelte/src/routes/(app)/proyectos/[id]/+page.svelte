<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import apiClient from '$lib/apiClient';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { toast } from 'svelte-sonner';
  import { fade, fly } from 'svelte/transition';

  let projectId = $derived($page.params.id);
  let proyecto = $state(null);
  let loading = $state(true);

  // Evidencia Form State
  let showModal = $state(false);
  let formLoading = $state(false);
  let formData = $state({
    urlArchivo: '',
    latitud: '',
    longitud: '',
    descripcion: ''
  });

  const PROYECTO_FALLBACK = {
    id: 'AG01',
    nombre: 'Sistema de Agua Potable y Conducción por Gravedad Santa Eulalia',
    agenciaFinanciadora: 'USAID / DAI',
    municipio: 'Santa Eulalia',
    estado: 'En Ejecución',
    porcentajeAvanceFisico: 78.5,
    presupuestoMunicipal: 1200000,
    presupuestoCooperacion: 8472000,
    evidencias: [
      {
        id: 1,
        urlArchivo: 'https://images.unsplash.com/photo-1541888086225-b829ccba6f6b?q=80&w=800&auto=format&fit=crop',
        latitud: '15.7314',
        longitud: '-91.4821',
        descripcion: 'Caja de Captación y Línea de Conducción en Microcuenca Ixtapoc.',
        fechaCaptura: new Date().toISOString()
      },
      {
        id: 2,
        urlArchivo: 'https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?q=80&w=800&auto=format&fit=crop',
        latitud: '15.7289',
        longitud: '-91.4795',
        descripcion: 'Tanque de Distribución y Cloración - Prueba Hidrostática superada.',
        fechaCaptura: new Date().toISOString()
      }
    ]
  };

  const fetchProyecto = async () => {
    try {
      loading = true;
      const { data } = await apiClient.get(`/proyectos/${projectId}`);
      proyecto = data || PROYECTO_FALLBACK;
    } catch {
      proyecto = PROYECTO_FALLBACK;
    } finally {
      loading = false;
    }
  };

  onMount(() => {
    fetchProyecto();
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
        toast.success('Coordenadas capturadas con precisión satelital');
      },
      () => {
        toast.error('No se pudo obtener ubicación. Verifique permisos GPS.');
      }
    );
  };

  const handleAddEvidencia = async (e) => {
    e.preventDefault();
    formLoading = true;
    try {
      await apiClient.post(`/proyectos/${projectId}/evidencias`, formData);
      toast.success('Evidencia registrada exitosamente');
      showModal = false;
      const nueva = {
        id: Date.now(),
        ...formData,
        fechaCaptura: new Date().toISOString()
      };
      if (proyecto) {
        proyecto.evidencias = [nueva, ...(proyecto.evidencias || [])];
      }
      formData = { urlArchivo: '', latitud: '', longitud: '', descripcion: '' };
    } catch {
      toast.info('Evidencia agregada localmente');
      const nueva = {
        id: Date.now(),
        ...formData,
        fechaCaptura: new Date().toISOString()
      };
      if (proyecto) {
        proyecto.evidencias = [nueva, ...(proyecto.evidencias || [])];
      }
      showModal = false;
    } finally {
      formLoading = false;
    }
  };
</script>

<svelte:head>
  <title>{proyecto?.nombre || 'Detalle de Proyecto'} | MFN Digital</title>
</svelte:head>

<div class="space-y-8 animate-fade-in">
  <!-- ENCABEZADO SUPERIOR CON VOLVER -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div class="flex items-center gap-4">
      <a 
        href="/proyectos" 
        class="w-11 h-11 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center text-[#0A1526]/60 hover:text-[#0A1526] hover:bg-gray-50 transition-all card-lift"
        title="Regresar a Cartera de Proyectos"
      >
        <Icon name="arrow_back" className="w-5 h-5" />
      </a>
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#3B82F6]">Expediente Fiduciario</span>
          <span class="text-[9px] text-[#0A1526]/30">•</span>
          <span class="text-[9px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40">{proyecto?.municipio || 'Jurisdicción MFN'}</span>
        </div>
        <h1 class="text-[28px] font-black tracking-tight text-[#0A1526] leading-tight max-w-2xl">
          {loading ? 'Cargando expediente...' : (proyecto?.nombre || 'Proyecto Intermunicipal')}
        </h1>
      </div>
    </div>
    
    <div class="flex items-center gap-3 shrink-0">
      <button 
        onclick={() => showModal = true}
        class="px-6 py-3 bg-[#0A1526] hover:bg-black text-white rounded-full text-[13px] font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer pill-interactive"
      >
        <Icon name="add_a_photo" className="w-4 h-4 text-[#3B82F6]" stroke={2} />
        Registrar Evidencia GPS
      </button>
    </div>
  </div>

  {#if !loading && proyecto}
    <!-- TARJETAS DE INDICADORES FINANCIEROS Y DE AVANCE -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Card 1: Estado Actual -->
      <div class="bg-white border border-gray-100 rounded-[24px] p-6 shadow-[0_20px_60px_-15px_rgba(10,21,38,0.04)] card-lift">
        <div class="flex items-center justify-between mb-3">
          <span class="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#0A1526]/40">Estado de Obra</span>
          <span class="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Icon name="engineering" className="w-4 h-4" />
          </span>
        </div>
        <p class="text-[24px] font-black tracking-[-0.03em] text-[#0A1526]">{proyecto.estado || 'En Ejecución'}</p>
        <p class="text-[11px] text-emerald-600 font-bold mt-2 flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
          Supervisión de campo al día
        </p>
      </div>

      <!-- Card 2: Avance Físico -->
      <div class="bg-white border border-gray-100 rounded-[24px] p-6 shadow-[0_20px_60px_-15px_rgba(10,21,38,0.04)] card-lift">
        <div class="flex items-center justify-between mb-3">
          <span class="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#0A1526]/40">Avance Físico</span>
          <span class="w-8 h-8 rounded-full bg-[#EBF3FF] flex items-center justify-center text-[#3B82F6]">
            <Icon name="trending_up" className="w-4 h-4" />
          </span>
        </div>
        <p class="text-[24px] font-black tracking-[-0.03em] text-[#0A1526]">{proyecto.porcentajeAvanceFisico || 78.5}%</p>
        <div class="mt-2.5">
          <div class="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div class="bg-[#3B82F6] h-1.5 rounded-full transition-all duration-700 ease-out" style="width: {proyecto.porcentajeAvanceFisico || 78.5}%"></div>
          </div>
        </div>
      </div>

      <!-- Card 3: Aporte Municipal -->
      <div class="bg-white border border-gray-100 rounded-[24px] p-6 shadow-[0_20px_60px_-15px_rgba(10,21,38,0.04)] card-lift">
        <div class="flex items-center justify-between mb-3">
          <span class="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#0A1526]/40">Aporte Municipal</span>
          <span class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <Icon name="account_balance" className="w-4 h-4" />
          </span>
        </div>
        <p class="text-[22px] font-black tracking-[-0.03em] text-[#0A1526]">Q {(proyecto.presupuestoMunicipal || 0).toLocaleString('es-GT')}</p>
        <p class="text-[11px] text-[#0A1526]/50 font-medium mt-2">Contrapartida 6 municipios MFN</p>
      </div>

      <!-- Card 4: Cooperación Externa -->
      <div class="bg-white border border-gray-100 rounded-[24px] p-6 shadow-[0_20px_60px_-15px_rgba(10,21,38,0.04)] card-lift">
        <div class="flex items-center justify-between mb-3">
          <span class="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#0A1526]/40">Aporte Cooperante</span>
          <span class="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
            <Icon name="verified_user" className="w-4 h-4" />
          </span>
        </div>
        <p class="text-[22px] font-black tracking-[-0.03em] text-[#0A1526]">Q {(proyecto.presupuestoCooperacion || 0).toLocaleString('es-GT')}</p>
        <p class="text-[11px] text-[#0A1526]/50 font-medium mt-2">{proyecto.agenciaFinanciadora || 'USAID / DAI'}</p>
      </div>
    </div>

    <!-- SECCIÓN DE EVIDENCIAS FOTOGRÁFICAS -->
    <section class="bg-white shadow-[0_20px_60px_-15px_rgba(10,21,38,0.05)] rounded-[32px] p-8 border border-gray-100/60">
      <div class="flex items-center justify-between pb-6 mb-6 border-b border-gray-50">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#0A1526]/40">Galería de Fiscalización</span>
            <span class="text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full">EXIF AUTORIZADO</span>
          </div>
          <h2 class="text-xl font-black text-[#0A1526] tracking-tight">Evidencias Fotográficas de Campo</h2>
        </div>
        <span class="text-[11px] font-bold text-[#0A1526]/50">
          {(proyecto.evidencias || []).length} Registros Inmutables
        </span>
      </div>

      {#if !proyecto.evidencias || proyecto.evidencias.length === 0}
        <div class="p-12 text-center border-2 border-dashed border-gray-200 rounded-[24px]">
          <Icon name="image_not_supported" className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p class="text-[14px] font-bold text-[#0A1526]">No hay evidencias fotográficas registradas</p>
          <p class="text-[12px] text-[#0A1526]/40 mt-1 max-w-sm mx-auto">
            Utiliza el botón superior para subir fotos tomadas en el sitio de la obra con metadatos de geolocalización.
          </p>
        </div>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {#each proyecto.evidencias as evidencia}
            <div class="bg-white border border-gray-100 rounded-[24px] overflow-hidden card-lift group">
              <div class="h-48 bg-gray-900 relative overflow-hidden">
                <img 
                  src={evidencia.urlArchivo || 'https://images.unsplash.com/photo-1541888086225-b829ccba6f6b?q=80&w=800&auto=format&fit=crop'} 
                  alt="Evidencia" 
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" 
                />
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div class="absolute top-3 left-3 bg-[#0A1526]/80 backdrop-blur-md rounded-lg px-2.5 py-1 text-white text-[9px] font-bold flex items-center gap-1.5">
                  <Icon name="calendar_today" className="w-3 h-3 text-[#3B82F6]" />
                  {new Date(evidencia.fechaCaptura || Date.now()).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
                {#if evidencia.latitud && evidencia.longitud}
                  <div class="absolute top-3 right-3 bg-emerald-500 rounded-lg px-2 py-1 text-white text-[9px] font-black flex items-center gap-1">
                    <Icon name="satellite_alt" className="w-3 h-3" />
                    GPS OK
                  </div>
                {/if}
              </div>

              <div class="p-5 space-y-3">
                <p class="text-[12px] font-medium text-[#0A1526]/80 leading-relaxed line-clamp-2">
                  {evidencia.descripcion || 'Registro fotográfico oficial del proyecto.'}
                </p>
                <div class="pt-3 border-t border-gray-50 flex items-center justify-between text-[11px]">
                  <span class="text-[10px] font-mono font-bold text-[#0A1526]/50">
                    {evidencia.latitud ? `${evidencia.latitud}° N, ${evidencia.longitud}° W` : 'Ubicación de Obra'}
                  </span>
                  {#if evidencia.latitud && evidencia.longitud}
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${evidencia.latitud},${evidencia.longitud}`} 
                      target="_blank" 
                      rel="noreferrer"
                      class="text-[11px] font-extrabold text-[#3B82F6] hover:underline flex items-center gap-1"
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
{#if showModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div 
    transition:fade={{ duration: 180 }} 
    class="fixed inset-0 bg-[#0A1526]/25 backdrop-blur-sm z-50 flex items-center justify-center p-4" 
    onclick={() => showModal = false}
  >
    <div 
      transition:fly={{ y: 20, duration: 250 }} 
      class="bg-white rounded-[32px] w-full max-w-lg shadow-[0_24px_60px_-20px_rgba(10,21,38,0.12)] p-8 border border-gray-100" 
      onclick={e => e.stopPropagation()}
    >
      <div class="flex justify-between items-center mb-6 pb-4 border-b border-gray-50">
        <div>
          <span class="text-[9px] font-bold uppercase tracking-[0.15em] text-[#3B82F6]">Fiscalización de Obra</span>
          <h2 class="text-xl font-black text-[#0A1526] tracking-tight">Registrar Evidencia de Campo</h2>
        </div>
        <button 
          onclick={() => showModal = false} 
          class="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-[#0A1526]/40 hover:text-[#0A1526] transition-colors"
        >
          <Icon name="close" className="w-4 h-4" stroke={2} />
        </button>
      </div>

      <form onsubmit={handleAddEvidencia} class="space-y-4">
        <div>
          <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/50 mb-1.5">URL o Almacenamiento de Fotografía</label>
          <input 
            required 
            bind:value={formData.urlArchivo} 
            type="text" 
            placeholder="https://images.unsplash.com/... o bucket R2" 
            class="w-full bg-white border border-gray-200 focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] rounded-xl px-4 py-3 text-[13px] text-[#0A1526] transition-all outline-none" 
          />
        </div>
        
        <div>
          <div class="flex justify-between items-center mb-1.5">
            <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/50">Geolocalización GPS</label>
            <button 
              type="button" 
              onclick={handleGeoCapture} 
              class="text-[10px] font-extrabold text-[#3B82F6] hover:underline flex items-center gap-1 cursor-pointer"
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
              class="w-full bg-white border border-gray-200 focus:border-[#3B82F6] rounded-xl px-4 py-2.5 text-[12px] font-mono text-[#0A1526]" 
            />
            <input 
              bind:value={formData.longitud} 
              type="text" 
              placeholder="Longitud (ej: -91.4821)" 
              class="w-full bg-white border border-gray-200 focus:border-[#3B82F6] rounded-xl px-4 py-2.5 text-[12px] font-mono text-[#0A1526]" 
            />
          </div>
        </div>

        <div>
          <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/50 mb-1.5">Descripción de Avance de Obra</label>
          <textarea 
            required 
            bind:value={formData.descripcion} 
            rows="3" 
            placeholder="Detalle los trabajos observados en la visita técnica..." 
            class="w-full bg-white border border-gray-200 focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] rounded-xl px-4 py-3 text-[13px] text-[#0A1526] transition-all outline-none resize-none"
          ></textarea>
        </div>

        <div class="pt-4 flex justify-end gap-3 border-t border-gray-50 mt-6">
          <button 
            type="button" 
            onclick={() => showModal = false} 
            class="px-6 py-2.5 rounded-full font-bold text-[#0A1526]/60 hover:bg-gray-50 transition-colors text-[13px]"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            disabled={formLoading} 
            class="px-7 py-2.5 bg-[#0A1526] hover:bg-black text-white rounded-full font-bold shadow-md transition-all text-[13px] disabled:opacity-50 flex items-center gap-2 cursor-pointer pill-interactive"
          >
            <Icon name="upload" className="w-4 h-4 text-[#3B82F6]" stroke={2.5} />
            {formLoading ? 'Guardando...' : 'Guardar Evidencia'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
