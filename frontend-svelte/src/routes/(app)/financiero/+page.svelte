<script>
  import { onMount } from 'svelte';
  import apiClient from '$lib/apiClient';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { toast } from 'svelte-sonner';
  import { fade, fly } from 'svelte/transition';

  const LISTA_MUNICIPIOS = [
    'Santa Eulalia',
    'San Pedro Soloma',
    'San Rafael la Independencia',
    'San Mateo Ixtatán',
    'Santa Cruz Barillas',
    'San Miguel Acatán'
  ];

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

  // Derivar las cuotas y solvencia de los municipios a partir de las transacciones reales en la BD
  let municipiosMFN = $derived(
    LISTA_MUNICIPIOS.map(nombre => {
      const txs = transacciones.filter(t => t.municipio === nombre && t.categoria === 'Cuota Ordinaria' && t.tipo === 'Ingreso');
      const cuotasPagadas = txs.reduce((acc, t) => acc + (t.monto || 0), 0);
      const cuotasEsperadas = 180000;
      const ultimo = txs[0]?.fecha ? new Date(txs[0].fecha).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Sin aportes';
      const estado = cuotasPagadas >= cuotasEsperadas ? 'Solvente' : cuotasPagadas > 0 ? `Atraso ${Math.max(1, 12 - Math.floor(cuotasPagadas / 15000))} Meses` : 'Sin aportes';
      return {
        nombre,
        cuotasPagadas,
        cuotasEsperadas,
        estado,
        ultimoAporte: ultimo
      };
    })
  );

  let filtroCuenta = $state('todas');
  let filtroTipo = $state('todos');
  let searchQuery = $state('');

  // Modal
  let showModal = $state(false);
  let formLoading = $state(false);
  let modalTipo = $state('Cuota'); // 'Cuota' | 'CajaChica'
  let nuevaTx = $state({
    tipo: 'Ingreso',
    cuentaBancaria: 'Fondos Públicos',
    categoria: 'Cuota Ordinaria',
    municipio: 'Santa Eulalia',
    monto: 15000,
    comprobanteTipo: 'Recibo CGC 63-A2',
    comprobanteNumero: '',
    urlComprobante: '',
    descripcion: ''
  });

  async function fetchFinanciero() {
    loading = true;
    try {
      const [resTx, resBal] = await Promise.allSettled([
        apiClient.get('/financiero/transacciones'),
        apiClient.get('/financiero/balance')
      ]);
      if (resTx.status === 'fulfilled' && Array.isArray(resTx.value.data)) {
        transacciones = resTx.value.data;
      }
      if (resBal.status === 'fulfilled' && resBal.value.data) {
        balance = resBal.value.data;
      }
    } catch (err) {
      console.error('Error al cargar datos financieros de la BD:', err);
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
        monto: 15000,
        comprobanteTipo: 'Recibo CGC 63-A2',
        comprobanteNumero: 'Serie AG-',
        urlComprobante: '',
        descripcion: 'Aporte mensual ordinario de municipalidad miembro.'
      };
    } else {
      nuevaTx = {
        tipo: 'Egreso',
        cuentaBancaria: 'Fondos Públicos',
        categoria: 'Caja Chica',
        municipio: 'Regional',
        monto: 450,
        comprobanteTipo: 'Factura SAT FEL',
        comprobanteNumero: 'FEL-',
        urlComprobante: '',
        descripcion: 'Gasto operativo de oficina central.'
      };
    }
    showModal = true;
  }

  async function guardarTransaccion(e) {
    e.preventDefault();
    if (nuevaTx.categoria === 'Caja Chica' && !nuevaTx.urlComprobante) {
      toast.error('RF11: Es obligatorio adjuntar la fotografía de la factura para egresos de Caja Chica');
      return;
    }

    formLoading = true;
    try {
      await apiClient.post('/financiero/transacciones', {
        ...nuevaTx,
        monto: Number(nuevaTx.monto)
      });
      toast.success(nuevaTx.tipo === 'Ingreso' ? 'Comprobante de ingreso registrado en la base de datos' : 'Egreso de caja chica liquidado en la base de datos');
      showModal = false;
      await fetchFinanciero();
    } catch (err) {
      console.error('Error al guardar movimiento:', err);
      toast.error('Error al registrar la transacción en la base de datos');
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

  let liquidezTotal = $derived(cuentaPublica.saldo + cuentaCooperacion.saldo);

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
                      t.comprobanteNumero.toLowerCase().includes(q);
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
      <span class="text-[9px] font-bold uppercase tracking-[0.15em] text-[#3B82F6]">Módulo 03</span>
      <span class="text-[9px] text-[#0A1526]/30">•</span>
      <span class="text-[9px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40">Administración Presupuestaria y Probidad</span>
    </div>
    <h2 class="text-[40px] font-black tracking-[-0.04em] leading-none text-[#0A1526] mb-3">Control Financiero y Cuotas</h2>
    <p class="text-[13px] text-[#0A1526]/50 leading-relaxed max-w-2xl">
      Separación bancaria estricta de fondos públicos y cooperación, rendición de cuentas CGC y digitalización de caja chica.
    </p>
  </div>

  <div class="flex items-center gap-3 shrink-0 flex-wrap">
    <!-- Botón Cuota Municipal -->
    <button 
      onclick={() => abrirModal('Cuota')}
      class="px-5 py-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-full text-[12px] font-bold text-[#0A1526] shadow-sm transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer"
    >
      <Icon name="payments" className="w-[18px] h-[18px] text-emerald-600" />
      <span>+ Ingreso Cuota Municipal</span>
    </button>

    <!-- Botón Gasto / Caja Chica -->
    <button 
      onclick={() => abrirModal('CajaChica')}
      class="px-6 py-3 bg-[#0A1526] hover:bg-black text-white rounded-full text-[12px] font-bold shadow-md transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer"
    >
      <Icon name="receipt_long" className="w-[18px] h-[18px] text-[#3B82F6]" />
      <span>+ Registrar Caja Chica</span>
    </button>
  </div>
</header>

<!-- SEPARACIÓN BANCARIA INSTITUCIONAL (2 GRANDES CUENTAS INDEPENDIENTES) -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
  <!-- Cuenta 1: Fondos Públicos Ordinarios -->
  <div class="bg-white border border-gray-100 rounded-[28px] p-7 shadow-[0_20px_60px_-15px_rgba(10,21,38,0.05)] card-lift relative overflow-hidden group">
    <div class="flex items-start justify-between mb-4">
      <div>
        <div class="flex items-center gap-2 mb-1.5">
          <span class="w-2 h-2 rounded-full bg-blue-500"></span>
          <span class="text-[9px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40">Cuenta Monetaria No. 1</span>
        </div>
        <h3 class="text-xl font-black text-[#0A1526] tracking-tight">Fondos Públicos e Ingresos Propios</h3>
        <p class="text-[12px] text-[#0A1526]/50 mt-0.5">Recibos Forma 63-A2 (CGC) · Cuotas ordinarias de los 6 municipios</p>
      </div>
      <span class="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-extrabold uppercase tracking-wider border border-blue-100">
        Banrural Oficial
      </span>
    </div>

    <div class="mt-6 pt-5 border-t border-gray-50 flex items-baseline justify-between">
      <div>
        <span class="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#0A1526]/40 block mb-1">Saldo Disponible Líquido</span>
        <p class="text-[32px] font-black tracking-[-0.04em] text-[#0A1526]">Q {cuentaPublica.saldo.toLocaleString('es-GT')}</p>
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
  <div class="bg-white border border-gray-100 rounded-[28px] p-7 shadow-[0_20px_60px_-15px_rgba(10,21,38,0.05)] card-lift relative overflow-hidden group">
    <div class="flex items-start justify-between mb-4">
      <div>
        <div class="flex items-center gap-2 mb-1.5">
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span class="text-[9px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40">Cuenta Monetaria No. 2</span>
        </div>
        <h3 class="text-xl font-black text-[#0A1526] tracking-tight">Cooperación Internacional y Donaciones</h3>
        <p class="text-[12px] text-[#0A1526]/50 mt-0.5">Recibos SAT Donaciones · Fondos USAID, AECID, BID no mezclables</p>
      </div>
      <span class="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold uppercase tracking-wider border border-emerald-100">
        Fideicomiso Aislado
      </span>
    </div>

    <div class="mt-6 pt-5 border-t border-gray-50 flex items-baseline justify-between">
      <div>
        <span class="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#0A1526]/40 block mb-1">Saldo Disponible Líquido</span>
        <p class="text-[32px] font-black tracking-[-0.04em] text-[#0A1526]">Q {cuentaCooperacion.saldo.toLocaleString('es-GT')}</p>
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

<!-- SEMÁFORO DE SOLVENCIA MUNICIPAL (6 MUNICIPIOS MIEMBROS) -->
<section class="bg-white border border-gray-100/60 rounded-[32px] p-8 mb-8 shadow-[0_20px_60px_-15px_rgba(10,21,38,0.05)]">
  <div class="flex items-center justify-between pb-6 mb-2 border-b border-gray-50">
    <div>
      <h3 class="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1">Semáforo de Solvencia de Cuotas Municipales</h3>
      <p class="text-[12px] font-medium text-[#0A1526]/50">Cuota ordinaria obligatoria de Q15,000 mensuales según Estatuto Orgánico MFN</p>
    </div>
    <span class="px-3.5 py-1.5 rounded-full bg-white border border-gray-200 text-[10px] font-bold text-[#0A1526]/70 shadow-xs">
      Año Fiscal 2024
    </span>
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 pt-2">
    {#each municipiosMFN as m}
      {@const porcentaje = Math.round((m.cuotasPagadas / m.cuotasEsperadas) * 100)}
      {@const esSolvente = m.estado === 'Solvente'}
      <div class="bg-[#F8FAFC] border border-gray-100 rounded-[22px] p-4.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
        <div class="flex items-center justify-between mb-3">
          <span class="w-2.5 h-2.5 rounded-full {esSolvente ? 'bg-emerald-500' : 'bg-amber-500'}"></span>
          <span class="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md {esSolvente ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}">
            {m.estado}
          </span>
        </div>
        <h4 class="text-[13px] font-black text-[#0A1526] tracking-tight leading-tight mb-2">{m.nombre}</h4>
        <div class="space-y-1 text-[11px] mb-3">
          <p class="font-bold text-[#0A1526]">Q {m.cuotasPagadas.toLocaleString('es-GT')}</p>
          <p class="text-[9px] text-[#0A1526]/40">de Q {m.cuotasEsperadas.toLocaleString('es-GT')}</p>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-1 overflow-hidden">
          <div class="{esSolvente ? 'bg-emerald-500' : 'bg-amber-500'} h-1 rounded-full transition-all duration-500" style="width: {porcentaje}%"></div>
        </div>
      </div>
    {/each}
  </div>
</section>

<!-- LIBRO AUXILIAR CRONOLÓGICO DE MOVIMIENTOS -->
<section class="bg-white border border-gray-100/60 rounded-[32px] p-8 shadow-[0_20px_60px_-15px_rgba(10,21,38,0.05)]">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-2 border-b border-gray-50">
    <div>
      <h3 class="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1">Libro Auxiliar Contable en Tiempo Real</h3>
      <p class="text-[12px] font-medium text-[#0A1526]/50">Registro vinculante auditado ante la Contraloría General de Cuentas (CGC)</p>
    </div>

    <!-- Filtros de la tabla -->
    <div class="flex items-center gap-3">
      <select bind:value={filtroCuenta} class="px-3.5 py-2 bg-white border border-gray-200 rounded-full text-[11px] font-bold text-[#0A1526] focus:outline-none">
        <option value="todas">Todas las Cuentas</option>
        <option value="Fondos Públicos">Fondos Públicos</option>
        <option value="Cooperación Internacional">Cooperación Internacional</option>
      </select>

      <select bind:value={filtroTipo} class="px-3.5 py-2 bg-white border border-gray-200 rounded-full text-[11px] font-bold text-[#0A1526] focus:outline-none">
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
          <th class="py-4 px-4 text-[9px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40">Transacción / Fecha</th>
          <th class="py-4 px-4 text-[9px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40">Cuenta & Categoría</th>
          <th class="py-4 px-4 text-[9px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40">Descripción y Origen</th>
          <th class="py-4 px-4 text-[9px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40">Comprobante Legal</th>
          <th class="py-4 px-4 text-[9px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 text-right">Monto</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-50/60">
        {#each transaccionesFiltradas as t}
          {@const esIngreso = t.tipo === 'Ingreso'}
          <tr class="transition-colors hover:bg-gray-50/50 group">
            <td class="py-4 px-4">
              <span class="text-[9px] font-mono font-bold text-[#3B82F6] block">{t.codigo}</span>
              <span class="text-[11px] text-[#0A1526]/50 font-medium">{t.fecha}</span>
            </td>
            <td class="py-4 px-4">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold {t.cuentaBancaria === 'Fondos Públicos' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}">
                {t.cuentaBancaria}
              </span>
              <span class="text-[11px] font-semibold text-[#0A1526]/60 block mt-1">{t.categoria}</span>
            </td>
            <td class="py-4 px-4 max-w-sm">
              <p class="text-[12px] font-bold text-[#0A1526] leading-snug">{t.descripcion}</p>
              {#if t.municipio}
                <span class="text-[10px] font-medium text-[#0A1526]/40 mt-0.5 block">{t.municipio}</span>
              {/if}
            </td>
            <td class="py-4 px-4">
              <div class="flex items-center gap-2">
                <div>
                  <span class="text-[11px] font-bold text-[#0A1526] block">{t.comprobanteTipo}</span>
                  <span class="text-[10px] font-mono text-[#0A1526]/50">{t.comprobanteNumero}</span>
                </div>
                {#if t.urlComprobante}
                  <a href={t.urlComprobante} target="_blank" class="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-[#0A1526] transition-colors" title="Ver Factura / Evidencia RF11">
                    <Icon name="image" className="w-3.5 h-3.5" />
                  </a>
                {/if}
              </div>
            </td>
            <td class="py-4 px-4 text-right">
              <span class="text-[15px] font-black tracking-tight {esIngreso ? 'text-emerald-600' : 'text-rose-600'}">
                {esIngreso ? '+' : '-'} Q {t.monto.toLocaleString('es-GT')}
              </span>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>

<!-- MODAL REGISTRO DE CUOTA / CAJA CHICA -->
{#if showModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div transition:fade={{ duration: 180 }} class="fixed inset-0 bg-[#0A1526]/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick={() => showModal = false}>
    <div transition:fly={{ y: 20, duration: 250 }} class="bg-white rounded-[32px] w-full max-w-xl shadow-[0_24px_60px_-20px_rgba(10,21,38,0.12)] p-8 border border-gray-100" onclick={e => e.stopPropagation()}>
      <div class="flex justify-between items-center mb-6 border-b border-gray-50 pb-4">
        <div>
          <span class="text-[9px] font-bold uppercase tracking-[0.15em] text-[#3B82F6]">Control Financiero MFN</span>
          <h2 class="text-xl font-black text-[#0A1526] tracking-tight">
            {modalTipo === 'Cuota' ? 'Registro de Cuota Municipal' : 'Liquidación de Gasto / Caja Chica'}
          </h2>
        </div>
        <button onclick={() => showModal = false} class="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
          <Icon name="close" className="w-5 h-5 text-[#0A1526]/50" stroke={2} />
        </button>
      </div>

      <form onsubmit={guardarTransaccion} class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1.5">Cuenta Bancaria</label>
            <select bind:value={nuevaTx.cuentaBancaria} class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[12px] text-[#0A1526]">
              <option value="Fondos Públicos">Fondos Públicos (Banrural)</option>
              <option value="Cooperación Internacional">Cooperación Internacional</option>
            </select>
          </div>

          <div>
            <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1.5">Monto (Quetzales)</label>
            <input required type="number" step="0.01" min="1" bind:value={nuevaTx.monto} class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] font-bold text-[#0A1526]" />
          </div>
        </div>

        {#if modalTipo === 'Cuota'}
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1.5">Municipio Miembro</label>
              <select bind:value={nuevaTx.municipio} class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[12px] text-[#0A1526]">
                {#each LISTA_MUNICIPIOS as mun}
                  <option value={mun}>{mun}</option>
                {/each}
              </select>
            </div>
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1.5">No. Recibo CGC (Forma 63-A2)</label>
              <input required type="text" bind:value={nuevaTx.comprobanteNumero} placeholder="Ej: Serie AG-88925" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-[#0A1526]" />
            </div>
          </div>
        {:else}
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1.5">Tipo de Comprobante</label>
              <select bind:value={nuevaTx.comprobanteTipo} class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[12px] text-[#0A1526]">
                <option value="Factura SAT FEL">Factura SAT FEL</option>
                <option value="Recibo CGC 63-A2">Recibo CGC 63-A2</option>
              </select>
            </div>
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1.5">No. Factura / Autorización</label>
              <input required type="text" bind:value={nuevaTx.comprobanteNumero} placeholder="Ej: FEL-D891-2201" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-[#0A1526]" />
            </div>
          </div>

          <!-- RF11: Evidencia obligatoria de factura en Caja Chica -->
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1.5">
              URL / Fotografía de Factura (Obligatorio RF11)
            </label>
            <input required type="text" bind:value={nuevaTx.urlComprobante} placeholder="https://..." class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-[#0A1526]" />
          </div>
        {/if}

        <div>
          <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1.5">Concepto / Descripción</label>
          <textarea required rows="2" bind:value={nuevaTx.descripcion} class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-[#0A1526]" placeholder="Justificación del movimiento financiero..."></textarea>
        </div>

        <div class="pt-4 flex justify-end gap-3 mt-6 border-t border-gray-50 pt-5">
          <button type="button" onclick={() => showModal = false} class="px-6 py-3 rounded-full font-bold text-[#0A1526]/60 hover:bg-gray-50 transition-colors text-[13px]">Cancelar</button>
          <button type="submit" disabled={formLoading} class="px-8 py-3 bg-[#0A1526] text-white rounded-full font-bold hover:bg-black shadow-md transition-all text-[13px] disabled:opacity-50">
            {formLoading ? 'Guardando...' : 'Registrar en Libro Auxiliar'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
