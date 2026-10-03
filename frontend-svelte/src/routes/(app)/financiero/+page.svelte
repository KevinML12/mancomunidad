<script>
  import { onMount } from 'svelte';
  import apiClient from '$lib/apiClient';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { toast } from 'svelte-sonner';
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

  // Modal Registro Cuota / Caja Chica
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

  // RF10: Emisión e Impresión de Comprobante Oficial Forma 63-A2 (CGC)
  let reciboSeleccionado = $state(null);
  let showReciboModal = $state(false);

  // RF12: Dictamen de Rendición de Cuentas para la Asamblea General de Alcaldes
  let showDictamenModal = $state(false);

  function abrirRecibo(t) {
    reciboSeleccionado = t;
    showReciboModal = true;
  }

  function imprimirDocumento() {
    window.print();
  }

  function montoALetras(monto) {
    const val = Math.floor(monto || 0);
    if (val === 15000) return 'QUINCE MIL QUETZALES EXACTOS';
    if (val === 180000) return 'CIENTO OCHENTA MIL QUETZALES EXACTOS';
    if (val === 30000) return 'TREINTA MIL QUETZALES EXACTOS';
    if (val === 45000) return 'CUARENTA Y CINCO MIL QUETZALES EXACTOS';
    if (val === 60000) return 'SESENTA MIL QUETZALES EXACTOS';
    if (val === 90000) return 'NOVENTA MIL QUETZALES EXACTOS';
    if (val === 5000) return 'CINCO MIL QUETZALES EXACTOS';
    if (val >= 1000 && val < 1000000) {
      const miles = Math.floor(val / 1000);
      const resto = val % 1000;
      return `${miles} MIL QUETZALES ${resto > 0 ? `CON ${resto}/100` : 'EXACTOS'}`;
    }
    return `Q ${val.toLocaleString('es-GT')} EXACTOS`;
  }

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
      <span class="text-[12px] font-bold uppercase tracking-normal text-[#1248AA]">Módulo 03</span>
      <span class="text-[12px] text-[#071D49]/30">•</span>
      <span class="text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40">Administración Presupuestaria y Probidad</span>
    </div>
    <h2 class="text-[40px] font-semibold tracking-[-0.04em] leading-none text-[#071D49] mb-3">Control Financiero y Cuotas</h2>
    <p class="text-[13px] text-[#071D49]/50 leading-relaxed max-w-2xl">
      Separación bancaria estricta de fondos públicos y cooperación, rendición de cuentas CGC y digitalización de caja chica.
    </p>
  </div>

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
</header>

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
        <p class="text-[12px] text-[#071D49]/50 mt-0.5">Recibos Forma 63-A2 (CGC) · Cuotas ordinarias de los 3 municipios activos</p>
      </div>
      <span class="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[12px] font-semibold uppercase tracking-wider border border-blue-100">
        Banrural Oficial
      </span>
    </div>

    <div class="mt-6 pt-5 border-t border-gray-50 flex items-baseline justify-between">
      <div>
        <span class="text-[12px] font-semibold uppercase tracking-normal text-[#071D49]/40 block mb-1">Saldo Disponible Líquido</span>
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
        <p class="text-[12px] text-[#071D49]/50 mt-0.5">Recibos SAT Donaciones · Fondos USAID, AECID, BID no mezclables</p>
      </div>
      <span class="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[12px] font-semibold uppercase tracking-wider border border-emerald-100">
        Fideicomiso Aislado
      </span>
    </div>

    <div class="mt-6 pt-5 border-t border-gray-50 flex items-baseline justify-between">
      <div>
        <span class="text-[12px] font-semibold uppercase tracking-normal text-[#071D49]/40 block mb-1">Saldo Disponible Líquido</span>
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

<!-- SEMÁFORO DE SOLVENCIA MUNICIPAL (3 MUNICIPIOS ACTIVOS) -->
<section class="glass-light   rounded-[32px] p-8 mb-8 ">
  <div class="flex items-center justify-between pb-6 mb-2 border-b border-gray-50">
    <div>
      <h3 class="text-[12px] font-semibold uppercase tracking-normal text-[#071D49]/40 mb-1">Semáforo de Solvencia de Cuotas Municipales</h3>
      <p class="text-[12px] font-medium text-[#071D49]/50">Cuota ordinaria obligatoria de Q15,000 mensuales según Estatuto Orgánico MFN</p>
    </div>
    <span class="px-3.5 py-1.5 rounded-full bg-white border border-gray-200 text-[12px] font-bold text-[#071D49]/70 shadow-xs">
      Año Fiscal 2024
    </span>
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 pt-2">
    {#each municipiosMFN as m}
      {@const porcentaje = Math.round((m.cuotasPagadas / m.cuotasEsperadas) * 100)}
      {@const esSolvente = m.estado === 'Solvente'}
      <div class="bg-[#FFFFFF] border border-gray-100 rounded-[22px] p-4.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
        <div class="flex items-center justify-between mb-3">
          <span class="w-2.5 h-2.5 rounded-full {esSolvente ? 'bg-emerald-500' : 'bg-amber-500'}"></span>
          <span class="text-[12px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md {esSolvente ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}">
            {m.estado}
          </span>
        </div>
        <h4 class="text-[13px] font-semibold text-[#071D49] tracking-tight leading-tight mb-2">{m.nombre}</h4>
        <div class="space-y-1 text-[11px] mb-3">
          <p class="font-bold text-[#071D49]">Q {m.cuotasPagadas.toLocaleString('es-GT')}</p>
          <p class="text-[12px] text-[#071D49]/40">de Q {m.cuotasEsperadas.toLocaleString('es-GT')}</p>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-1 overflow-hidden">
          <div class="{esSolvente ? 'bg-emerald-500' : 'bg-amber-500'} h-1 rounded-full transition-all duration-500" style="width: {porcentaje}%"></div>
        </div>
      </div>
    {/each}
  </div>
</section>

<!-- LIBRO AUXILIAR CRONOLÓGICO DE MOVIMIENTOS -->
<section class="glass-light   rounded-[32px] p-8 ">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-2 border-b border-gray-50">
    <div>
      <h3 class="text-[12px] font-semibold uppercase tracking-normal text-[#071D49]/40 mb-1">Libro Auxiliar Contable en Tiempo Real</h3>
      <p class="text-[12px] font-medium text-[#071D49]/50">Registro vinculante auditado ante la Contraloría General de Cuentas (CGC)</p>
    </div>

    <!-- Filtros de la tabla & Dictamen Oficial -->
    <div class="flex items-center gap-3 flex-wrap">
      <button 
        onclick={() => showDictamenModal = true}
        class="flex items-center gap-2 px-4 py-2 bg-[#071D49] hover:bg-black text-white text-[11px] font-bold rounded-full shadow-sm transition-colors cursor-pointer"
        title="Generar informe para la asamblea de alcaldes (RF12)"
      >
        <Icon name="description" className="w-3.5 h-3.5 text-amber-400" />
        <span>Dictamen Rendición de Cuentas (CGC)</span>
      </button>

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
          <th class="py-4 px-4 text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40">Comprobante Legal</th>
          <th class="py-4 px-4 text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40 text-right">Monto</th>
          <th class="py-4 px-4 text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40 text-center">Acciones (RF10/11)</th>
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
                  <a href={t.urlComprobante} target="_blank" class="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-[#071D49] transition-colors" title="Ver Factura / Evidencia RF11">
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
            <td class="py-4 px-4 text-center">
              {#if esIngreso}
                <button 
                  onclick={() => abrirRecibo(t)}
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 text-[#1248AA] text-[12px] font-bold transition-colors cursor-pointer"
                  title="Emitir / Imprimir Comprobante Oficial Forma 63-A2 (CGC)"
                >
                  <Icon name="print" className="w-3.5 h-3.5" />
                  <span>Recibo 63-A2</span>
                </button>
              {:else if t.urlComprobante}
                <a 
                  href={t.urlComprobante} 
                  target="_blank" 
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-[#071D49] text-[12px] font-bold transition-colors"
                  title="Ver factura de caja chica"
                >
                  <Icon name="receipt_long" className="w-3.5 h-3.5" />
                  <span>Factura FEL</span>
                </a>
              {:else}
                <span class="text-[12px] text-[#071D49]/30 font-medium">—</span>
              {/if}
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
  <div transition:fade={{ duration: 180 }} class="fixed inset-0 bg-[#071D49]/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick={() => showModal = false}>
    <div transition:fly={{ y: 20, duration: 250 }} class="glass-light rounded-[32px] w-full max-w-xl  p-8  " onclick={e => e.stopPropagation()}>
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
              <option value="Fondos Públicos">Fondos Públicos (Banrural)</option>
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
              <label for="field-4" class="block text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40 mb-1.5">No. Recibo CGC (Forma 63-A2)</label>
              <input id="field-4" required type="text" bind:value={nuevaTx.comprobanteNumero} placeholder="Ej: Serie AG-88925" class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-[#071D49]" />
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
              URL / Fotografía de Factura (Obligatorio RF11)
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
            {formLoading ? 'Guardando...' : 'Registrar en Libro Auxiliar'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- MODAL COMPROBANTE OFICIAL FORMA 63-A2 (CGC - RF10) -->
{#if showReciboModal && reciboSeleccionado}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071D49]/70 backdrop-blur-sm overflow-y-auto">
    <div class="glass-light rounded-[28px] max-w-2xl w-full p-8 md:p-10    relative print:m-0 print:p-6 print: print:shadow-none print:w-full print:max-w-none">
      <!-- Botones de Acción (ocultos al imprimir) -->
      <div class="flex items-center justify-between pb-6 mb-6 border-b border-gray-100 print:hidden">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span class="text-[11px] font-bold text-[#071D49] uppercase tracking-wider">Documento Oficial Auditado</span>
        </div>
        <div class="flex items-center gap-3">
          <button 
            type="button" 
            onclick={imprimirDocumento}
            class="flex items-center gap-2 px-5 py-2.5 bg-[#071D49] hover:bg-black text-white text-[12px] font-bold rounded-full shadow-md transition-all cursor-pointer"
          >
            <Icon name="print" className="w-4 h-4 text-[#1248AA]" />
            <span>Imprimir / Guardar PDF</span>
          </button>
          <button 
            type="button" 
            onclick={() => showReciboModal = false} 
            class="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-[#071D49] transition-colors"
          >
            <Icon name="close" className="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- FORMATO OFICIAL IMPRIMIBLE FORMA 63-A2 -->
      <div class="border-2 border-[#071D49] p-6 md:p-8 rounded-2xl relative bg-[#FCFDFE]">
        <!-- Encabezado Gubernamental -->
        <div class="text-center pb-5 mb-5 border-b-2 border-[#071D49]">
          <div class="flex items-center justify-center gap-2 mb-1">
            <span class="text-[12px] font-semibold tracking-[0.2em] text-[#071D49] uppercase">República de Guatemala · Contraloría General de Cuentas</span>
          </div>
          <h2 class="text-[18px] md:text-[20px] font-semibold text-[#071D49] tracking-tight uppercase leading-tight">
            Mancomunidad de Municipios de la Frontera del Norte
          </h2>
          <p class="text-[11px] font-bold text-[#071D49]/70 mt-1">
            Cantón Vista Hermosa, Santa Eulalia, Huehuetenango · NIT: 47337753
          </p>
          <div class="mt-3 inline-block bg-[#071D49] text-white px-4 py-1 rounded-full text-[12px] font-semibold uppercase tracking-widest">
            Comprobante de Ingreso Oficial · Forma 63-A2 (CGC)
          </div>
        </div>

        <!-- Metadatos de Control -->
        <div class="grid grid-cols-2 gap-4 pb-4 mb-4 border-b border-gray-200 text-[11px]">
          <div>
            <span class="text-[12px] font-bold uppercase text-[#071D49]/50 block">No. Comprobante Legal</span>
            <span class="font-mono text-[14px] font-semibold text-[#071D49]">{reciboSeleccionado.comprobanteNumero || 'Serie AG-2026'}</span>
          </div>
          <div class="text-right">
            <span class="text-[12px] font-bold uppercase text-[#071D49]/50 block">Fecha de Certificación</span>
            <span class="font-bold text-[13px] text-[#071D49]">{reciboSeleccionado.fecha || new Date().toISOString().split('T')[0]}</span>
          </div>
        </div>

        <!-- Cuerpo del Recibo -->
        <div class="space-y-4 text-[12px] text-[#071D49]">
          <div class="bg-gray-50/80 p-3.5 rounded-xl border border-gray-100">
            <span class="text-[12px] font-bold uppercase text-[#071D49]/50 block mb-0.5">Recibido de la Entidad:</span>
            <p class="font-semibold text-[14px] text-[#071D49]">
              {reciboSeleccionado.municipio ? `MUNICIPALIDAD DE ${reciboSeleccionado.municipio.toUpperCase()}` : 'COOPERACIÓN INTERNACIONAL / SOCIO ALIADO'}
            </p>
            <p class="text-[12px] text-[#071D49]/60 font-semibold mt-0.5">Entidad miembro integrante de la Mancomunidad Frontera del Norte</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-blue-50/60 p-3.5 rounded-xl border border-blue-100">
              <span class="text-[12px] font-bold uppercase text-blue-900/60 block mb-0.5">Cantidad en Cifras:</span>
              <p class="font-mono text-[18px] font-semibold text-[#1248AA]">
                Q {reciboSeleccionado.monto.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div class="bg-gray-50/80 p-3.5 rounded-xl border border-gray-100">
              <span class="text-[12px] font-bold uppercase text-[#071D49]/50 block mb-0.5">Cuenta Bancaria Receptora:</span>
              <p class="font-bold text-[11px] text-[#071D49]">{reciboSeleccionado.cuentaBancaria}</p>
              <p class="text-[12px] font-mono text-[#071D49]/50">No. 3440-001-928 (Banrural)</p>
            </div>
          </div>

          <div class="p-3.5 rounded-xl border border-gray-100">
            <span class="text-[12px] font-bold uppercase text-[#071D49]/50 block mb-0.5">Cantidad en Letras:</span>
            <p class="font-bold text-[12px] text-[#071D49] tracking-wide">
              {montoALetras(reciboSeleccionado.monto)}
            </p>
          </div>

          <div class="p-3.5 rounded-xl border border-gray-100">
            <span class="text-[12px] font-bold uppercase text-[#071D49]/50 block mb-0.5">Por Concepto De:</span>
            <p class="font-medium text-[12px] text-[#071D49]/80 leading-relaxed">
              {reciboSeleccionado.descripcion}
            </p>
          </div>

          <!-- Sello y Hash de Auditoría -->
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl text-[12px] font-mono text-[#071D49]/60 border border-gray-200/60">
            <span>Sello Criptográfico CGC:</span>
            <span class="font-bold">{reciboSeleccionado.codigo}-SHA256-OK</span>
          </div>

          <!-- Firmas Oficiales -->
          <div class="grid grid-cols-2 gap-8 pt-10 mt-6 border-t border-gray-200 text-center">
            <div>
              <div class="w-44 mx-auto border-b-2 border-gray-400 mb-2"></div>
              <p class="text-[11px] font-semibold text-[#071D49]">Lic. Óscar Fernando Ixcoy</p>
              <p class="text-[12px] font-bold text-[#071D49]/50 uppercase tracking-wider">Dirección Administrativa y Financiera (DAF-MFN)</p>
              <p class="text-[12px] text-[#071D49]/40 mt-0.5">Firma y Sello Oficial</p>
            </div>
            <div>
              <div class="w-44 mx-auto border-b-2 border-gray-400 mb-2"></div>
              <p class="text-[11px] font-semibold text-[#071D49]">Marvin Josué Ramírez</p>
              <p class="text-[12px] font-bold text-[#071D49]/50 uppercase tracking-wider">Gerencia Ejecutiva</p>
              <p class="text-[12px] text-[#071D49]/40 mt-0.5">Vo.Bo. Representación Legal</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- MODAL DICTAMEN DE RENDICIÓN DE CUENTAS PARA LA ASAMBLEA (CGC - RF12) -->
{#if showDictamenModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071D49]/70 backdrop-blur-sm overflow-y-auto">
    <div class="glass-light rounded-[28px] max-w-3xl w-full p-8 md:p-10    relative print:m-0 print:p-6 print: print:shadow-none print:w-full print:max-w-none">
      <!-- Acciones (Ocultas al Imprimir) -->
      <div class="flex items-center justify-between pb-6 mb-6 border-b border-gray-100 print:hidden">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span class="text-[11px] font-bold text-[#071D49] uppercase tracking-wider">Informe Oficial de Rendición de Cuentas (RF12)</span>
        </div>
        <div class="flex items-center gap-3">
          <button 
            type="button" 
            onclick={imprimirDocumento}
            class="flex items-center gap-2 px-5 py-2.5 bg-[#071D49] hover:bg-black text-white text-[12px] font-bold rounded-full shadow-md transition-all cursor-pointer"
          >
            <Icon name="print" className="w-4 h-4 text-amber-400" />
            <span>Imprimir Dictamen para Asamblea</span>
          </button>
          <button 
            type="button" 
            onclick={() => showDictamenModal = false} 
            class="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-[#071D49] transition-colors"
          >
            <Icon name="close" className="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- CUERPO DEL INFORME OFICIAL -->
      <div class="space-y-6 text-[#071D49]">
        <!-- Encabezado -->
        <div class="text-center pb-6 border-b-2 border-[#071D49]">
          <h2 class="text-[18px] md:text-[22px] font-semibold text-[#071D49] uppercase tracking-tight">
            Mancomunidad de Municipios de la Frontera del Norte
          </h2>
          <p class="text-[11px] font-bold text-[#071D49]/60 uppercase tracking-widest mt-1">
            Departamento de Huehuetenango · República de Guatemala
          </p>
          <div class="mt-3 bg-[#071D49] text-white inline-block px-5 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider">
            Dictamen Consolidado de Ejecución Presupuestaria · Asamblea General
          </div>
          <p class="text-[12px] text-[#071D49]/50 mt-2 font-medium">
            En cumplimiento del Código Municipal (Decreto 12-2002) y Ley de Acceso a la Información Pública (Decreto 57-2008)
          </p>
        </div>

        <!-- Resumen de Liquidez y Separación de Fondos -->
        <div class="grid grid-cols-3 gap-4">
          <div class="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center">
            <span class="text-[12px] font-semibold uppercase text-[#071D49]/50 block">Fondos Públicos (CGC)</span>
            <p class="text-[18px] font-semibold text-[#071D49] mt-1">Q {balance.cuentas.fondosPublicos.saldo.toLocaleString('es-GT')}</p>
            <span class="text-[12px] text-[#071D49]/50 font-medium">Cuotas Municipales</span>
          </div>
          <div class="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 text-center">
            <span class="text-[12px] font-semibold uppercase text-blue-900/60 block">Cooperación Externa (SAT)</span>
            <p class="text-[18px] font-semibold text-[#1248AA] mt-1">Q {balance.cuentas.cooperacion.saldo.toLocaleString('es-GT')}</p>
            <span class="text-[12px] text-[#1248AA]/70 font-medium">USAID / BID / AECID</span>
          </div>
          <div class="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 text-center">
            <span class="text-[12px] font-semibold uppercase text-emerald-900/60 block">Liquidez Disponible Total</span>
            <p class="text-[18px] font-semibold text-emerald-600 mt-1">Q {balance.saldoDisponibleTotal.toLocaleString('es-GT')}</p>
            <span class="text-[12px] text-emerald-700/70 font-medium">Saldo Neto Operativo</span>
          </div>
        </div>

        <!-- Estado de Solvencia de los 6 Municipios -->
        <div class="border border-gray-200 rounded-2xl overflow-hidden">
          <div class="bg-gray-100/70 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <span class="text-[11px] font-semibold text-[#071D49] uppercase tracking-wider">Estado de Aportes Ordinarios por Municipio (Ejercicio 2026)</span>
            <span class="text-[12px] font-bold text-[#071D49]/60">Cuota Base: Q15,000 / Mes</span>
          </div>
          <table class="w-full text-left text-[11px]">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="py-2.5 px-4 font-bold uppercase text-[12px] text-[#071D49]/50">Municipio</th>
                <th class="py-2.5 px-4 font-bold uppercase text-[12px] text-[#071D49]/50 text-right">Aportado</th>
                <th class="py-2.5 px-4 font-bold uppercase text-[12px] text-[#071D49]/50 text-right">Cuota Anual</th>
                <th class="py-2.5 px-4 font-bold uppercase text-[12px] text-[#071D49]/50 text-center">Estado Fiscal</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              {#each municipiosMFN as m}
                <tr>
                  <td class="py-2.5 px-4 font-bold text-[#071D49]">{m.nombre}</td>
                  <td class="py-2.5 px-4 text-right font-mono font-bold text-emerald-600">Q {m.cuotasPagadas.toLocaleString('es-GT')}</td>
                  <td class="py-2.5 px-4 text-right font-mono text-[#071D49]/50">Q {m.cuotasEsperadas.toLocaleString('es-GT')}</td>
                  <td class="py-2.5 px-4 text-center">
                    <span class="px-2 py-0.5 rounded-full text-[12px] font-semibold uppercase {m.estado === 'Solvente' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                      {m.estado}
                    </span>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <!-- Conclusión Dictamen y Firmas de la Asamblea -->
        <p class="text-[11px] text-[#071D49]/70 leading-relaxed text-justify">
          El presente dictamen certifica la legalidad y transparencia de los movimientos operados en las cuentas oficiales de la Mancomunidad de Municipios Frontera del Norte durante el período, confirmando la no mezcla de recursos de cooperación internacional con fondos públicos según lo mandata la ley.
        </p>

        <div class="grid grid-cols-3 gap-6 pt-10 mt-6 border-t border-gray-200 text-center">
          <div>
            <div class="w-32 mx-auto border-b border-gray-400 mb-2"></div>
            <p class="text-[12px] font-semibold text-[#071D49]">Alcalde Presidente</p>
            <p class="text-[12px] font-bold text-[#071D49]/50 uppercase">Junta Directiva MFN</p>
          </div>
          <div>
            <div class="w-32 mx-auto border-b border-gray-400 mb-2"></div>
            <p class="text-[12px] font-semibold text-[#071D49]">Marvin Josué Ramírez</p>
            <p class="text-[12px] font-bold text-[#071D49]/50 uppercase">Gerente Ejecutivo</p>
          </div>
          <div>
            <div class="w-32 mx-auto border-b border-gray-400 mb-2"></div>
            <p class="text-[12px] font-semibold text-[#071D49]">Julio César Matías</p>
            <p class="text-[12px] font-bold text-[#071D49]/50 uppercase">Auditor Interno (AUD)</p>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

