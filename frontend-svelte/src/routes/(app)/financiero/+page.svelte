<script>
  import { onMount } from 'svelte';
  import apiClient from '$lib/apiClient';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { toast } from 'svelte-sonner';
  import { auth } from '$lib/stores/auth.svelte.js';
  import { fade, fly } from 'svelte/transition';

  import { MUNICIPIOS_MFN as LISTA_MUNICIPIOS } from '$lib/municipios.js';

  let transacciones = $state([]);
  let balance = $state({
    ingresosTotales: 0,
    egresosTotales: 0,
    saldoDisponibleTotal: 0,
    cuentas: {
      fondosPublicos: { ingresos: 0, egresos: 0, saldo: 0 },
      cooperacion: { ingresos: 0, egresos: 0, saldo: 0 }
    }
  });
  let loading = $state(true);
  let loadError = $state(false);

  // Mostrar solo aportes registrados; la obligación anual requiere una regla institucional aprobada.
  let municipiosMFN = $derived(
    LISTA_MUNICIPIOS.map(nombre => {
      const txs = transacciones.filter(t => t.municipio === nombre && t.categoria === 'Cuota Ordinaria' && t.tipo === 'Ingreso');
      const cuotasPagadas = txs.reduce((acc, t) => acc + (t.monto || 0), 0);
      const ultimo = txs[0]?.fecha ? new Date(txs[0].fecha).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Sin aportes';
      return {
        nombre,
        cuotasPagadas,
        ultimoAporte: ultimo
      };
    })
  );

  let filtroCuenta = $state('todas');
  let filtroTipo = $state('todos');
  let searchQuery = $state('');

  // Modal Registro Cuota / Caja Chica
  let showModal = $state(false);
  let formLoading = $state(false);
  let modalTipo = $state('Cuota'); // 'Cuota' | 'CajaChica'
  let nuevaTx = $state({
    tipo: 'Ingreso',
    cuentaBancaria: 'Fondos Públicos',
    categoria: 'Cuota Ordinaria',
    municipio: 'Santa Eulalia',
    monto: '',
    comprobanteTipo: 'Recibo CGC 63-A2',
    comprobanteNumero: '',
    urlComprobante: '',
    descripcion: ''
  });

  async function fetchFinanciero() {
    loading = true;
    loadError = false;
    try {
      const [resTx, resBal] = await Promise.all([
        apiClient.get('/financiero/transacciones'),
        apiClient.get('/financiero/balance')
      ]);
      if (!Array.isArray(resTx.data) || !resBal.data?.cuentas) throw new Error('Respuesta financiera incompleta');
      transacciones = resTx.data;
      balance = resBal.data;
    } catch (err) {
      console.error('Error al cargar datos financieros de la BD:', err);
      loadError = true;
      toast.error('No se pudo conectar con el módulo financiero de la base de datos');
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    fetchFinanciero();
  });

  function abrirModal(tipo) {
    modalTipo = tipo;
    if (tipo === 'Cuota') {
      nuevaTx = {
        tipo: 'Ingreso',
        cuentaBancaria: 'Fondos Públicos',
        categoria: 'Cuota Ordinaria',
        municipio: 'Santa Eulalia',
        monto: '',
        comprobanteTipo: 'Recibo CGC 63-A2',
        comprobanteNumero: '',
        urlComprobante: '',
        descripcion: 'Aporte mensual ordinario de municipalidad miembro.'
      };
    } else {
      nuevaTx = {
        tipo: 'Egreso',
        cuentaBancaria: 'Fondos Públicos',
        categoria: 'Caja Chica',
        municipio: 'Regional',
        monto: '',
        comprobanteTipo: 'Factura SAT FEL',
        comprobanteNumero: '',
        urlComprobante: '',
        descripcion: 'Gasto operativo de oficina central.'
      };
    }
    showModal = true;
  }

  async function guardarTransaccion(e) {
    e.preventDefault();
    if (nuevaTx.categoria === 'Caja Chica' && !nuevaTx.urlComprobante) {
      toast.error('Adjunte el comprobante del gasto de caja chica');
      return;
    }

    formLoading = true;
    try {
      await apiClient.post('/financiero/transacciones', {
        ...nuevaTx,
        monto: Number(nuevaTx.monto)
      });
      toast.success('Movimiento registrado en el sistema');
      showModal = false;
      await fetchFinanciero();
    } catch (err) {
      console.error('Error al guardar movimiento:', err);
      toast.error(err.response?.data?.error || 'No se pudo guardar el movimiento. Revise la conexión.');
    } finally {
      formLoading = false;
    }
  }

  // Cálculos reactivos de cuentas bancarias separadas
  let cuentaPublica = $derived.by(() => {
    const pub = transacciones.filter(t => t.cuentaBancaria === 'Fondos Públicos');
    const ing = pub.filter(t => t.tipo === 'Ingreso').reduce((acc, c) => acc + c.monto, 0);
    const egr = pub.filter(t => t.tipo === 'Egreso').reduce((acc, c) => acc + c.monto, 0);
    return { ingresos: ing, egresos: egr, saldo: ing - egr };
  });

  let cuentaCooperacion = $derived.by(() => {
    const coop = transacciones.filter(t => t.cuentaBancaria === 'Cooperación Internacional');
    const ing = coop.filter(t => t.tipo === 'Ingreso').reduce((acc, c) => acc + c.monto, 0);
    const egr = coop.filter(t => t.tipo === 'Egreso').reduce((acc, c) => acc + c.monto, 0);
    return { ingresos: ing, egresos: egr, saldo: ing - egr };
  });

  // Filtrado de la tabla
  let transaccionesFiltradas = $derived(
    transacciones.filter(t => {
      if (filtroCuenta !== 'todas' && t.cuentaBancaria !== filtroCuenta) return false;
      if (filtroTipo !== 'todos' && t.tipo !== filtroTipo) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = t.codigo.toLowerCase().includes(q) ||
                      t.descripcion.toLowerCase().includes(q) ||
                      (t.municipio && t.municipio.toLowerCase().includes(q)) ||
                      (t.comprobanteNumero || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    })
  );
</script>

<svelte:head>
  <title>Control Financiero y Rendición de Cuentas | MFN Digital</title>
</svelte:head>

<!-- HEADER PRINCIPAL -->
<header class="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-8 mt-2 animate-fade-in">
  <div>
    <div class="flex items-center gap-2 mb-2">
      <span class="text-[12px] font-bold uppercase tracking-normal text-[#1248AA]">Módulo 03</span>
      <span class="text-[12px] text-[#071D49]/30">•</span>
      <span class="text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40">Administración Presupuestaria y Probidad</span>
    </div>
    <h2 class="text-[40px] font-semibold tracking-[-0.04em] leading-none text-[#071D49] mb-3">Control Financiero y Cuotas</h2>
    <p class="text-[13px] text-[#071D49]/50 leading-relaxed max-w-2xl">
      Movimientos registrados por tipo de cuenta. Los saldos mostrados son cálculos del sistema, no estados bancarios certificados.
    </p>
  </div>

  {#if auth.puedeEditar('financiero')}
  <div class="flex items-center gap-3 shrink-0 flex-wrap">
    <!-- Botón Cuota Municipal -->
    <button 
      onclick={() => abrirModal('Cuota')}
      class="px-5 py-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-full text-[12px] font-bold text-[#071D49] shadow-sm transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer"
    >
      <Icon name="payments" className="w-[18px] h-[18px] text-emerald-600" />
      <span>+ Ingreso Cuota Municipal</span>
    </button>

    <!-- Botón Gasto / Caja Chica -->
    <button 
      onclick={() => abrirModal('CajaChica')}
      class="px-6 py-3 bg-[#071D49] hover:bg-black text-white rounded-full text-[12px] font-bold shadow-md transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer"
    >
      <Icon name="receipt_long" className="w-[18px] h-[18px] text-[#1248AA]" />
      <span>+ Registrar Caja Chica</span>
    </button>
  </div>
  {/if}
</header>
{#if loadError}
  <div role="alert" class="glass-light rounded-[24px] p-6 mb-8 text-[#071D49]">
    <p>No se pudieron cargar los movimientos financieros.</p>
    <button class="mt-3 px-4 py-2 bg-[#071D49] text-white rounded-xl" onclick={fetchFinanciero}>Reintentar</button>
  </div>
{:else if loading}
  <p class="mb-8 text-[#071D49]">Cargando movimientos financieros...</p>
{:else}


<!-- SEPARACIÓN BANCARIA INSTITUCIONAL (2 GRANDES CUENTAS INDEPENDIENTES) -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
  <!-- Cuenta 1: Fondos Públicos Ordinarios -->
  <div class="glass-light   rounded-[28px] p-7  card-lift relative overflow-hidden group">
    <div class="flex items-start justify-between mb-4">
      <div>
        <div class="flex items-center gap-2 mb-1.5">
          <span class="w-2 h-2 rounded-full bg-blue-500"></span>
          <span class="text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40">Cuenta Monetaria No. 1</span>
        </div>
        <h3 class="text-xl font-semibold text-[#071D49] tracking-tight">Fondos Públicos e Ingresos Propios</h3>
        <p class="text-[12px] text-[#071D49]/50 mt-0.5">Ingresos y egresos registrados para fondos públicos</p>
      </div>
      <span class="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[12px] font-semibold uppercase tracking-wider border border-blue-100">
        Registro interno
      </span>
    </div>

    <div class="mt-6 pt-5 border-t border-gray-50 flex items-baseline justify-between">
      <div>
        <span class="text-[12px] font-semibold uppercase tracking-normal text-[#071D49]/40 block mb-1">Saldo de movimientos registrados</span>
        <p class="text-[32px] font-semibold tracking-[-0.04em] text-[#071D49]">Q {cuentaPublica.saldo.toLocaleString('es-GT')}</p>
      </div>
      <div class="text-right space-y-1 text-[11px]">
        <p class="text-emerald-700 font-bold flex items-center justify-end gap-1">
          <Icon name="arrow_upward" className="w-3.5 h-3.5" />
          <span>Ingresos: Q {cuentaPublica.ingresos.toLocaleString('es-GT')}</span>
        </p>
        <p class="text-rose-600 font-bold flex items-center justify-end gap-1">
          <Icon name="arrow_downward" className="w-3.5 h-3.5" />
          <span>Egresos: Q {cuentaPublica.egresos.toLocaleString('es-GT')}</span>
        </p>
      </div>
    </div>
  </div>

  <!-- Cuenta 2: Cooperación Internacional y Donaciones -->
  <div class="glass-light   rounded-[28px] p-7  card-lift relative overflow-hidden group">
    <div class="flex items-start justify-between mb-4">
      <div>
        <div class="flex items-center gap-2 mb-1.5">
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span class="text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40">Cuenta Monetaria No. 2</span>
        </div>
        <h3 class="text-xl font-semibold text-[#071D49] tracking-tight">Cooperación Internacional y Donaciones</h3>
        <p class="text-[12px] text-[#071D49]/50 mt-0.5">Ingresos y egresos registrados para cooperación</p>
      </div>
      <span class="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[12px] font-semibold uppercase tracking-wider border border-emerald-100">
        Registro interno
      </span>
    </div>

    <div class="mt-6 pt-5 border-t border-gray-50 flex items-baseline justify-between">
      <div>
        <span class="text-[12px] font-semibold uppercase tracking-normal text-[#071D49]/40 block mb-1">Saldo de movimientos registrados</span>
        <p class="text-[32px] font-semibold tracking-[-0.04em] text-[#071D49]">Q {cuentaCooperacion.saldo.toLocaleString('es-GT')}</p>
      </div>
      <div class="text-right space-y-1 text-[11px]">
        <p class="text-emerald-700 font-bold flex items-center justify-end gap-1">
          <Icon name="arrow_upward" className="w-3.5 h-3.5" />
          <span>Ingresos: Q {cuentaCooperacion.ingresos.toLocaleString('es-GT')}</span>
        </p>
        <p class="text-rose-600 font-bold flex items-center justify-end gap-1">
          <Icon name="arrow_downward" className="w-3.5 h-3.5" />
          <span>Egresos: Q {cuentaCooperacion.egresos.toLocaleString('es-GT')}</span>
        </p>
      </div>
    </div>
  </div>
</div>

<!-- APORTES REGISTRADOS POR MUNICIPIO -->
<section class="glass-light rounded-[32px] p-8 mb-8">
  <div class="pb-6 mb-2 border-b border-gray-50">
    <h3 class="text-[12px] font-semibold uppercase tracking-normal text-[#071D49]/40 mb-1">Aportes municipales registrados</h3>
    <p class="text-[12px] font-medium text-[#071D49]/50">Los importes proceden de los movimientos cargados; no determinan solvencia ni obligaciones pendientes.</p>
  </div>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
    {#each municipiosMFN as m}
      <div class="bg-white border border-gray-100 rounded-[22px] p-4">
        <h4 class="text-[13px] font-semibold text-[#071D49] mb-2">{m.nombre}</h4>
        <p class="text-[15px] font-semibold text-[#071D49]">Q {m.cuotasPagadas.toLocaleString('es-GT')}</p>
        <p class="text-[12px] text-[#071D49]/50">Último aporte: {m.ultimoAporte}</p>
      </div>
    {/each}
  </div>
</section>

<!-- LIBRO AUXILIAR CRONOLÓGICO DE MOVIMIENTOS -->
<section class="glass-light   rounded-[32px] p-8 ">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-2 border-b border-gray-50">
    <div>
      <h3 class="text-[12px] font-semibold uppercase tracking-normal text-[#071D49]/40 mb-1">Movimientos registrados</h3>
      <p class="text-[12px] font-medium text-[#071D49]/50">Movimientos capturados en el sistema; conciliar con los comprobantes y estados bancarios.</p>
    </div>

    <div class="flex items-center gap-3 flex-wrap">
      <select bind:value={filtroCuenta} class="px-3.5 py-2 bg-white border border-gray-200 rounded-full text-[11px] font-bold text-[#071D49] focus:outline-none">
        <option value="todas">Todas las Cuentas</option>
        <option value="Fondos Públicos">Fondos Públicos</option>
        <option value="Cooperación Internacional">Cooperación Internacional</option>
      </select>

      <select bind:value={filtroTipo} class="px-3.5 py-2 bg-white border border-gray-200 rounded-full text-[11px] font-bold text-[#071D49] focus:outline-none">
        <option value="todos">Ingresos y Egresos</option>
        <option value="Ingreso">Solo Ingresos</option>
        <option value="Egreso">Solo Egresos</option>
      </select>
    </div>
  </div>

  <div class="overflow-x-auto">
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b border-gray-50">
          <th class="py-4 px-4 text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40">Transacción / Fecha</th>
          <th class="py-4 px-4 text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40">Cuenta & Categoría</th>
          <th class="py-4 px-4 text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40">Descripción y Origen</th>
          <th class="py-4 px-4 text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40">Comprobante registrado</th>
          <th class="py-4 px-4 text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40 text-right">Monto</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-50/60">
        {#each transaccionesFiltradas as t}
          {@const esIngreso = t.tipo === 'Ingreso'}
          <tr class="transition-colors hover:bg-gray-50/50 group">
            <td class="py-4 px-4">
              <span class="text-[12px] font-mono font-bold text-[#1248AA] block">{t.codigo}</span>
              <span class="text-[11px] text-[#071D49]/50 font-medium">{t.fecha}</span>
            </td>
            <td class="py-4 px-4">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-bold {t.cuentaBancaria === 'Fondos Públicos' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}">
                {t.cuentaBancaria}
              </span>
              <span class="text-[11px] font-semibold text-[#071D49]/60 block mt-1">{t.categoria}</span>
            </td>
            <td class="py-4 px-4 max-w-sm">
              <p class="text-[12px] font-bold text-[#071D49] leading-snug">{t.descripcion}</p>
              {#if t.municipio}
                <span class="text-[12px] font-medium text-[#071D49]/40 mt-0.5 block">{t.municipio}</span>
              {/if}
            </td>
            <td class="py-4 px-4">
              <div class="flex items-center gap-2">
                <div>
                  <span class="text-[11px] font-bold text-[#071D49] block">{t.comprobanteTipo}</span>
                  <span class="text-[12px] font-mono text-[#071D49]/50">{t.comprobanteNumero}</span>
                </div>
                {#if t.urlComprobante}
                  <a href={t.urlComprobante} target="_blank" class="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-[#071D49] transition-colors" title="Ver comprobante adjunto">
                    <Icon name="image" className="w-3.5 h-3.5" />
                  </a>
                {/if}
              </div>
            </td>
            <td class="py-4 px-4 text-right">
              <span class="text-[15px] font-semibold tracking-tight {esIngreso ? 'text-emerald-600' : 'text-rose-600'}">
                {esIngreso ? '+' : '-'} Q {t.monto.toLocaleString('es-GT')}
              </span>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>

{/if}

<!-- MODAL REGISTRO DE CUOTA / CAJA CHICA -->
{#if showModal && auth.puedeEditar('financiero')}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div transition:fade={{ duration: 180 }} class="fixed inset-0 bg-[#071D49]/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick={() => showModal = false}>
    <div transition:fly={{ y: 20, duration: 250 }} class="glass-light mfn-form-dialog rounded-[32px] w-full max-w-xl  p-8  " onclick={e => e.stopPropagation()}>
      <div class="flex justify-between items-center mb-6 border-b border-gray-50 pb-4">
        <div>
          <span class="text-[12px] font-bold uppercase tracking-normal text-[#1248AA]">Control Financiero MFN</span>
          <h2 class="text-xl font-semibold text-[#071D49] tracking-tight">
            {modalTipo === 'Cuota' ? 'Registro de Cuota Municipal' : 'Liquidación de Gasto / Caja Chica'}
          </h2>
        </div>
        <button onclick={() => showModal = false} class="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
          <Icon name="close" className="w-5 h-5 text-[#071D49]/50" stroke={2} />
        </button>
      </div>

      <form onsubmit={guardarTransaccion} class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="field-1" class="block text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40 mb-1.5">Cuenta Bancaria</label>
            <select id="field-1" bind:value={nuevaTx.cuentaBancaria} class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[12px] text-[#071D49]">
              <option value="Fondos Públicos">Fondos Públicos</option>
              <option value="Cooperación Internacional">Cooperación Internacional</option>
            </select>
          </div>

          <div>
            <label for="field-2" class="block text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40 mb-1.5">Monto (Quetzales)</label>
            <input id="field-2" required type="number" step="0.01" min="1" bind:value={nuevaTx.monto} class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] font-bold text-[#071D49]" />
          </div>
        </div>

        {#if modalTipo === 'Cuota'}
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="field-3" class="block text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40 mb-1.5">Municipio Miembro</label>
              <select id="field-3" bind:value={nuevaTx.municipio} class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[12px] text-[#071D49]">
                {#each LISTA_MUNICIPIOS as mun}
                  <option value={mun}>{mun}</option>
                {/each}
              </select>
            </div>
            <div>
              <label for="field-4" class="block text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40 mb-1.5">Número del comprobante existente</label>
              <input id="field-4" required type="text" bind:value={nuevaTx.comprobanteNumero} class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-[#071D49]" />
            </div>
          </div>
        {:else}
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="field-5" class="block text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40 mb-1.5">Tipo de Comprobante</label>
              <select id="field-5" bind:value={nuevaTx.comprobanteTipo} class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[12px] text-[#071D49]">
                <option value="Factura SAT FEL">Factura SAT FEL</option>
                <option value="Recibo CGC 63-A2">Recibo CGC 63-A2</option>
              </select>
            </div>
            <div>
              <label for="field-6" class="block text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40 mb-1.5">No. Factura / Autorización</label>
              <input id="field-6" required type="text" bind:value={nuevaTx.comprobanteNumero} placeholder="Ej: FEL-D891-2201" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-[#071D49]" />
            </div>
          </div>

          <!-- RF11: Evidencia obligatoria de factura en Caja Chica -->
          <div>
            <label for="field-7" class="block text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40 mb-1.5">
              URL del comprobante del gasto
            </label>
            <input id="field-7" required type="text" bind:value={nuevaTx.urlComprobante} placeholder="https://..." class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-[#071D49]" />
          </div>
        {/if}

        <div>
          <label for="field-8" class="block text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40 mb-1.5">Concepto / Descripción</label>
          <textarea id="field-8" required rows="2" bind:value={nuevaTx.descripcion} class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-[#071D49]" placeholder="Justificación del movimiento financiero..."></textarea>
        </div>

        <div class="pt-4 flex justify-end gap-3 mt-6 border-t border-gray-50 pt-5">
          <button type="button" onclick={() => showModal = false} class="px-6 py-3 rounded-full font-bold text-[#071D49]/60 hover:bg-gray-50 transition-colors text-[13px]">Cancelar</button>
          <button type="submit" disabled={formLoading} class="px-8 py-3 bg-[#071D49] text-white rounded-full font-bold hover:bg-black shadow-md transition-all text-[13px] disabled:opacity-50">
            {formLoading ? 'Guardando...' : 'Registrar movimiento'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

