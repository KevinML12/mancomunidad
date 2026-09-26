<script>
  import { onMount } from 'svelte';
  import apiClient from '$lib/apiClient';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { toast } from 'svelte-sonner';
  import { fade, fly } from 'svelte/transition';

  let convenios = $state([]);
  let loading = $state(true);
  let searchQuery = $state('');
  let filtroTipo = $state('todos');
  let filtroAlerta = $state('todas');

  // Modal
  let showModal = $state(false);
  let formLoading = $state(false);
  let nuevoConvenio = $state({
    nombre: '',
    tipoOrganizacion: 'Cooperación Internacional',
    entidadCooperante: '',
    montoCooperacion: 0,
    contrapartidaMFN: 0,
    fechaSuscripcion: '',
    fechaVencimiento: '',
    urlDocumento: '',
    coordinadorMFN: 'Ing. Carlos Méndez'
  });

  async function fetchConvenios() {
    loading = true;
    try {
      const { data } = await apiClient.get('/convenios');
      if (Array.isArray(data)) {
        convenios = data;
      }
    } catch (err) {
      console.error('Error al cargar convenios de la BD:', err);
      toast.error('No se pudo conectar con el portafolio de convenios de la base de datos');
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    fetchConvenios();
  });

  // Métricas reactivas
  let totalCooperacion = $derived(convenios.reduce((acc, c) => acc + (c.montoCooperacion || 0), 0));
  let totalContrapartida = $derived(convenios.reduce((acc, c) => acc + (c.contrapartidaMFN || 0), 0));
  let alertas90dCount = $derived(convenios.filter(c => c.diasRestantes >= 0 && c.diasRestantes <= 90).length);
  let vencidosCount = $derived(convenios.filter(c => c.diasRestantes < 0).length);
  let enRenovacionCount = $derived(convenios.filter(c => c.estado === 'En Renovación').length);

  // Filtrado reactivo
  let conveniosFiltrados = $derived(
    convenios.filter(c => {
      if (filtroTipo !== 'todos' && c.tipoOrganizacion !== filtroTipo) return false;
      if (filtroAlerta === 'alertas' && !(c.diasRestantes <= 90)) return false;
      if (filtroAlerta === 'vigentes' && !(c.diasRestantes > 90)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = (c.nombre || '').toLowerCase().includes(q) ||
                      (c.codigo || '').toLowerCase().includes(q) ||
                      (c.entidadCooperante || '').toLowerCase().includes(q) ||
                      (c.coordinadorMFN || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    })
  );

  async function prorrogarConvenio(conv) {
    const meses = prompt(`Prorrogar convenio ${conv.codigo}. Ingrese cantidad de meses de extensión:`, "12");
    if (!meses || isNaN(Number(meses))) return;
    
    const actual = new Date(conv.fechaVencimiento);
    actual.setMonth(actual.getMonth() + Number(meses));
    const nuevaFecha = actual.toISOString().split('T')[0];

    try {
      await apiClient.put(`/convenios/${conv.id}`, {
        estado: 'Vigente',
        fechaVencimiento: nuevaFecha
      });
      toast.success(`Convenio prorrogado en la BD hasta ${nuevaFecha}`);
      await fetchConvenios();
    } catch (err) {
      console.error('Error al prorrogar convenio:', err);
      toast.error('No se pudo actualizar la prórroga en la base de datos');
    }
  }

  async function guardarConvenio(e) {
    e.preventDefault();
    formLoading = true;
    try {
      await apiClient.post('/convenios', {
        ...nuevoConvenio,
        montoCooperacion: Number(nuevoConvenio.montoCooperacion),
        contrapartidaMFN: Number(nuevoConvenio.contrapartidaMFN),
        fechaSuscripcion: nuevoConvenio.fechaSuscripcion || new Date().toISOString().split('T')[0]
      });
      toast.success('Convenio registrado exitosamente en la base de datos');
      showModal = false;
      nuevoConvenio = {
        nombre: '',
        tipoOrganizacion: 'Cooperación Internacional',
        entidadCooperante: '',
        montoCooperacion: 0,
        contrapartidaMFN: 0,
        fechaSuscripcion: '',
        fechaVencimiento: '',
        urlDocumento: '',
        coordinadorMFN: 'Ing. Carlos Méndez'
      };
      await fetchConvenios();
    } catch (err) {
      console.error('Error al guardar convenio:', err);
      toast.error('Error al registrar el convenio en la base de datos');
    } finally {
      formLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Alianzas y Convenios | MFN Digital</title>
</svelte:head>

<!-- HEADER PRINCIPAL -->
<header class="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-8 mt-2 animate-fade-in">
  <div>
    <div class="flex items-center gap-2 mb-2">
      <span class="text-[9px] font-bold uppercase tracking-[0.15em] text-[#3B82F6]">Módulo 05</span>
      <span class="text-[9px] text-[#0A1526]/30">•</span>
      <span class="text-[9px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40">Relaciones Interinstitucionales y Cooperación</span>
    </div>
    <h2 class="text-[40px] font-black tracking-[-0.04em] leading-none text-[#0A1526] mb-3">Alianzas y Convenios</h2>
    <p class="text-[13px] text-[#0A1526]/50 leading-relaxed max-w-2xl">
      Portafolio activo de cooperación, monitoreo cronológico con alertas tempranas automáticas a 90 días de caducidad.
    </p>
  </div>

  <div class="flex items-center gap-3 shrink-0 flex-wrap">
    <!-- Buscador -->
    <div class="relative">
      <input 
        type="text" 
        bind:value={searchQuery}
        placeholder="Buscar convenio o cooperante..." 
        class="w-[280px] pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-full text-[13px] text-[#0A1526] placeholder-[#0A1526]/30 shadow-sm focus:outline-none focus:border-[#3B82F6] transition-all" 
      />
      <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#0A1526]/30" />
    </div>

    <!-- Filtro Tipo Organización -->
    <select 
      bind:value={filtroTipo} 
      class="px-4 py-3 bg-white border border-gray-100 rounded-full shadow-sm text-[12px] font-bold text-[#0A1526] focus:outline-none transition-colors"
    >
      <option value="todos">Todos los Aliados</option>
      <option value="Cooperación Internacional">Cooperación Internacional</option>
      <option value="Sector Público">Sector Público</option>
      <option value="ONG">ONG y Sociedad Civil</option>
    </select>

    <!-- Botón Nuevo Convenio -->
    <button 
      onclick={() => showModal = true}
      class="px-6 py-3 bg-[#0A1526] hover:bg-black text-white rounded-full text-[13px] font-bold shadow-md transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer"
    >
      <Icon name="add" className="w-[18px] h-[18px] text-[#3B82F6]" stroke={2.5} />
      <span>+ Registrar Convenio</span>
    </button>
  </div>
</header>

<!-- BARRA EJECUTIVA DE KPIS -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
  <!-- KPI 1: Fondos Gestionados -->
  <div class="bg-white border border-gray-100 rounded-[24px] p-6 shadow-[0_20px_60px_-15px_rgba(10,21,38,0.04)] card-lift">
    <div class="flex items-center justify-between mb-3">
      <span class="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#0A1526]/40">Cooperación en Cartera</span>
      <span class="w-8 h-8 rounded-full bg-[#EBF3FF] flex items-center justify-center text-[#3B82F6]">
        <Icon name="monetization_on" className="w-4 h-4" />
      </span>
    </div>
    <p class="text-[28px] font-black tracking-[-0.04em] text-[#0A1526]">$ {(totalCooperacion / 1000000).toFixed(2)}M</p>
    <p class="text-[11px] text-[#0A1526]/50 font-medium mt-2">Contrapartida MFN: Q {totalContrapartida.toLocaleString('es-GT')}</p>
  </div>

  <!-- KPI 2: Alertas a 90 Días (RF15) -->
  <div class="bg-white border border-gray-100 rounded-[24px] p-6 shadow-[0_20px_60px_-15px_rgba(10,21,38,0.04)] card-lift">
    <div class="flex items-center justify-between mb-3">
      <span class="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#0A1526]/40">Alerta Temprana 90D</span>
      <span class="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
        <Icon name="alarm" className="w-4 h-4" />
      </span>
    </div>
    <div class="flex items-center gap-2">
      <p class="text-[28px] font-black tracking-[-0.04em] text-amber-600">{alertas90dCount}</p>
      {#if alertas90dCount > 0}
        <span class="w-2 h-2 rounded-full bg-amber-500 beacon-dot text-amber-500"></span>
      {/if}
    </div>
    <p class="text-[11px] text-amber-800 font-bold mt-2">Próximos a caducar en 90 días</p>
  </div>

  <!-- KPI 3: En Gestión Diplomática -->
  <div class="bg-white border border-gray-100 rounded-[24px] p-6 shadow-[0_20px_60px_-15px_rgba(10,21,38,0.04)] card-lift">
    <div class="flex items-center justify-between mb-3">
      <span class="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#0A1526]/40">En Renovación</span>
      <span class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
        <Icon name="autorenew" className="w-4 h-4" />
      </span>
    </div>
    <p class="text-[28px] font-black tracking-[-0.04em] text-[#0A1526]">{enRenovacionCount}</p>
    <p class="text-[11px] text-[#0A1526]/50 font-medium mt-2">Mesas de negociación con donantes</p>
  </div>

  <!-- KPI 4: Caducados sin prórroga -->
  <div class="bg-white border border-gray-100 rounded-[24px] p-6 shadow-[0_20px_60px_-15px_rgba(10,21,38,0.04)] card-lift">
    <div class="flex items-center justify-between mb-3">
      <span class="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#0A1526]/40">Convenios Vencidos</span>
      <span class="w-8 h-8 rounded-full {vencidosCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'} flex items-center justify-center">
        <Icon name="event_busy" className="w-4 h-4" />
      </span>
    </div>
    <p class="text-[28px] font-black tracking-[-0.04em] {vencidosCount > 0 ? 'text-rose-600' : 'text-[#0A1526]'}">{vencidosCount}</p>
    <p class="text-[11px] font-bold mt-2 {vencidosCount > 0 ? 'text-rose-600' : 'text-emerald-600'}">
      {vencidosCount > 0 ? 'Requieren finiquito o adenda' : 'Portafolio 100% al día'}
    </p>
  </div>
</div>

<!-- GRILLA DE CONVENIOS CON MOTOR CRONOLÓGICO -->
<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
  {#each conveniosFiltrados as conv}
    {@const esAlerta90 = conv.diasRestantes >= 0 && conv.diasRestantes <= 90}
    {@const esVencido = conv.diasRestantes < 0}
    <div class="bg-white border border-gray-100 rounded-[28px] p-7 shadow-[0_20px_60px_-15px_rgba(10,21,38,0.05)] card-lift flex flex-col justify-between">
      <div>
        <!-- Cabecera de Tarjeta -->
        <div class="flex items-start justify-between gap-3 mb-4">
          <div>
            <span class="text-[9px] font-mono font-bold text-[#3B82F6] bg-blue-50 px-2 py-0.5 rounded-md">
              {conv.codigo}
            </span>
            <span class="text-[10px] font-bold text-[#0A1526]/40 ml-2 uppercase tracking-wider">{conv.tipoOrganizacion}</span>
          </div>

          <!-- Pill de Estado Cronológico -->
          <span class="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border {esVencido ? 'bg-rose-50 text-rose-700 border-rose-200' : esAlerta90 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}">
            {conv.estado}
          </span>
        </div>

        <h3 class="text-lg font-black text-[#0A1526] tracking-tight leading-snug mb-1">
          {conv.nombre}
        </h3>
        <p class="text-[13px] font-bold text-[#3B82F6] mb-5">
          {conv.entidadCooperante}
        </p>

        <!-- Bloque de Montos Comprometidos -->
        <div class="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-[#F8FAFC] border border-gray-100 mb-5">
          <div>
            <span class="text-[9px] font-bold uppercase tracking-wider text-[#0A1526]/40 block mb-1">Monto Cooperación</span>
            <p class="text-base font-black text-[#0A1526]">
              {conv.montoCooperacion > 0 ? `$ ${conv.montoCooperacion.toLocaleString('en-US')}` : 'Asistencia Técnica'}
            </p>
          </div>
          <div>
            <span class="text-[9px] font-bold uppercase tracking-wider text-[#0A1526]/40 block mb-1">Contrapartida MFN</span>
            <p class="text-base font-black text-[#0A1526]">
              Q {conv.contrapartidaMFN.toLocaleString('es-GT')}
            </p>
          </div>
        </div>

        <!-- Alerta Cronológica RF15 -->
        <div class="space-y-2 mb-6">
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-[#0A1526]/50 font-semibold">Vencimiento oficial:</span>
            <span class="font-mono font-bold text-[#0A1526]">{conv.fechaVencimiento}</span>
          </div>

          {#if esVencido}
            <div class="bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 flex items-center gap-2 text-rose-700 text-[11px] font-bold">
              <Icon name="error" className="w-4 h-4 shrink-0 text-rose-600" />
              <span>Convenio expirado hace {Math.abs(conv.diasRestantes)} días (Requiere finiquito)</span>
            </div>
          {:else if esAlerta90}
            <div class="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-2 text-amber-800 text-[11px] font-bold">
              <Icon name="notification_important" className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Alerta Temprana RF15: Faltan {conv.diasRestantes} días para caducar</span>
            </div>
          {:else}
            <div class="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 flex items-center gap-2 text-emerald-800 text-[11px] font-semibold">
              <Icon name="check_circle" className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Vigencia garantizada ({conv.diasRestantes} días restantes)</span>
            </div>
          {/if}
        </div>
      </div>

      <!-- Footer y Acciones -->
      <div class="pt-4 border-t border-gray-50 flex items-center justify-between">
        <div class="text-[11px] text-[#0A1526]/50">
          Coordinador: <strong class="text-[#0A1526]">{conv.coordinadorMFN}</strong>
        </div>

        <div class="flex items-center gap-2">
          {#if conv.urlDocumento}
            <a 
              href={conv.urlDocumento} 
              target="_blank"
              class="px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-100 text-[11px] font-bold text-[#0A1526] transition-colors flex items-center gap-1.5"
            >
              <Icon name="description" className="w-3.5 h-3.5 text-[#3B82F6]" />
              <span>Instrumento</span>
            </a>
          {/if}

          <button 
            onclick={() => prorrogarConvenio(conv)}
            class="px-4 py-1.5 rounded-full bg-[#0A1526] hover:bg-black text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
          >
            <span>Prorrogar</span>
            <span>+</span>
          </button>
        </div>
      </div>
    </div>
  {/each}
</div>

<!-- MODAL REGISTRO DE CONVENIO -->
{#if showModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div transition:fade={{ duration: 180 }} class="fixed inset-0 bg-[#0A1526]/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick={() => showModal = false}>
    <div transition:fly={{ y: 20, duration: 250 }} class="bg-white rounded-[32px] w-full max-w-xl shadow-[0_24px_60px_-20px_rgba(10,21,38,0.12)] p-8 border border-gray-100" onclick={e => e.stopPropagation()}>
      <div class="flex justify-between items-center mb-6 border-b border-gray-50 pb-4">
        <div>
          <span class="text-[9px] font-bold uppercase tracking-[0.15em] text-[#3B82F6]">Portafolio de Alianzas</span>
          <h2 class="text-xl font-black text-[#0A1526] tracking-tight">Nuevo Convenio Interinstitucional</h2>
        </div>
        <button onclick={() => showModal = false} class="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
          <Icon name="close" className="w-5 h-5 text-[#0A1526]/50" stroke={2} />
        </button>
      </div>

      <form onsubmit={guardarConvenio} class="space-y-4">
        <div>
          <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1.5">Nombre del Convenio o Acuerdo</label>
          <input required type="text" bind:value={nuevoConvenio.nombre} placeholder="Ej: Convenio de Cooperación No Reembolsable..." class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-[#0A1526]" />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1.5">Tipo de Organización</label>
            <select bind:value={nuevoConvenio.tipoOrganizacion} class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[12px] text-[#0A1526]">
              <option value="Cooperación Internacional">Cooperación Internacional</option>
              <option value="Sector Público">Sector Público</option>
              <option value="ONG">ONG y Sociedad Civil</option>
            </select>
          </div>

          <div>
            <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1.5">Entidad Cooperante</label>
            <input required type="text" bind:value={nuevoConvenio.entidadCooperante} placeholder="Ej: USAID, AECID, BID" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-[#0A1526]" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1.5">Monto Cooperación ($ USD)</label>
            <input required type="number" min="0" step="1000" bind:value={nuevoConvenio.montoCooperacion} class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] font-bold text-[#0A1526]" />
          </div>

          <div>
            <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1.5">Contrapartida MFN (Q GTQ)</label>
            <input required type="number" min="0" step="1000" bind:value={nuevoConvenio.contrapartidaMFN} class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] font-bold text-[#0A1526]" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1.5">Fecha Suscripción</label>
            <input required type="date" bind:value={nuevoConvenio.fechaSuscripcion} class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-[#0A1526]" />
          </div>

          <div>
            <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1.5">Fecha Vencimiento (Motor 90D)</label>
            <input required type="date" bind:value={nuevoConvenio.fechaVencimiento} class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-[#0A1526]" />
          </div>
        </div>

        <div>
          <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1.5">Coordinador MFN Designado</label>
          <input required type="text" bind:value={nuevoConvenio.coordinadorMFN} class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-[#0A1526]" />
        </div>

        <div>
          <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1.5">URL Instrumento Legal PDF</label>
          <input type="text" bind:value={nuevoConvenio.urlDocumento} placeholder="https://storage.mfn.gob.gt/convenios/convenio.pdf" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-[#0A1526]" />
        </div>

        <div class="pt-4 flex justify-end gap-3 mt-6 border-t border-gray-50 pt-5">
          <button type="button" onclick={() => showModal = false} class="px-6 py-3 rounded-full font-bold text-[#0A1526]/60 hover:bg-gray-50 transition-colors text-[13px]">Cancelar</button>
          <button type="submit" disabled={formLoading} class="px-8 py-3 bg-[#0A1526] text-white rounded-full font-bold hover:bg-black shadow-md transition-all text-[13px] disabled:opacity-50">
            {formLoading ? 'Registrando...' : 'Incorporar Convenio'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
