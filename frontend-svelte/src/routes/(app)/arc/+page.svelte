<script>
  import { onMount } from 'svelte';
  import apiClient from '$lib/apiClient';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { toast } from 'svelte-sonner';
  import { fade, fly } from 'svelte/transition';
  import { auth } from '$lib/stores/auth.svelte.js';
  import { MUNICIPIOS_MFN } from '$lib/municipios.js';

  let tareas = $state([]);
  let loading = $state(true);
  let filtroDimension = $state('todas');
  let filtroPrioridad = $state('todas');
  let filtroMunicipio = $state('todos');
  let searchQuery = $state('');
  let asignables = $state([]);
  let municipiosPermitidos = $derived(['GE', 'JD'].includes(auth.role) ? ['Regional', ...MUNICIPIOS_MFN] : (auth.user?.municipios || []));

  function openModal() {
    nuevaTarea.municipio = municipiosPermitidos[0] || '';
    showModal = true;
    if (nuevaTarea.municipio) fetchAsignables(nuevaTarea.municipio);
  }

  async function fetchAsignables(municipio) {
    nuevaTarea.responsableId = '';
    try { asignables = (await apiClient.get(`/arc/asignables?municipio=${encodeURIComponent(municipio)}`)).data; }
    catch { asignables = []; toast.error('No se pudieron cargar las cuentas disponibles'); }
  }

  // Drag and Drop (RF7)
  let draggingTaskId = $state(null);
  let dragOverColId = $state(null);

  // Modal
  let showModal = $state(false);
  let formLoading = $state(false);
  let nuevaTarea = $state({
    titulo: '',
    descripcion: '',
    dimension: 'Planificación y Monitoreo',
    prioridad: 'Media',
    municipio: 'Regional',
    responsableId: '',
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
      toast.error(err.response?.data?.error || 'No se pudo actualizar la tarea. Revise la conexión.');
    }
  }

  async function crearTarea(e) {
    e.preventDefault();
    formLoading = true;
    try {
      await apiClient.post('/arc', { ...nuevaTarea, responsableId: Number(nuevaTarea.responsableId) });
      toast.success('Meta del Plan ARC guardada en la base de datos');
      showModal = false;
      nuevaTarea = {
        titulo: '',
        descripcion: '',
        dimension: 'Planificación y Monitoreo',
        prioridad: 'Media',
        municipio: 'Regional',
        responsableId: '',
        fechaLimite: ''
      };
      await fetchTareas();
    } catch (err) {
      console.error('Error al crear tarea en la BD:', err);
      toast.error(err.response?.data?.error || 'No se pudo guardar la tarea. Revise la conexión.');
    } finally {
      formLoading = false;
    }
  }

  // Filtrado reactivo
  let tareasFiltradas = $derived(
    tareas.filter(t => {
      if (filtroDimension !== 'todas' && t.dimension !== filtroDimension) return false;
      if (filtroPrioridad !== 'todas' && t.prioridad !== filtroPrioridad) return false;
      if (filtroMunicipio !== 'todos' && t.municipio !== filtroMunicipio) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = t.titulo.toLowerCase().includes(q) || 
                      t.codigo.toLowerCase().includes(q) || 
                      t.responsable.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    }).sort((a, b) => Number(b.esPropia) - Number(a.esPropia))
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
<header class="mfn-module-header flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-8 mt-2">
  <div>
    <div class="flex items-center gap-2 mb-2">
      <span class="text-[12px] font-medium uppercase tracking-normal text-[#1248AA]">Plan ARC</span>
      <span class="text-[12px] text-[#071D49]/30">•</span>
      <span class="text-[12px] font-medium uppercase tracking-normal text-[#071D49]/40">Seguimiento de acciones</span>
    </div>
    <h2 class="text-[40px] font-medium tracking-[-0.04em] leading-none text-[#071D49] mb-3">Plan de mejoras ARC</h2>
    <p class="text-[13px] text-[#071D49]/50 leading-relaxed max-w-2xl">
      Consulte las acciones, sus responsables, fechas límite y estados.
    </p>
  </div>

  <div class="flex items-center gap-3 shrink-0 flex-wrap">
    <!-- Buscador -->
    <div class="relative">
      <input 
        type="text" 
        bind:value={searchQuery}
        placeholder="Buscar tarea, código o responsable..." 
        class="w-full sm:w-[280px] pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-full text-[13px] text-[#071D49] placeholder-[#071D49]/30 shadow-sm focus:outline-none focus:border-[#1248AA] transition-all"
      />
      <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#071D49]/30" />
    </div>

    <!-- Filtro Dimensión -->
    <select 
      bind:value={filtroDimension} 
      class="px-4 py-3 bg-white border border-gray-100 rounded-full shadow-sm text-[12px] font-medium text-[#071D49] focus:outline-none transition-colors"
    >
      <option value="todas">Todas las Dimensiones</option>
      <option value="Planificación y Monitoreo">Planificación y Monitoreo</option>
      <option value="Gestión de Proyectos e Inversión">Gestión de Proyectos</option>
      <option value="Probidad, Transparencia y Eficiencia Institucional">Probidad y Transparencia</option>
    </select>

    <select bind:value={filtroMunicipio} aria-label="Filtrar por municipio" class="px-4 py-3 bg-white border border-gray-100 rounded-[4px] text-[12px] text-[#071D49]">
      <option value="todos">Todos los municipios</option><option value="Regional">Regional</option>
      {#each MUNICIPIOS_MFN as municipio}<option value={municipio}>{municipio}</option>{/each}
    </select>

    <!-- Botón Crear -->
    {#if auth.puedeEditar('arc')}<button
      onclick={openModal}
      class="px-6 py-3 bg-[#071D49] hover:bg-black text-white rounded-full text-[13px] font-medium shadow-md transition-colors flex items-center gap-2 cursor-pointer"
    >
      <Icon name="add" className="w-[18px] h-[18px] text-[#1248AA]" stroke={2.5} />
      Nueva Tarea ARC
    </button>
    {/if}
  </div>
</header>

<!-- BARRA EJECUTIVA DE KPIS -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
  <!-- KPI 1: Cumplimiento Global -->
  <div class="glass-light   rounded-[4px] p-6  card-lift">
    <div class="flex items-center justify-between mb-3">
      <span class="text-[12px] font-medium uppercase tracking-normal text-[#071D49]/40">Cumplimiento Global</span>
      <span class="w-8 h-8 rounded-full bg-[#EDF4FF] flex items-center justify-center text-[#1248AA]">
        <Icon name="fact_check" className="w-4 h-4" />
      </span>
    </div>
    <p class="text-[28px] font-medium tracking-[-0.04em] text-[#071D49]">{cumplimientoPct}%</p>
    <div class="mt-3">
      <div class="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div class="bg-[#1248AA] h-1.5 rounded-full transition-all duration-700 ease-out" style="width: {cumplimientoPct}%"></div>
      </div>
      <p class="text-[12px] text-[#071D49]/40 font-medium mt-1.5">{finalizadas} de {totalTareas} metas cumplidas</p>
    </div>
  </div>

  <!-- KPI 2: En Proceso -->
  <div class="glass-light   rounded-[4px] p-6  card-lift">
    <div class="flex items-center justify-between mb-3">
      <span class="text-[12px] font-medium uppercase tracking-normal text-[#071D49]/40">Acciones en Proceso</span>
      <span class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
        <Icon name="pending_actions" className="w-4 h-4" />
      </span>
    </div>
    <p class="text-[28px] font-medium tracking-[-0.04em] text-[#071D49]">{enProcesoCount}</p>
    <p class="text-[11px] text-[#071D49]/50 font-medium mt-2">Ejecución operativa en municipios</p>
  </div>

  <!-- KPI 3: En Revisión (M&E) -->
  <div class="glass-light   rounded-[4px] p-6  card-lift">
    <div class="flex items-center justify-between mb-3">
      <span class="text-[12px] font-medium uppercase tracking-normal text-[#071D49]/40">En Revisión (M&E)</span>
      <span class="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
        <Icon name="rate_review" className="w-4 h-4" />
      </span>
    </div>
    <p class="text-[28px] font-medium tracking-[-0.04em] text-[#071D49]">{enRevisionCount}</p>
    <p class="text-[11px] text-[#071D49]/50 font-medium mt-2">Monitoreo y Evaluación validando</p>
  </div>

  <!-- KPI 4: Alertas de Vencimiento -->
  <div class="glass-light   rounded-[4px] p-6  card-lift">
    <div class="flex items-center justify-between mb-3">
      <span class="text-[12px] font-medium uppercase tracking-normal text-[#071D49]/40">Metas Vencidas</span>
      <span class="w-8 h-8 rounded-full {vencidasCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'} flex items-center justify-center">
        <Icon name="notification_important" className="w-4 h-4" />
      </span>
    </div>
    <p class="text-[28px] font-medium tracking-[-0.04em] {vencidasCount > 0 ? 'text-rose-600' : 'text-[#071D49]'}">{vencidasCount}</p>
    <p class="text-[11px] font-medium mt-2 {vencidasCount > 0 ? 'text-rose-600 font-medium' : 'text-emerald-600 font-medium'}">
      {vencidasCount > 0 ? 'Alerta de incumplimiento activa' : 'Sin retrasos institucionales'}
    </p>
  </div>
</div>

<!-- TABLERO KANBAN (RF7, RF8, RF9) -->
<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
  {#each COLUMNAS as col, colIdx}
    {@const tareasCol = tareasFiltradas.filter(t => t.estado === col.id)}
    <div 
      class="bg-[#FFFFFF] border rounded-[4px] p-5 shadow-xs flex flex-col min-h-[500px] animate-slide-up stagger-{colIdx + 1} transition-all duration-200 {dragOverColId === col.id ? 'border-[#1248AA] ring-2 ring-[#1248AA]/30 bg-blue-50/30' : 'border-gray-200/60'}"
      ondragover={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; dragOverColId = col.id; }}
      ondragleave={() => { if (dragOverColId === col.id) dragOverColId = null; }}
      ondrop={(e) => {
        e.preventDefault();
        dragOverColId = null;
        if (draggingTaskId) {
          cambiarEstado(draggingTaskId, col.id);
          draggingTaskId = null;
        }
      }}
      role="region"
      aria-label={`Columna ${col.label}`}
    >
      <!-- Header de Columna -->
      <div class="flex items-center justify-between pb-4 mb-4 border-b border-gray-200/60">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full {col.id === 'Pendiente' ? 'bg-gray-400' : col.id === 'En Proceso' ? 'bg-[#1248AA]' : col.id === 'En Revisión' ? 'bg-amber-500' : 'bg-emerald-500'}"></span>
          <h3 class="text-[13px] font-medium text-[#071D49] tracking-tight">{col.label}</h3>
        </div>
        <span class="text-[12px] font-medium text-[#071D49]/50 bg-white border border-gray-200 px-2 py-0.5 rounded-full shadow-xs">
          {tareasCol.length}
        </span>
      </div>

      <!-- Tarjetas de la Columna -->
      <div class="space-y-4 flex-1">
        {#if tareasCol.length === 0}
          <div class="h-32 border-2 border-dashed border-gray-200/80 rounded-[4px] flex items-center justify-center text-[11px] text-[#071D49]/30 font-medium">
            Arrastra tareas aquí
          </div>
        {:else}
          {#each tareasCol as tarea}
            <div 
              role="group"
              aria-label={tarea.titulo}
              draggable="true"
              ondragstart={(e) => {
                draggingTaskId = tarea.id;
                e.dataTransfer.setData('text/plain', tarea.id.toString());
                e.dataTransfer.effectAllowed = 'move';
              }}
              ondragend={() => {
                draggingTaskId = null;
                dragOverColId = null;
              }}
              class="bg-white border border-gray-100 rounded-[4px] p-5 shadow-[0_10px_30px_-10px_rgba(10,21,38,0.04)] card-lift group relative cursor-grab active:cursor-grabbing transition-all {draggingTaskId === tarea.id ? 'opacity-40 scale-[0.98] border-dashed border-[#1248AA]' : ''}"
            >
              <!-- Top tags -->
              <div class="flex items-center justify-between gap-2 mb-2.5">
                <span class="text-[12px] font-mono font-medium text-[#1248AA] bg-blue-50 px-2 py-0.5 rounded-md">
                  {tarea.codigo}
                </span>
                {#if tarea.esPropia}<span class="text-[11px] text-[#1248AA]">Mi tarea</span>{/if}
                <span class="text-[12px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full {tarea.prioridad === 'Alta' ? 'bg-rose-50 text-rose-700' : tarea.prioridad === 'Media' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'}">
                  {tarea.prioridad}
                </span>
              </div>

              <!-- Título y Descripción -->
              <h4 class="text-[13px] font-medium text-[#071D49] leading-snug tracking-tight mb-1.5 group-hover:text-[#1248AA] transition-colors">
                {tarea.titulo}
              </h4>
              <p class="text-[11px] text-[#071D49]/50 line-clamp-3 leading-relaxed mb-4">
                {tarea.descripcion}
              </p>

              <!-- Dimensión ARC -->
              <div class="mb-3.5 pb-3 border-b border-gray-50 flex items-center gap-1.5 text-[12px] font-medium text-[#071D49]/60">
                <Icon name="corporate_fare" className="w-3.5 h-3.5 text-[#1248AA]" />
                <span class="truncate">{tarea.dimension}</span>
              </div>

              <!-- Footer: Responsable y Alerta de Vencimiento -->
              <div class="space-y-2">
                <div class="flex items-center justify-between text-[11px]">
                  <span class="text-[12px] font-medium text-[#071D49]/40 uppercase tracking-wider">Responsable:</span>
                  <span class="font-medium text-[#071D49]">{tarea.responsable}</span>
                </div>

                <div class="flex items-center justify-between text-[11px]">
                  <span class="text-[12px] font-medium text-[#071D49]/40 uppercase tracking-wider">Fecha límite:</span>
                  <span class="font-mono text-[11px] font-medium {tarea.estaVencida ? 'text-rose-600' : 'text-[#071D49]/70'}">
                    {tarea.fechaLimite}
                  </span>
                </div>

                <!-- Notificación Visual Roja si está Vencida (RF9) -->
                {#if tarea.estaVencida}
                  <div class="bg-rose-50 border border-rose-200/60 rounded-[4px] px-2.5 py-1.5 flex items-center gap-1.5 text-rose-700 text-[12px] font-medium animate-pulse-soft">
                    <span class="w-1.5 h-1.5 rounded-full bg-rose-600 beacon-dot text-rose-600 shrink-0"></span>
                    <span>Meta vencida ({Math.abs(tarea.diasRestantes)} días de retraso)</span>
                  </div>
                {:else if tarea.diasRestantes <= 3 && tarea.estado !== 'Finalizado'}
                  <div class="bg-amber-50 border border-amber-200/60 rounded-[4px] px-2.5 py-1.5 flex items-center gap-1.5 text-amber-800 text-[12px] font-medium">
                    <Icon name="schedule" className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                    <span>Vence pronto ({tarea.diasRestantes} días restantes)</span>
                  </div>
                {/if}
              </div>

              <!-- Botones de Transición Rápida Kanban -->
              <div class="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
                <span class="text-[12px] font-medium uppercase tracking-wider text-[#071D49]/30">Mover a:</span>
                <div class="flex items-center gap-1">
                  {#if col.id !== 'Pendiente'}
                    <button 
                      onclick={() => cambiarEstado(tarea.id, col.id === 'Finalizado' ? 'En Revisión' : col.id === 'En Revisión' ? 'En Proceso' : 'Pendiente')}
                      class="px-2 py-1 rounded-md text-[12px] font-medium text-[#071D49]/60 hover:bg-gray-100 transition-colors pill-interactive"
                      title="Regresar estado"
                    >
                      ←
                    </button>
                  {/if}
                  {#if col.id !== 'Finalizado'}
                    <button 
                      onclick={() => cambiarEstado(tarea.id, col.id === 'Pendiente' ? 'En Proceso' : col.id === 'En Proceso' ? 'En Revisión' : 'Finalizado')}
                      class="px-2.5 py-1 rounded-md text-[12px] font-medium bg-[#071D49] hover:bg-black text-white shadow-xs transition-colors flex items-center gap-1 cursor-pointer pill-interactive"
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
{#if showModal && auth.puedeEditar('arc')}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div transition:fade={{ duration: 180 }} class="fixed inset-0 bg-[#071D49]/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick={() => showModal = false}>
    <div transition:fly={{ y: 20, duration: 250 }} class="glass-light mfn-form-dialog rounded-[4px] w-full max-w-xl  p-8  " onclick={e => e.stopPropagation()}>
      <div class="flex justify-between items-center mb-6 border-b border-gray-50 pb-4">
        <div>
          <span class="text-[12px] font-medium uppercase tracking-normal text-[#1248AA]">Plan de Mejoras ARC</span>
          <h2 class="text-xl font-medium text-[#071D49] tracking-tight">Nueva acción</h2>
        </div>
        <button onclick={() => showModal = false} class="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
          <Icon name="close" className="w-5 h-5 text-[#071D49]/50" stroke={2} />
        </button>
      </div>

      <form onsubmit={crearTarea} class="space-y-4">
        <label class="block text-[12px] text-[#071D49]/70">Municipio
          <select required bind:value={nuevaTarea.municipio} onchange={() => fetchAsignables(nuevaTarea.municipio)} class="mt-1 w-full bg-white border border-gray-200 rounded-[4px] px-4 py-3 text-[13px] text-[#071D49]">
            {#each municipiosPermitidos as municipio}<option value={municipio}>{municipio}</option>{/each}
          </select>
        </label>
        <div>
          <label for="field-1" class="block text-[12px] font-medium uppercase tracking-normal text-[#071D49]/40 mb-1.5">Título de la Meta</label>
          <input id="field-1" required bind:value={nuevaTarea.titulo} type="text" class="w-full bg-white border border-gray-200 focus:border-[#1248AA] focus:ring-1 focus:ring-[#1248AA] rounded-[4px] px-4 py-3 text-[13px] text-[#071D49] shadow-sm transition-all" placeholder="Ej: Implementación de Módulo Financiero..." />
        </div>

        <div>
          <label for="field-2" class="block text-[12px] font-medium uppercase tracking-normal text-[#071D49]/40 mb-1.5">Instrucción y Descripción</label>
          <textarea id="field-2" required bind:value={nuevaTarea.descripcion} rows="3" class="w-full bg-white border border-gray-200 focus:border-[#1248AA] focus:ring-1 focus:ring-[#1248AA] rounded-[4px] px-4 py-3 text-[13px] text-[#071D49] shadow-sm transition-all" placeholder="Detalle los compromisos institucionales derivados del informe ARC..."></textarea>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="field-3" class="block text-[12px] font-medium uppercase tracking-normal text-[#071D49]/40 mb-1.5">Dimensión ARC</label>
            <select id="field-3" bind:value={nuevaTarea.dimension} class="w-full bg-white border border-gray-200 focus:border-[#1248AA] rounded-[4px] px-4 py-3 text-[12px] text-[#071D49]">
              <option value="Planificación y Monitoreo">Planificación y Monitoreo</option>
              <option value="Gestión de Proyectos e Inversión">Gestión de Proyectos e Inversión</option>
              <option value="Probidad, Transparencia y Eficiencia Institucional">Probidad, Transparencia y Eficiencia</option>
            </select>
          </div>

          <div>
            <label for="field-4" class="block text-[12px] font-medium uppercase tracking-normal text-[#071D49]/40 mb-1.5">Prioridad</label>
            <select id="field-4" bind:value={nuevaTarea.prioridad} class="w-full bg-white border border-gray-200 focus:border-[#1248AA] rounded-[4px] px-4 py-3 text-[12px] text-[#071D49]">
              <option value="Alta">Alta</option>
              <option value="Media">Media</option>
              <option value="Baja">Baja</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="field-5" class="block text-[12px] font-medium uppercase tracking-normal text-[#071D49]/40 mb-1.5">Responsable Asignado</label>
            <select id="field-5" required bind:value={nuevaTarea.responsableId} class="w-full bg-white border border-gray-200 rounded-[4px] px-4 py-3 text-[13px] text-[#071D49]">
              <option value="">Seleccione una cuenta</option>{#each asignables as persona}<option value={persona.id}>{persona.nombre}</option>{/each}
            </select>
          </div>

          <div>
            <label for="field-6" class="block text-[12px] font-medium uppercase tracking-normal text-[#071D49]/40 mb-1.5">Fecha Límite Estricta</label>
            <input id="field-6" required bind:value={nuevaTarea.fechaLimite} type="date" class="w-full bg-white border border-gray-200 rounded-[4px] px-4 py-3 text-[13px] text-[#071D49]" />
          </div>
        </div>

        <div class="pt-4 flex justify-end gap-3 mt-6 border-t border-gray-50 pt-5">
          <button type="button" onclick={() => showModal = false} class="px-6 py-3 rounded-full font-medium text-[#071D49]/60 hover:bg-gray-50 transition-colors text-[13px]">Cancelar</button>
          <button type="submit" disabled={formLoading} class="px-8 py-3 bg-[#071D49] text-white rounded-full font-medium hover:bg-black shadow-md transition-all text-[13px] disabled:opacity-50">
            {formLoading ? 'Guardando...' : 'Asignar Tarea ARC'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
