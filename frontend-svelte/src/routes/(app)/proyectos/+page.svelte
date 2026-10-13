<script>
  import { onMount } from 'svelte';
  import apiClient from '$lib/apiClient';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { toast } from 'svelte-sonner';
  import { auth } from '$lib/stores/auth.svelte.js';
  import { getSnapshot, saveSnapshot } from '$lib/offline-field.js';
  import { fade, fly } from 'svelte/transition';

  let proyectos = $state([]);
  let selectedProyecto = $state(null);
  let loading = $state(true);
  let offlineSnapshot = $state(null);
  let searchQuery = $state('');
  let proyectosFiltrados = $derived(proyectos.filter(p => `${p.nombre} ${p.municipio} ${p.agencia} ${p.id}`.toLowerCase().includes(searchQuery.toLowerCase().trim())));
  
  // Modal states
  let showModal = $state(false);
  let formLoading = $state(false);
  let formData = $state({
    nombre: '',
    agenciaFinanciadora: '',
    municipio: 'Santa Eulalia',
    fechaInicioPlanificada: '',
    fechaFinPlanificada: '',
    presupuestoMunicipal: 0,
    presupuestoCooperacion: 0
  });

  function applyProjects(data) {
    proyectos = data.map((d) => {
      const totalQ = (d.presupuestoMunicipal || 0) + (d.presupuestoCooperacion || 0);
      return {
        id: d.id.toString(), codigo: 'Proyecto #', sufijo: d.id.toString(),
        nombre: d.nombre, agencia: d.agenciaFinanciadora || 'Sin agencia registrada',
        municipio: d.municipio || 'Regional', subregion: 'TERRITORIO MFN',
        presupuestoQ: `Q ${totalQ.toLocaleString()}`, estado: d.estado || 'Planificación',
        estadoTipo: d.estado === 'Finalizado' ? 'emerald' : d.estado === 'Ejecución' ? 'blue' : 'amber',
        avance: d.porcentajeAvanceFisico || 0, evidenciasCount: d._count?.evidencias || 0
      };
    });
    selectedProyecto = proyectos.find((p) => p.id === selectedProyecto?.id) || proyectos[0] || null;
  }

  const fetchProyectos = async () => {
    loading = true;
    offlineSnapshot = null;
    try {
      const { data } = await apiClient.get('/proyectos');
      if (!Array.isArray(data)) throw new Error('Respuesta de proyectos inválida');
      await saveSnapshot(auth.user?.id, 'projects', data).catch((error) => console.warn('No se pudo guardar la copia local de proyectos:', error));
      applyProjects(data);
    } catch (err) {
      console.error('Error al consultar proyectos de la base de datos:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        toast.error('No se pudo autorizar la consulta de proyectos');
      } else {
        const saved = await getSnapshot(auth.user?.id, 'projects').catch(() => null);
        if (saved && Array.isArray(saved.data)) {
          offlineSnapshot = saved.savedAt;
          applyProjects(saved.data);
        } else {
          toast.error('No hay una copia local de los proyectos. Conéctese al menos una vez.');
        }
      }
    } finally {
      loading = false;
    }
  };

  onMount(() => {
    fetchProyectos();
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    formLoading = true;
    try {
      await apiClient.post('/proyectos', {
        ...formData,
        fechaInicioPlanificada: formData.fechaInicioPlanificada || new Date().toISOString().split('T')[0],
        presupuestoMunicipal: Number(formData.presupuestoMunicipal),
        presupuestoCooperacion: Number(formData.presupuestoCooperacion)
      });
      toast.success('Proyecto guardado en la base de datos');
      showModal = false;
      await fetchProyectos();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo guardar el proyecto. Revise la conexión.');
    } finally {
      formLoading = false;
    }
  };
</script>

<svelte:head>
  <title>Proyectos Intermunicipales | MFN Digital</title>
</svelte:head>

<!-- HEADER SUPERIOR -->
<header class="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-8 mt-2">
  <div>
    <div class="flex items-center gap-2 mb-2">
      <span class="text-[12px] font-bold uppercase tracking-normal text-[#1248AA]">Módulo 01</span>
      <span class="text-[12px] text-[#071D49]/30">•</span>
      <span class="text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40">Concurrencia Fiduciaria y Territorial</span>
    </div>
    <h2 class="text-[40px] font-semibold tracking-[-0.04em] leading-none text-[#071D49] mb-3">Proyectos Intermunicipales</h2>
    <p class="text-[13px] text-[#071D49]/50 leading-relaxed max-w-xl">Presupuestos, avance reportado y evidencias registradas para cada proyecto.</p>
  </div>
  <div class="flex items-center gap-3 shrink-0">
    <!-- Buscador -->
    <div class="relative">
      <input type="text" bind:value={searchQuery} placeholder="Buscar por proyecto o municipio..." class="w-[300px] pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-full text-[13px] text-[#071D49] placeholder-[#071D49]/30 shadow-sm focus:outline-none focus:border-[#1248AA] transition-all" />
      <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#071D49]/30" />
    </div>
    <!-- Nuevo Proyecto -->
    {#if auth.puedeEditar('proyectos')}
    <button onclick={() => showModal = true} class="px-6 py-3 bg-[#071D49] hover:bg-black text-white rounded-full text-[13px] font-bold shadow-md transition-colors flex items-center gap-2">
      <Icon name="add" className="w-[18px] h-[18px] text-[#1248AA]" stroke={2.5} />
      Nuevo Proyecto
    </button>
    {/if}
  </div>
</header>
{#if offlineSnapshot}
  <div role="status" class="mb-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
    Mostrando proyectos guardados en este dispositivo el {new Date(offlineSnapshot).toLocaleString('es-GT')}. Pueden estar desactualizados.
    <button onclick={fetchProyectos} class="ml-2 underline font-semibold">Reintentar conexión</button>
  </div>
{/if}

<!-- TARJETA DE DATOS (CARTERA DE INVERSIÓN) -->
<section class="glass-light  rounded-[32px] p-8 mb-8  ">
  <div class="flex items-center justify-between pb-6 mb-2 border-b border-gray-50">
    <div>
      <h3 class="text-[12px] font-semibold uppercase tracking-normal text-[#071D49]/40 mb-1">Cartera de Inversión Vigente</h3>
      <p class="text-[12px] font-medium text-[#071D49]/50">Proyectos registrados en el sistema</p>
    </div>
    <div class="bg-white border border-gray-100 px-3.5 py-1.5 rounded-full shadow-sm">
      <span class="text-[12px] font-semibold text-[#071D49]/60 uppercase tracking-widest">{proyectosFiltrados.length} de {proyectos.length} proyectos</span>
    </div>
  </div>

  <div class="overflow-x-auto">
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b border-gray-50">
          <th class="py-5 px-4 text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40">Proyecto / Expediente</th>
          <th class="py-5 px-4 text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40">Agencia Cooperante</th>
          <th class="py-5 px-4 text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40">Municipio Ejecutor</th>
          <th class="py-5 px-4 text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40">Presupuesto</th>
          <th class="py-5 px-4 text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40">Estado</th>
          <th class="py-5 px-4 text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40 w-44">Avance Físico</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-50/50">
        {#each proyectosFiltrados as p}
          <tr 
            class="transition-colors cursor-pointer group {selectedProyecto?.id === p.id ? 'bg-[#FFFFFF]/60' : 'hover:bg-gray-50/50'}"
            onclick={() => selectedProyecto = p}
          >
            <td class="py-5 px-4">
              <div class="flex items-start gap-3">
                <span class="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 {selectedProyecto?.id === p.id ? 'bg-[#1248AA]' : 'bg-[#071D49]/20 group-hover:bg-[#1248AA]/50'} transition-colors"></span>
                <div>
                  <div class="flex items-center gap-1 mb-1">
                    <span class="text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40">{p.codigo}</span>
                    <span class="text-[12px] font-bold uppercase tracking-normal text-[#1248AA]">{p.sufijo}</span>
                  </div>
                  <p class="text-[13px] font-semibold text-[#071D49] leading-tight tracking-tight max-w-[210px]">{p.nombre}</p>
                </div>
              </div>
            </td>
            <td class="py-5 px-4">
              <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full {p.agencia.includes('USAID') ? 'bg-[#EDF4FF] text-[#1D4ED8] border border-[#1248AA]/10' : p.agencia.includes('AECID') ? 'bg-amber-50 text-amber-800 border border-amber-200/50' : p.agencia.includes('BID') ? 'bg-cyan-50 text-cyan-800 border border-cyan-200/50' : 'bg-gray-100 text-gray-700 border border-gray-200'}">
                <Icon name="verified_user" className="w-3.5 h-3.5" />
                <span class="text-[11px] font-semibold tracking-tight">{p.agencia}</span>
              </span>
            </td>
            <td class="py-5 px-4">
              <p class="text-[13px] font-bold text-[#071D49] tracking-tight">{p.municipio}</p>
              <p class="text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40 mt-0.5">{p.subregion}</p>
            </td>
            <td class="py-5 px-4">
              <p class="text-[16px] font-semibold tracking-[-0.02em] text-[#071D49]">{p.presupuestoQ}</p>
            </td>
            <td class="py-5 px-4">
              <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full {p.estadoTipo === 'emerald' ? 'bg-[#ECFDF5] text-emerald-700 border-emerald-100' : p.estadoTipo === 'amber' ? 'bg-[#FFFBEB] text-amber-700 border-amber-100' : 'bg-blue-50 text-blue-700 border-blue-100'} border">
                <span class="w-1.5 h-1.5 rounded-full {p.estadoTipo === 'emerald' ? 'bg-emerald-500' : p.estadoTipo === 'amber' ? 'bg-amber-500' : 'bg-blue-500'}"></span>
                <span class="text-[11px] font-semibold tracking-tight">{p.estado}</span>
              </span>
            </td>
            <td class="py-5 px-4">
              <div class="space-y-1.5 pr-4">
                <div class="flex items-end justify-between">
                  <span class="text-[14px] font-semibold text-[#071D49] leading-none">{p.avance}%</span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-1">
                  <div class="bg-[#1248AA] h-1 rounded-full transition-all duration-500" style="width: {p.avance}%"></div>
                </div>
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>

{#if selectedProyecto}
<section class="glass-light rounded-[32px] p-8 space-y-4">
  <h3 class="text-xl font-semibold text-[#071D49]">{selectedProyecto.nombre}</h3>
  <p class="text-sm text-[#071D49]/60">{selectedProyecto.municipio} · Presupuesto registrado: {selectedProyecto.presupuestoQ} · Avance físico reportado: {selectedProyecto.avance}%</p>
  <p class="text-sm text-[#071D49]/60">{selectedProyecto.evidenciasCount} evidencias registradas</p>
  <a href="/proyectos/{selectedProyecto.id}" class="inline-flex px-5 py-3 bg-[#071D49] text-white rounded-full text-sm font-semibold">Ver expediente y evidencias</a>
</section>
{/if}

{#if showModal && auth.puedeEditar('proyectos')}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div transition:fade={{ duration: 180 }} class="fixed inset-0 bg-[#071D49]/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick={() => showModal = false}>
    <div transition:fly={{ y: 20, duration: 250 }} class="glass-light mfn-form-dialog rounded-[32px] w-full max-w-2xl  p-8  " onclick={e => e.stopPropagation()}>
      <div class="flex justify-between items-center mb-6 border-b border-gray-50 pb-4">
        <h2 class="text-xl font-semibold text-[#071D49] tracking-tight">Nuevo Proyecto de Inversión</h2>
        <button onclick={() => showModal = false} class="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
          <Icon name="close" className="w-5 h-5 text-[#071D49]/50" stroke={2} />
        </button>
      </div>

      <form onsubmit={handleSubmit} class="space-y-5">
        <div>
          <label for="field-1" class="block text-[12px] font-bold uppercase tracking-normal text-[#071D49]/50 mb-1.5">Nombre del Proyecto</label>
          <input id="field-1" required bind:value={formData.nombre} type="text" class="w-full bg-white border border-gray-200 focus:border-[#1248AA] focus:ring-1 focus:ring-[#1248AA] rounded-xl px-4 py-3 text-[13px] text-[#071D49] shadow-sm transition-all" placeholder="Ej: Sistema de Agua Potable..." />
        </div>
        
        <div class="grid grid-cols-2 gap-5">
          <div>
            <label for="field-2" class="block text-[12px] font-bold uppercase tracking-normal text-[#071D49]/50 mb-1.5">Agencia Cooperante</label>
            <input id="field-2" required bind:value={formData.agenciaFinanciadora} type="text" class="w-full bg-white border border-gray-200 focus:border-[#1248AA] focus:ring-1 focus:ring-[#1248AA] rounded-xl px-4 py-3 text-[13px] text-[#071D49] shadow-sm transition-all" placeholder="Ej: USAID / AECID" />
          </div>
          <div>
            <label for="field-3" class="block text-[12px] font-bold uppercase tracking-normal text-[#071D49]/50 mb-1.5">Municipio</label>
            <select id="field-3" bind:value={formData.municipio} class="w-full bg-white border border-gray-200 focus:border-[#1248AA] focus:ring-1 focus:ring-[#1248AA] rounded-xl px-4 py-3 text-[13px] text-[#071D49] shadow-sm transition-all">
              <option value="Santa Eulalia">Santa Eulalia</option>
              <option value="San Pedro Soloma">San Pedro Soloma</option>
              <option value="San Rafael la Independencia">San Rafael la Independencia</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-5">
          <div>
            <label for="field-4" class="block text-[12px] font-bold uppercase tracking-normal text-[#071D49]/50 mb-1.5">Aporte Municipal (Q)</label>
            <input id="field-4" required bind:value={formData.presupuestoMunicipal} type="number" min="0" step="0.01" class="w-full bg-white border border-gray-200 focus:border-[#1248AA] focus:ring-1 focus:ring-[#1248AA] rounded-xl px-4 py-3 text-[13px] text-[#071D49] shadow-sm transition-all" />
          </div>
          <div>
            <label for="field-5" class="block text-[12px] font-bold uppercase tracking-normal text-[#071D49]/50 mb-1.5">Aporte Cooperación (Q)</label>
            <input id="field-5" required bind:value={formData.presupuestoCooperacion} type="number" min="0" step="0.01" class="w-full bg-white border border-gray-200 focus:border-[#1248AA] focus:ring-1 focus:ring-[#1248AA] rounded-xl px-4 py-3 text-[13px] text-[#071D49] shadow-sm transition-all" />
          </div>
        </div>

        <div class="pt-4 flex justify-end gap-3 mt-8 border-t border-gray-50 pt-6">
          <button type="button" onclick={() => showModal = false} class="px-6 py-3 rounded-full font-bold text-[#071D49]/60 hover:bg-gray-50 transition-colors text-[13px]">Cancelar</button>
          <button type="submit" disabled={formLoading} class="px-8 py-3 bg-[#071D49] text-white rounded-full font-bold hover:bg-black shadow-md transition-all text-[13px] disabled:opacity-50">
            {formLoading ? 'Registrando...' : 'Registrar Proyecto'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
