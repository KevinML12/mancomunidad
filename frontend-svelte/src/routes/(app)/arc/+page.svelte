<script>
  import { onMount } from 'svelte';
  import apiClient from '$lib/apiClient';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { toast } from 'svelte-sonner';
  import { fade, fly } from 'svelte/transition';

  let tareas = $state([]);
  let loading = $state(true);
  let filtroDimension = $state('todas');
  let filtroPrioridad = $state('todas');
  let searchQuery = $state('');

  // Modal
  let showModal = $state(false);
  let formLoading = $state(false);
  let nuevaTarea = $state({
    titulo: '',
    descripcion: '',
    dimension: 'Planificación y Monitoreo',
    prioridad: 'Media',
    municipio: 'Regional',
    responsable: 'Ing. Carlos Méndez',
    fechaLimite: ''
  });

  const COLUMNAS = [
    { id: 'Pendiente', label: 'Pendiente', color: 'bg-gray-100 text-gray-700', border: 'border-gray-200' },
    { id: 'En Proceso', label: 'En Proceso', color: 'bg-blue-50 text-blue-700', border: 'border-blue-200' },
    { id: 'En Revisión', label: 'En Revisión', color: 'bg-amber-50 text-amber-700', border: 'border-amber-200' },
    { id: 'Finalizado', label: 'Finalizado', color: 'bg-emerald-50 text-emerald-700', border: 'border-emerald-200' }
  ];

  async function fetchTareas() {
    loading = true;
    try {
      const { data } = await apiClient.get('/arc');
      if (Array.isArray(data)) {
        tareas = data;
      }
    } catch (err) {
      console.error('Error al cargar tareas ARC de la BD:', err);
      toast.error('No se pudo cargar el tablero ARC desde la base de datos');
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    fetchTareas();
  });

  async function cambiarEstado(tareaId, nuevoEstado) {
    try {
      await apiClient.put(`/arc/${tareaId}`, { estado: nuevoEstado });
      toast.success(`Estado actualizado en la BD: ${nuevoEstado}`);
      await fetchTareas();
    } catch (err) {
      console.error('Error al actualizar estado:', err);
      toast.error('No se pudo actualizar el estado en la base de datos');
    }
  }

  async function crearTarea(e) {
    e.preventDefault();
    formLoading = true;
    try {
      await apiClient.post('/arc', nuevaTarea);
      toast.success('Meta del Plan ARC guardada en la base de datos');
      showModal = false;
      nuevaTarea = {
        titulo: '',
        descripcion: '',
        dimension: 'Planificación y Monitoreo',
        prioridad: 'Media',
        municipio: 'Regional',
        responsable: 'Ing. Carlos Méndez',
        fechaLimite: ''
      };
      await fetchTareas();
    } catch (err) {
      console.error('Error al crear tarea en la BD:', err);
      toast.error('Error al guardar la meta en la base de datos');
    } finally {
      formLoading = false;
    }
  }

  // Filtrado reactivo
  let tareasFiltradas = $derived(
    tareas.filter(t => {
      if (filtroDimension !== 'todas' && t.dimension !== filtroDimension) return false;
      if (filtroPrioridad !== 'todas' && t.prioridad !== filtroPrioridad) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = t.titulo.toLowerCase().includes(q) || 
                      t.codigo.toLowerCase().includes(q) || 
                      t.responsable.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    })
  );

  // Métricas reactivas
  let totalTareas = $derived(tareas.length);
  let finalizadas = $derived(tareas.filter(t => t.estado === 'Finalizado').length);
  let enProcesoCount = $derived(tareas.filter(t => t.estado === 'En Proceso').length);
  let enRevisionCount = $derived(tareas.filter(t => t.estado === 'En Revisión').length);
  let vencidasCount = $derived(tareas.filter(t => t.estaVencida).length);
  let cumplimientoPct = $derived(totalTareas > 0 ? Math.round((finalizadas / totalTareas) * 100) : 0);
</script>

<svelte:head>
  <title>Plan de Mejoras (ARC) | MFN Digital</title>
</svelte:head>

<!-- HEADER DEL MÓDULO -->
<header class="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-8 mt-2">
  <div>
    <div class="flex items-center gap-2 mb-2">
      <span class="text-[9px] font-bold uppercase tracking-[0.15em] text-[#3B82F6]">Módulo 02</span>
      <span class="text-[9px] text-[#0A1526]/30">•</span>
      <span class="text-[9px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40">Autovaloración y Reconocimiento de Capacidades</span>
    </div>
    <h2 class="text-[40px] font-black tracking-[-0.04em] leading-none text-[#0A1526] mb-3">Plan de Mejoras (ARC)</h2>
    <p class="text-[13px] text-[#0A1526]/50 leading-relaxed max-w-2xl">
      Supervisión activa de metas estratégicas, asignación de responsabilidades y alertas preventivas de vencimiento.
    </p>
  </div>

  <div class="flex items-center gap-3 shrink-0 flex-wrap">
    <!-- Buscador -->
    <div class="relative">
      <input 
        type="text" 
        bind:value={searchQuery}
        placeholder="Buscar tarea, código o responsable..." 
        class="w-[280px] pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-full text-[13px] text-[#0A1526] placeholder-[#0A1526]/30 shadow-sm focus:outline-none focus:border-[#3B82F6] transition-all" 
      />
      <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#0A1526]/30" />
    </div>

    <!-- Filtro Dimensión -->
    <select 
      bind:value={filtroDimension} 
      class="px-4 py-3 bg-white border border-gray-100 rounded-full shadow-sm text-[12px] font-bold text-[#0A1526] focus:outline-none transition-colors"
    >
      <option value="todas">Todas las Dimensiones</option>
      <option value="Planificación y Monitoreo">Planificación y Monitoreo</option>
      <option value="Gestión de Proyectos e Inversión">Gestión de Proyectos</option>
      <option value="Probidad, Transparencia y Eficiencia Institucional">Probidad y Transparencia</option>
    </select>

    <!-- Botón Crear -->
    <button 
      onclick={() => showModal = true} 
      class="px-6 py-3 bg-[#0A1526] hover:bg-black text-white rounded-full text-[13px] font-bold shadow-md transition-colors flex items-center gap-2 cursor-pointer"
    >
      <Icon name="add" className="w-[18px] h-[18px] text-[#3B82F6]" stroke={2.5} />
      Nueva Tarea ARC
    </button>
  </div>
</header>

<!-- BARRA EJECUTIVA DE KPIS -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
  <!-- KPI 1: Cumplimiento Global -->
  <div class="bg-white border border-gray-100 rounded-[24px] p-6 shadow-[0_20px_60px_-15px_rgba(10,21,38,0.04)] card-lift">
    <div class="flex items-center justify-between mb-3">
      <span class="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#0A1526]/40">Cumplimiento Global</span>
      <span class="w-8 h-8 rounded-full bg-[#EBF3FF] flex items-center justify-center text-[#3B82F6]">
        <Icon name="fact_check" className="w-4 h-4" />
      </span>
    </div>
    <p class="text-[28px] font-black tracking-[-0.04em] text-[#0A1526]">{cumplimientoPct}%</p>
    <div class="mt-3">
      <div class="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div class="bg-[#3B82F6] h-1.5 rounded-full transition-all duration-700 ease-out" style="width: {cumplimientoPct}%"></div>
      </div>
      <p class="text-[10px] text-[#0A1526]/40 font-medium mt-1.5">{finalizadas} de {totalTareas} metas cumplidas</p>
    </div>
  </div>

  <!-- KPI 2: En Proceso -->
  <div class="bg-white border border-gray-100 rounded-[24px] p-6 shadow-[0_20px_60px_-15px_rgba(10,21,38,0.04)] card-lift">
    <div class="flex items-center justify-between mb-3">
      <span class="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#0A1526]/40">Acciones en Proceso</span>
      <span class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
        <Icon name="pending_actions" className="w-4 h-4" />
      </span>
    </div>
    <p class="text-[28px] font-black tracking-[-0.04em] text-[#0A1526]">{enProcesoCount}</p>
    <p class="text-[11px] text-[#0A1526]/50 font-medium mt-2">Ejecución operativa en municipios</p>
  </div>

  <!-- KPI 3: En Revisión (M&E) -->
  <div class="bg-white border border-gray-100 rounded-[24px] p-6 shadow-[0_20px_60px_-15px_rgba(10,21,38,0.04)] card-lift">
    <div class="flex items-center justify-between mb-3">
      <span class="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#0A1526]/40">En Revisión (M&E)</span>
      <span class="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
        <Icon name="rate_review" className="w-4 h-4" />
      </span>
    </div>
    <p class="text-[28px] font-black tracking-[-0.04em] text-[#0A1526]">{enRevisionCount}</p>
    <p class="text-[11px] text-[#0A1526]/50 font-medium mt-2">Monitoreo y Evaluación validando</p>
  </div>

  <!-- KPI 4: Alertas de Vencimiento -->
  <div class="bg-white border border-gray-100 rounded-[24px] p-6 shadow-[0_20px_60px_-15px_rgba(10,21,38,0.04)] card-lift">
    <div class="flex items-center justify-between mb-3">
      <span class="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#0A1526]/40">Metas Vencidas</span>
      <span class="w-8 h-8 rounded-full {vencidasCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'} flex items-center justify-center">
        <Icon name="notification_important" className="w-4 h-4" />
      </span>
    </div>
    <p class="text-[28px] font-black tracking-[-0.04em] {vencidasCount > 0 ? 'text-rose-600' : 'text-[#0A1526]'}">{vencidasCount}</p>
    <p class="text-[11px] font-medium mt-2 {vencidasCount > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}">
      {vencidasCount > 0 ? 'Alerta de incumplimiento activa' : 'Sin retrasos institucionales'}
    </p>
  </div>
</div>

<!-- TABLERO KANBAN (RF7, RF8, RF9) -->
<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
  {#each COLUMNAS as col, colIdx}
    {@const tareasCol = tareasFiltradas.filter(t => t.estado === col.id)}
    <div class="bg-[#F8FAFC] border border-gray-200/60 rounded-[28px] p-5 shadow-xs flex flex-col min-h-[500px] animate-slide-up stagger-{colIdx + 1}">
      <!-- Header de Columna -->
      <div class="flex items-center justify-between pb-4 mb-4 border-b border-gray-200/60">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full {col.id === 'Pendiente' ? 'bg-gray-400' : col.id === 'En Proceso' ? 'bg-[#3B82F6]' : col.id === 'En Revisión' ? 'bg-amber-500' : 'bg-emerald-500'}"></span>
          <h3 class="text-[13px] font-black text-[#0A1526] tracking-tight">{col.label}</h3>
        </div>
        <span class="text-[10px] font-black text-[#0A1526]/50 bg-white border border-gray-200 px-2 py-0.5 rounded-full shadow-xs">
          {tareasCol.length}
        </span>
      </div>

      <!-- Tarjetas de la Columna -->
      <div class="space-y-4 flex-1">
        {#if tareasCol.length === 0}
          <div class="h-32 border-2 border-dashed border-gray-200/80 rounded-2xl flex items-center justify-center text-[11px] text-[#0A1526]/30 font-medium">
            Sin tareas en este estado
          </div>
        {:else}
          {#each tareasCol as tarea}
            <div class="bg-white border border-gray-100 rounded-[20px] p-5 shadow-[0_10px_30px_-10px_rgba(10,21,38,0.04)] card-lift group relative">
              <!-- Top tags -->
              <div class="flex items-center justify-between gap-2 mb-2.5">
                <span class="text-[9px] font-mono font-bold text-[#3B82F6] bg-blue-50 px-2 py-0.5 rounded-md">
                  {tarea.codigo}
                </span>
                <span class="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full {tarea.prioridad === 'Alta' ? 'bg-rose-50 text-rose-700' : tarea.prioridad === 'Media' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'}">
                  {tarea.prioridad}
                </span>
              </div>

              <!-- Título y Descripción -->
              <h4 class="text-[13px] font-black text-[#0A1526] leading-snug tracking-tight mb-1.5 group-hover:text-[#3B82F6] transition-colors">
                {tarea.titulo}
              </h4>
              <p class="text-[11px] text-[#0A1526]/50 line-clamp-3 leading-relaxed mb-4">
                {tarea.descripcion}
              </p>

              <!-- Dimensión ARC -->
              <div class="mb-3.5 pb-3 border-b border-gray-50 flex items-center gap-1.5 text-[10px] font-semibold text-[#0A1526]/60">
                <Icon name="corporate_fare" className="w-3.5 h-3.5 text-[#3B82F6]" />
                <span class="truncate">{tarea.dimension}</span>
              </div>

              <!-- Footer: Responsable y Alerta de Vencimiento -->
              <div class="space-y-2">
                <div class="flex items-center justify-between text-[11px]">
                  <span class="text-[10px] font-bold text-[#0A1526]/40 uppercase tracking-wider">Responsable:</span>
                  <span class="font-bold text-[#0A1526]">{tarea.responsable}</span>
                </div>

                <div class="flex items-center justify-between text-[11px]">
                  <span class="text-[10px] font-bold text-[#0A1526]/40 uppercase tracking-wider">Fecha límite:</span>
                  <span class="font-mono text-[11px] font-bold {tarea.estaVencida ? 'text-rose-600' : 'text-[#0A1526]/70'}">
                    {tarea.fechaLimite}
                  </span>
                </div>

                <!-- Notificación Visual Roja si está Vencida (RF9) -->
                {#if tarea.estaVencida}
                  <div class="bg-rose-50 border border-rose-200/60 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 text-rose-700 text-[10px] font-bold animate-pulse-soft">
                    <span class="w-1.5 h-1.5 rounded-full bg-rose-600 beacon-dot text-rose-600 shrink-0"></span>
                    <span>Meta vencida ({Math.abs(tarea.diasRestantes)} días de retraso)</span>
                  </div>
                {:else if tarea.diasRestantes <= 3 && tarea.estado !== 'Finalizado'}
                  <div class="bg-amber-50 border border-amber-200/60 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 text-amber-800 text-[10px] font-bold">
                    <Icon name="schedule" className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                    <span>Vence pronto ({tarea.diasRestantes} días restantes)</span>
                  </div>
                {/if}
              </div>

              <!-- Botones de Transición Rápida Kanban -->
              <div class="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
                <span class="text-[9px] font-bold uppercase tracking-wider text-[#0A1526]/30">Mover a:</span>
                <div class="flex items-center gap-1">
                  {#if col.id !== 'Pendiente'}
                    <button 
                      onclick={() => cambiarEstado(tarea.id, col.id === 'Finalizado' ? 'En Revisión' : col.id === 'En Revisión' ? 'En Proceso' : 'Pendiente')}
                      class="px-2 py-1 rounded-md text-[10px] font-bold text-[#0A1526]/60 hover:bg-gray-100 transition-colors pill-interactive"
                      title="Regresar estado"
                    >
                      ←
                    </button>
                  {/if}
                  {#if col.id !== 'Finalizado'}
                    <button 
                      onclick={() => cambiarEstado(tarea.id, col.id === 'Pendiente' ? 'En Proceso' : col.id === 'En Proceso' ? 'En Revisión' : 'Finalizado')}
                      class="px-2.5 py-1 rounded-md text-[10px] font-bold bg-[#0A1526] hover:bg-black text-white shadow-xs transition-colors flex items-center gap-1 cursor-pointer pill-interactive"
                    >
                      <span>Avanzar</span>
                      <span>→</span>
                    </button>
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {/each}
</div>

<!-- MODAL NUEVA TAREA ARC (RF8) -->
{#if showModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div transition:fade={{ duration: 180 }} class="fixed inset-0 bg-[#0A1526]/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick={() => showModal = false}>
    <div transition:fly={{ y: 20, duration: 250 }} class="bg-white rounded-[32px] w-full max-w-xl shadow-[0_24px_60px_-20px_rgba(10,21,38,0.12)] p-8 border border-gray-100" onclick={e => e.stopPropagation()}>
      <div class="flex justify-between items-center mb-6 border-b border-gray-50 pb-4">
        <div>
          <span class="text-[9px] font-bold uppercase tracking-[0.15em] text-[#3B82F6]">Plan de Mejoras ARC</span>
          <h2 class="text-xl font-black text-[#0A1526] tracking-tight">Nueva Meta Operativa</h2>
        </div>
        <button onclick={() => showModal = false} class="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
          <Icon name="close" className="w-5 h-5 text-[#0A1526]/50" stroke={2} />
        </button>
      </div>

      <form onsubmit={crearTarea} class="space-y-4">
        <div>
          <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1.5">Título de la Meta</label>
          <input required bind:value={nuevaTarea.titulo} type="text" class="w-full bg-white border border-gray-200 focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] rounded-xl px-4 py-3 text-[13px] text-[#0A1526] shadow-sm transition-all" placeholder="Ej: Implementación de Módulo Financiero..." />
        </div>

        <div>
          <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1.5">Instrucción y Descripción</label>
          <textarea required bind:value={nuevaTarea.descripcion} rows="3" class="w-full bg-white border border-gray-200 focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] rounded-xl px-4 py-3 text-[13px] text-[#0A1526] shadow-sm transition-all" placeholder="Detalle los compromisos institucionales derivados del informe ARC..."></textarea>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1.5">Dimensión ARC</label>
            <select bind:value={nuevaTarea.dimension} class="w-full bg-white border border-gray-200 focus:border-[#3B82F6] rounded-xl px-4 py-3 text-[12px] text-[#0A1526]">
              <option value="Planificación y Monitoreo">Planificación y Monitoreo</option>
              <option value="Gestión de Proyectos e Inversión">Gestión de Proyectos e Inversión</option>
              <option value="Probidad, Transparencia y Eficiencia Institucional">Probidad, Transparencia y Eficiencia</option>
            </select>
          </div>

          <div>
            <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1.5">Prioridad</label>
            <select bind:value={nuevaTarea.prioridad} class="w-full bg-white border border-gray-200 focus:border-[#3B82F6] rounded-xl px-4 py-3 text-[12px] text-[#0A1526]">
              <option value="Alta">Alta</option>
              <option value="Media">Media</option>
              <option value="Baja">Baja</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1.5">Responsable Asignado</label>
            <input required bind:value={nuevaTarea.responsable} type="text" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-[#0A1526]" placeholder="Ej: Ing. Carlos Méndez" />
          </div>

          <div>
            <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1.5">Fecha Límite Estricta</label>
            <input required bind:value={nuevaTarea.fechaLimite} type="date" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-[#0A1526]" />
          </div>
        </div>

        <div class="pt-4 flex justify-end gap-3 mt-6 border-t border-gray-50 pt-5">
          <button type="button" onclick={() => showModal = false} class="px-6 py-3 rounded-full font-bold text-[#0A1526]/60 hover:bg-gray-50 transition-colors text-[13px]">Cancelar</button>
          <button type="submit" disabled={formLoading} class="px-8 py-3 bg-[#0A1526] text-white rounded-full font-bold hover:bg-black shadow-md transition-all text-[13px] disabled:opacity-50">
            {formLoading ? 'Guardando...' : 'Asignar Tarea ARC'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
