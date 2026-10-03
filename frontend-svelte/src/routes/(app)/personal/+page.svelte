<script>
  import { onMount } from 'svelte';
  import apiClient from '$lib/apiClient';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { toast } from 'svelte-sonner';

  let colaboradores = $state([]);
  let puestos = $state([]);
  let loading = $state(true);
  let activeTab = $state('directorio'); // 'directorio' | 'puestos'
  let searchQuery = $state('');
  let filtroCategoria = $state('todas');

  // Modal Expediente Detallado
  let showExpedienteModal = $state(false);
  let expedienteLoading = $state(false);
  let colaboradorSeleccionado = $state(null);

  // Modal Nuevo Colaborador
  let showNuevoModal = $state(false);
  let formLoading = $state(false);
  let nuevoColaborador = $state({
    nombre: '',
    dpi: '',
    puestoId: '',
    fechaIngreso: new Date().toISOString().split('T')[0],
    tipoContrato: 'Renglón 022 (Personal por Contrato)'
  });

  async function cargarDatos() {
    loading = true;
    try {
      const [resColab, resPuestos] = await Promise.allSettled([
        apiClient.get('/colaboradores'),
        apiClient.get('/puestos')
      ]);

      if (resColab.status === 'fulfilled' && Array.isArray(resColab.value.data)) {
        colaboradores = resColab.value.data;
      }
      if (resPuestos.status === 'fulfilled' && Array.isArray(resPuestos.value.data)) {
        puestos = resPuestos.value.data;
      }
    } catch (err) {
      console.error('Error al cargar talento humano:', err);
      toast.error('Error al conectar con el módulo de personal');
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    cargarDatos();
  });

  async function verExpediente(colabId) {
    expedienteLoading = true;
    showExpedienteModal = true;
    try {
      const { data } = await apiClient.get(`/colaboradores/${colabId}`);
      colaboradorSeleccionado = data;
    } catch (err) {
      console.error('Error al cargar expediente:', err);
      toast.error('No se pudo cargar el expediente completo');
      showExpedienteModal = false;
    } finally {
      expedienteLoading = false;
    }
  }

  async function registrarColaborador(e) {
    e?.preventDefault();
    if (!nuevoColaborador.nombre || !nuevoColaborador.puestoId || !nuevoColaborador.fechaIngreso) {
      toast.error('Nombre, puesto y fecha de ingreso son requeridos');
      return;
    }

    formLoading = true;
    try {
      await apiClient.post('/colaboradores', {
        ...nuevoColaborador,
        puestoId: Number(nuevoColaborador.puestoId)
      });
      toast.success('Colaborador registrado exitosamente en el SIRH');
      showNuevoModal = false;
      nuevoColaborador = {
        nombre: '',
        dpi: '',
        puestoId: '',
        fechaIngreso: new Date().toISOString().split('T')[0],
        tipoContrato: 'Renglón 022 (Personal por Contrato)'
      };
      await cargarDatos();
    } catch (err) {
      console.error('Error al registrar colaborador:', err);
      toast.error(err.response?.data?.error || 'No se pudo guardar el registro');
    } finally {
      formLoading = false;
    }
  }

  function calcularAntiguedad(fechaStr) {
    if (!fechaStr) return 'N/A';
    const inicio = new Date(fechaStr);
    const hoy = new Date();
    let anios = hoy.getFullYear() - inicio.getFullYear();
    let meses = hoy.getMonth() - inicio.getMonth();
    if (meses < 0) {
      anios--;
      meses += 12;
    }
    if (anios > 0) return `${anios} año${anios > 1 ? 's' : ''} y ${meses} mes${meses !== 1 ? 'es' : ''}`;
    return `${meses} mes${meses !== 1 ? 'es' : ''}`;
  }

  // Filtrado reactivo de colaboradores
  let colaboradoresFiltrados = $derived(
    colaboradores.filter(c => {
      const matchSearch = searchQuery === '' || 
        c.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.dpi && c.dpi.includes(searchQuery)) ||
        (c.puesto?.nombre && c.puesto.nombre.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchCat = filtroCategoria === 'todas' || c.puesto?.categoria === filtroCategoria;
      return matchSearch && matchCat;
    })
  );

  // Estadísticas del módulo
  let totalPersonal = $derived(colaboradores.length);
  let totalPuestos = $derived(puestos.length);
  let categoriasContadas = $derived({
    A: puestos.filter(p => p.categoria === 'A').length,
    B: puestos.filter(p => p.categoria === 'B').length,
    C: puestos.filter(p => p.categoria === 'C').length,
    D: puestos.filter(p => p.categoria === 'D').length,
  });
</script>

<svelte:head>
  <title>Talento Humano (SIRH) | MFN Digital</title>
</svelte:head>

<!-- HEADER DEL MÓDULO -->
<header class="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-8 mt-2">
  <div>
    <div class="flex items-center gap-2 mb-2">
      <span class="text-[12px] font-bold uppercase tracking-normal text-[#1248AA]">Capítulo I · SIRH</span>
      <span class="text-[12px] text-[#071D49]/30">•</span>
      <span class="text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40">Reglamento Interno de Trabajo</span>
    </div>
    <h2 class="text-[40px] font-semibold tracking-[-0.04em] leading-none text-[#071D49] mb-3">Talento Humano (SIRH)</h2>
    <p class="text-[13px] text-[#071D49]/50 leading-relaxed max-w-2xl">
      Estructura de puestos, control de expedientes laborales, saldos de vacaciones acumuladas y carrera administrativa institucional.
    </p>
  </div>

  <div class="flex items-center gap-3 shrink-0 flex-wrap">
    <!-- Pestañas de Navegación -->
    <div class="bg-white p-1 rounded-full border border-gray-100 shadow-sm flex items-center">
      <button 
        type="button" 
        onclick={() => activeTab = 'directorio'}
        class="px-5 py-2 rounded-full text-[12px] font-bold transition-all {activeTab === 'directorio' ? 'bg-[#071D49] text-white shadow-sm' : 'text-[#071D49]/60 hover:text-[#071D49]'}"
      >
        Directorio Personal ({totalPersonal})
      </button>
      <button 
        type="button" 
        onclick={() => activeTab = 'puestos'}
        class="px-5 py-2 rounded-full text-[12px] font-bold transition-all {activeTab === 'puestos' ? 'bg-[#071D49] text-white shadow-sm' : 'text-[#071D49]/60 hover:text-[#071D49]'}"
      >
        Catálogo de Puestos ({totalPuestos})
      </button>
    </div>

    <!-- Botón Nuevo Colaborador -->
    <button 
      type="button" 
      onclick={() => showNuevoModal = true}
      class="flex items-center gap-2 px-5 py-2.5 bg-[#1248AA] hover:bg-blue-600 text-white text-[12px] font-bold rounded-full shadow-md transition-all cursor-pointer"
    >
      <Icon name="person_add" className="w-4 h-4" />
      <span>Nuevo Colaborador</span>
    </button>
  </div>
</header>

<!-- BARRA DE KPIS INSTITUCIONALES -->
<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
  <div class="glass-light   rounded-[24px] p-6 ">
    <div class="flex items-center justify-between mb-3">
      <span class="text-[12px] font-semibold uppercase tracking-normal text-[#071D49]/40">Personal Activo</span>
      <span class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-[#1248AA]">
        <Icon name="groups" className="w-4 h-4" />
      </span>
    </div>
    <p class="text-[28px] font-semibold tracking-[-0.04em] text-[#071D49]">{totalPersonal}</p>
    <p class="text-[11px] text-[#071D49]/50 font-medium mt-1">Colaboradores en funciones</p>
  </div>

  <div class="glass-light   rounded-[24px] p-6 ">
    <div class="flex items-center justify-between mb-3">
      <span class="text-[12px] font-semibold uppercase tracking-normal text-[#071D49]/40">Puestos Estructurales</span>
      <span class="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
        <Icon name="work" className="w-4 h-4" />
      </span>
    </div>
    <p class="text-[28px] font-semibold tracking-[-0.04em] text-[#071D49]">{totalPuestos}</p>
    <p class="text-[11px] text-[#071D49]/50 font-medium mt-1">Manual de Organización</p>
  </div>

  <div class="glass-light   rounded-[24px] p-6 ">
    <div class="flex items-center justify-between mb-3">
      <span class="text-[12px] font-semibold uppercase tracking-normal text-[#071D49]/40">Prestación Vacacional</span>
      <span class="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
        <Icon name="flight_takeoff" className="w-4 h-4" />
      </span>
    </div>
    <p class="text-[28px] font-semibold tracking-[-0.04em] text-[#071D49]">20 Días</p>
    <p class="text-[11px] text-[#071D49]/50 font-medium mt-1">Garantía Art. 38 RIT</p>
  </div>

  <div class="glass-light   rounded-[24px] p-6 ">
    <div class="flex items-center justify-between mb-3">
      <span class="text-[12px] font-semibold uppercase tracking-normal text-[#071D49]/40">Auditoría CGC</span>
      <span class="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
        <Icon name="verified" className="w-4 h-4" />
      </span>
    </div>
    <p class="text-[28px] font-semibold tracking-[-0.04em] text-emerald-600">100%</p>
    <p class="text-[11px] text-emerald-700 font-bold mt-1">Expedientes al día</p>
  </div>
</div>

<!-- CONTENIDO PRINCIPAL -->
{#if activeTab === 'directorio'}
  <!-- BARRA DE BÚSQUEDA Y FILTROS -->
  <div class="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
    <div class="relative w-full sm:w-80">
      <input 
        type="text" 
        bind:value={searchQuery}
        placeholder="Buscar por nombre, puesto o DPI..." 
        class="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-full text-[13px] text-[#071D49] placeholder-[#071D49]/30 shadow-sm focus:outline-none focus:border-[#1248AA]" 
      />
      <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#071D49]/30" />
    </div>

    <div class="flex items-center gap-2 self-end">
      <span class="text-[11px] font-bold text-[#071D49]/40 uppercase tracking-wider">Categoría:</span>
      <select bind:value={filtroCategoria} class="px-3.5 py-2 bg-white border border-gray-200 rounded-full text-[11px] font-bold text-[#071D49] focus:outline-none">
        <option value="todas">Todas las Categorías</option>
        <option value="A">Cat. A (Dirección Superior)</option>
        <option value="B">Cat. B (Mandos Medios / M&E)</option>
        <option value="C">Cat. C (Técnicos Operativos)</option>
        <option value="D">Cat. D (Asistentes de Campo)</option>
      </select>
    </div>
  </div>

  <!-- GRID DE COLABORADORES -->
  <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
    {#each colaboradoresFiltrados as colab, idx}
      <div class="glass-light   rounded-[28px] p-6  hover: transition-all card-lift flex flex-col justify-between">
        <div>
          <!-- Cabecera de Tarjeta -->
          <div class="flex items-start justify-between gap-3 mb-4">
            <div class="flex items-center gap-3.5">
              <img 
                src="https://i.pravatar.cc/120?img={(colab.id * 7) % 70 + 1}" 
                alt={colab.nombre} 
                class="w-13 h-13 rounded-2xl border-2 border-gray-100 object-cover shadow-xs" 
              />
              <div>
                <h3 class="text-[15px] font-semibold text-[#071D49] tracking-tight leading-snug">{colab.nombre}</h3>
                <p class="text-[12px] font-bold text-[#1248AA] mt-0.5">{colab.puesto?.nombre || 'Puesto no asignado'}</p>
              </div>
            </div>

            <span class="px-2.5 py-1 rounded-full text-[12px] font-semibold uppercase tracking-wider {colab.puesto?.categoria === 'A' ? 'bg-purple-50 text-purple-700' : colab.puesto?.categoria === 'B' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}">
              Cat. {colab.puesto?.categoria || 'C'}
            </span>
          </div>

          <!-- Detalles Rápidos -->
          <div class="space-y-2 py-3 border-y border-gray-50 text-[11px]">
            <div class="flex items-center justify-between text-[#071D49]/70">
              <span class="text-[#071D49]/40 uppercase tracking-wider text-[12px] font-bold">Estado Laboral:</span>
              <span class="inline-flex items-center gap-1 font-bold text-emerald-600">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Activo
              </span>
            </div>

            <div class="flex items-center justify-between text-[#071D49]/70">
              <span class="text-[#071D49]/40 uppercase tracking-wider text-[12px] font-bold">Antigüedad Institucional:</span>
              <span class="font-bold text-[#071D49]">{calcularAntiguedad(colab.fechaIngreso)}</span>
            </div>

            <div class="flex items-center justify-between text-[#071D49]/70">
              <span class="text-[#071D49]/40 uppercase tracking-wider text-[12px] font-bold">Régimen / Renglón:</span>
              <span class="font-bold text-[#071D49]">{colab.tipoContrato || 'Renglón 022 (Contrato)'}</span>
            </div>
          </div>
        </div>

        <!-- Botón Ver Expediente -->
        <div class="pt-4 mt-4 flex items-center justify-between">
          <span class="text-[12px] font-mono text-[#071D49]/40">ID: MFN-EMP-00{colab.id}</span>
          <button 
            type="button" 
            onclick={() => verExpediente(colab.id)}
            class="inline-flex items-center gap-2 px-4 py-2 bg-[#071D49] hover:bg-black text-white text-[11px] font-bold rounded-full shadow-xs transition-all cursor-pointer"
          >
            <Icon name="badge" className="w-3.5 h-3.5 text-[#1248AA]" />
            <span>Ver Expediente</span>
          </button>
        </div>
      </div>
    {/each}
  </div>
{:else}
  <!-- PESTAÑA: ESTRUCTURA ORGÁNICA Y CATÁLOGO DE PUESTOS -->
  <div class="glass-light   rounded-[32px] p-8 ">
    <div class="pb-6 mb-6 border-b border-gray-100 flex items-center justify-between">
      <div>
        <h3 class="text-[14px] font-semibold text-[#071D49] uppercase tracking-wider">Catálogo Jerárquico de Puestos</h3>
        <p class="text-[12px] text-[#071D49]/50 mt-0.5">Clasificación salarial y funcional según el Manual de Evaluación del Desempeño</p>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-[11px] font-bold text-[#071D49]/60">Total de Categorías: 4</span>
      </div>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse text-[12px]">
        <thead>
          <tr class="border-b border-gray-100 text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40">
            <th class="py-3 px-4">Puesto Institucional</th>
            <th class="py-3 px-4">Categoría</th>
            <th class="py-3 px-4">Forma de Pago</th>
            <th class="py-3 px-4 text-center">Colaboradores Asignados</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          {#each puestos as p}
            <tr class="hover:bg-gray-50/50 transition-colors">
              <td class="py-3.5 px-4 font-bold text-[#071D49]">
                <div class="flex items-center gap-2">
                  <span class="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-[#071D49]/60 text-[11px]">
                    <Icon name="work_outline" className="w-3.5 h-3.5" />
                  </span>
                  <span>{p.nombre}</span>
                </div>
              </td>
              <td class="py-3.5 px-4">
                <span class="px-2.5 py-0.5 rounded-full text-[12px] font-semibold uppercase {p.categoria === 'A' ? 'bg-purple-50 text-purple-700' : p.categoria === 'B' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}">
                  Categoría {p.categoria}
                </span>
              </td>
              <td class="py-3.5 px-4 text-[#071D49]/60 font-medium">
                {p.formaPago}
              </td>
              <td class="py-3.5 px-4 text-center font-bold text-[#071D49]">
                <span class="w-6 h-6 rounded-full bg-blue-50 text-[#1248AA] inline-flex items-center justify-center text-[11px]">
                  {p._count?.colaboradores || 0}
                </span>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
{/if}

<!-- MODAL EXPEDIENTE COMPLETO DEL COLABORADOR -->
{#if showExpedienteModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071D49]/70 backdrop-blur-sm overflow-y-auto">
    <div class="glass-light rounded-[32px] max-w-2xl w-full p-8 md:p-10    relative animate-fade-in">
      <button 
        type="button" 
        onclick={() => showExpedienteModal = false} 
        class="absolute right-6 top-6 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-[#071D49] transition-colors"
      >
        <Icon name="close" className="w-5 h-5" />
      </button>

      {#if expedienteLoading || !colaboradorSeleccionado}
        <div class="py-16 text-center">
          <div class="w-8 h-8 border-3 border-[#1248AA] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p class="text-[12px] font-bold text-[#071D49]/60">Consultando expediente en la base de datos...</p>
        </div>
      {:else}
        <!-- Ficha de Expediente -->
        <div class="flex items-center gap-4 pb-6 mb-6 border-b border-gray-100">
          <img 
            src="https://i.pravatar.cc/150?img={(colaboradorSeleccionado.id * 7) % 70 + 1}" 
            alt={colaboradorSeleccionado.nombre} 
            class="w-16 h-16 rounded-2xl border-2 border-gray-100 object-cover shadow-sm"
          />
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="text-[12px] font-bold uppercase tracking-widest text-[#1248AA] bg-blue-50 px-2 py-0.5 rounded-md">
                Expediente Laboral No. {colaboradorSeleccionado.id}
              </span>
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            </div>
            <h3 class="text-[20px] font-semibold text-[#071D49] leading-tight">{colaboradorSeleccionado.nombre}</h3>
            <p class="text-[12px] font-bold text-[#071D49]/60 mt-0.5">{colaboradorSeleccionado.puesto?.nombre}</p>
          </div>
        </div>

        <!-- Secciones del Expediente -->
        <div class="space-y-6 text-[12px]">
          <!-- Control de Vacaciones (Art. 38 Reglamento Interno) -->
          <div class="bg-[#FFFFFF] p-5 rounded-2xl border border-gray-100">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <Icon name="beach_access" className="w-4 h-4 text-[#1248AA]" />
                <h4 class="font-semibold text-[#071D49] text-[13px]">Saldo de Vacaciones (Ejercicio 2026)</h4>
              </div>
              <span class="text-[12px] font-bold text-[#071D49]/50">Código de Trabajo de Guatemala</span>
            </div>

            {#if colaboradorSeleccionado.saldosVacaciones?.length > 0}
              {@const saldo = colaboradorSeleccionado.saldosVacaciones[0]}
              <div class="grid grid-cols-3 gap-3 text-center">
                <div class="bg-white p-3 rounded-xl border border-gray-200/60">
                  <span class="text-[12px] font-bold uppercase text-[#071D49]/40 block">Derecho Anual</span>
                  <span class="text-[18px] font-semibold text-[#071D49]">{saldo.diasDisponibles} Días</span>
                </div>
                <div class="bg-white p-3 rounded-xl border border-gray-200/60">
                  <span class="text-[12px] font-bold uppercase text-[#071D49]/40 block">Días Disfrutados</span>
                  <span class="text-[18px] font-semibold text-amber-600">{saldo.diasUsados} Días</span>
                </div>
                <div class="bg-emerald-50 p-3 rounded-xl border border-emerald-200/60">
                  <span class="text-[12px] font-bold uppercase text-emerald-800 block">Saldo Vigente</span>
                  <span class="text-[18px] font-semibold text-emerald-700">{saldo.diasDisponibles - saldo.diasUsados} Días</span>
                </div>
              </div>
            {:else}
              <p class="text-[11px] text-[#071D49]/50 italic">Saldo inicial de 20 días hábiles acreditado.</p>
            {/if}
          </div>

          <!-- Historial de Evaluaciones de Desempeño -->
          <div>
            <h4 class="font-semibold text-[#071D49] text-[13px] mb-2 flex items-center gap-2">
              <Icon name="assignment_turned_in" className="w-4 h-4 text-emerald-600" />
              <span>Evaluaciones de Desempeño Históricas</span>
            </h4>
            {#if colaboradorSeleccionado.evaluaciones?.length > 0}
              <div class="space-y-2">
                {#each colaboradorSeleccionado.evaluaciones as ev}
                  <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div>
                      <span class="font-bold text-[#071D49] block">{ev.periodo}</span>
                      <span class="text-[12px] text-[#071D49]/50">Evaluado por Gerencia Ejecutiva</span>
                    </div>
                    <span class="px-3 py-1 rounded-full text-[12px] font-semibold uppercase bg-emerald-100 text-emerald-800">
                      {ev.resultado}
                    </span>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="p-3 bg-gray-50 rounded-xl text-[11px] text-[#071D49]/50 italic">
                Sin evaluaciones pendientes en el ejercicio actual.
              </div>
            {/if}
          </div>

          <!-- Régimen Disciplinario (Reglamento Interno) -->
          <div>
            <h4 class="font-semibold text-[#071D49] text-[13px] mb-2 flex items-center gap-2">
              <Icon name="gavel" className="w-4 h-4 text-purple-600" />
              <span>Régimen Disciplinario y Conducta</span>
            </h4>
            {#if colaboradorSeleccionado.faltas?.length > 0}
              <div class="space-y-2">
                {#each colaboradorSeleccionado.faltas as f}
                  <div class="p-3 bg-rose-50 rounded-xl border border-rose-200/60 text-rose-800">
                    <span class="font-bold block">{f.tipoFalta}</span>
                    <span class="text-[12px] text-rose-600">{f.descripcion}</span>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-[11px] text-emerald-800 flex items-center gap-2">
                <Icon name="check_circle" className="w-4 h-4 text-emerald-600" />
                <span class="font-bold">Expediente Disciplinario Limpio (Sin sanciones ni llamadas de atención)</span>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<!-- MODAL REGISTRO DE NUEVO COLABORADOR -->
{#if showNuevoModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071D49]/70 backdrop-blur-sm">
    <div class="glass-light rounded-[32px] max-w-md w-full p-8    relative animate-fade-in">
      <div class="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
        <div>
          <h3 class="text-[16px] font-semibold text-[#071D49]">Nuevo Colaborador</h3>
          <p class="text-[12px] text-[#071D49]/50">Alta en el Sistema de Recursos Humanos (SIRH)</p>
        </div>
        <button 
          type="button" 
          onclick={() => showNuevoModal = false} 
          class="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-[#071D49]/60 transition-colors"
        >
          <Icon name="close" className="w-4 h-4" />
        </button>
      </div>

      <form onsubmit={registrarColaborador} class="space-y-4">
        <div>
          <label for="input-nombre-colab" class="block text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40 mb-1.5">
            Nombre Completo
          </label>
          <input 
            id="input-nombre-colab"
            type="text" 
            required 
            bind:value={nuevoColaborador.nombre} 
            placeholder="Ej. Ing. Maynor Cifuentes"
            class="w-full bg-[#FFFFFF] border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-[#071D49] focus:outline-none focus:border-[#1248AA]"
          />
        </div>

        <div>
          <label for="input-dpi-colab" class="block text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40 mb-1.5">
            DPI / CUI
          </label>
          <input 
            id="input-dpi-colab"
            type="text" 
            bind:value={nuevoColaborador.dpi} 
            placeholder="Ej. 2891 44520 1301"
            class="w-full bg-[#FFFFFF] border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-[#071D49] focus:outline-none focus:border-[#1248AA]"
          />
        </div>

        <div>
          <label for="select-puesto-colab" class="block text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40 mb-1.5">
            Puesto Institucional
          </label>
          <select 
            id="select-puesto-colab"
            required 
            bind:value={nuevoColaborador.puestoId} 
            class="w-full bg-[#FFFFFF] border border-gray-200 rounded-xl px-4 py-3 text-[12px] text-[#071D49] focus:outline-none focus:border-[#1248AA]"
          >
            <option value="">Seleccione un puesto del catálogo...</option>
            {#each puestos as p}
              <option value={p.id}>{p.nombre} (Cat. {p.categoria})</option>
            {/each}
          </select>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="input-fecha-ingreso" class="block text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40 mb-1.5">
              Fecha de Ingreso
            </label>
            <input 
              id="input-fecha-ingreso"
              type="date" 
              required 
              bind:value={nuevoColaborador.fechaIngreso} 
              class="w-full bg-[#FFFFFF] border border-gray-200 rounded-xl px-3 py-3 text-[12px] text-[#071D49] focus:outline-none focus:border-[#1248AA]"
            />
          </div>

          <div>
            <label for="select-contrato-colab" class="block text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40 mb-1.5">
              Renglón
            </label>
            <select 
              id="select-contrato-colab"
              bind:value={nuevoColaborador.tipoContrato} 
              class="w-full bg-[#FFFFFF] border border-gray-200 rounded-xl px-3 py-3 text-[11px] text-[#071D49] focus:outline-none focus:border-[#1248AA]"
            >
              <option value="Renglón 022 (Contrato)">Renglón 022</option>
              <option value="Renglón 011 (Permanente)">Renglón 011</option>
              <option value="Renglón 029 (Servicios)">Renglón 029</option>
            </select>
          </div>
        </div>

        <div class="pt-4 flex justify-end gap-2 border-t border-gray-100">
          <button 
            type="button" 
            onclick={() => showNuevoModal = false} 
            class="px-5 py-2.5 rounded-full font-bold text-[12px] text-[#071D49]/60 hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            disabled={formLoading}
            class="px-6 py-2.5 rounded-full font-bold text-[12px] bg-[#071D49] hover:bg-black text-white shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {formLoading ? 'Registrando...' : 'Guardar Colaborador'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
